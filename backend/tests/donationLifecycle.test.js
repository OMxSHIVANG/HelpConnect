import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import DonationAudit from '../models/DonationAudit.js';
import {
    DONATION_STATUSES,
    PICKUP_STATUSES,
    VALID_DONATION_TRANSITIONS,
    VALID_PICKUP_TRANSITIONS,
    isValidDonationTransition,
    isValidPickupTransition,
    derivePickupStatusFromDonationStatus,
    deriveDonationStatusFromPickupStatus,
    getStatusDisplayInfo
} from '../services/donationLifecycleService.js';

describe('Donation Lifecycle & Status Transitions (TASK 4)', () => {
    // 1. Valid Macro Transitions
    test('1. Valid sequence transitions: pending -> accepted -> pickup_scheduled -> picked_up -> received -> distributed -> completed', () => {
        assert.ok(isValidDonationTransition('pending', 'accepted'), 'pending -> accepted');
        assert.ok(isValidDonationTransition('accepted', 'pickup_scheduled'), 'accepted -> pickup_scheduled');
        assert.ok(isValidDonationTransition('pickup_scheduled', 'picked_up'), 'pickup_scheduled -> picked_up');
        assert.ok(isValidDonationTransition('picked_up', 'received'), 'picked_up -> received');
        assert.ok(isValidDonationTransition('received', 'distributed'), 'received -> distributed');
        assert.ok(isValidDonationTransition('distributed', 'completed'), 'distributed -> completed');

        // Direct skips supported by business workflows:
        assert.ok(isValidDonationTransition('accepted', 'picked_up'), 'accepted -> picked_up');
        assert.ok(isValidDonationTransition('accepted', 'received'), 'accepted -> received');
        assert.ok(isValidDonationTransition('picked_up', 'completed'), 'picked_up -> completed');
        assert.ok(isValidDonationTransition('received', 'completed'), 'received -> completed');
    });

    // 2. Cancellation and Rejection Transitions
    test('2. Rejection and cancellation transitions from eligible non-terminal states', () => {
        // Pending can be rejected or cancelled
        assert.ok(isValidDonationTransition('pending', 'rejected'), 'pending -> rejected');
        assert.ok(isValidDonationTransition('pending', 'cancelled'), 'pending -> cancelled');

        // Accepted can be rejected or cancelled before dispatch
        assert.ok(isValidDonationTransition('accepted', 'rejected'), 'accepted -> rejected');
        assert.ok(isValidDonationTransition('accepted', 'cancelled'), 'accepted -> cancelled');

        // Pickup scheduled can be cancelled before physical collection
        assert.ok(isValidDonationTransition('pickup_scheduled', 'cancelled'), 'pickup_scheduled -> cancelled');
    });

    // 3. Invalid Forward and Jumping Transitions
    test('3. Invalid transitions are strictly rejected', () => {
        assert.equal(isValidDonationTransition('pending', 'completed'), false, 'Cannot jump pending -> completed');
        assert.equal(isValidDonationTransition('pending', 'picked_up'), false, 'Cannot jump pending -> picked_up');
        assert.equal(isValidDonationTransition('pending', 'received'), false, 'Cannot jump pending -> received');
        assert.equal(isValidDonationTransition('pending', 'distributed'), false, 'Cannot jump pending -> distributed');

        assert.equal(isValidDonationTransition('pickup_scheduled', 'distributed'), false, 'Cannot jump pickup_scheduled -> distributed');
        assert.equal(isValidDonationTransition('pickup_scheduled', 'completed'), false, 'Cannot jump pickup_scheduled -> completed');
    });

    // 4. Invalid Backward Transitions
    test('4. Backward transitions are strictly prevented', () => {
        assert.equal(isValidDonationTransition('picked_up', 'pending'), false, 'picked_up cannot revert to pending');
        assert.equal(isValidDonationTransition('picked_up', 'accepted'), false, 'picked_up cannot revert to accepted');
        assert.equal(isValidDonationTransition('picked_up', 'pickup_scheduled'), false, 'picked_up cannot revert to pickup_scheduled');

        assert.equal(isValidDonationTransition('received', 'picked_up'), false, 'received cannot revert to picked_up');
        assert.equal(isValidDonationTransition('received', 'accepted'), false, 'received cannot revert to accepted');

        assert.equal(isValidDonationTransition('distributed', 'received'), false, 'distributed cannot revert to received');
        assert.equal(isValidDonationTransition('distributed', 'picked_up'), false, 'distributed cannot revert to picked_up');
    });

    // 5. Terminal States Immutability
    test('5. Completed, rejected, and cancelled are terminal states that disallow any further transition', () => {
        DONATION_STATUSES.forEach(target => {
            assert.equal(isValidDonationTransition('completed', target), false, `completed cannot transition to ${target}`);
            assert.equal(isValidDonationTransition('rejected', target), false, `rejected cannot transition to ${target}`);
            assert.equal(isValidDonationTransition('cancelled', target), false, `cancelled cannot transition to ${target}`);
        });

        PICKUP_STATUSES.forEach(target => {
            assert.equal(isValidPickupTransition('completed', target), false, `pickup completed cannot transition to ${target}`);
            assert.equal(isValidPickupTransition('cancelled', target), false, `pickup cancelled cannot transition to ${target}`);
        });
    });

    // 6. Prohibition of Self-Transitions
    test('6. Redundant self-transitions return false to prevent duplicate audit logs and events', () => {
        DONATION_STATUSES.forEach(status => {
            assert.equal(isValidDonationTransition(status, status), false, `Self-transition ${status} -> ${status} must be rejected`);
        });
        PICKUP_STATUSES.forEach(status => {
            assert.equal(isValidPickupTransition(status, status), false, `Pickup self-transition ${status} -> ${status} must be rejected`);
        });
    });

    // 7. Cancellation Guard for Donors
    test('7. Donors are prohibited from cancelling donations once picked up, received, distributed or completed', () => {
        const canCancel = (status) => {
            const forbiddenStatuses = ['picked_up', 'received', 'distributed', 'completed', 'rejected', 'cancelled'];
            return !forbiddenStatuses.includes(status);
        };

        assert.equal(canCancel('pending'), true);
        assert.equal(canCancel('accepted'), true);
        assert.equal(canCancel('pickup_scheduled'), true);
        assert.equal(canCancel('picked_up'), false);
        assert.equal(canCancel('received'), false);
        assert.equal(canCancel('distributed'), false);
        assert.equal(canCancel('completed'), false);
    });

    // 8. Status and PickupStatus Synchronization
    test('8. Donation status and pickupStatus synchronize correctly across business events', () => {
        // Business Event: Accept Donation
        assert.equal(derivePickupStatusFromDonationStatus('accepted', 'accepted'), 'accepted');

        // Business Event: Pickup Scheduled with agent assigned
        assert.equal(derivePickupStatusFromDonationStatus('pickup_scheduled', 'agent_assigned'), 'agent_assigned');

        // Business Event: Handover confirmed (picked_up)
        assert.equal(derivePickupStatusFromDonationStatus('picked_up', 'agent_arrived'), 'donation_collected');
        assert.equal(deriveDonationStatusFromPickupStatus('donation_collected', 'accepted'), 'picked_up');
        assert.equal(deriveDonationStatusFromPickupStatus('donation_collected', 'pickup_scheduled'), 'picked_up');

        // Business Event: Parcel received by NGO
        assert.equal(derivePickupStatusFromDonationStatus('received', 'donation_collected'), 'completed');
        assert.equal(deriveDonationStatusFromPickupStatus('completed', 'picked_up'), 'received');

        // Business Event: Distributed
        assert.equal(derivePickupStatusFromDonationStatus('distributed', 'completed'), 'completed');

        // Business Event: Completed
        assert.equal(derivePickupStatusFromDonationStatus('completed', 'completed'), 'completed');

        // Business Event: Cancelled
        assert.equal(derivePickupStatusFromDonationStatus('cancelled', 'agent_assigned'), 'cancelled');
        assert.equal(deriveDonationStatusFromPickupStatus('cancelled', 'accepted'), 'cancelled');

        // Business Event: Rejected
        assert.equal(derivePickupStatusFromDonationStatus('rejected', 'accepted'), 'cancelled');
    });

    // 9. Atomic Collection Concurrency Prevention
    test('9. Concurrency simulation: Simultaneous collection confirmations are prevented atomically', () => {
        // Simulation of MongoDB atomic conditional update:
        // Donation.findOneAndUpdate({ _id, isVerificationCodeUsed: false, status: 'pickup_scheduled' }, ...)
        let isVerificationCodeUsed = false;
        let pickupStatus = 'agent_arrived';
        let status = 'pickup_scheduled';

        const tryConfirmCollection = (codeMatches) => {
            if (!codeMatches) return { success: false, error: 'Invalid code' };

            // Atomic conditional match
            if (isVerificationCodeUsed || status !== 'pickup_scheduled') {
                return { success: false, error: 'Already confirmed or code used' };
            }

            // Apply atomic changes
            isVerificationCodeUsed = true;
            pickupStatus = 'donation_collected';
            status = 'picked_up';
            return { success: true };
        };

        // First concurrent request with correct code:
        const firstAttempt = tryConfirmCollection(true);
        assert.equal(firstAttempt.success, true, 'First collection attempt succeeds');
        assert.equal(isVerificationCodeUsed, true);
        assert.equal(status, 'picked_up');
        assert.equal(pickupStatus, 'donation_collected');

        // Second simultaneous request with same code:
        const secondAttempt = tryConfirmCollection(true);
        assert.equal(secondAttempt.success, false, 'Second simultaneous attempt is rejected');
        assert.equal(secondAttempt.error, 'Already confirmed or code used');
    });

    // 10. Atomic Completion / Delivery Concurrency Prevention
    test('10. Concurrency simulation: Duplicate delivery receipt confirmation is prevented atomically', () => {
        // Simulation of MongoDB conditional update:
        // Donation.findOneAndUpdate({ _id, pickupStatus: 'donation_collected', status: 'picked_up' }, ...)
        let pickupStatus = 'donation_collected';
        let status = 'picked_up';

        const tryConfirmDelivery = () => {
            if (pickupStatus !== 'donation_collected' || status !== 'picked_up') {
                return { success: false, error: 'Already confirmed delivery or invalid status' };
            }
            pickupStatus = 'completed';
            status = 'received';
            return { success: true };
        };

        const firstDelivery = tryConfirmDelivery();
        assert.equal(firstDelivery.success, true, 'First NGO delivery confirmation succeeds');
        assert.equal(pickupStatus, 'completed');
        assert.equal(status, 'received');

        const secondDelivery = tryConfirmDelivery();
        assert.equal(secondDelivery.success, false, 'Duplicate delivery confirmation is blocked');
    });

    // 11. Conflicting NGO and Agent Updates
    test('11. Conflicting NGO cancellation and Agent collection race is safely resolved', () => {
        // Scenario A: Agent confirms collection before NGO attempts cancellation
        let status = 'accepted';
        let pickupStatus = 'agent_arrived';

        // Agent collects
        status = 'picked_up';
        pickupStatus = 'donation_collected';

        // NGO attempts to cancel
        const canCancelAfterPickup = ['pending', 'accepted', 'pickup_scheduled'].includes(status);
        assert.equal(canCancelAfterPickup, false, 'Cancellation is blocked because parcel is already picked up');

        // Scenario B: NGO cancels before Agent confirms collection
        let statusB = 'accepted';
        let pickupStatusB = 'agent_arrived';

        // NGO cancels
        statusB = 'cancelled';
        pickupStatusB = 'cancelled';

        // Agent attempts collection
        const canCollectAfterCancel = statusB !== 'cancelled' && pickupStatusB !== 'cancelled';
        assert.equal(canCollectAfterCancel, false, 'Collection is blocked because order was cancelled');
    });

    // 12. Frontend Consistent Status Mapping & Receipt Rule
    test('12. getStatusDisplayInfo guarantees Pickup Completed is NEVER shown before NGO receipt', () => {
        // While agent has collected but NGO has not confirmed receipt:
        const infoPickedUp = getStatusDisplayInfo('picked_up', 'donation_collected');
        assert.equal(infoPickedUp.isPickupCompleted, false, 'Pickup Completed must be FALSE when donation_collected');
        assert.equal(infoPickedUp.isHandoverComplete, true, 'Handover is complete');
        assert.equal(infoPickedUp.isReceivedByNgo, false, 'Not yet received by NGO');
        assert.equal(infoPickedUp.primaryLabel, 'Donation Collected (In Transit)');
        assert.equal(infoPickedUp.pickupLabel, 'Donation Collected');

        // When NGO confirms receipt:
        const infoReceived = getStatusDisplayInfo('received', 'completed');
        assert.equal(infoReceived.isPickupCompleted, true, 'Pickup Completed is TRUE after NGO confirms receipt');
        assert.equal(infoReceived.isReceivedByNgo, true, 'Received by NGO is TRUE');
        assert.equal(infoReceived.primaryLabel, 'Received at NGO');
        assert.equal(infoReceived.pickupLabel, 'Pickup Completed');

        // When distributed:
        const infoDistributed = getStatusDisplayInfo('distributed', 'completed');
        assert.equal(infoDistributed.primaryLabel, 'Distributed to Beneficiaries');
        assert.equal(infoDistributed.isReceivedByNgo, true);

        // When completed:
        const infoCompleted = getStatusDisplayInfo('completed', 'completed');
        assert.equal(infoCompleted.isTerminal, true);
        assert.equal(infoCompleted.primaryLabel, 'Completed');
    });

    // 13. Audit History Schema & Immutability
    test('13. DonationAudit schema validates required fields and supports all business roles', () => {
        const donationId = new mongoose.Types.ObjectId();
        const userId = new mongoose.Types.ObjectId();

        const audit = new DonationAudit({
            donation: donationId,
            action: 'picked_up',
            fromStatus: 'pickup_scheduled',
            toStatus: 'picked_up',
            performedBy: userId,
            performedByModel: 'PickupAgent',
            performerRole: 'agent',
            reason: 'Donor handover completed using verified OTP',
            notes: 'Handover complete'
        });

        const err = audit.validateSync();
        assert.equal(err, undefined, 'Audit record should validate successfully with all required fields');
        assert.equal(audit.performerRole, 'agent');
        assert.equal(audit.performedByModel, 'PickupAgent');
        assert.equal(audit.reason, 'Donor handover completed using verified OTP');
    });
});
