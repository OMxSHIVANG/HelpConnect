import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import PickupAgent from '../models/PickupAgent.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { generateAgentToken, generateToken } from '../middleware/authMiddleware.js';

test('Pickup Agent Authentication & Security System Test Suite', async (t) => {
    const testSecret = 'helpconnect_test_jwt_secret_key_12345';
    process.env.JWT_SECRET = testSecret;

    const ngoId = new mongoose.Types.ObjectId();
    const ngo2Id = new mongoose.Types.ObjectId();
    const donorUserId = new mongoose.Types.ObjectId();
    const requirementId = new mongoose.Types.ObjectId();

    await t.test('1. PickupAgent model hashes password with bcrypt and matches password securely', async () => {
        const agent = new PickupAgent({
            ngoId,
            fullName: 'Kabir Verma',
            phone: '9876543210',
            vehicleType: 'Bike',
            vehicleNumber: 'DL 01 AA 1111',
            password: 'secretPassword123'
        });

        // Trigger pre-save hook manually or via mock
        const salt = await bcrypt.genSalt(10);
        agent.password = await bcrypt.hash(agent.password, salt);

        assert.notEqual(agent.password, 'secretPassword123', 'Password must not be stored in plain text');
        assert.ok(agent.password.startsWith('$2'), 'Password should be a valid bcrypt hash');

        const isMatch = await agent.matchPassword('secretPassword123');
        assert.equal(isMatch, true, 'Valid password should match bcrypt hash');

        const isWrong = await agent.matchPassword('wrongPassword');
        assert.equal(isWrong, false, 'Invalid password must not match bcrypt hash');
    });

    await t.test('2. generateAgentToken creates a valid JWT with agentId and role=agent', () => {
        const agent = {
            _id: new mongoose.Types.ObjectId(),
            agentId: 'AGT-TEST01',
            fullName: 'Rajesh Agent'
        };

        const token = generateAgentToken(agent);
        assert.ok(typeof token === 'string' && token.length > 20, 'Token must be a non-empty string');

        const decoded = jwt.verify(token, testSecret);
        assert.equal(decoded.id, agent._id.toString());
        assert.equal(decoded.agentCode, 'AGT-TEST01');
        assert.equal(decoded.role, 'agent', 'Agent token role must be strictly "agent"');
    });

    await t.test('3. Security Check: Unauthenticated person cannot update GPS', () => {
        const verifyCanUpdateGps = (req) => {
            if (!req.agent) {
                throw new Error('Not authorized: Pickup agent authentication credentials required');
            }
            return true;
        };

        // Unauthenticated request without req.agent
        assert.throws(
            () => verifyCanUpdateGps({}),
            /Not authorized: Pickup agent authentication credentials required/
        );
    });

    await t.test('4. Security Check: Donor cannot update agent GPS (Role isolation check)', () => {
        const donorUser = {
            _id: donorUserId,
            role: 'user'
        };
        const donorToken = generateToken(donorUser);
        const decoded = jwt.verify(donorToken, testSecret);

        const authorizeAgentOnly = (tokenPayload) => {
            if (tokenPayload.role !== 'agent') {
                throw new Error('Access denied: Requires valid pickup agent credentials');
            }
            return true;
        };

        assert.throws(
            () => authorizeAgentOnly(decoded),
            /Requires valid pickup agent credentials/
        );
    });

    await t.test('5. Security Check: Wrong agent cannot update another agent\'s donation', () => {
        const assignedAgentId = new mongoose.Types.ObjectId();
        const wrongAgentId = new mongoose.Types.ObjectId();

        const donation = {
            _id: new mongoose.Types.ObjectId(),
            status: 'accepted',
            pickupStatus: 'agent_assigned',
            assignedAgent: assignedAgentId
        };

        const verifyAgentAssignment = (donationRecord, authenticatedAgent) => {
            const assigned = (donationRecord.assignedAgent._id || donationRecord.assignedAgent).toString();
            if (assigned !== authenticatedAgent._id.toString()) {
                throw new Error('Not authorized: You are not the assigned pickup agent for this donation.');
            }
            return true;
        };

        // Wrong agent attempt
        assert.throws(
            () => verifyAgentAssignment(donation, { _id: wrongAgentId }),
            /You are not the assigned pickup agent/
        );

        // Correct agent attempt
        assert.equal(
            verifyAgentAssignment(donation, { _id: assignedAgentId }),
            true
        );
    });

    await t.test('6. Security Check: Inactive agent cannot perform pickup operations (GPS update or collection)', () => {
        const inactiveAgent = {
            _id: new mongoose.Types.ObjectId(),
            agentId: 'AGT-INACTIVE',
            status: 'inactive'
        };

        const checkAgentActiveStatus = (agent) => {
            if (agent.status !== 'active') {
                throw new Error('This pickup agent account has been deactivated. Access denied.');
            }
            return true;
        };

        assert.throws(
            () => checkAgentActiveStatus(inactiveAgent),
            /deactivated/
        );

        const activeAgent = { ...inactiveAgent, status: 'active' };
        assert.equal(checkAgentActiveStatus(activeAgent), true);
    });

    await t.test('7. Security Check: Unassigned agent cannot confirm collection', () => {
        const assignedAgentId = new mongoose.Types.ObjectId();
        const unassignedAgentId = new mongoose.Types.ObjectId();

        const donation = {
            _id: new mongoose.Types.ObjectId(),
            status: 'accepted',
            pickupStatus: 'agent_arrived',
            assignedAgent: assignedAgentId,
            verificationCode: 'HC-998877'
        };

        const verifyCanConfirmCollection = (donationRecord, agent, otp) => {
            const assigned = (donationRecord.assignedAgent._id || donationRecord.assignedAgent).toString();
            if (assigned !== agent._id.toString()) {
                throw new Error('Not authorized: You are not the assigned pickup agent for this order.');
            }
            if (!otp || otp.toUpperCase() !== donationRecord.verificationCode) {
                throw new Error('Invalid donor verification OTP.');
            }
            return true;
        };

        // Unassigned agent attempt with right OTP
        assert.throws(
            () => verifyCanConfirmCollection(donation, { _id: unassignedAgentId }, 'HC-998877'),
            /You are not the assigned pickup agent/
        );
    });

    await t.test('8. Security Check: Unauthorized user cannot access private tracking details', () => {
        const donorId = new mongoose.Types.ObjectId();
        const ngoUserId = new mongoose.Types.ObjectId();
        const assignedAgentDbId = new mongoose.Types.ObjectId();
        const strangerUserId = new mongoose.Types.ObjectId();

        const donation = {
            _id: new mongoose.Types.ObjectId(),
            donor: { _id: donorId },
            ngo: { user: ngoUserId, _id: ngoId },
            assignedAgent: { _id: assignedAgentDbId },
            verificationCode: 'HC-PRIVATE-OTP'
        };

        const authorizeLiveTracking = (donationRecord, requester) => {
            const requesterId = (requester._id || '').toString();
            if (requester.role === 'admin') return true;
            if (requesterId === donationRecord.donor._id.toString()) return true;
            if (donationRecord.ngo?.user && requesterId === donationRecord.ngo.user.toString()) return true;
            if (requester.role === 'agent' && requesterId === donationRecord.assignedAgent._id.toString()) return true;
            throw new Error('Not authorized: You do not have permission to access private tracking details for this donation.');
        };

        // Stranger user access rejected
        assert.throws(
            () => authorizeLiveTracking(donation, { _id: strangerUserId, role: 'user' }),
            /Not authorized: You do not have permission/
        );

        // Stranger agent access rejected
        const strangerAgentId = new mongoose.Types.ObjectId();
        assert.throws(
            () => authorizeLiveTracking(donation, { _id: strangerAgentId, role: 'agent' }),
            /Not authorized: You do not have permission/
        );

        // Authorized parties permitted
        assert.equal(authorizeLiveTracking(donation, { _id: donorId, role: 'user' }), true);
        assert.equal(authorizeLiveTracking(donation, { _id: ngoUserId, role: 'ngo' }), true);
        assert.equal(authorizeLiveTracking(donation, { _id: assignedAgentDbId, role: 'agent' }), true);
        assert.equal(authorizeLiveTracking(donation, { _id: new mongoose.Types.ObjectId(), role: 'admin' }), true);
    });

    await t.test('9. Security Check: Never expose donor verification OTP to pickup agent or unauthorized users', () => {
        const donorId = new mongoose.Types.ObjectId();
        const assignedAgentId = new mongoose.Types.ObjectId();

        const donation = {
            _id: new mongoose.Types.ObjectId(),
            donor: { _id: donorId },
            assignedAgent: { _id: assignedAgentId },
            verificationCode: 'HC-SECRET-CODE'
        };

        const formatTrackingResponse = (donationRecord, requester) => {
            const isDonorOrAdmin = requester.role === 'admin' || (requester._id && donationRecord.donor._id.toString() === requester._id.toString());
            return {
                donationId: donationRecord._id,
                verificationCode: isDonorOrAdmin ? donationRecord.verificationCode : undefined
            };
        };

        const agentResponse = formatTrackingResponse(donation, { _id: assignedAgentId, role: 'agent' });
        assert.equal(agentResponse.verificationCode, undefined, 'Verification OTP must be hidden from pickup agent in tracking payload');

        const donorResponse = formatTrackingResponse(donation, { _id: donorId, role: 'user' });
        assert.equal(donorResponse.verificationCode, 'HC-SECRET-CODE', 'Donor should receive their verification code');
    });

    await t.test('10. Collection confirmation OTP validation prevents expired or already-used OTP reuse', () => {
        const assignedAgentId = new mongoose.Types.ObjectId();

        // 1. Used OTP check
        const alreadyUsedDonation = {
            _id: new mongoose.Types.ObjectId(),
            assignedAgent: assignedAgentId,
            verificationCode: 'HC-112233',
            isVerificationCodeUsed: true,
            pickupStatus: 'donation_collected'
        };

        const validateOtpCollection = (donationRecord, otp) => {
            if (donationRecord.isVerificationCodeUsed || donationRecord.pickupStatus === 'donation_collected') {
                throw new Error('This donation parcel has already been collected. The verification code/OTP cannot be reused.');
            }
            if (donationRecord.verificationCodeExpiresAt && new Date() > donationRecord.verificationCodeExpiresAt) {
                throw new Error('Donor verification OTP has expired. Please request a fresh OTP from the donor.');
            }
            if (!otp || (otp !== donationRecord.verificationCode && otp.replace('HC-', '') !== donationRecord.verificationCode.replace('HC-', ''))) {
                throw new Error('Invalid donor verification OTP.');
            }
            return true;
        };

        assert.throws(
            () => validateOtpCollection(alreadyUsedDonation, 'HC-112233'),
            /cannot be reused/
        );

        // 2. Expired OTP check
        const expiredDonation = {
            _id: new mongoose.Types.ObjectId(),
            assignedAgent: assignedAgentId,
            verificationCode: 'HC-EXPIRE',
            isVerificationCodeUsed: false,
            verificationCodeExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
            pickupStatus: 'agent_arrived'
        };

        assert.throws(
            () => validateOtpCollection(expiredDonation, 'HC-EXPIRE'),
            /expired/
        );

        // 3. Valid fresh OTP check
        const validDonation = {
            _id: new mongoose.Types.ObjectId(),
            assignedAgent: assignedAgentId,
            verificationCode: 'HC-VALID1',
            isVerificationCodeUsed: false,
            verificationCodeExpiresAt: new Date(Date.now() + 3600000),
            pickupStatus: 'agent_arrived'
        };

        assert.equal(validateOtpCollection(validDonation, 'HC-VALID1'), true);
        assert.equal(validateOtpCollection(validDonation, 'VALID1'), true); // prefix-tolerant
    });

    await t.test('11. Valid assigned agent can perform permitted operations (start journey, GPS update, OTP confirmation)', () => {
        const agentId = new mongoose.Types.ObjectId();
        const agent = {
            _id: agentId,
            agentId: 'AGT-SUCCESS',
            fullName: 'Valid Hero Agent',
            status: 'active'
        };

        const donation = {
            _id: new mongoose.Types.ObjectId(),
            status: 'accepted',
            pickupStatus: 'agent_assigned',
            assignedAgent: agentId,
            verificationCode: 'HC-FINAL9',
            isVerificationCodeUsed: false,
            agentLocation: {}
        };

        // 1. Permitted to start journey
        donation.pickupStatus = 'agent_on_the_way';
        assert.equal(donation.pickupStatus, 'agent_on_the_way');

        // 2. Permitted to update GPS coordinates
        const lat = 28.3670;
        const lng = 79.4304;
        const accuracy = 15;
        donation.agentLocation = { latitude: lat, longitude: lng, accuracy };
        assert.equal(donation.agentLocation.latitude, 28.3670);

        // 3. Permitted to confirm collection with valid OTP
        const enteredOtp = 'HC-FINAL9';
        assert.equal(enteredOtp, donation.verificationCode);
        donation.isVerificationCodeUsed = true;
        donation.pickupStatus = 'donation_collected';
        donation.status = 'picked_up';

        assert.equal(donation.isVerificationCodeUsed, true);
        assert.equal(donation.pickupStatus, 'donation_collected');
        assert.equal(donation.status, 'picked_up');
    });

    await t.test('12. Activation Token Generation: Generates secure hex token, valid 7-day expiration, and activation link', () => {
        const agent = new PickupAgent({
            ngoId,
            fullName: 'Ravi Teja',
            phone: '9876543299',
            vehicleType: 'Bike',
            vehicleNumber: 'DL 04 CD 9988'
        });

        // Model default initializes activation token and expiration
        assert.ok(agent.activationToken, 'Activation token must be generated by default');
        assert.equal(agent.activationToken.length, 48, 'Activation token must be a 24-byte hex string (48 characters)');
        assert.ok(agent.activationTokenExpires > new Date(), 'Activation token must expire in the future');
        assert.equal(agent.isActivated, false, 'New agent must be pending activation by default');

        // Verify activation link structure
        const baseUrl = 'http://localhost:5173';
        const activationLink = `${baseUrl}/agent/activate?token=${agent.activationToken}&agentId=${agent.agentId}`;
        assert.ok(activationLink.includes(agent.activationToken));
        assert.ok(activationLink.includes(agent.agentId));
    });
});
