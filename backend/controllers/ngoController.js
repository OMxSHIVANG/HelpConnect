import NGO from '../models/NGO.js';
import User from '../models/User.js';
import Requirement from '../models/Requirement.js';
import Donation from '../models/Donation.js';
import Review from '../models/Review.js';
import { formatNGO, formatNGOList } from '../views/ngoView.js';
import { getCoordinatesForCity } from '../utils/geoUtils.js';

// @desc    Register NGO profile (for NGO user)
// @route   POST /api/ngo/register
// @access  Private (Authenticated User)
export const registerNGOProfile = async (req, res) => {
    try {
        const { ngoName, registrationNumber, phone, address, city, state, description, location } = req.body;

        const normalizedRegNo = registrationNumber?.trim().toUpperCase();

        const existingNGO = await NGO.findOne({
            $or: [{ registrationNumber: normalizedRegNo }, { user: req.user._id }]
        });

        if (existingNGO) {
            return res.status(400).json({
                success: false,
                message: existingNGO.registrationNumber === normalizedRegNo
                    ? 'An NGO with this registration number already exists'
                    : 'You have already registered an NGO profile'
            });
        }

        // Determine coordinates
        let coordinates = [0, 0];
        let latitude = null;
        let longitude = null;
        let verificationStatus = 'unverified';

        if (location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
            coordinates = [Number(location.coordinates[0]), Number(location.coordinates[1])];
            longitude = coordinates[0];
            latitude = coordinates[1];
            verificationStatus = 'manual_map_selected';
        } else if (req.body.longitude !== undefined && req.body.latitude !== undefined) {
            latitude = Number(req.body.latitude);
            longitude = Number(req.body.longitude);
            coordinates = [longitude, latitude];
            verificationStatus = 'manual_map_selected';
        } else {
            const resolved = getCoordinatesForCity(city, address);
            if (resolved) {
                coordinates = resolved;
                longitude = resolved[0];
                latitude = resolved[1];
                verificationStatus = 'geocoded';
            }
        }

        // Newly registered NGO is ALWAYS unverified by default
        const ngo = await NGO.create({
            user: req.user._id,
            ngoName: ngoName.trim(),
            registrationNumber: normalizedRegNo,
            phone: phone ? phone.trim() : '',
            address: address.trim(),
            city: city.trim(),
            state: state ? state.trim() : '',
            description: description ? description.trim() : '',
            location: {
                type: 'Point',
                coordinates,
                latitude,
                longitude,
                accuracy: req.body.accuracy ? Number(req.body.accuracy) : null,
                formattedAddress: req.body.formattedAddress || address,
                verificationStatus,
                lastUpdatedAt: new Date()
            },
            isVerified: false,
            isActive: true
        });

        // Update user role to 'ngo' if not already
        if (req.user.role !== 'ngo' && req.user.role !== 'admin') {
            await User.findByIdAndUpdate(req.user._id, { role: 'ngo' });
        }

        res.status(201).json(formatNGO(ngo));
    } catch (error) {
        console.error('Register NGO profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error registering NGO' });
    }
};

// @desc    Get all verified & active NGOs
// @route   GET /api/ngo
// @access  Public
export const getNGOs = async (req, res) => {
    try {
        const { search, city, state } = req.query;
        const filter = { isVerified: true, isActive: true };

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { ngoName: regex },
                { description: regex },
                { city: regex },
                { state: regex },
                { address: regex },
                { registrationNumber: regex },
                { workingAreas: regex },
                { ngoType: regex }
            ];
        }

        if (city && city.trim() && city.toLowerCase() !== 'all') {
            filter.city = new RegExp(city.trim(), 'i');
        }

        if (state && state.trim()) {
            filter.state = new RegExp(state.trim(), 'i');
        }

        const ngos = await NGO.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json(formatNGOList(ngos));
    } catch (error) {
        console.error('Get NGOs error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current NGO profile
// @route   GET /api/ngo/profile
// @access  Private (NGO)
export const getNGOProfile = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id }).populate('user', 'name email');
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found for this account' });
        }
        res.json(formatNGO(ngo));
    } catch (error) {
        console.error('Get NGO profile error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update NGO profile details
// @route   PUT /api/ngo/profile
// @access  Private (NGO)
export const updateNGOProfile = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });

        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        // Verify ownership: logged in user must own this NGO profile
        if (ngo.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this NGO profile' });
        }

        // Allow-list editable fields. Prevent modifying registrationNumber, isVerified, or user
        if (req.body.ngoName) ngo.ngoName = req.body.ngoName.trim();
        if (req.body.phone !== undefined) ngo.phone = req.body.phone.trim();
        if (req.body.address) ngo.address = req.body.address.trim();
        if (req.body.city) ngo.city = req.body.city.trim();
        if (req.body.state !== undefined) ngo.state = req.body.state.trim();
        if (req.body.description !== undefined) ngo.description = req.body.description.trim();
        if (req.body.logo !== undefined) ngo.logo = req.body.logo;
        if (req.body.location?.coordinates && Array.isArray(req.body.location.coordinates)) {
            const coords = [Number(req.body.location.coordinates[0]), Number(req.body.location.coordinates[1])];
            ngo.location = {
                type: 'Point',
                coordinates: coords,
                longitude: coords[0],
                latitude: coords[1],
                accuracy: req.body.accuracy ? Number(req.body.accuracy) : ngo.location?.accuracy,
                formattedAddress: req.body.formattedAddress || ngo.address,
                verificationStatus: 'manual_map_selected',
                lastUpdatedAt: new Date()
            };
        } else if (req.body.longitude !== undefined && req.body.latitude !== undefined) {
            const lng = Number(req.body.longitude);
            const lat = Number(req.body.latitude);
            ngo.location = {
                type: 'Point',
                coordinates: [lng, lat],
                longitude: lng,
                latitude: lat,
                accuracy: req.body.accuracy ? Number(req.body.accuracy) : ngo.location?.accuracy,
                formattedAddress: req.body.formattedAddress || ngo.address,
                verificationStatus: 'manual_map_selected',
                lastUpdatedAt: new Date()
            };
        } else if (req.body.city && (!ngo.location || !ngo.location.coordinates || (ngo.location.coordinates[0] === 0 && ngo.location.coordinates[1] === 0))) {
            const resolved = getCoordinatesForCity(ngo.city, ngo.address);
            if (resolved) {
                ngo.location = {
                    type: 'Point',
                    coordinates: resolved,
                    longitude: resolved[0],
                    latitude: resolved[1],
                    formattedAddress: ngo.address,
                    verificationStatus: 'geocoded',
                    lastUpdatedAt: new Date()
                };
            }
        }

        const updatedNGO = await ngo.save();
        res.json(formatNGO(updatedNGO));
    } catch (error) {
        console.error('Update NGO profile error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single NGO details by ID
// @route   GET /api/ngo/:id
// @access  Public
export const getNGOById = async (req, res) => {
    try {
        const ngo = await NGO.findById(req.params.id).populate('user', 'name email');
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }
        res.json(formatNGO(ngo));
    } catch (error) {
        console.error('Get NGO by ID error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get comprehensive explainable NGO Transparency Scorecard
// @route   GET /api/ngo/:id/transparency
// @access  Public
export const getNGOTransparencyScorecard = async (req, res) => {
    try {
        const ngo = await NGO.findById(req.params.id).populate('user', 'name email');
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }

        // Fetch quantitative metrics for explainable scoring
        const [
            totalRequirements,
            fulfilledRequirements,
            acceptedDonations,
            completedDonations,
            donationsWithEvidence,
            verifiedReviews
        ] = await Promise.all([
            Requirement.countDocuments({ ngo: ngo._id }),
            Requirement.countDocuments({ ngo: ngo._id, status: 'fulfilled' }),
            Donation.countDocuments({ ngo: ngo._id, status: { $in: ['accepted', 'picked_up', 'received', 'distributed', 'completed'] } }),
            Donation.countDocuments({ ngo: ngo._id, status: 'completed' }),
            Donation.countDocuments({ ngo: ngo._id, status: 'completed', 'evidenceImages.0': { $exists: true } }),
            Review.find({ ngo: ngo._id }).populate('donor', 'name avatar').sort({ createdAt: -1 })
        ]);

        // 1. Admin Verification Score (Max 30)
        let adminVerificationScore = 0;
        if (ngo.isVerified) adminVerificationScore += 20;
        if (ngo.registrationNumber) adminVerificationScore += 10;

        // 2. Requirement Fulfillment Rate (Max 25)
        const fulfillmentRate = totalRequirements > 0
            ? Math.round((fulfilledRequirements / totalRequirements) * 100)
            : 80;
        const fulfillmentScore = Math.round((fulfillmentRate / 100) * 25);

        // 3. Donation Completion Rate (Max 25)
        const completionRate = acceptedDonations > 0
            ? Math.round((completedDonations / acceptedDonations) * 100)
            : 85;
        const completionScore = Math.round((completionRate / 100) * 25);

        // 4. Evidence Submission Rate (Max 20)
        const evidenceRate = completedDonations > 0
            ? Math.round((donationsWithEvidence / completedDonations) * 100)
            : 70;
        const evidenceScore = Math.round((evidenceRate / 100) * 20);

        const totalScore = Math.min(100, Math.max(0, adminVerificationScore + fulfillmentScore + completionScore + evidenceScore));

        // Average review rating
        const avgRating = verifiedReviews.length > 0
            ? (verifiedReviews.reduce((sum, r) => sum + r.rating, 0) / verifiedReviews.length).toFixed(1)
            : '5.0';

        // Persist computed transparency score to NGO record asynchronously
        NGO.findByIdAndUpdate(ngo._id, {
            transparencyScore: totalScore,
            fulfilledRequirementsCount: fulfilledRequirements,
            completedDonationsCount: completedDonations,
            evidenceSubmissionRate: evidenceRate
        }).exec().catch(() => {});

        res.json({
            success: true,
            scorecard: {
                ngoId: ngo._id,
                ngoName: ngo.ngoName,
                logo: ngo.logo,
                city: ngo.city,
                overallTransparencyScore: totalScore,
                scoreTier: totalScore >= 85 ? 'Gold Trust (Tier 1)' : totalScore >= 70 ? 'Silver Trust (Tier 2)' : 'Standard Verified',
                metricsBreakdown: {
                    adminVerification: {
                        score: adminVerificationScore,
                        max: 30,
                        isVerified: ngo.isVerified,
                        registrationNumber: ngo.registrationNumber,
                        verifiedAt: ngo.lastVerifiedAt || ngo.updatedAt
                    },
                    requirementFulfillment: {
                        score: fulfillmentScore,
                        max: 25,
                        ratePercentage: fulfillmentRate,
                        fulfilledCount: fulfilledRequirements,
                        totalCount: totalRequirements
                    },
                    donationCompletion: {
                        score: completionScore,
                        max: 25,
                        ratePercentage: completionRate,
                        completedCount: completedDonations,
                        acceptedCount: acceptedDonations
                    },
                    evidenceSubmission: {
                        score: evidenceScore,
                        max: 20,
                        ratePercentage: evidenceRate,
                        donationsWithEvidence
                    }
                },
                // Clear source distinction
                adminVerifiedData: {
                    registrationNumber: ngo.registrationNumber,
                    legalAddress: ngo.address,
                    isVerified: ngo.isVerified,
                    verificationStatus: ngo.verificationStatus
                },
                ngoSubmittedData: {
                    mission: ngo.mission || '',
                    vision: ngo.vision || '',
                    website: ngo.website || '',
                    workingAreas: ngo.workingAreas || [],
                    establishedYear: ngo.establishedYear || null
                },
                systemCalculatedMetrics: {
                    transparencyScore: totalScore,
                    completedDonations,
                    fulfilledRequirements,
                    verifiedReviewsCount: verifiedReviews.length,
                    averageRating: Number(avgRating)
                },
                verifiedDonorReviews: verifiedReviews.map(r => ({
                    _id: r._id,
                    donorName: r.donor?.name || 'Verified Donor',
                    donorAvatar: r.donor?.avatar || '',
                    rating: r.rating,
                    comment: r.comment,
                    date: r.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('Transparency scorecard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
