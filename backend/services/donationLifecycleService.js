import mongoose from 'mongoose';
import Donation from '../models/Donation.js';
import DonationAudit from '../models/DonationAudit.js';
import Requirement from '../models/Requirement.js';
import Campaign from '../models/Campaign.js';
import NGO from '../models/NGO.js';
import Notification from '../models/Notification.js';
import PickupAgent from '../models/PickupAgent.js';
import { runTransactionSafe } from '../utils/transactionHelper.js';
import { PICKUP_NOTIFICATION_MESSAGES } from '../utils/geoUtils.js';
import { emitDonationPickupStatus } from '../socket.js';

/**
 * Standard Donation Statuses (Macro lifecycle)
 */
export const DONATION_STATUSES = [
    'pending',
    'accepted',
    'pickup_scheduled',
    'picked_up',
    'received',
    'distributed',
    'completed',
    'rejected',
    'cancelled'
];

/**
 * Standard Pickup Statuses (Micro transit lifecycle)
 */
export const PICKUP_STATUSES = [
    'accepted',
    'agent_assigned',
    'agent_on_the_way',
    'agent_nearby',
    'agent_arrived',
    'donation_collected',
    'completed',
    'cancelled'
];

/**
 * Valid donation status transitions map including verified handover & distribution steps
 */
export const VALID_DONATION_TRANSITIONS = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['pickup_scheduled', 'picked_up', 'received', 'completed', 'rejected', 'cancelled'],
    pickup_scheduled: ['picked_up', 'received', 'rejected', 'cancelled'],
    picked_up: ['received', 'distributed', 'completed'],
    received: ['distributed', 'completed'],
    distributed: ['completed'],
    completed: [], // Terminal state
    rejected: [],  // Terminal state
    cancelled: []  // Terminal state
};

/**
 * Valid pickup status transitions map
 */
export const VALID_PICKUP_TRANSITIONS = {
    accepted: ['agent_assigned', 'cancelled'],
    agent_assigned: ['agent_on_the_way', 'agent_nearby', 'agent_arrived', 'cancelled'],
    agent_on_the_way: ['agent_nearby', 'agent_arrived', 'cancelled'],
    agent_nearby: ['agent_arrived', 'cancelled'],
    agent_arrived: ['donation_collected', 'cancelled'],
    donation_collected: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: []  // Terminal state
};

/**
 * Check if a donation status transition is allowed
 * @param {string} fromStatus 
 * @param {string} toStatus 
 * @returns {boolean}
 */
export const isValidDonationTransition = (fromStatus, toStatus) => {
    if (!fromStatus || !toStatus) return false;
    if (fromStatus === toStatus) return false; // Reject redundant self-transitions
    const allowed = VALID_DONATION_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
};

/**
 * Check if a pickup status transition is allowed
 * @param {string} fromStatus 
 * @param {string} toStatus 
 * @returns {boolean}
 */
export const isValidPickupTransition = (fromStatus, toStatus) => {
    if (!fromStatus || !toStatus) return false;
    if (fromStatus === toStatus) return false;
    const allowed = VALID_PICKUP_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
};

/**
 * Determine synchronized pickupStatus from a donation status transition
 * @param {string} newDonationStatus 
 * @param {string} currentPickupStatus 
 * @returns {string}
 */
export const derivePickupStatusFromDonationStatus = (newDonationStatus, currentPickupStatus) => {
    switch (newDonationStatus) {
        case 'accepted':
            return currentPickupStatus === 'agent_assigned' ? 'agent_assigned' : 'accepted';
        case 'pickup_scheduled':
            return currentPickupStatus || 'agent_assigned';
        case 'picked_up':
            return 'donation_collected';
        case 'received':
            return 'completed';
        case 'completed':
            return 'completed';
        case 'rejected':
        case 'cancelled':
            return 'cancelled';
        default:
            return currentPickupStatus || 'accepted';
    }
};

/**
 * Determine synchronized donation status from a pickup status transition
 * @param {string} newPickupStatus 
 * @param {string} currentDonationStatus 
 * @returns {string}
 */
export const deriveDonationStatusFromPickupStatus = (newPickupStatus, currentDonationStatus) => {
    switch (newPickupStatus) {
        case 'agent_assigned':
            return currentDonationStatus === 'pending' ? 'accepted' : currentDonationStatus;
        case 'donation_collected':
            return 'picked_up';
        case 'completed':
            // If already received or distributed, keep it or move to received
            if (['received', 'distributed', 'completed'].includes(currentDonationStatus)) {
                return currentDonationStatus;
            }
            return 'received';
        case 'cancelled':
            return 'cancelled';
        default:
            return currentDonationStatus;
    }
};

/**
 * Unified Status Display Information for Frontends and API consumers
 * Guarantees that "Pickup Completed" is never displayed before NGO confirms receipt.
 * @param {string} status - Donation status
 * @param {string} pickupStatus - Pickup status
 * @returns {object}
 */
export const getStatusDisplayInfo = (status, pickupStatus) => {
    const isPickupDone = pickupStatus === 'completed';
    const isReceived = ['received', 'distributed', 'completed'].includes(status);
    const isCollected = status === 'picked_up' || pickupStatus === 'donation_collected';

    let primaryLabel = 'Pending';
    let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    let pickupLabel = 'Order Accepted';

    switch (status) {
        case 'pending':
            primaryLabel = 'Pending Offer';
            badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
            break;
        case 'accepted':
            primaryLabel = 'Accepted by NGO';
            badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
            break;
        case 'pickup_scheduled':
            primaryLabel = 'Pickup Scheduled';
            badgeClass = 'bg-sky-100 text-sky-800 border-sky-300';
            break;
        case 'picked_up':
            primaryLabel = 'Donation Collected (In Transit)';
            badgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
            break;
        case 'received':
            primaryLabel = 'Received at NGO';
            badgeClass = 'bg-teal-100 text-teal-800 border-teal-300';
            break;
        case 'distributed':
            primaryLabel = 'Distributed to Beneficiaries';
            badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-300';
            break;
        case 'completed':
            primaryLabel = 'Completed';
            badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            break;
        case 'rejected':
            primaryLabel = 'Rejected';
            badgeClass = 'bg-red-100 text-red-800 border-red-300';
            break;
        case 'cancelled':
            primaryLabel = 'Cancelled';
            badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
            break;
        default:
            primaryLabel = status ? status.replace(/_/g, ' ') : 'Pending';
    }

    switch (pickupStatus) {
        case 'agent_assigned':
            pickupLabel = 'Agent Assigned';
            break;
        case 'agent_on_the_way':
            pickupLabel = 'Agent on the Way';
            break;
        case 'agent_nearby':
            pickupLabel = 'Agent Nearby (<5km)';
            break;
        case 'agent_arrived':
            pickupLabel = 'Agent Arrived at Pickup';
            break;
        case 'donation_collected':
            pickupLabel = 'Donation Collected';
            break;
        case 'completed':
            pickupLabel = 'Pickup Completed';
            break;
        case 'cancelled':
            pickupLabel = 'Pickup Cancelled';
            break;
        default:
            pickupLabel = 'Accepted';
    }

    return {
        donationStatus: status,
        pickupStatus: pickupStatus,
        primaryLabel,
        pickupLabel,
        badgeClass,
        isPickupCompleted: isPickupDone,
        isHandoverComplete: isCollected || isReceived,
        isReceivedByNgo: isReceived,
        isTerminal: ['completed', 'rejected', 'cancelled'].includes(status),
        canCancel: ['pending', 'accepted', 'pickup_scheduled'].includes(status)
    };
};

/**
 * Record an immutable audit entry
 */
export const recordAuditEntry = async ({
    donationId,
    action,
    fromStatus,
    toStatus,
    performedBy,
    performerRole,
    performedByModel = 'User',
    reason = '',
    notes = '',
    session = null
}) => {
    try {
        const opts = session ? { session } : {};
        const normalizedRole = ['user', 'donor', 'ngo', 'agent', 'admin', 'system'].includes(performerRole)
            ? performerRole
            : 'system';

        const finalNotes = notes || reason || `Status changed from ${fromStatus || 'none'} to ${toStatus}`;

        await DonationAudit.create(
            [
                {
                    donation: donationId,
                    action: action || toStatus,
                    fromStatus: fromStatus || '',
                    toStatus: toStatus || '',
                    performedBy: performedBy,
                    performedByModel: performedByModel,
                    performerRole: normalizedRole,
                    notes: finalNotes,
                    reason: reason || finalNotes
                }
            ],
            opts
        );
    } catch (auditErr) {
        console.error('DonationAudit logging error:', auditErr.message);
        // Audit log failures should not silently corrupt or crash primary business transaction,
        // but if within a session, bubble up to ensure consistency
        if (session) throw auditErr;
    }
};

/**
 * Send standard notification without revealing OTP
 */
export const dispatchLifecycleNotification = async ({
    donation,
    type,
    title,
    donorMessage,
    ngoMessage
}) => {
    try {
        const orderRef = donation._id ? donation._id.toString().slice(-6).toUpperCase() : '';
        const donorId = donation.donor?._id || donation.donor;
        const ngoUserId = donation.ngo?.user || (donation.ngo?._id ? null : null);

        if (donorId && donorMessage) {
            await Notification.create({
                recipient: donorId,
                type: type || 'general',
                title: title || 'Donation Status Update',
                message: donorMessage,
                relatedId: donation._id,
                relatedModel: 'Donation'
            });
        }

        if (ngoUserId && ngoMessage) {
            await Notification.create({
                recipient: ngoUserId,
                type: type || 'general',
                title: title || 'Donation Status Update',
                message: `Order #${orderRef}: ${ngoMessage}`,
                relatedId: donation._id,
                relatedModel: 'Donation'
            });
        }
    } catch (notifErr) {
        console.error('Lifecycle notification error:', notifErr.message);
    }
};

/**
 * Centralized Transition: Update Donation Status
 * Handles:
 * - Atomic validation of transition
 * - Atomic requirement shortage deduction / restoration
 * - Campaign receivedQuantity increment
 * - NGO completed count increment
 * - Synchronized pickupStatus updates
 * - Audit log creation
 * - Dispatch notifications
 */
export const transitionDonationStatus = async ({
    donationId,
    targetStatus,
    performedBy,
    performerRole,
    performedByModel = 'User',
    reason = '',
    notes = '',
    scheduledPickupDate = null,
    distributionNotes = '',
    evidenceImages = []
}) => {
    if (!DONATION_STATUSES.includes(targetStatus)) {
        throw new Error(`Invalid donation status '${targetStatus}'`);
    }

    return await runTransactionSafe(async (session, context) => {
        const opts = session ? { session } : {};

        const donation = await Donation.findById(donationId).session(session);
        if (!donation) {
            throw new Error('Donation not found');
        }

        const currentStatus = donation.status;
        const currentPickup = donation.pickupStatus || 'accepted';

        // Check valid transition
        if (!isValidDonationTransition(currentStatus, targetStatus)) {
            throw new Error(`Invalid status transition: cannot change donation from '${currentStatus}' to '${targetStatus}'.`);
        }

        const activeStates = ['accepted', 'pickup_scheduled', 'picked_up', 'received', 'distributed', 'completed'];
        const isOldActive = activeStates.includes(currentStatus);
        const isNewActive = activeStates.includes(targetStatus);

        // Case 1: First time entering active state (pending -> accepted)
        if (!isOldActive && isNewActive) {
            const updatedReq = await Requirement.findOneAndUpdate(
                {
                    _id: donation.requirement,
                    remainingQuantity: { $gte: donation.quantity }
                },
                {
                    $inc: { remainingQuantity: -donation.quantity }
                },
                { new: true, ...opts }
            );

            if (!updatedReq) {
                throw new Error(`Cannot accept donation: quantity (${donation.quantity}) exceeds remaining needed quantity.`);
            }

            if (updatedReq.remainingQuantity === 0) {
                await Requirement.findByIdAndUpdate(donation.requirement, { status: 'fulfilled' }, opts);
            }
        }
        // Case 2: Leaving active state back to rejected or cancelled
        else if (isOldActive && !isNewActive) {
            await Requirement.findByIdAndUpdate(
                donation.requirement,
                {
                    $inc: { remainingQuantity: donation.quantity },
                    $set: { status: 'active' }
                },
                opts
            );
        }

        // Derive synchronized pickupStatus
        const nextPickupStatus = derivePickupStatusFromDonationStatus(targetStatus, currentPickup);

        // Build atomic update payload
        const updateFields = {
            status: targetStatus,
            pickupStatus: nextPickupStatus
        };

        if (scheduledPickupDate) {
            updateFields.scheduledPickupDate = new Date(scheduledPickupDate);
        }
        if (distributionNotes) {
            updateFields.distributionNotes = distributionNotes.trim();
        }
        if (targetStatus === 'distributed') {
            updateFields.distributionDate = new Date();
        }
        if (targetStatus === 'picked_up' && !donation.pickupTimeline?.donationCollectedAt) {
            updateFields['pickupTimeline.donationCollectedAt'] = new Date();
        }
        if (targetStatus === 'received' && !donation.pickupTimeline?.completedAt) {
            updateFields['pickupTimeline.completedAt'] = new Date();
        }

        if (Array.isArray(evidenceImages) && evidenceImages.length > 0) {
            updateFields.evidenceImages = Array.from(new Set([...(donation.evidenceImages || []), ...evidenceImages]));
        }

        // Atomic conditional update preventing concurrent conflicting updates
        const updatedDonation = await Donation.findOneAndUpdate(
            {
                _id: donationId,
                status: currentStatus // Guard: ensures state hasn't changed concurrently
            },
            {
                $set: updateFields
            },
            { new: true, ...opts }
        )
            .populate('donor', 'name email phone city')
            .populate('ngo', 'ngoName user address city phone')
            .populate('assignedAgent')
            .populate('requirement', 'title category unit');

        if (!updatedDonation) {
            throw new Error(`Conflict: Donation status was modified concurrently by another process.`);
        }

        // If completed and tied to campaign
        if (targetStatus === 'completed' && updatedDonation.campaign) {
            const updatedCampaign = await Campaign.findByIdAndUpdate(
                updatedDonation.campaign,
                { $inc: { receivedQuantity: updatedDonation.quantity } },
                { new: true, ...opts }
            );
            if (updatedCampaign && updatedCampaign.receivedQuantity >= updatedCampaign.targetQuantity) {
                await Campaign.findByIdAndUpdate(updatedDonation.campaign, { status: 'completed' }, opts);
            }
        }

        // If completed or received, update NGO completed count
        if (targetStatus === 'completed') {
            await NGO.findByIdAndUpdate(updatedDonation.ngo?._id || updatedDonation.ngo, { $inc: { completedDonationsCount: 1 } }, opts);
        }

        // Record Audit Trail
        await recordAuditEntry({
            donationId: updatedDonation._id,
            action: targetStatus,
            fromStatus: currentStatus,
            toStatus: targetStatus,
            performedBy,
            performerRole,
            performedByModel,
            reason: reason || notes,
            notes: notes || reason,
            session
        });

        // Notifications
        const orderRef = updatedDonation._id.toString().slice(-6).toUpperCase();
        let notifDonor = `Your donation offer status has been updated to ${targetStatus.replace(/_/g, ' ')}.`;
        let notifNgo = `Donation status updated to ${targetStatus.replace(/_/g, ' ')}.`;

        if (targetStatus === 'accepted') {
            notifDonor = 'Your donation offer has been accepted by the NGO!';
            notifNgo = 'Donation accepted successfully.';
        } else if (targetStatus === 'picked_up') {
            notifDonor = 'Your donation has been collected successfully.';
            notifNgo = 'Donation parcel collected from donor.';
        } else if (targetStatus === 'received') {
            notifDonor = 'Your donation parcel has been received by the NGO.';
            notifNgo = 'Donation parcel verified and received at facility.';
        } else if (targetStatus === 'distributed') {
            notifDonor = 'Your donation items have been distributed to beneficiaries!';
            notifNgo = 'Donation items distributed.';
        } else if (targetStatus === 'completed') {
            notifDonor = 'Your donation process is fully completed. Thank you for your support!';
            notifNgo = 'Donation order successfully completed.';
        } else if (targetStatus === 'rejected') {
            notifDonor = 'Your donation offer could not be accepted at this time.';
        } else if (targetStatus === 'cancelled') {
            notifDonor = 'Your donation offer has been cancelled.';
            notifNgo = `Order #${orderRef} was cancelled.`;
        }

        const triggerSideEffects = async () => {
            await dispatchLifecycleNotification({
                donation: updatedDonation,
                type: targetStatus,
                title: `Donation ${targetStatus.toUpperCase().replace(/_/g, ' ')}`,
                donorMessage: notifDonor,
                ngoMessage: notifNgo
            });

            emitDonationPickupStatus({
                donationId: updatedDonation._id.toString(),
                pickupStatus: updatedDonation.pickupStatus,
                status: updatedDonation.status,
                timeline: updatedDonation.pickupTimeline,
                agentLocation: updatedDonation.agentLocation,
                assignedAgent: updatedDonation.assignedAgent,
                message: notifDonor
            });
        };

        if (context?.onCommit) {
            context.onCommit(triggerSideEffects);
        } else {
            await triggerSideEffects();
        }

        return updatedDonation;
    });
};

/**
 * Centralized Transition: Update Pickup Status
 * Handles:
 * - Atomic validation of pickup status transitions
 * - Monotonic progression check
 * - Timeline timestamp recording
 * - Synchronizing donation status (e.g. donation_collected -> picked_up)
 * - Atomic audit logging
 * - Privacy-preserving notifications
 */
export const transitionPickupStatus = async ({
    donationId,
    targetPickupStatus,
    performedBy,
    performerRole,
    performedByModel = 'User',
    reason = '',
    notes = '',
    locationData = null
}) => {
    if (!PICKUP_STATUSES.includes(targetPickupStatus)) {
        throw new Error(`Invalid pickup status '${targetPickupStatus}'`);
    }

    return await runTransactionSafe(async (session, context) => {
        const opts = session ? { session } : {};

        const donation = await Donation.findById(donationId).session(session);
        if (!donation) {
            throw new Error('Donation not found');
        }

        const currentPickup = donation.pickupStatus || 'accepted';
        const currentDonationStatus = donation.status;

        // Terminal check
        if (['completed', 'cancelled'].includes(currentPickup)) {
            throw new Error(`Cannot modify pickup status: pickup is already ${currentPickup}.`);
        }

        // Transition validity check
        if (!isValidPickupTransition(currentPickup, targetPickupStatus)) {
            throw new Error(`Invalid pickup transition from '${currentPickup}' to '${targetPickupStatus}'.`);
        }

        // Derive synchronized donation status
        const nextDonationStatus = deriveDonationStatusFromPickupStatus(targetPickupStatus, currentDonationStatus);

        const updateFields = {
            pickupStatus: targetPickupStatus,
            status: nextDonationStatus
        };

        // Timeline timestamps
        if (targetPickupStatus === 'agent_on_the_way' && !donation.pickupTimeline?.agentOnTheWayAt) {
            updateFields['pickupTimeline.agentOnTheWayAt'] = new Date();
        } else if (targetPickupStatus === 'agent_nearby' && !donation.pickupTimeline?.agentNearbyAt) {
            updateFields['pickupTimeline.agentNearbyAt'] = new Date();
        } else if (targetPickupStatus === 'agent_arrived' && !donation.pickupTimeline?.agentArrivedAt) {
            updateFields['pickupTimeline.agentArrivedAt'] = new Date();
        } else if (targetPickupStatus === 'donation_collected' && !donation.pickupTimeline?.donationCollectedAt) {
            updateFields['pickupTimeline.donationCollectedAt'] = new Date();
            updateFields.isVerificationCodeUsed = true;
        } else if (targetPickupStatus === 'completed' && !donation.pickupTimeline?.completedAt) {
            updateFields['pickupTimeline.completedAt'] = new Date();
        }

        if (locationData) {
            updateFields.agentLocation = {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: locationData.accuracy || null,
                heading: locationData.heading || null,
                speed: locationData.speed || null,
                updatedAt: new Date()
            };
        }

        // Atomic conditional update
        const updatedDonation = await Donation.findOneAndUpdate(
            {
                _id: donationId,
                pickupStatus: currentPickup // Guard against race conditions
            },
            {
                $set: updateFields
            },
            { new: true, ...opts }
        )
            .populate('donor', 'name email phone city')
            .populate('ngo', 'ngoName user address city phone')
            .populate('assignedAgent');

        if (!updatedDonation) {
            throw new Error(`Conflict: Pickup status was modified concurrently by another process.`);
        }

        // Audit Trail
        await recordAuditEntry({
            donationId: updatedDonation._id,
            action: targetPickupStatus,
            fromStatus: currentPickup,
            toStatus: targetPickupStatus,
            performedBy,
            performerRole,
            performedByModel,
            reason: reason || notes,
            notes: notes || reason,
            session
        });

        // Notifications
        const triggerPickupSideEffects = async () => {
            const notifConfig = PICKUP_NOTIFICATION_MESSAGES[targetPickupStatus];
            if (notifConfig) {
                await dispatchLifecycleNotification({
                    donation: updatedDonation,
                    type: targetPickupStatus,
                    title: notifConfig.title,
                    donorMessage: notifConfig.donorMessage,
                    ngoMessage: notifConfig.ngoMessage
                });
            }

            emitDonationPickupStatus({
                donationId: updatedDonation._id.toString(),
                pickupStatus: targetPickupStatus,
                status: updatedDonation.status,
                timeline: updatedDonation.pickupTimeline,
                agentLocation: updatedDonation.agentLocation,
                assignedAgent: updatedDonation.assignedAgent,
                message: notifConfig?.donorMessage
            });
        };

        if (context?.onCommit) {
            context.onCommit(triggerPickupSideEffects);
        } else {
            await triggerPickupSideEffects();
        }

        return updatedDonation;
    });
};

/**
 * Atomic Collection Confirmation (Agent side with Donor OTP)
 * Prevents simultaneous collection confirmations or OTP reuse.
 */
export const confirmCollectionWithOtp = async ({
    donationId,
    agentId,
    verificationCode,
    notes = '',
    evidenceImages = []
}) => {
    return await runTransactionSafe(async (session, context) => {
        const opts = session ? { session } : {};

        const donation = await Donation.findById(donationId).session(session);
        if (!donation) {
            throw new Error('Donation not found');
        }

        // Check assigned agent
        const assignedId = donation.assignedAgent?._id || donation.assignedAgent;
        if (!assignedId || assignedId.toString() !== agentId.toString()) {
            throw new Error('Not authorized: You are not the assigned pickup agent for this donation.');
        }

        // Check if already completed or cancelled
        if (donation.status === 'completed' || donation.pickupStatus === 'completed') {
            throw new Error('This donation pickup has already been completed.');
        }
        if (donation.status === 'cancelled' || donation.pickupStatus === 'cancelled') {
            throw new Error('This donation pickup has been cancelled.');
        }

        // Check if OTP was already used or collection already confirmed
        if (donation.isVerificationCodeUsed || donation.pickupStatus === 'donation_collected' || donation.status === 'picked_up') {
            throw new Error('Donation collection has already been confirmed or verification OTP has already been verified.');
        }

        // Check if OTP has expired
        if (donation.verificationCodeExpiresAt && new Date() > new Date(donation.verificationCodeExpiresAt)) {
            throw new Error('Verification OTP has expired. Please ask the donor for a fresh code.');
        }

        // Check verification code
        const cleanedEntered = String(verificationCode || '').trim().toUpperCase();
        const expectedCode = String(donation.verificationCode || '').trim().toUpperCase();
        if (!cleanedEntered || cleanedEntered !== expectedCode) {
            throw new Error('Invalid verification code provided. Please check the code with the donor.');
        }

        // Validate transition
        if (!isValidPickupTransition(donation.pickupStatus, 'donation_collected')) {
            throw new Error(`Cannot confirm collection from current status '${donation.pickupStatus}'.`);
        }

        const oldPickupStatus = donation.pickupStatus;
        const oldStatus = donation.status;

        // Atomic conditional update ensuring isVerificationCodeUsed is false
        const updatedDonation = await Donation.findOneAndUpdate(
            {
                _id: donationId,
                assignedAgent: agentId,
                isVerificationCodeUsed: false, // Guard against two simultaneous confirmations
                pickupStatus: { $ne: 'donation_collected' },
                status: { $in: ['accepted', 'pickup_scheduled'] }
            },
            {
                $set: {
                    pickupStatus: 'donation_collected',
                    status: 'picked_up',
                    isVerificationCodeUsed: true,
                    verificationCodeVerifiedAt: new Date(),
                    'pickupTimeline.donationCollectedAt': new Date(),
                    ...(Array.isArray(evidenceImages) && evidenceImages.length > 0
                        ? { evidenceImages: Array.from(new Set([...(donation.evidenceImages || []), ...evidenceImages])) }
                        : {})
                }
            },
            { new: true, ...opts }
        )
            .populate('donor', 'name email phone')
            .populate('ngo', 'ngoName user address city phone')
            .populate('assignedAgent');

        if (!updatedDonation) {
            throw new Error('Conflict: Donation collection was already confirmed concurrently.');
        }

        // Audit Trail
        await recordAuditEntry({
            donationId: updatedDonation._id,
            action: 'donation_collected',
            fromStatus: oldPickupStatus,
            toStatus: 'donation_collected',
            performedBy: agentId,
            performerRole: 'agent',
            performedByModel: 'PickupAgent',
            reason: notes || 'Donation collected by assigned agent with valid donor OTP.',
            notes: notes || 'Collection confirmed with OTP',
            session
        });

        // Notifications
        const notifConfig = PICKUP_NOTIFICATION_MESSAGES.donation_collected;
        const triggerCollectionSideEffects = async () => {
            const notifConfig = PICKUP_NOTIFICATION_MESSAGES.donation_collected;
            await dispatchLifecycleNotification({
                donation: updatedDonation,
                type: 'donation_collected',
                title: notifConfig.title,
                donorMessage: notifConfig.donorMessage,
                ngoMessage: notifConfig.ngoMessage
            });

            emitDonationPickupStatus({
                donationId: updatedDonation._id.toString(),
                pickupStatus: 'donation_collected',
                status: 'picked_up',
                timeline: updatedDonation.pickupTimeline,
                agentLocation: updatedDonation.agentLocation,
                assignedAgent: updatedDonation.assignedAgent,
                message: notifConfig?.donorMessage
            });
        };

        if (context?.onCommit) {
            context.onCommit(triggerCollectionSideEffects);
        } else {
            await triggerCollectionSideEffects();
        }

        return updatedDonation;
    });
};

/**
 * Atomic Parcel Receipt / Delivery Confirmation (NGO side)
 * Transitions pickupStatus to 'completed' and status to 'received'.
 * Guarantees that "Pickup Completed" is only set after NGO confirms receipt!
 */
export const confirmDeliveryAtNgo = async ({
    donationId,
    ngoId,
    userId,
    userRole,
    verificationCode = null,
    notes = ''
}) => {
    return await runTransactionSafe(async (session, context) => {
        const opts = session ? { session } : {};

        const donation = await Donation.findById(donationId).session(session);
        if (!donation) {
            throw new Error('Donation not found');
        }

        // Authority check
        const donationNgoId = donation.ngo?._id || donation.ngo;
        if (userRole !== 'admin' && (!ngoId || donationNgoId.toString() !== ngoId.toString())) {
            throw new Error('Not authorized: This donation order belongs to a different NGO.');
        }

        // Already completed check
        if (donation.pickupStatus === 'completed' && donation.status === 'completed') {
            return donation;
        }

        // Transition validity check
        if (!isValidPickupTransition(donation.pickupStatus, 'completed')) {
            throw new Error(`Cannot complete pickup from current status '${donation.pickupStatus}'. Must be in 'donation_collected'.`);
        }

        if (verificationCode && verificationCode.trim().toUpperCase() !== donation.verificationCode) {
            throw new Error('Invalid handover verification code provided.');
        }

        const oldPickupStatus = donation.pickupStatus;
        const oldStatus = donation.status;

        // Atomic conditional update
        const updatedDonation = await Donation.findOneAndUpdate(
            {
                _id: donationId,
                pickupStatus: 'donation_collected' // Guard: requires pickup to have been collected first
            },
            {
                $set: {
                    pickupStatus: 'completed',
                    status: 'received',
                    'pickupTimeline.completedAt': new Date()
                }
            },
            { new: true, ...opts }
        )
            .populate('donor', 'name email phone')
            .populate('ngo', 'ngoName user address city phone')
            .populate('assignedAgent')
            .populate('requirement', 'title category unit');

        if (!updatedDonation) {
            throw new Error('Conflict: Parcel delivery was already verified or donation status changed concurrently.');
        }

        // Update campaign if exists
        if (updatedDonation.campaign) {
            const updatedCampaign = await Campaign.findByIdAndUpdate(
                updatedDonation.campaign,
                { $inc: { receivedQuantity: updatedDonation.quantity } },
                { new: true, ...opts }
            );
            if (updatedCampaign && updatedCampaign.receivedQuantity >= updatedCampaign.targetQuantity) {
                await Campaign.findByIdAndUpdate(updatedDonation.campaign, { status: 'completed' }, opts);
            }
        }

        // Increment NGO completed count
        await NGO.findByIdAndUpdate(donationNgoId, { $inc: { completedDonationsCount: 1 } }, opts);

        // Audit Trail
        await recordAuditEntry({
            donationId: updatedDonation._id,
            action: 'completed',
            fromStatus: oldPickupStatus,
            toStatus: 'completed',
            performedBy: userId,
            performerRole: userRole === 'admin' ? 'admin' : 'ngo',
            performedByModel: 'User',
            reason: notes || 'Donation parcel received and verified at NGO collection centre.',
            notes: notes || 'Delivery confirmed at facility',
            session
        });

        // Notification
        const triggerDeliverySideEffects = async () => {
            const notifConfig = PICKUP_NOTIFICATION_MESSAGES.completed;
            await dispatchLifecycleNotification({
                donation: updatedDonation,
                type: 'completed',
                title: notifConfig.title,
                donorMessage: notifConfig.donorMessage,
                ngoMessage: notifConfig.ngoMessage
            });

            emitDonationPickupStatus({
                donationId: updatedDonation._id.toString(),
                pickupStatus: 'completed',
                status: 'received',
                timeline: updatedDonation.pickupTimeline,
                agentLocation: updatedDonation.agentLocation,
                assignedAgent: updatedDonation.assignedAgent,
                message: notifConfig?.donorMessage
            });
        };

        if (context?.onCommit) {
            context.onCommit(triggerDeliverySideEffects);
        } else {
            await triggerDeliverySideEffects();
        }

        return updatedDonation;
    });
};

/**
 * Atomic Cancellation Workflow
 * Prohibits cancellation once parcel is picked up, received, or completed.
 */
export const cancelDonationOffer = async ({
    donationId,
    userId,
    userRole,
    reason = ''
}) => {
    return await runTransactionSafe(async (session, context) => {
        const opts = session ? { session } : {};

        const donation = await Donation.findById(donationId).session(session);
        if (!donation) {
            throw new Error('Donation not found');
        }

        const oldStatus = donation.status;
        const oldPickup = donation.pickupStatus;

        // Authorization check
        const isDonor = donation.donor?.toString() === userId.toString();
        const isNgo = donation.ngo?.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isDonor && !isNgo && !isAdmin) {
            throw new Error('Not authorized to cancel this donation');
        }

        // Prohibition check: cannot cancel once in picked_up, received, distributed, completed
        if (['picked_up', 'received', 'distributed', 'completed'].includes(oldStatus)) {
            throw new Error(`Cannot cancel a donation that is already ${oldStatus.replace('_', ' ')}`);
        }

        if (['rejected', 'cancelled'].includes(oldStatus)) {
            throw new Error(`Donation is already ${oldStatus}`);
        }

        // Restore requirement quantity if donation was active
        const activeStates = ['accepted', 'pickup_scheduled'];
        if (activeStates.includes(oldStatus)) {
            await Requirement.findByIdAndUpdate(
                donation.requirement,
                {
                    $inc: { remainingQuantity: donation.quantity },
                    $set: { status: 'active' }
                },
                opts
            );
        }

        // Atomic conditional update
        const updatedDonation = await Donation.findOneAndUpdate(
            {
                _id: donationId,
                status: { $in: ['pending', 'accepted', 'pickup_scheduled'] } // Guard: cannot cancel if concurrent pickup happened
            },
            {
                $set: {
                    status: 'cancelled',
                    pickupStatus: 'cancelled'
                }
            },
            { new: true, ...opts }
        )
            .populate('donor', 'name email phone')
            .populate('ngo', 'ngoName user');

        if (!updatedDonation) {
            throw new Error('Conflict: Donation could not be cancelled because its status was modified concurrently.');
        }

        // Audit Trail
        await recordAuditEntry({
            donationId: updatedDonation._id,
            action: 'cancelled',
            fromStatus: oldStatus,
            toStatus: 'cancelled',
            performedBy: userId,
            performerRole: isDonor ? 'donor' : (isAdmin ? 'admin' : 'ngo'),
            performedByModel: 'User',
            reason: reason || 'Donation cancelled before collection',
            notes: reason || 'Donation cancelled',
            session
        });

        // Notifications
        const triggerCancelSideEffects = async () => {
            const orderRef = updatedDonation._id.toString().slice(-6).toUpperCase();
            await dispatchLifecycleNotification({
                donation: updatedDonation,
                type: 'cancelled',
                title: 'Donation Cancelled',
                donorMessage: `Donation #${orderRef} has been cancelled.`,
                ngoMessage: `Donation #${orderRef} was cancelled.`
            });
        };

        if (context?.onCommit) {
            context.onCommit(triggerCancelSideEffects);
        } else {
            await triggerCancelSideEffects();
        }

        return updatedDonation;
    });
};
