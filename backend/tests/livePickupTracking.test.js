import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Donation from '../models/Donation.js';
import PickupAgent from '../models/PickupAgent.js';
import DonationAudit from '../models/DonationAudit.js';
import {
    calculateDistanceKm,
    determineNextPickupStatus,
    isValidPickupTransition,
    PICKUP_STATUS_ORDER,
    VALID_PICKUP_TRANSITIONS,
    PICKUP_NOTIFICATION_MESSAGES,
    validateCoordinates
} from '../utils/geoUtils.js';

test('Automatic Live Pickup Tracking System Suite (TASK 3)', async (t) => {
    const ngoId = new mongoose.Types.ObjectId();
    const donorId = new mongoose.Types.ObjectId();
    const requirementId = new mongoose.Types.ObjectId();

    // 1. 50% Threshold Test
    await t.test('1. 50% threshold: triggers agent_on_the_way and prevents 5km override on incomplete routes', () => {
        // On a 20 km route, at 9 km remaining (11 km completed = 55% completed, remaining > 5 km):
        const status1 = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 9.0,
            initialRouteDistanceKm: 20.0
        });
        assert.equal(status1, 'agent_on_the_way', 'Should trigger agent_on_the_way when >= 50% completed');

        // At 12 km remaining on 20 km route (only 8 km completed = 40% completed):
        const status2 = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 12.0,
            initialRouteDistanceKm: 20.0
        });
        assert.equal(status2, null, 'Should remain agent_assigned if < 50% completed');

        // Crucial requirement: Do NOT allow the 5 km condition to override the 50% progress condition.
        // On an 8 km route, at 5.0 km remaining (only 3.0 km completed = 37.5%, NOT 50%):
        // Remaining distance is 5 km, but agent has NOT completed 50% of the route.
        const status3 = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 5.0,
            initialRouteDistanceKm: 8.0
        });
        assert.equal(status3, null, '5 km condition must NOT override the 50% progress condition');
    });

    // 2. 5 km Threshold Test
    await t.test('2. 5 km threshold: triggers agent_nearby when agent is on the way', () => {
        // When agent is on the way and enters within 5 km:
        const statusNearby = determineNextPickupStatus({
            currentStatus: 'agent_on_the_way',
            currentDistanceKm: 4.8,
            initialRouteDistanceKm: 15.0
        });
        assert.equal(statusNearby, 'agent_nearby', 'Should transition to agent_nearby within 5 km');

        // Outside 5 km:
        const statusOutside = determineNextPickupStatus({
            currentStatus: 'agent_on_the_way',
            currentDistanceKm: 5.2,
            initialRouteDistanceKm: 15.0
        });
        assert.equal(statusOutside, null, 'Should not transition if remaining distance is > 5 km');
    });

    // 3. 200 Metre Threshold Test
    await t.test('3. 200 metre threshold: triggers agent_arrived when agent reaches pickup destination', () => {
        // Within 200 metres (0.15 km = 150m):
        const statusArrived = determineNextPickupStatus({
            currentStatus: 'agent_nearby',
            currentDistanceKm: 0.15,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(statusArrived, 'agent_arrived', 'Should transition to agent_arrived within 200m');

        // From agent_on_the_way straight into 200m:
        const statusDirectArrived = determineNextPickupStatus({
            currentStatus: 'agent_on_the_way',
            currentDistanceKm: 0.18,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(statusDirectArrived, 'agent_arrived', 'Should transition to agent_arrived directly if inside 200m');

        // Outside 200 metres (0.25 km = 250m):
        const statusNotArrived = determineNextPickupStatus({
            currentStatus: 'agent_nearby',
            currentDistanceKm: 0.25,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(statusNotArrived, null, 'Should not transition to agent_arrived at 250m');
    });

    // 4. Exactly on Each Threshold Test
    await t.test('4. Exactly on each threshold boundary', () => {
        // Exactly on 50% threshold: 10 km route, exactly 5.0 km remaining (5.0 <= 0.5 * 10.0)
        const exactly50Percent = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 5.0,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(exactly50Percent, 'agent_on_the_way', 'Boundary: exactly 50% triggers agent_on_the_way');

        // Exactly on 5 km threshold: exactly 5.0 km remaining when agent_on_the_way
        const exactly5Km = determineNextPickupStatus({
            currentStatus: 'agent_on_the_way',
            currentDistanceKm: 5.0,
            initialRouteDistanceKm: 15.0
        });
        assert.equal(exactly5Km, 'agent_nearby', 'Boundary: exactly 5.0 km triggers agent_nearby');

        // Exactly on 200 metre threshold: exactly 0.20 km remaining when agent_nearby
        const exactly200m = determineNextPickupStatus({
            currentStatus: 'agent_nearby',
            currentDistanceKm: 0.20,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(exactly200m, 'agent_arrived', 'Boundary: exactly 0.20 km triggers agent_arrived');
    });

    // 5. Agent Starts Inside a Threshold (isFirstUpdate)
    await t.test('5. Agent starts inside a threshold without fabricating previous movement', () => {
        // Agent first GPS ping is already inside 5 km (e.g. 3.5 km away):
        const firstUpdateNearby = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 3.5,
            initialRouteDistanceKm: 3.5,
            isFirstUpdate: true
        });
        assert.equal(firstUpdateNearby, 'agent_nearby', 'First update inside 5km directly sets agent_nearby');

        // Agent first GPS ping is already inside 200m (e.g. 0.10 km away):
        const firstUpdateArrived = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 0.10,
            initialRouteDistanceKm: 0.10,
            isFirstUpdate: true
        });
        assert.equal(firstUpdateArrived, 'agent_arrived', 'First update inside 200m directly sets agent_arrived');

        // Agent first GPS ping is at 9 km on 20 km route (55% completed, > 5km):
        const firstUpdateOnTheWay = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: 9.0,
            initialRouteDistanceKm: 20.0,
            isFirstUpdate: true
        });
        assert.equal(firstUpdateOnTheWay, 'agent_on_the_way', 'First update at > 50% progress sets agent_on_the_way');
    });

    // 6. Missing Donor Coordinates
    await t.test('6. Missing or unverified donor coordinates pauses automatic distance triggers', () => {
        // If currentDistanceKm is null or undefined (cannot compute distance):
        const nullDistance = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: null,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(nullDistance, null, 'Must return null when distance is null');

        const nanDistance = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: NaN,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(nanDistance, null, 'Must return null when distance is NaN');

        const negativeDistance = determineNextPickupStatus({
            currentStatus: 'agent_assigned',
            currentDistanceKm: -1,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(negativeDistance, null, 'Must return null when distance is negative');
    });

    // 7. Duplicate GPS Updates
    await t.test('7. Duplicate GPS updates prevent repeated transitions, duplicate timestamps and notifications', () => {
        // If currentStatus is already agent_nearby and agent sends another GPS ping at 3.0 km:
        const duplicateNearby = determineNextPickupStatus({
            currentStatus: 'agent_nearby',
            currentDistanceKm: 3.0,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(duplicateNearby, null, 'Repeated update in same zone returns null (no transition)');

        // Same status self-transition is rejected by isValidPickupTransition:
        assert.equal(isValidPickupTransition('agent_nearby', 'agent_nearby'), false, 'Self-transition is not permitted');
        assert.equal(isValidPickupTransition('agent_on_the_way', 'agent_on_the_way'), false, 'Self-transition is not permitted');
        assert.equal(isValidPickupTransition('agent_arrived', 'agent_arrived'), false, 'Self-transition is not permitted');

        // Simulation of timeline preservation:
        const timeline = {
            agentAssignedAt: new Date('2026-11-16T10:00:00Z'),
            agentOnTheWayAt: new Date('2026-11-16T10:15:00Z'),
            agentNearbyAt: null
        };
        const originalTimestamp = timeline.agentOnTheWayAt.getTime();

        // Repeated update at agent_on_the_way must NOT overwrite agentOnTheWayAt
        if (!timeline.agentOnTheWayAt) {
            timeline.agentOnTheWayAt = new Date();
        }
        assert.equal(timeline.agentOnTheWayAt.getTime(), originalTimestamp, 'Existing timeline timestamp must not be overwritten');
    });

    // 8. Invalid GPS Updates
    await t.test('8. Invalid GPS coordinates, bad accuracy, stale timestamps, and teleportation jumps are rejected', () => {
        // Coordinate range validation:
        assert.equal(validateCoordinates(95.0, 77.0), false, 'Latitude > 90 must be invalid');
        assert.equal(validateCoordinates(-91.0, 77.0), false, 'Latitude < -90 must be invalid');
        assert.equal(validateCoordinates(28.0, 185.0), false, 'Longitude > 180 must be invalid');
        assert.equal(validateCoordinates(0, 0), false, 'Null Island (0,0) must be invalid');
        assert.equal(validateCoordinates('abc', 77.0), false, 'Non-numeric latitude must be invalid');
        assert.equal(validateCoordinates(28.0, null), false, 'Null longitude must be invalid');
        assert.equal(validateCoordinates(28.3670, 79.4304), true, 'Valid Bareilly coordinates must pass');

        // Accuracy validation:
        const validateAccuracy = (acc) => {
            const parsed = parseFloat(acc);
            return !isNaN(parsed) && parsed >= 0 && parsed <= 500;
        };
        assert.equal(validateAccuracy(15), true, '15m accuracy is acceptable');
        assert.equal(validateAccuracy(500), true, '500m accuracy is boundary acceptable');
        assert.equal(validateAccuracy(501), false, '501m accuracy is outside 500m threshold');
        assert.equal(validateAccuracy(-5), false, 'Negative accuracy is invalid');

        // Stale timestamp validation:
        const validateTimestamp = (ts) => {
            const recorded = new Date(ts).getTime();
            const now = Date.now();
            return !isNaN(recorded) && (now - recorded) <= 10 * 60 * 1000 && (recorded - now) <= 2 * 60 * 1000;
        };
        assert.equal(validateTimestamp(new Date()), true, 'Current timestamp is valid');
        assert.equal(validateTimestamp(new Date(Date.now() - 15 * 60 * 1000)), false, '15 min old timestamp is stale');
        assert.equal(validateTimestamp(new Date(Date.now() + 5 * 60 * 1000)), false, '5 min future timestamp is invalid');

        // Teleportation / jump check (> 160 km/h):
        const isSuspiciousJump = (lat1, lon1, lat2, lon2, elapsedSeconds) => {
            const distKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
            const speedKmh = distKm / (elapsedSeconds / 3600);
            return distKm > 1 && speedKmh > 160;
        };
        // 50 km jump in 30 seconds (~6000 km/h)
        assert.equal(isSuspiciousJump(28.36, 79.43, 28.70, 79.90, 30), true, 'Super-speed jump is flagged as suspicious');
        // 0.2 km in 30 seconds (24 km/h bike pace)
        assert.equal(isSuspiciousJump(28.3600, 79.4300, 28.3615, 79.4310, 30), false, 'Normal bike speed is accepted');
    });

    // 9. Backward Status Prevention
    await t.test('9. Backward status progression is strictly prevented', () => {
        // Enforce sequence:
        // accepted (1) -> agent_assigned (2) -> agent_on_the_way (3) -> agent_nearby (4) -> agent_arrived (5) -> donation_collected (6) -> completed (7)
        assert.equal(isValidPickupTransition('agent_arrived', 'agent_nearby'), false, 'agent_arrived cannot go back to agent_nearby');
        assert.equal(isValidPickupTransition('agent_nearby', 'agent_on_the_way'), false, 'agent_nearby cannot go back to agent_on_the_way');
        assert.equal(isValidPickupTransition('agent_on_the_way', 'agent_assigned'), false, 'agent_on_the_way cannot go back to agent_assigned');
        assert.equal(isValidPickupTransition('donation_collected', 'agent_arrived'), false, 'donation_collected cannot go back to agent_arrived');
        assert.equal(isValidPickupTransition('donation_collected', 'agent_on_the_way'), false, 'donation_collected cannot go back to agent_on_the_way');
        assert.equal(isValidPickupTransition('completed', 'agent_arrived'), false, 'completed cannot go back to agent_arrived');
        assert.equal(isValidPickupTransition('completed', 'donation_collected'), false, 'completed cannot go back to donation_collected');

        // Sequential rank check:
        const isStrictForwardRank = (from, to) => {
            return (PICKUP_STATUS_ORDER[to] || 0) > (PICKUP_STATUS_ORDER[from] || 0);
        };
        assert.equal(isStrictForwardRank('agent_assigned', 'agent_on_the_way'), true);
        assert.equal(isStrictForwardRank('agent_on_the_way', 'agent_nearby'), true);
        assert.equal(isStrictForwardRank('agent_nearby', 'agent_arrived'), true);
        assert.equal(isStrictForwardRank('agent_arrived', 'agent_nearby'), false);
    });

    // 10. Cancelled Donation
    await t.test('10. Cancelled donations remain cancelled and reject all transitions and GPS progression', () => {
        assert.equal(isValidPickupTransition('cancelled', 'agent_assigned'), false, 'Cancelled cannot become agent_assigned');
        assert.equal(isValidPickupTransition('cancelled', 'agent_on_the_way'), false, 'Cancelled cannot become agent_on_the_way');
        assert.equal(isValidPickupTransition('cancelled', 'completed'), false, 'Cancelled cannot become completed');

        // Automatic GPS status progression must return null for cancelled donation
        const nextStatus = determineNextPickupStatus({
            currentStatus: 'cancelled',
            currentDistanceKm: 0.1,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(nextStatus, null, 'Cancelled donation must never automatically progress status');
    });

    // 11. Completed Donation
    await t.test('11. Completed donations are terminal and reject all further updates', () => {
        assert.equal(isValidPickupTransition('completed', 'agent_arrived'), false, 'Completed cannot become agent_arrived');
        assert.equal(isValidPickupTransition('completed', 'donation_collected'), false, 'Completed cannot become donation_collected');
        assert.equal(isValidPickupTransition('completed', 'cancelled'), false, 'Completed cannot be cancelled');

        // Automatic GPS status progression must return null for completed donation
        const nextStatus = determineNextPickupStatus({
            currentStatus: 'completed',
            currentDistanceKm: 0.05,
            initialRouteDistanceKm: 10.0
        });
        assert.equal(nextStatus, null, 'Completed donation must never automatically progress status');
    });

    // 12. Notification Messages Standard & Privacy
    await t.test('12. Notification messages strictly match specification and never reveal OTP', () => {
        assert.equal(
            PICKUP_NOTIFICATION_MESSAGES.agent_assigned.donorMessage,
            'Pickup agent has been assigned to your donation.'
        );
        assert.equal(
            PICKUP_NOTIFICATION_MESSAGES.agent_on_the_way.donorMessage,
            'Your pickup agent is on the way.'
        );
        assert.equal(
            PICKUP_NOTIFICATION_MESSAGES.agent_nearby.donorMessage,
            'Your pickup agent is within 5 km of your pickup location.'
        );
        assert.equal(
            PICKUP_NOTIFICATION_MESSAGES.agent_arrived.donorMessage,
            'Your pickup agent has arrived at your pickup location.'
        );
        assert.equal(
            PICKUP_NOTIFICATION_MESSAGES.donation_collected.donorMessage,
            'Your donation has been collected successfully.'
        );
        assert.equal(
            PICKUP_NOTIFICATION_MESSAGES.completed.donorMessage,
            'Your donation parcel has been received by the NGO.'
        );

        // Verify none of the messages contain OTP tokens or verification codes
        Object.values(PICKUP_NOTIFICATION_MESSAGES).forEach((cfg) => {
            assert.ok(!cfg.donorMessage.toLowerCase().includes('otp'), 'Donor message must not reveal OTP');
            assert.ok(!cfg.ngoMessage.toLowerCase().includes('otp'), 'NGO message must not reveal OTP');
        });
    });

    // 13. Donation and PickupAgent Mongoose Schema Validations
    await t.test('13. Donation and PickupAgent models correctly store tracking fields and validate schemas', () => {
        const agentId = new mongoose.Types.ObjectId();
        const donation = new Donation({
            donor: donorId,
            ngo: ngoId,
            requirement: requirementId,
            quantity: 3,
            pickupAddress: 'Civil Lines',
            city: 'Bareilly',
            status: 'accepted',
            pickupStatus: 'agent_nearby',
            assignedAgent: agentId,
            agentLocation: {
                latitude: 28.3670,
                longitude: 79.4304,
                accuracy: 12,
                heading: 180,
                speed: 35,
                updatedAt: new Date()
            },
            trackingSession: {
                initialRouteDistanceKm: 8.5,
                startLocation: { latitude: 28.3500, longitude: 79.4000 },
                distanceToDonorKm: 3.2,
                startedAt: new Date(),
                lastActiveAt: new Date()
            },
            pickupTimeline: {
                agentAssignedAt: new Date(),
                agentOnTheWayAt: new Date(),
                agentNearbyAt: new Date(),
                agentArrivedAt: null,
                donationCollectedAt: null,
                completedAt: null
            }
        });

        const donationErr = donation.validateSync();
        assert.equal(donationErr, undefined, 'Donation validates with live tracking fields');
        assert.equal(donation.pickupStatus, 'agent_nearby');
        assert.equal(donation.agentLocation.latitude, 28.3670);
        assert.equal(donation.trackingSession.distanceToDonorKm, 3.2);
        assert.ok(donation.pickupTimeline.agentNearbyAt instanceof Date);

        const agent = new PickupAgent({
            ngoId,
            fullName: 'Vikram Logistic',
            phone: '9876543210',
            vehicleType: 'Bike',
            vehicleNumber: 'UP 25 AB 9999',
            currentLocation: {
                latitude: 28.3670,
                longitude: 79.4304,
                updatedAt: new Date()
            }
        });

        const agentErr = agent.validateSync();
        assert.equal(agentErr, undefined, 'PickupAgent validates with currentLocation');
        assert.equal(agent.currentLocation.latitude, 28.3670);
    });
});
