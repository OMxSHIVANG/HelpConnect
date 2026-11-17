import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PickupAgent from '../models/PickupAgent.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import {
    loginUser,
    sendEmailVerificationOtp,
    verifyEmailOtp
} from '../controllers/authController.js';
import { agentLogin } from '../controllers/pickupAgentController.js';

describe('Authentication & Security Tests', () => {
    process.env.JWT_SECRET = 'test_super_secure_secret_key_123456';

    test('generateToken produces valid verifiable token with user ID and role', () => {
        const dummyUser = { _id: '507f1f77bcf86cd799439011', role: 'user' };
        const token = generateToken(dummyUser);

        assert.ok(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        assert.equal(decoded.id, dummyUser._id);
        assert.equal(decoded.role, 'user');
    });

    test('Verification fails with wrong secret', () => {
        const dummyUser = { _id: '507f1f77bcf86cd799439011', role: 'user' };
        const token = generateToken(dummyUser);

        assert.throws(() => {
            jwt.verify(token, 'wrong_secret_key_1234567890');
        });
    });

    test('Bcrypt hashes and securely validates password', async () => {
        const password = 'SuperSecretPassword!2026';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        assert.notEqual(password, hash);
        assert.ok(await bcrypt.compare(password, hash));
        assert.ok(!await bcrypt.compare('WrongPassword', hash));
    });

    test('Role authorization middleware restricts unauthorized roles', () => {
        const adminOnly = authorize('admin');

        let nextCalled = false;
        let responseStatus = null;
        let responseJson = null;

        const fakeRes = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };

        // Case A: normal user denied access to admin route
        adminOnly({ user: { role: 'user' } }, fakeRes, () => { nextCalled = true; });
        assert.equal(responseStatus, 403);
        assert.equal(nextCalled, false);
        assert.ok(responseJson.message.includes('Forbidden'));

        // Case B: admin user granted access
        nextCalled = false;
        responseStatus = null;
        adminOnly({ user: { role: 'admin' } }, fakeRes, () => { nextCalled = true; });
        assert.equal(nextCalled, true);
        assert.equal(responseStatus, null);
    });

    test('Role authorization middleware handles unauthenticated request', () => {
        const protectAdmin = authorize('admin');
        let responseStatus = null;
        const fakeRes = {
            status: (code) => {
                responseStatus = code;
                return { json: () => {} };
            }
        };

        protectAdmin({}, fakeRes, () => {});
        assert.equal(responseStatus, 401);
    });

    test('loginUser returns 404 with notFound when unregistered user tries to log in', async () => {
        const origUserFindOne = User.findOne;
        User.findOne = () => Promise.resolve(null); // Simulate user not registered in DB

        let status = null;
        let responseData = null;
        const fakeReq = { body: { email: 'nonexistent@example.com', password: 'password123' } };
        const fakeRes = {
            status: (code) => {
                status = code;
                return {
                    json: (data) => { responseData = data; }
                };
            }
        };

        try {
            await loginUser(fakeReq, fakeRes);
            assert.equal(status, 404, 'Must return 404 for unregistered user');
            assert.equal(responseData?.notFound, true, 'Response must flag notFound: true');
            assert.ok(responseData?.message?.toLowerCase().includes('not found'), 'Message should indicate user not found');
            assert.ok(responseData?.message?.toLowerCase().includes('register'), 'Message should prompt user to register');
        } finally {
            User.findOne = origUserFindOne;
        }
    });

    test('agentLogin returns 404 with notFound when agent is not registered', async () => {
        const origAgentFindOne = PickupAgent.findOne;
        PickupAgent.findOne = () => ({
            select: () => ({
                populate: () => Promise.resolve(null)
            })
        });

        let status = null;
        let responseData = null;
        const fakeReq = { body: { login: 'AGT-NONEXISTENT', password: 'password123' } };
        const fakeRes = {
            status: (code) => {
                status = code;
                return {
                    json: (data) => { responseData = data; }
                };
            }
        };

        try {
            await agentLogin(fakeReq, fakeRes);
            assert.equal(status, 404, 'Must return 404 for unregistered agent');
            assert.equal(responseData?.notFound, true, 'Response must flag notFound: true');
            assert.ok(responseData?.message?.toLowerCase().includes('not found'), 'Message should indicate user not found');
            assert.ok(responseData?.message?.toLowerCase().includes('register'), 'Message should prompt user to register');
        } finally {
            PickupAgent.findOne = origAgentFindOne;
        }
    });

    test('sendEmailVerificationOtp generates code and verifyEmailOtp marks isEmailVerified true', async () => {
        const mockUser = {
            _id: '507f1f77bcf86cd799439011',
            email: 'donor@example.com',
            isEmailVerified: false,
            emailVerificationOtp: null,
            emailVerificationOtpExpires: null,
            save: async function() { return this; }
        };

        const origFindById = User.findById;
        User.findById = (id) => ({
            select: () => Promise.resolve(mockUser),
            then: (resolve) => resolve(mockUser)
        });

        try {
            // 1. Send OTP
            let sendStatus = null;
            let sendData = null;
            await sendEmailVerificationOtp(
                { user: { _id: mockUser._id } },
                { status: (c) => { sendStatus = c; return { json: (d) => { sendData = d; } }; }, json: (d) => { sendData = d; } }
            );

            assert.equal(sendData?.success, true);
            assert.ok(mockUser.emailVerificationOtp, 'OTP must be generated and saved');
            assert.equal(mockUser.emailVerificationOtp.length, 6, 'OTP must be 6 digits');

            const generatedOtp = mockUser.emailVerificationOtp;

            // 2. Reject incorrect OTP
            let failData = null;
            let failStatus = null;
            await verifyEmailOtp(
                { user: { _id: mockUser._id }, body: { otp: '000000' } },
                { status: (c) => { failStatus = c; return { json: (d) => { failData = d; } }; }, json: (d) => { failData = d; } }
            );
            assert.equal(failStatus, 400);
            assert.equal(failData?.success, false);

            // 3. Confirm with valid OTP
            let verifyData = null;
            let verifyStatus = null;
            await verifyEmailOtp(
                { user: { _id: mockUser._id }, body: { otp: generatedOtp } },
                { status: (c) => { verifyStatus = c; return { json: (d) => { verifyData = d; } }; }, json: (d) => { verifyData = d; } }
            );

            assert.equal(verifyData?.success, true);
            assert.equal(verifyData?.isEmailVerified, true);
            assert.equal(mockUser.isEmailVerified, true);
        } finally {
            User.findById = origFindById;
        }
    });
});
