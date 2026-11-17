import mongoose from 'mongoose';
import crypto from 'crypto';
import Donation from '../models/Donation.js';
import Requirement from '../models/Requirement.js';
import NGO from '../models/NGO.js';
import User from '../models/User.js';
import DonationAudit from '../models/DonationAudit.js';
import Campaign from '../models/Campaign.js';
import PickupSchedule from '../models/PickupSchedule.js';
import PickupAgent from '../models/PickupAgent.js';
import { getCoordinatesForCity, calculateDistanceKm, validateCoordinates, getDistanceDetails, estimateRoadDistanceKm } from '../utils/geoUtils.js';
import { sendEmail } from '../utils/emailService.js';
import { formatDonation, formatDonationList } from '../views/donationView.js';
import { createNotification } from './ngoProfileController.js';
import { runTransactionSafe } from '../utils/transactionHelper.js';
import {
    VALID_DONATION_TRANSITIONS,
    isValidDonationTransition,
    transitionDonationStatus,
    cancelDonationOffer
} from '../services/donationLifecycleService.js';

// Valid donation status transitions map including verified handover & distribution steps
export const VALID_TRANSITIONS = VALID_DONATION_TRANSITIONS;

// @desc    Create a new donation
// @route   POST /api/donations
// @access  Private (Donor / User)
export const createDonation = async (req, res) => {
    try {
        const {
            requirementId,
            quantity,
            description,
            pickupAddress,
            city,
            state,
            image,
            clothesType,
            targetAgeGroup,
            size,
            bookClass,
            bookType,
            bookName,
            foodType,
            electronicType,
            medicineType,
            customItems,
            extraItems,
            campaignId,
            isGroupContribution,
            isAnonymous,
            latitude,
            longitude,
            accuracy,
            formattedAddress,
            locationVerificationStatus
        } = req.body;

        const donationQuantity = Number(quantity);
        if (!donationQuantity || donationQuantity <= 0 || !Number.isInteger(donationQuantity)) {
            return res.status(400).json({ success: false, message: 'Donation quantity must be a positive whole number greater than 0' });
        }

        const requirement = await Requirement.findById(requirementId);
        if (!requirement) {
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }

        if (requirement.status !== 'active') {
            return res.status(400).json({ success: false, message: 'This requirement is no longer active for donations' });
        }

        if (donationQuantity > requirement.remainingQuantity) {
            return res.status(400).json({
                success: false,
                message: `Donation quantity (${donationQuantity}) exceeds remaining needed quantity (${requirement.remainingQuantity} ${requirement.unit})`
            });
        }

        // Prevent duplicate submissions within a short 10-second window
        const recentDuplicate = await Donation.findOne({
            donor: req.user._id,
            requirement: requirement._id,
            quantity: donationQuantity,
            status: 'pending',
            createdAt: { $gte: new Date(Date.now() - 10 * 1000) }
        });

        if (recentDuplicate) {
            return res.status(400).json({
                success: false,
                message: 'A duplicate donation request was recently submitted. Please check your donations page.'
            });
        }

        // Generate unique cryptographic verification code
        const verificationCode = `HC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const campaign = campaignId || requirement.campaign || null;

        // Process donor location: actual coordinates, browser GPS, map pin, or geocoding
        let pickupLocation = {
            type: 'Point',
            coordinates: undefined,
            latitude: null,
            longitude: null,
            accuracy: null,
            formattedAddress: formattedAddress ? String(formattedAddress).trim() : `${pickupAddress.trim()}, ${(city || requirement.city || '').trim()}`,
            verificationStatus: 'unverified',
            lastUpdatedAt: null
        };

        if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
            const lat = Number(latitude);
            const lng = Number(longitude);
            if (validateCoordinates(lat, lng)) {
                pickupLocation.coordinates = [lng, lat];
                pickupLocation.latitude = lat;
                pickupLocation.longitude = lng;
                pickupLocation.accuracy = accuracy != null ? Number(accuracy) : null;
                pickupLocation.verificationStatus = locationVerificationStatus || 'donor_confirmed';
                pickupLocation.lastUpdatedAt = new Date();
            }
        } else {
            const resolvedCoords = getCoordinatesForCity(city || requirement.city, pickupAddress);
            if (resolvedCoords) {
                pickupLocation.coordinates = [resolvedCoords[0], resolvedCoords[1]];
                pickupLocation.longitude = resolvedCoords[0];
                pickupLocation.latitude = resolvedCoords[1];
                pickupLocation.verificationStatus = 'geocoded';
                pickupLocation.lastUpdatedAt = new Date();
            }
        }

        let createdDonation;
        await runTransactionSafe(async (session, context) => {
            const opts = session ? { session } : {};

            const donation = new Donation({
                donor: req.user._id,
                ngo: requirement.ngo,
                requirement: requirement._id,
                campaign,
                isGroupContribution: Boolean(isGroupContribution || requirement.isGroupDonation),
                isAnonymous: Boolean(isAnonymous),
                verificationCode,
                quantity: donationQuantity,
                description: description ? description.trim() : '',
                pickupAddress: pickupAddress.trim(),
                city: city ? city.trim() : requirement.city,
                state: state ? state.trim() : '',
                pickupLocation,
                image: image || '',
                clothesType: clothesType || requirement.clothesType || '',
                targetAgeGroup: targetAgeGroup || requirement.targetAgeGroup || '',
                size: size || requirement.size || '',
                bookClass: bookClass || requirement.bookClass || '',
                bookType: bookType || requirement.bookType || '',
                bookName: bookName || requirement.bookName || '',
                foodType: foodType || requirement.foodType || '',
                electronicType: electronicType || requirement.electronicType || '',
                medicineType: medicineType || requirement.medicineType || '',
                customItems: customItems || requirement.customItems || '',
                extraItems: extraItems ? extraItems.trim() : '',
                status: 'pending'
            });

            // Set QR payload for verified collection
            donation.qrPayload = JSON.stringify({
                donationId: donation._id,
                code: verificationCode,
                action: 'verify_handover',
                donor: isAnonymous ? 'Anonymous Donor' : req.user.name
            });
            await donation.save(opts);
            createdDonation = donation;

            // Increment contributor count if group donation
            if (requirement.isGroupDonation) {
                await Requirement.findByIdAndUpdate(requirement._id, { $inc: { contributorsCount: 1 } }, opts);
            }

            // Create initial immutable audit trail record
            await DonationAudit.create([
                {
                    donation: donation._id,
                    action: 'created',
                    fromStatus: '',
                    toStatus: 'pending',
                    performedBy: req.user._id,
                    performerRole: 'user',
                    verificationCodeUsed: verificationCode,
                    notes: 'Donation offer initiated by donor'
                }
            ], opts);

            // Post-commit notification (only triggered after transaction commits successfully)
            const sendCreationNotification = async () => {
                try {
                    const ngo = await NGO.findById(requirement.ngo).populate('user', 'email');
                    if (ngo && ngo.user && ngo.user.email) {
                        await sendEmail({
                            to: ngo.user.email,
                            subject: `New Donation Offer Received: ${requirement.title}`,
                            text: `Hello ${ngo.ngoName},\n\nYou received a new donation offer of ${donationQuantity} ${requirement.unit} from ${req.user.name}.\n\nPlease log in to your HelpConnect NGO Dashboard to review and accept/reject this donation request.\n\nThank you,\nHelpConnect Team`
                        });
                    }
                } catch (e) {
                    console.error('Email notification error on donation create:', e.message);
                }
            };

            if (context?.onCommit) {
                context.onCommit(sendCreationNotification);
            } else {
                sendCreationNotification().catch(() => {});
            }
        });

        res.status(201).json(formatDonation(createdDonation));
    } catch (error) {
        console.error('Create donation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get donor's own donations
// @route   GET /api/donations/my-donations
// @access  Private (Donor)
export const getMyDonations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit);

        let query = Donation.find({ donor: req.user._id })
            .populate('ngo', 'ngoName phone city address')
            .populate('requirement', 'title category unit')
            .populate('assignedAgent', 'agentId fullName phone vehicleType vehicleNumber profilePhoto status')
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const donations = await query;
        res.json(formatDonationList(donations));
    } catch (error) {
        console.error('Get my donations error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get donations received by NGO
// @route   GET /api/donations/ngo-donations
// @access  Private (NGO)
export const getNgoDonations = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found for this user' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit);

        let query = Donation.find({ ngo: ngo._id })
            .populate('donor', 'name email phone location')
            .populate('requirement', 'title category quantity remainingQuantity unit')
            .populate('assignedAgent', 'agentId fullName phone vehicleType vehicleNumber profilePhoto status')
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const donations = await query;
        res.json(formatDonationList(donations));
    } catch (error) {
        console.error('Get NGO donations error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single donation by ID
// @route   GET /api/donations/:id
// @access  Private
export const getDonationById = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id)
            .populate('donor', 'name email phone location')
            .populate('ngo', 'ngoName phone address city state user')
            .populate('requirement', 'title category quantity remainingQuantity unit')
            .populate('assignedAgent');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // Authorization check: owner donor, recipient NGO user, or admin
        const donorId = donation.donor?._id ? donation.donor._id.toString() : donation.donor?.toString();
        const ngoUserId = donation.ngo?.user ? donation.ngo.user.toString() : null;
        const isOwnerDonor = donorId === req.user._id.toString();
        const isRecipientNGO = ngoUserId === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwnerDonor && !isRecipientNGO && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this donation' });
        }

        res.json(formatDonation(donation));
    } catch (error) {
        console.error('Get donation by ID error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update donation status (accept, reject, completed, picked_up, received)
// @route   PUT /api/donations/:id/status
// @access  Private (Recipient NGO / Admin)
export const updateDonationStatus = async (req, res) => {
    try {
        const { status, evidenceImages, notes, verificationCode, scheduledPickupDate, distributionNotes } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // Verify authorization: logged in user must own the recipient NGO profile, be owner donor (for cancellation), or be an admin
        const ngo = await NGO.findOne({ user: req.user._id });
        const donNgoId = (donation.ngo?._id || donation.ngo)?.toString();
        const isRecipientNGO = ngo && donNgoId === ngo._id.toString();
        const isOwnerDonor = donation.donor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        // Donors may only cancel if still in pending/accepted
        if (isOwnerDonor && !isRecipientNGO && !isAdmin) {
            if (status !== 'cancelled') {
                return res.status(403).json({ success: false, message: 'Donors may only cancel their donation offer before dispatch' });
            }
        } else if (!isRecipientNGO && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update status for this donation' });
        }

        // Check valid status value
        const allowedStatuses = ['pending', 'accepted', 'pickup_scheduled', 'picked_up', 'received', 'distributed', 'completed', 'rejected', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status '${status}'` });
        }

        // Check valid transition from current status
        const allowedNextStates = VALID_TRANSITIONS[donation.status] || [];
        if (!allowedNextStates.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: cannot change donation from '${donation.status}' to '${status}'.`
            });
        }

        // Optional Verification Code validation for handover/delivery
        if (verificationCode && verificationCode.trim().toUpperCase() !== donation.verificationCode) {
            return res.status(400).json({ success: false, message: 'Invalid verification code provided for this donation handover.' });
        }

        // Requirement 1: NGO must assign a registered pickup agent before accepting a donation pickup order
        if (donation.status === 'pending' && status === 'accepted') {
            const agentId = req.body.agentId || donation.assignedAgent;
            if (!agentId) {
                return res.status(400).json({
                    success: false,
                    message: 'A registered pickup agent must be assigned before accepting a donation pickup order.'
                });
            }
            const agent = await PickupAgent.findById(agentId);
            if (!agent) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected pickup agent was not found. Please assign a valid registered agent.'
                });
            }
            if (agent.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot assign an inactive pickup agent. Please select an active registered agent.'
                });
            }
        }

        if (req.body.agentId) {
            const agent = await PickupAgent.findById(req.body.agentId);
            if (agent && agent.status === 'active') {
                donation.assignedAgent = agent._id;
                donation.assignedAgentId = agent.agentId;
                donation.assignedNgoId = donation.ngo;
                donation.assignedAt = new Date();
                donation.pickupStatus = 'agent_assigned';
                if (!donation.pickupTimeline) donation.pickupTimeline = {};
                donation.pickupTimeline.agentAssignedAt = new Date();
                await donation.save();
            }
        }

        const updatedDonation = await transitionDonationStatus({
            donationId: donation._id,
            targetStatus: status,
            performedBy: req.user._id,
            performerRole: req.user.role,
            reason: notes,
            notes,
            scheduledPickupDate,
            distributionNotes,
            evidenceImages
        });

        // Send Email notification to donor asynchronously
        (async () => {
            try {
                const [donor, requirement] = await Promise.all([
                    User.findById(donation.donor),
                    Requirement.findById(donation.requirement)
                ]);
                if (donor && donor.email) {
                    await sendEmail({
                        to: donor.email,
                        subject: `Donation Update: Status Changed to ${status.toUpperCase()}`,
                        text: `Hello ${donor.name},\n\nYour donation offer for "${requirement?.title || 'Material Requirement'}" has been updated to: ${status.toUpperCase()}.\n\nThank you for supporting NGOs through HelpConnect!\n\nBest regards,\nHelpConnect Team`
                    });
                }
            } catch (e) {
                console.error('Email notification error on donation update:', e.message);
            }
        })();

        res.json(formatDonation(updatedDonation));
    } catch (error) {
        console.error('Update donation status error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Cancel donation by donor
// @route   PUT /api/donations/:id/cancel
// @access  Private (Donor / Admin)
export const cancelDonation = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const isDonor = donation.donor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isDonor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this donation' });
        }

        // Prevent donors from cancelling donations after pickup, receipt or completion
        if (['picked_up', 'received', 'distributed', 'completed'].includes(donation.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a donation that is already ${donation.status.replace('_', ' ')}`
            });
        }

        if (['rejected', 'cancelled'].includes(donation.status)) {
            return res.status(400).json({
                success: false,
                message: `Donation is already ${donation.status}`
            });
        }

        const cancelledDonation = await cancelDonationOffer({
            donationId: req.params.id,
            userId: req.user._id,
            userRole: isDonor ? 'donor' : (isAdmin ? 'admin' : 'ngo'),
            reason: req.body?.reason || 'Cancelled by user'
        });

        res.json({
            success: true,
            message: 'Donation cancelled successfully',
            donation: formatDonation(cancelledDonation)
        });
    } catch (error) {
        console.error('Cancel donation error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get complete verifiable audit timeline for a donation
// @route   GET /api/donations/:id/timeline
// @access  Private (Owner Donor / Recipient NGO / Admin)
export const getDonationTimeline = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id)
            .populate('donor', 'name email phone location city address impactPrivacy')
            .populate('ngo', 'ngoName phone address city state logo registrationNumber isVerified location')
            .populate('requirement', 'title category unit quantity')
            .populate('assignedAgent');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const isOwnerDonor = donation.donor?._id?.toString() === req.user._id.toString();
        const ngo = await NGO.findOne({ user: req.user._id });
        const isRecipientNGO = ngo && donation.ngo?._id?.toString() === ngo._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwnerDonor && !isRecipientNGO && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this donation timeline' });
        }

        const auditTrail = await DonationAudit.find({ donation: donation._id })
            .populate('performedBy', 'name role')
            .sort({ createdAt: 1 });

        // Retrieve associated pickup schedule or compute from donation
        const pickup = await PickupSchedule.findOne({ donation: donation._id });
        const donorCity = donation.city || pickup?.city || donation.donor?.city || donation.donor?.location || '';
        const donorAddress = pickup?.pickupAddress || donation.pickupAddress || donation.donor?.address || donorCity;

        // Use actual stored coordinates from pickupLocation if available; otherwise attempt to resolve
        let donorLat = donation.pickupLocation?.latitude != null ? donation.pickupLocation.latitude : null;
        let donorLng = donation.pickupLocation?.longitude != null ? donation.pickupLocation.longitude : null;
        let donorVerificationStatus = donation.pickupLocation?.verificationStatus || 'unverified';

        if (donorLat == null || donorLng == null) {
            const pCoords = getCoordinatesForCity(donorCity, donorAddress);
            if (pCoords) {
                donorLng = pCoords[0];
                donorLat = pCoords[1];
                donorVerificationStatus = 'geocoded';
            }
        }

        const isDonorLocationVerified = donorLat != null && donorLng != null;

        const pickupInfo = {
            ...(pickup ? pickup.toObject() : {}),
            pickupAddress: donorAddress,
            city: donorCity,
            contactPhone: pickup?.contactPhone || donation.donor?.phone || '',
            status: donation.status,
            verificationStatus: donorVerificationStatus,
            isLocationVerified: isDonorLocationVerified,
            coordinates: isDonorLocationVerified ? [donorLng, donorLat] : null,
            latitude: donorLat,
            longitude: donorLng
        };

        const hasValidNgoCoords = Array.isArray(donation.ngo?.location?.coordinates) &&
            donation.ngo.location.coordinates.length === 2 &&
            (donation.ngo.location.coordinates[0] !== 0 || donation.ngo.location.coordinates[1] !== 0);

        const ngoCoords = hasValidNgoCoords
            ? donation.ngo.location.coordinates
            : (donation.ngo ? getCoordinatesForCity(donation.ngo.city, donation.ngo.address) : null);

        const ngoLocation = donation.ngo ? {
            ngoName: donation.ngo.ngoName,
            address: donation.ngo.address,
            city: donation.ngo.city,
            coordinates: ngoCoords || null,
            latitude: ngoCoords ? ngoCoords[1] : null,
            longitude: ngoCoords ? ngoCoords[0] : null
        } : null;

        let distanceKm = null;
        let distanceDetails = null;
        if (isDonorLocationVerified && ngoCoords) {
            distanceDetails = getDistanceDetails(donorLat, donorLng, ngoCoords[1], ngoCoords[0]);
            distanceKm = distanceDetails?.straightLineDistanceKm || null;
        }

        res.json({
            success: true,
            donation: formatDonation(donation, { includeVerificationCode: isOwnerDonor || isAdmin }),
            donor: donation.isAnonymous && !isRecipientNGO && !isAdmin
                ? { name: 'Anonymous Donor' }
                : donation.donor,
            ngo: donation.ngo,
            ngoLocation,
            pickup: pickupInfo,
            distanceKm,
            distanceDetails,
            requirement: donation.requirement,
            timeline: auditTrail
        });
    } catch (error) {
        console.error('Get donation timeline error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get official donation receipt
// @route   GET /api/donations/:id/receipt
// @access  Private (Owner Donor / Recipient NGO / Admin)
export const getDonationReceipt = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id)
            .populate('donor', 'name email phone address city state')
            .populate('ngo', 'ngoName phone address city state registrationNumber logo isVerified')
            .populate('requirement', 'title category unit');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const isOwnerDonor = donation.donor?._id?.toString() === req.user._id.toString();
        const ngo = await NGO.findOne({ user: req.user._id });
        const isRecipientNGO = ngo && donation.ngo?._id?.toString() === ngo._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwnerDonor && !isRecipientNGO && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this receipt' });
        }

        // Receipt verification hash
        const receiptHash = crypto
            .createHash('sha256')
            .update(`${donation._id}-${donation.verificationCode}-${donation.createdAt}`)
            .digest('hex')
            .substring(0, 16)
            .toUpperCase();

        const receipt = {
            receiptNumber: `REC-${donation._id.toString().substring(18, 24).toUpperCase()}-${donation.verificationCode}`,
            verificationHash: receiptHash,
            issueDate: donation.updatedAt || donation.createdAt,
            donationId: donation._id,
            status: donation.status,
            donor: {
                name: donation.isAnonymous ? 'Anonymous Donor' : donation.donor?.name || 'Valued Donor',
                email: donation.isAnonymous ? '' : donation.donor?.email || '',
                city: donation.city,
                state: donation.state
            },
            ngo: {
                name: donation.ngo?.ngoName || 'NGO Partner',
                registrationNumber: donation.ngo?.registrationNumber || 'N/A',
                address: donation.ngo?.address || '',
                city: donation.ngo?.city || '',
                phone: donation.ngo?.phone || '',
                isVerified: donation.ngo?.isVerified || false
            },
            items: [
                {
                    title: donation.requirement?.title || 'Material Donation',
                    category: donation.requirement?.category || 'General',
                    quantity: donation.quantity,
                    unit: donation.requirement?.unit || 'items',
                    description: donation.description || ''
                }
            ],
            verificationCode: donation.verificationCode,
            evidenceImages: donation.evidenceImages || []
        };

        res.json({ success: true, receipt });
    } catch (error) {
        console.error('Get donation receipt error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
