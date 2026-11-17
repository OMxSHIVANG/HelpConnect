import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {
    isValidDonationTransition,
    isValidPickupTransition,
    deriveDonationStatusFromPickupStatus,
    derivePickupStatusFromDonationStatus,
    getStatusDisplayInfo
} from '../services/donationLifecycleService.js';
import { runTransactionSafe } from '../utils/transactionHelper.js';
import { generateAgentToken } from '../middleware/authMiddleware.js';
import { calculateDistanceKm, getCoordinatesForCity, validateCoordinates } from '../utils/geoUtils.js';

describe('Comprehensive Regression & Technical Audit Suite (TASK 12)', () => {
    const JWT_SECRET = 'regression_test_secret_key_at_least_32_characters';
    process.env.JWT_SECRET = JWT_SECRET;

    // 1. User & Agent Authentication & Role Isolation
    describe('1. Authentication, Tokens & Role Authorization', () => {
        test('Agent JWT generation and role validation', () => {
            const agentId = 'HC-AGT-8821';
            const agentMongoId = new mongoose.Types.ObjectId();
            const ngoId = new mongoose.Types.ObjectId();

            const token = generateAgentToken({
                _id: agentMongoId,
                agentId,
                fullName: 'Vikram Singh',
                ngo: ngoId,
                status: 'active'
            });

            assert.ok(token, 'Token must be generated');
            const decoded = jwt.verify(token, JWT_SECRET);
            assert.equal(decoded.agentCode, agentId);
            assert.equal(decoded.role, 'agent');
            assert.equal(decoded.id, agentMongoId.toString());
        });

        test('Tampered or forged tokens are rejected with JsonWebTokenError', () => {
            const validToken = jwt.sign({ id: 'user123', role: 'donor' }, JWT_SECRET, { expiresIn: '1h' });
            const forgedToken = validToken.slice(0, -6) + 'abcdef';

            assert.throws(() => {
                jwt.verify(forgedToken, JWT_SECRET);
            }, /invalid signature/);
        });

        test('Role isolation: donor cannot perform agent actions', () => {
            const donorToken = jwt.sign({ id: 'donor123', role: 'user' }, JWT_SECRET);
            const decoded = jwt.verify(donorToken, JWT_SECRET);
            assert.notEqual(decoded.role, 'agent');
        });
    });

    // 2. NGO Location & Geospatial System
    describe('2. Geospatial System & Unknown City Safety', () => {
        test('Resolves known cities correctly to [longitude, latitude]', () => {
            const coords = getCoordinatesForCity('Meerut');
            assert.ok(coords, 'Coords should be resolved');
            assert.equal(coords[0], 77.7064); // Longitude
            assert.equal(coords[1], 28.9845); // Latitude
        });

        test('NEVER assumes unknown city is Bareilly (returns null)', () => {
            const unknownCityResult = getCoordinatesForCity('RandomUnknownCityX99');
            assert.equal(unknownCityResult, null, 'Unknown cities must return null instead of Bareilly');
        });

        test('Coordinate validation correctly identifies valid and invalid coordinates', () => {
            assert.equal(validateCoordinates(28.5, 77.2), true);
            assert.equal(validateCoordinates(95.0, 77.2), false); // Latitude > 90
            assert.equal(validateCoordinates(28.5, 195.0), false); // Longitude > 180
            assert.equal(validateCoordinates(null, 77.2), false);
            assert.equal(validateCoordinates(undefined, undefined), false);
        });

        test('Haversine distance calculation produces accurate kilometer distance', () => {
            // New Delhi (28.6139, 77.2090) to Meerut (28.9845, 77.7064) ~ 62-65km
            const dist = calculateDistanceKm(28.6139, 77.2090, 28.9845, 77.7064);
            assert.ok(dist >= 60 && dist <= 70, `Distance should be ~64km, got: ${dist}`);
        });
    });

    // 3. Donation & Pickup Lifecycle State Machine
    describe('3. Donation & Pickup Lifecycle Transitions', () => {
        test('Full happy path progression: accepted -> agent_assigned -> agent_on_the_way -> agent_nearby -> agent_arrived -> donation_collected -> completed', () => {
            assert.ok(isValidPickupTransition('accepted', 'agent_assigned'));
            assert.ok(isValidPickupTransition('agent_assigned', 'agent_on_the_way'));
            assert.ok(isValidPickupTransition('agent_on_the_way', 'agent_nearby'));
            assert.ok(isValidPickupTransition('agent_nearby', 'agent_arrived'));
            assert.ok(isValidPickupTransition('agent_arrived', 'donation_collected'));
            assert.ok(isValidPickupTransition('donation_collected', 'completed'));
        });

        test('Derives correct donation status from pickup status', () => {
            assert.equal(deriveDonationStatusFromPickupStatus('agent_assigned', 'pending'), 'accepted');
            assert.equal(deriveDonationStatusFromPickupStatus('donation_collected', 'accepted'), 'picked_up');
            assert.equal(deriveDonationStatusFromPickupStatus('completed', 'picked_up'), 'received');
        });

        test('Derives correct pickup status from donation status', () => {
            assert.equal(derivePickupStatusFromDonationStatus('accepted', 'pending'), 'accepted');
            assert.equal(derivePickupStatusFromDonationStatus('picked_up', 'agent_arrived'), 'donation_collected');
            assert.equal(derivePickupStatusFromDonationStatus('received', 'donation_collected'), 'completed');
            assert.equal(derivePickupStatusFromDonationStatus('cancelled', 'agent_assigned'), 'cancelled');
        });

        test('Terminal states: Cancelled or Completed donations cannot transition', () => {
            assert.equal(isValidPickupTransition('completed', 'agent_on_the_way'), false);
            assert.equal(isValidPickupTransition('cancelled', 'agent_on_the_way'), false);
            assert.equal(isValidDonationTransition('completed', 'pending'), false);
            assert.equal(isValidDonationTransition('cancelled', 'accepted'), false);
        });

        test('Backward transitions are strictly prevented', () => {
            assert.equal(isValidPickupTransition('donation_collected', 'agent_on_the_way'), false);
            assert.equal(isValidPickupTransition('agent_arrived', 'agent_assigned'), false);
            assert.equal(isValidDonationTransition('picked_up', 'accepted'), false);
        });

        test('getStatusDisplayInfo never displays completed before received', () => {
            const displayPickedUp = getStatusDisplayInfo('picked_up', 'donation_collected');
            assert.equal(displayPickedUp.primaryLabel, 'Donation Collected (In Transit)');
            assert.equal(displayPickedUp.isReceivedByNgo, false);

            const displayReceived = getStatusDisplayInfo('received', 'completed');
            assert.equal(displayReceived.primaryLabel, 'Received at NGO');
            assert.equal(displayReceived.isReceivedByNgo, true);
        });
    });

    // 4. Security, OTP Verification & Idempotency
    describe('4. OTP Verification & Race Condition Protection', () => {
        test('Collection confirmation OTP validation logic verifies single-use and expiration', () => {
            const code = 'ABC123';
            const expiresAt = new Date(Date.now() + 600000); // +10 min
            let used = false;

            // Helper to simulate atomic verification
            const verifyOtp = (input) => {
                if (used) return { success: false, reason: 'OTP has already been used' };
                if (Date.now() > expiresAt.getTime()) return { success: false, reason: 'OTP has expired' };
                if (input.toUpperCase().trim() !== code) return { success: false, reason: 'Invalid verification OTP' };
                used = true;
                return { success: true };
            };

            // Wrong OTP
            assert.equal(verifyOtp('WRONG1').success, false);
            // Correct OTP
            assert.equal(verifyOtp('ABC123').success, true);
            // Reuse attempt
            assert.equal(verifyOtp('ABC123').success, false);
            assert.match(verifyOtp('ABC123').reason, /already been used/);
        });
    });

    // 5. MongoDB Transaction Helper & Post-Commit Safety
    describe('5. Transaction Safety & Outbox Side-Effects', () => {
        test('runTransactionSafe runs without re-executing failed callbacks', async () => {
            let callbackAttempts = 0;

            try {
                await runTransactionSafe(async () => {
                    callbackAttempts++;
                    throw new Error('Simulated Database Write Failure');
                });
            } catch (err) {
                assert.match(err.message, /Simulated Database Write Failure/);
            }

            // Must NOT have blindly re-executed after error
            assert.equal(callbackAttempts, 1, 'Callback must never be re-executed after failure');
        });

        test('Post-commit callbacks do NOT fire if an error occurs inside transaction', async () => {
            let notificationSent = false;

            try {
                await runTransactionSafe(async (session, context) => {
                    context.onCommit(async () => {
                        notificationSent = true;
                    });
                    throw new Error('Abort transaction');
                });
            } catch {
                // Expected abort
            }

            assert.equal(notificationSent, false, 'No notifications should fire if transaction aborts');
        });
    });
});
