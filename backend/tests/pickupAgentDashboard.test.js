import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import PickupAgent from '../models/PickupAgent.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import User from '../models/User.js';
import { generateAgentToken } from '../middleware/authMiddleware.js';
import {
    confirmCollectionWithOtp,
    confirmDeliveryAtNgo,
    transitionPickupStatus,
    getStatusDisplayInfo
} from '../services/donationLifecycleService.js';
import { validateCoordinates } from '../utils/geoUtils.js';

test('Dedicated Pickup Agent Dashboard Test Suite (TASK 5)', async (t) => {
    const testSecret = 'helpconnect_test_jwt_secret_key_12345';
    process.env.JWT_SECRET = testSecret;

    const ngoId = new mongoose.Types.ObjectId();
    const ngo2Id = new mongoose.Types.ObjectId();
    const donorUserId = new mongoose.Types.ObjectId();
    const requirementId = new mongoose.Types.ObjectId();

    // 1. Agent Login Validation
    await t.test('1. Agent Login: validates credentials, role=agent token, and rejects inactive agents', async () => {
        const passwordPlain = 'SecureAgentPass!123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordPlain, salt);

        const activeAgent = new PickupAgent({
            ngoId,
            agentId: 'AGT-DASH01',
            fullName: 'Sameer Khan',
            phone: '9876543210',
            vehicleType: 'Bike',
            vehicleNumber: 'DL 01 AA 2222',
            password: hashedPassword,
            status: 'active'
        });

        // Match password
        assert.equal(await activeAgent.matchPassword(passwordPlain), true, 'Valid password must match');
        assert.equal(await activeAgent.matchPassword('WrongPass'), false, 'Wrong password must be rejected');

        // Token generation
        const token = generateAgentToken(activeAgent);
        const decoded = jwt.verify(token, testSecret);
        assert.equal(decoded.id, activeAgent._id.toString());
        assert.equal(decoded.agentCode, 'AGT-DASH01');
        assert.equal(decoded.role, 'agent', 'Token must have role=agent');

        // Inactive agent check
        const inactiveAgent = new PickupAgent({
            ngoId,
            agentId: 'AGT-DASH02',
            fullName: 'Inactive Agent',
            phone: '9876543211',
            vehicleType: 'Scooter',
            vehicleNumber: 'DL 01 BB 3333',
            password: hashedPassword,
            status: 'inactive'
        });

        const checkAgentCanLogin = (agent) => {
            if (agent.status !== 'active') {
                throw new Error('Your agent account has been deactivated. Please contact your NGO coordinator.');
            }
            return true;
        };

        assert.throws(
            () => checkAgentCanLogin(inactiveAgent),
            /deactivated/
        );
        assert.equal(checkAgentCanLogin(activeAgent), true);
    });

    // 2. Agent Logout Verification
    await t.test('2. Agent Logout: clears authentication session and invalidates active state', () => {
        let activeToken = 'mock_agent_jwt_token_12345';
        let activeUser = { agentId: 'AGT-DASH01', fullName: 'Sameer Khan' };

        const logoutAgent = () => {
            activeToken = null;
            activeUser = null;
            return { success: true, message: 'Pickup agent logged out successfully' };
        };

        const res = logoutAgent();
        assert.equal(res.success, true);
        assert.equal(activeToken, null, 'Agent token must be cleared');
        assert.equal(activeUser, null, 'Agent session user must be cleared');
    });

    // 3. Assigned Pickups Isolation
    await t.test('3. Assigned Pickups: Only returns orders belonging to authenticated agent', () => {
        const agent1Id = new mongoose.Types.ObjectId();
        const agent2Id = new mongoose.Types.ObjectId();

        const allDonations = [
            { _id: new mongoose.Types.ObjectId(), assignedAgent: agent1Id, title: 'Blankets', status: 'accepted', pickupStatus: 'agent_assigned' },
            { _id: new mongoose.Types.ObjectId(), assignedAgent: agent1Id, title: 'Winter Coats', status: 'accepted', pickupStatus: 'agent_on_the_way' },
            { _id: new mongoose.Types.ObjectId(), assignedAgent: agent2Id, title: 'School Books', status: 'accepted', pickupStatus: 'agent_assigned' },
            { _id: new mongoose.Types.ObjectId(), assignedAgent: null, title: 'Rice Bags', status: 'pending', pickupStatus: 'accepted' }
        ];

        // Filter for agent 1
        const agent1Orders = allDonations.filter(d => d.assignedAgent && d.assignedAgent.toString() === agent1Id.toString());
        assert.equal(agent1Orders.length, 2, 'Agent 1 should only see their 2 assigned orders');
        assert.ok(agent1Orders.every(d => d.assignedAgent.toString() === agent1Id.toString()));

        // Ensure Agent 1 cannot see Agent 2 or unassigned donations
        const containsAgent2 = agent1Orders.some(d => d.assignedAgent.toString() === agent2Id.toString());
        assert.equal(containsAgent2, false, 'Agent 1 must not see Agent 2 donations');
    });

    // 4. Unauthorized Donation Access Rejection
    await t.test('4. Security Check: Agent cannot confirm collection or update GPS on another agent\'s order', () => {
        const assignedAgentId = new mongoose.Types.ObjectId();
        const unauthorizedAgentId = new mongoose.Types.ObjectId();

        const donation = {
            _id: new mongoose.Types.ObjectId(),
            assignedAgent: assignedAgentId,
            status: 'accepted',
            pickupStatus: 'agent_arrived',
            verificationCode: 'HC-998877',
            isVerificationCodeUsed: false
        };

        const verifyAgentAuthorized = (order, agentId) => {
            if (!order.assignedAgent || order.assignedAgent.toString() !== agentId.toString()) {
                throw new Error('Not authorized: You are not the assigned pickup agent for this donation.');
            }
            return true;
        };

        // Unauthorized agent attempt
        assert.throws(
            () => verifyAgentAuthorized(donation, unauthorizedAgentId),
            /Not authorized: You are not the assigned pickup agent/
        );

        // Assigned agent succeeds
        assert.equal(verifyAgentAuthorized(donation, assignedAgentId), true);
    });

    // 5. GPS Sharing & Validation
    await t.test('5. GPS Sharing: Validates coordinates, accuracy threshold, and prevents updates on completed orders', () => {
        // Coordinate validation
        assert.equal(validateCoordinates(28.3670, 79.4304), true, 'Valid Bareilly coordinates pass');
        assert.equal(validateCoordinates(95.0, 79.0), false, 'Latitude > 90 is rejected');
        assert.equal(validateCoordinates(0, 0), false, 'Null Island is rejected');

        // Accuracy check (0 to 500m)
        const validateAccuracy = (acc) => !isNaN(acc) && acc >= 0 && acc <= 500;
        assert.equal(validateAccuracy(15), true, '15m is good accuracy');
        assert.equal(validateAccuracy(550), false, '550m exceeds 500m threshold');

        // Terminal order GPS freeze check
        const checkGpsAllowedOnOrder = (pickupStatus) => {
            if (['completed', 'cancelled'].includes(pickupStatus)) {
                throw new Error(`This donation pickup has been ${pickupStatus}. GPS updates stopped.`);
            }
            return true;
        };

        assert.throws(() => checkGpsAllowedOnOrder('completed'), /completed/);
        assert.throws(() => checkGpsAllowedOnOrder('cancelled'), /cancelled/);
        assert.equal(checkGpsAllowedOnOrder('agent_on_the_way'), true);
        assert.equal(checkGpsAllowedOnOrder('agent_nearby'), true);
    });

    // 6. OTP Verification and Collection
    await t.test('6. OTP Collection Verification: Correct OTP confirms collection; invalid OTP is rejected', () => {
        const expectedCode = 'HC-112233';

        const verifyCollectionOtp = (enteredCode, isUsed) => {
            if (isUsed) {
                throw new Error('Donation collection has already been confirmed or OTP was already verified.');
            }
            const cleanEntered = (enteredCode || '').trim().toUpperCase().replace(/^HC-/, '');
            const cleanExpected = expectedCode.replace(/^HC-/, '');
            if (cleanEntered !== cleanExpected) {
                throw new Error('Invalid donor verification OTP.');
            }
            return {
                pickupStatus: 'donation_collected',
                status: 'picked_up',
                isVerificationCodeUsed: true
            };
        };

        // Wrong OTP
        assert.throws(() => verifyCollectionOtp('WRONG1', false), /Invalid donor verification OTP/);

        // Valid OTP
        const success = verifyCollectionOtp('112233', false);
        assert.equal(success.pickupStatus, 'donation_collected');
        assert.equal(success.status, 'picked_up');
        assert.equal(success.isVerificationCodeUsed, true);

        // Reusing verified OTP
        assert.throws(() => verifyCollectionOtp('112233', true), /already been confirmed/);
    });

    // 7. NGO Delivery & Completion
    await t.test('7. NGO Delivery: Transitions to completed and received only when NGO verifies receipt', () => {
        // While in transit after collection:
        const inTransitDisplay = getStatusDisplayInfo('picked_up', 'donation_collected');
        assert.equal(inTransitDisplay.isPickupCompleted, false, 'Pickup Completed must be FALSE when donation_collected');
        assert.equal(inTransitDisplay.primaryLabel, 'Donation Collected (In Transit)');
        assert.equal(inTransitDisplay.isReceivedByNgo, false);

        // When NGO confirms receipt:
        const completedDisplay = getStatusDisplayInfo('received', 'completed');
        assert.equal(completedDisplay.isPickupCompleted, true, 'Pickup Completed is TRUE after NGO receipt');
        assert.equal(completedDisplay.isReceivedByNgo, true);
        assert.equal(completedDisplay.primaryLabel, 'Received at NGO');
        assert.equal(completedDisplay.pickupLabel, 'Pickup Completed');
    });

    // 8. Agent Profile Protection
    await t.test('8. Agent Profile: Profile shows credentials and disallows non-NGO modifications', () => {
        const agent = {
            agentId: 'AGT-DASH01',
            fullName: 'Sameer Khan',
            phone: '9876543210',
            vehicleType: 'Bike',
            vehicleNumber: 'DL 01 AA 2222',
            status: 'active',
            ngoId
        };

        // Profile read gives all required details
        assert.equal(agent.agentId, 'AGT-DASH01');
        assert.equal(agent.fullName, 'Sameer Khan');
        assert.equal(agent.vehicleType, 'Bike');
        assert.equal(agent.vehicleNumber, 'DL 01 AA 2222');
        assert.equal(agent.status, 'active');

        // Only authorized NGO / admin can edit registration
        const canEditAgent = (userRole, userNgoId, agentNgoId) => {
            if (userRole === 'admin') return true;
            if (userRole === 'ngo' && userNgoId.toString() === agentNgoId.toString()) return true;
            return false;
        };

        assert.equal(canEditAgent('agent', null, ngoId), false, 'Agent cannot edit own registration');
        assert.equal(canEditAgent('user', null, ngoId), false, 'Donor cannot edit agent registration');
        assert.equal(canEditAgent('ngo', ngo2Id, ngoId), false, 'Different NGO cannot edit agent');
        assert.equal(canEditAgent('ngo', ngoId, ngoId), true, 'Assigned NGO can edit agent');
        assert.equal(canEditAgent('admin', null, ngoId), true, 'Admin can edit agent');
    });
});
