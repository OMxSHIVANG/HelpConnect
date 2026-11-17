import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
    determineTrackingRole,
    serializeTrackingResponse,
    serializeDonorTracking,
    serializeNgoTracking,
    serializeAgentTracking,
    serializeAdminTracking,
    isPickupActive
} from '../serializers/trackingSerializer.js';
import { getLiveTrackingData, confirmCollection, updateLiveLocation } from '../controllers/pickupAgentController.js';
import { formatDonation } from '../views/donationView.js';
import { confirmCollectionWithOtp } from '../services/donationLifecycleService.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';

test('Live Tracking Data Privacy & Information Exposure Suite (TASK 7)', async (t) => {
    const donorId = new mongoose.Types.ObjectId();
    const otherDonorId = new mongoose.Types.ObjectId();
    const agentId = new mongoose.Types.ObjectId();
    const otherAgentId = new mongoose.Types.ObjectId();
    const ngoUserId = new mongoose.Types.ObjectId();
    const ngoProfileId = new mongoose.Types.ObjectId();
    const otherNgoUserId = new mongoose.Types.ObjectId();
    const otherNgoProfileId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const donationId = new mongoose.Types.ObjectId();

    const mockDonation = {
        _id: donationId,
        donor: {
            _id: donorId,
            name: 'Pooja Sharma',
            phone: '9811223344',
            city: 'Delhi',
            location: 'Connaught Place'
        },
        assignedAgent: {
            _id: agentId,
            agentId: 'AGT-PRIV01',
            fullName: 'Amit Kumar',
            phone: '9876500000',
            vehicleType: 'Motorcycle',
            vehicleNumber: 'DL 04 CD 5678',
            profilePhoto: 'https://helpconnect.org/photos/amit.jpg',
            status: 'active'
        },
        ngo: {
            _id: ngoProfileId,
            user: ngoUserId,
            ngoName: 'Goonj Seva Trust',
            phone: '011-23456789',
            address: 'Sarita Vihar, New Delhi',
            city: 'Delhi',
            location: {
                latitude: 28.5283,
                longitude: 77.2917
            }
        },
        pickupAddress: 'Block B, Sector 14, Delhi',
        city: 'Delhi',
        status: 'accepted',
        pickupStatus: 'agent_on_the_way',
        verificationCode: 'HC-PRIVATE-9988',
        qrPayload: 'helpconnect://verify-donation?code=HC-PRIVATE-9988',
        verificationCodeExpiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours future
        isVerificationCodeUsed: false,
        quantity: 10,
        category: 'Warm Blankets',
        description: 'Clean woollen blankets in sealed cartons',
        pickupInstructions: 'Ring bell on second floor. Fragile boxes.',
        agentLocation: {
            latitude: 28.5350,
            longitude: 77.2800,
            accuracy: 14,
            heading: 180,
            speed: 40,
            updatedAt: new Date()
        },
        trackingSession: {
            initialRouteDistanceKm: 8.5,
            distanceToDonorKm: 3.2,
            startedAt: new Date()
        },
        pickupTimeline: {
            agentAssignedAt: new Date(Date.now() - 3600000),
            agentOnTheWayAt: new Date()
        }
    };

    const mockContext = {
        donorCoords: [77.2090, 28.6139],
        isDonorLocationVerified: true,
        ngoCoords: [77.2917, 28.5283],
        isNgoLocationVerified: true,
        currentDistanceKm: 3.2,
        distanceDetails: {
            straightLineDistanceKm: 3.2,
            estimatedRoadDistanceKm: 4.1,
            distanceLabel: 'Est. Travel Distance: ~4.1 km'
        }
    };

    // 1. Role-Based Response Scoping
    await t.test('1. Role Scoping: Donor receives agent name, vehicle, photo, and live location, but NOT agent phone, internal IDs, or OTP', () => {
        const donorRequester = {
            user: { _id: donorId, role: 'donor' },
            _id: donorId,
            role: 'donor'
        };

        const role = determineTrackingRole(mockDonation, donorRequester);
        assert.equal(role, 'donor');

        const donorView = serializeTrackingResponse(mockDonation, donorRequester, mockContext);
        assert.equal(donorView.success, true);
        assert.equal(donorView.role, 'donor');
        assert.equal(donorView.pickupStatus, 'agent_on_the_way');

        // Allowed fields
        assert.equal(donorView.assignedAgent.fullName, 'Amit Kumar');
        assert.equal(donorView.assignedAgent.vehicleType, 'Motorcycle');
        assert.equal(donorView.assignedAgent.vehicleNumber, 'DL 04 CD 5678');
        assert.equal(donorView.assignedAgent.profilePhoto, 'https://helpconnect.org/photos/amit.jpg');
        assert.equal(donorView.agentLocation.latitude, 28.5350);
        assert.equal(donorView.currentDistanceKm, 3.2);
        assert.ok(donorView.pickupTimeline);

        // FORBIDDEN sensitive fields
        assert.equal(donorView.assignedAgent.phone, undefined, 'Agent private phone number must not be exposed to donor');
        assert.equal(donorView.assignedAgent.agentId, undefined, 'Internal agent ID must not be exposed to donor');
        assert.equal(donorView.verificationCode, undefined, 'Donor verification OTP must not be exposed in normal tracking view');
        assert.equal(donorView.password, undefined);
        assert.equal(donorView.__v, undefined);
    });

    await t.test('2. Role Scoping: NGO receives complete pickup status, agent details, donor pickup info, but NOT donor OTP or password hashes', () => {
        const ngoRequester = {
            user: { _id: ngoUserId, role: 'ngo' },
            _id: ngoUserId,
            role: 'ngo',
            ngoId: ngoProfileId
        };

        const role = determineTrackingRole(mockDonation, ngoRequester);
        assert.equal(role, 'ngo');

        const ngoView = serializeTrackingResponse(mockDonation, ngoRequester, mockContext);
        assert.equal(ngoView.success, true);
        assert.equal(ngoView.role, 'ngo');

        // Allowed fields
        assert.equal(ngoView.assignedAgent.fullName, 'Amit Kumar');
        assert.equal(ngoView.assignedAgent.phone, '9876500000');
        assert.equal(ngoView.assignedAgent.agentId, 'AGT-PRIV01');
        assert.equal(ngoView.assignedAgent.status, 'active');
        assert.equal(ngoView.donorPickupInfo.name, 'Pooja Sharma');
        assert.equal(ngoView.donorPickupInfo.phone, '9811223344');
        assert.equal(ngoView.donorPickupInfo.pickupAddress, 'Block B, Sector 14, Delhi');
        assert.equal(ngoView.agentLocation.latitude, 28.5350);

        // FORBIDDEN sensitive fields
        assert.equal(ngoView.verificationCode, undefined, 'Donor verification OTP must NOT be exposed to NGO before collection handover');
        assert.equal(ngoView.password, undefined);
        assert.equal(ngoView.tokens, undefined);
    });

    await t.test('3. Role Scoping: Assigned Agent receives item details, donor address, contact info during active pickup, but NEVER donor OTP', () => {
        const agentRequester = {
            agent: { _id: agentId, agentId: 'AGT-PRIV01' },
            _id: agentId,
            userType: 'agent',
            role: 'agent'
        };

        const role = determineTrackingRole(mockDonation, agentRequester);
        assert.equal(role, 'agent');

        const agentView = serializeTrackingResponse(mockDonation, agentRequester, mockContext);
        assert.equal(agentView.success, true);
        assert.equal(agentView.role, 'agent');

        // Allowed fields
        assert.equal(agentView.pickupAddress, 'Block B, Sector 14, Delhi');
        assert.equal(agentView.donorContact.name, 'Pooja Sharma');
        assert.equal(agentView.donorContact.phone, '9811223344');
        assert.equal(agentView.ngoDestination.ngoName, 'Goonj Seva Trust');
        assert.equal(agentView.pickupInstructions, 'Ring bell on second floor. Fragile boxes.');

        // STRICT SECURITY: Agent must NEVER be provided the OTP in any tracking response!
        assert.equal(agentView.verificationCode, undefined, 'Pickup agent must NEVER be sent the donor OTP via API');
    });

    await t.test('4. Contact Redaction: After collection is complete, donor contact details are redacted in agent view', () => {
        const collectedDonation = {
            ...mockDonation,
            pickupStatus: 'donation_collected',
            status: 'picked_up'
        };

        const agentRequester = {
            agent: { _id: agentId },
            _id: agentId,
            role: 'agent'
        };

        const agentView = serializeTrackingResponse(collectedDonation, agentRequester, mockContext);
        assert.equal(agentView.pickupStatus, 'donation_collected');
        assert.equal(agentView.donorContact.phone, '[Redacted - Parcel Collected]', 'Donor phone must be redacted once items are collected');
    });

    await t.test('5. Location Privacy: Live coordinates are strictly hidden (null) after pickup is completed or cancelled', () => {
        const completedDonation = {
            ...mockDonation,
            pickupStatus: 'completed',
            status: 'completed',
            agentLocation: {
                latitude: 28.5350,
                longitude: 77.2800
            }
        };

        const donorRequester = { user: { _id: donorId, role: 'donor' }, _id: donorId, role: 'donor' };
        const donorView = serializeTrackingResponse(completedDonation, donorRequester, mockContext);
        assert.equal(donorView.agentLocation, null, 'Donor must NOT receive live agent coordinates after pickup completed');

        const cancelledDonation = {
            ...mockDonation,
            pickupStatus: 'cancelled',
            status: 'cancelled',
            agentLocation: {
                latitude: 28.5350,
                longitude: 77.2800
            }
        };
        const donorCancelledView = serializeTrackingResponse(cancelledDonation, donorRequester, mockContext);
        assert.equal(donorCancelledView.agentLocation, null, 'Donor must NOT receive live agent coordinates after cancellation');
    });

    await t.test('6. Unauthorized Stakeholders Rejection: Unrelated donor, unassigned agent, or other NGO are rejected with 403', () => {
        // Unrelated donor
        const otherDonorRequester = {
            user: { _id: otherDonorId, role: 'donor' },
            _id: otherDonorId,
            role: 'donor'
        };
        assert.equal(determineTrackingRole(mockDonation, otherDonorRequester), null);
        assert.equal(serializeTrackingResponse(mockDonation, otherDonorRequester, mockContext), null);

        // Unassigned agent
        const otherAgentRequester = {
            agent: { _id: otherAgentId },
            _id: otherAgentId,
            role: 'agent'
        };
        assert.equal(determineTrackingRole(mockDonation, otherAgentRequester), null);
        assert.equal(serializeTrackingResponse(mockDonation, otherAgentRequester, mockContext), null);

        // Other NGO
        const otherNgoRequester = {
            user: { _id: otherNgoUserId, role: 'ngo' },
            _id: otherNgoUserId,
            role: 'ngo',
            ngoId: otherNgoProfileId
        };
        assert.equal(determineTrackingRole(mockDonation, otherNgoRequester), null);
        assert.equal(serializeTrackingResponse(mockDonation, otherNgoRequester, mockContext), null);
    });

    await t.test('7. OTP Single-Use & Expiration: Rejects expired and already-used OTPs', () => {
        const validateOtpHandover = (donation, enteredCode) => {
            if (donation.isVerificationCodeUsed) {
                throw new Error('Donation collection has already been confirmed or verification OTP has already been verified.');
            }
            if (donation.verificationCodeExpiresAt && new Date() > new Date(donation.verificationCodeExpiresAt)) {
                throw new Error('Verification OTP has expired. Please ask the donor for a fresh code.');
            }
            const cleanEntered = String(enteredCode || '').trim().toUpperCase();
            const cleanExpected = String(donation.verificationCode || '').trim().toUpperCase();
            if (!cleanEntered || cleanEntered !== cleanExpected) {
                throw new Error('Invalid verification code provided. Please check the code with the donor.');
            }
            return true;
        };

        // Expired OTP check
        const expiredDonation = {
            verificationCode: 'HC-EXPIRED',
            verificationCodeExpiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
            isVerificationCodeUsed: false
        };

        assert.throws(
            () => validateOtpHandover(expiredDonation, 'HC-EXPIRED'),
            /expired/i,
            'Expired OTP must be rejected'
        );

        // Already-used OTP check
        const usedDonation = {
            verificationCode: 'HC-USED11',
            verificationCodeExpiresAt: new Date(Date.now() + 3600000),
            isVerificationCodeUsed: true
        };

        assert.throws(
            () => validateOtpHandover(usedDonation, 'HC-USED11'),
            /already been confirmed|already been verified/i,
            'Already used OTP must be rejected'
        );

        // Valid unexpired, unused OTP check
        const validDonation = {
            verificationCode: 'HC-VALID99',
            verificationCodeExpiresAt: new Date(Date.now() + 3600000),
            isVerificationCodeUsed: false
        };

        assert.equal(validateOtpHandover(validDonation, 'HC-VALID99'), true, 'Valid OTP must pass');
    });

    await t.test('8. formatDonation Privacy: Never includes verificationCode or qrPayload unless explicitly authorized for donor view', () => {
        const donationDoc = {
            ...mockDonation,
            toObject: () => mockDonation
        };

        // Default formatting: verificationCode is omitted
        const publicFormatted = formatDonation(donationDoc);
        assert.equal(publicFormatted.verificationCode, undefined, 'Default formatted donation must omit verificationCode');
        assert.equal(publicFormatted.qrPayload, undefined, 'Default formatted donation must omit qrPayload');

        // Explicitly authorized donor private workflow: verificationCode included
        const donorPrivateFormatted = formatDonation(donationDoc, { includeVerificationCode: true });
        assert.equal(donorPrivateFormatted.verificationCode, 'HC-PRIVATE-9988');
        assert.equal(donorPrivateFormatted.qrPayload.includes('HC-PRIVATE-9988'), true);
    });

    await t.test('9. Location Updates Privacy: updateLiveLocation rejects coordinate updates on completed or cancelled pickups', async () => {
        const completedDonation = {
            ...mockDonation,
            status: 'completed',
            pickupStatus: 'completed'
        };

        const origFindById = Donation.findById;
        Donation.findById = () => ({
            populate: () => ({
                populate: () => ({
                    populate: () => Promise.resolve(completedDonation)
                })
            })
        });

        const req = {
            agent: { _id: agentId, status: 'active' },
            params: { id: donationId.toString() },
            body: { latitude: 28.5350, longitude: 77.2800 }
        };

        let resJson = null;
        let resCode = 200;
        const res = {
            status: (code) => { resCode = code; return res; },
            json: (data) => { resJson = data; }
        };

        await updateLiveLocation(req, res);
        assert.equal(resCode, 400);
        assert.match(resJson.message, /completed/i, 'Should reject GPS updates for completed donation');

        Donation.findById = origFindById;
    });
});
