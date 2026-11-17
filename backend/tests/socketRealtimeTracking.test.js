import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import PickupAgent from '../models/PickupAgent.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import {
    initSocket,
    getIO,
    emitAgentLocationUpdate,
    emitDonationPickupStatus,
    emitChatMessage,
    emitNotification
} from '../socket.js';

test('Socket.IO Real-Time Tracking & Event Bus Test Suite (TASK 6)', async (t) => {
    const testSecret = 'helpconnect_test_jwt_secret_key_12345';
    process.env.JWT_SECRET = testSecret;

    // Test IDs
    const donorId = new mongoose.Types.ObjectId();
    const otherDonorId = new mongoose.Types.ObjectId();
    const agentId = new mongoose.Types.ObjectId();
    const otherAgentId = new mongoose.Types.ObjectId();
    const ngoUserId = new mongoose.Types.ObjectId();
    const ngoProfileId = new mongoose.Types.ObjectId();
    const otherNgoUserId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const donationId = new mongoose.Types.ObjectId();

    // Mock Models
    const mockDonor = {
        _id: donorId,
        name: 'Arun Donor',
        email: 'arun@example.com',
        role: 'donor',
        isActive: true
    };

    const mockOtherDonor = {
        _id: otherDonorId,
        name: 'Sneha Other',
        email: 'sneha@example.com',
        role: 'donor',
        isActive: true
    };

    const mockInactiveUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Inactive User',
        email: 'inactive@example.com',
        role: 'donor',
        isActive: false
    };

    const mockAgent = {
        _id: agentId,
        agentId: 'AGT-REAL01',
        fullName: 'Ravi Agent',
        phone: '9876543210',
        vehicleType: 'Bike',
        vehicleNumber: 'DL 01 AA 1111',
        status: 'active',
        currentLocation: null,
        save: async () => {}
    };

    const mockInactiveAgent = {
        _id: new mongoose.Types.ObjectId(),
        agentId: 'AGT-INACT',
        fullName: 'Inactive Agent',
        status: 'inactive'
    };

    const mockOtherAgent = {
        _id: otherAgentId,
        agentId: 'AGT-REAL02',
        fullName: 'Vikram Agent',
        status: 'active',
        save: async () => {}
    };

    const mockNgoUser = {
        _id: ngoUserId,
        name: 'NGO Coordinator',
        role: 'ngo',
        isActive: true
    };

    const mockAdminUser = {
        _id: adminId,
        name: 'System Admin',
        role: 'admin',
        isActive: true
    };

    const mockDonation = {
        _id: donationId,
        donor: donorId,
        assignedAgent: agentId,
        ngo: {
            _id: ngoProfileId,
            user: ngoUserId,
            ngoName: 'Goonj Foundation'
        },
        pickupStatus: 'agent_assigned',
        status: 'accepted',
        verificationCode: 'SAFE12',
        pickupLocation: {
            latitude: 28.6139,
            longitude: 77.2090,
            verificationStatus: 'verified'
        },
        agentLocation: null,
        trackingSession: {
            initialRouteDistanceKm: 10,
            startedAt: new Date()
        },
        pickupTimeline: {
            agentAssignedAt: new Date()
        },
        populate: function() { return this; },
        save: async () => {}
    };

    // Model Stubs
    const origUserFindById = User.findById;
    const origAgentFindById = PickupAgent.findById;
    const origAgentFindOne = PickupAgent.findOne;
    const origDonationFindById = Donation.findById;
    const origNgoFindOne = NGO.findOne;

    User.findById = (id) => {
        const idStr = id?.toString();
        if (idStr === donorId.toString()) return Promise.resolve(mockDonor);
        if (idStr === otherDonorId.toString()) return Promise.resolve(mockOtherDonor);
        if (idStr === mockInactiveUser._id.toString()) return Promise.resolve(mockInactiveUser);
        if (idStr === ngoUserId.toString()) return Promise.resolve(mockNgoUser);
        if (idStr === adminId.toString()) return Promise.resolve(mockAdminUser);
        return Promise.resolve(null);
    };

    PickupAgent.findById = (id) => {
        const idStr = id?.toString();
        if (idStr === agentId.toString()) return Promise.resolve(mockAgent);
        if (idStr === otherAgentId.toString()) return Promise.resolve(mockOtherAgent);
        if (idStr === mockInactiveAgent._id.toString()) return Promise.resolve(mockInactiveAgent);
        return Promise.resolve(null);
    };

    PickupAgent.findOne = (query) => {
        const code = query?.agentId;
        if (code === mockAgent.agentId || code === agentId.toString()) return Promise.resolve(mockAgent);
        if (code === mockOtherAgent.agentId || code === otherAgentId.toString()) return Promise.resolve(mockOtherAgent);
        if (code === mockInactiveAgent.agentId || code === mockInactiveAgent._id.toString()) return Promise.resolve(mockInactiveAgent);
        return Promise.resolve(null);
    };

    Donation.findById = (id) => {
        const idStr = id?.toString();
        if (idStr === donationId.toString()) {
            return {
                populate: () => Promise.resolve(mockDonation),
                then: (resolve) => resolve(mockDonation)
            };
        }
        return {
            populate: () => Promise.resolve(null),
            then: (resolve) => resolve(null)
        };
    };

    NGO.findOne = (query) => {
        if (query?.user?.toString() === ngoUserId.toString()) {
            return Promise.resolve({ _id: ngoProfileId, user: ngoUserId, ngoName: 'Goonj Foundation' });
        }
        return Promise.resolve(null);
    };

    // Helper tokens
    const donorToken = jwt.sign({ id: donorId, role: 'donor' }, testSecret, { expiresIn: '1h' });
    const otherDonorToken = jwt.sign({ id: otherDonorId, role: 'donor' }, testSecret, { expiresIn: '1h' });
    const agentToken = jwt.sign({ agentId, role: 'agent' }, testSecret, { expiresIn: '1h' });
    const otherAgentToken = jwt.sign({ agentId: otherAgentId, role: 'agent' }, testSecret, { expiresIn: '1h' });
    const ngoToken = jwt.sign({ id: ngoUserId, role: 'ngo' }, testSecret, { expiresIn: '1h' });
    const adminToken = jwt.sign({ id: adminId, role: 'admin' }, testSecret, { expiresIn: '1h' });
    const inactiveUserToken = jwt.sign({ id: mockInactiveUser._id, role: 'donor' }, testSecret, { expiresIn: '1h' });
    const inactiveAgentToken = jwt.sign({ agentId: mockInactiveAgent._id, role: 'agent' }, testSecret, { expiresIn: '1h' });
    const wrongSecretToken = jwt.sign({ id: donorId, role: 'donor' }, 'completely_wrong_secret_123');

    // Initialize in-memory Server
    const dummyHttpServer = new EventEmitter();
    dummyHttpServer.listen = () => dummyHttpServer;
    const io = initSocket(dummyHttpServer);

    // Retrieve authentication middleware registered on io.sockets
    const authMiddleware = io.sockets._fns[0];

    // Helper to simulate mock socket
    const createMockSocket = (token) => {
        const socket = new EventEmitter();
        socket.on('error', () => {}); // Prevent EventEmitter unhandled error
        socket.handshake = {
            auth: { token },
            headers: {}
        };
        socket.rooms = new Set();
        socket.join = (room) => socket.rooms.add(room);
        socket.leave = (room) => socket.rooms.delete(room);
        socket.emitted = [];
        socket.emit = (event, ...args) => {
            socket.emitted.push({ event, args });
            return EventEmitter.prototype.emit.apply(socket, [event, ...args]);
        };
        return socket;
    };

    // Helper to authenticate and connect mock socket
    const setupConnectedSocket = async (token) => {
        const socket = createMockSocket(token);
        await new Promise((resolve, reject) => {
            authMiddleware(socket, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
        EventEmitter.prototype.emit.call(io.sockets, 'connection', socket);
        return socket;
    };

    // 1. Authenticated Socket Connections
    await t.test('1. Socket Authentication: Valid user and agent tokens authenticate; invalid/inactive are rejected', async () => {
        // A. Valid Donor
        const donorSocket = createMockSocket(donorToken);
        let donorErr = null;
        await new Promise(r => authMiddleware(donorSocket, (e) => { donorErr = e; r(); }));
        assert.equal(!donorErr, true, 'Valid donor JWT should pass authentication middleware');
        assert.equal(donorSocket.userType, 'user');
        assert.equal(donorSocket.role, 'donor');
        assert.equal(donorSocket.authId, donorId.toString());

        // B. Valid Agent
        const agentSocket = createMockSocket(agentToken);
        let agentErr = null;
        await new Promise(r => authMiddleware(agentSocket, (e) => { agentErr = e; r(); }));
        assert.equal(!agentErr, true, 'Valid agent JWT should pass authentication middleware');
        assert.equal(agentSocket.userType, 'agent');
        assert.equal(agentSocket.role, 'agent');
        assert.equal(agentSocket.authId, agentId.toString());

        // C. Missing Token
        const noTokenSocket = createMockSocket(null);
        let noTokenErr = null;
        await new Promise(r => authMiddleware(noTokenSocket, (e) => { noTokenErr = e; r(); }));
        assert.notEqual(noTokenErr, null);
        assert.match(noTokenErr.message, /token required/i);

        // D. Wrong Secret
        const wrongSecretSocket = createMockSocket(wrongSecretToken);
        let wrongSecretErr = null;
        await new Promise(r => authMiddleware(wrongSecretSocket, (e) => { wrongSecretErr = e; r(); }));
        assert.notEqual(wrongSecretErr, null);
        assert.match(wrongSecretErr.message, /authentication failed/i);

        // E. Inactive Agent
        const inactiveAgentSocket = createMockSocket(inactiveAgentToken);
        let inactiveAgentErr = null;
        await new Promise(r => authMiddleware(inactiveAgentSocket, (e) => { inactiveAgentErr = e; r(); }));
        assert.notEqual(inactiveAgentErr, null);
        assert.match(inactiveAgentErr.message, /inactive/i);

        // F. Deactivated User
        const inactiveUserSocket = createMockSocket(inactiveUserToken);
        let inactiveUserErr = null;
        await new Promise(r => authMiddleware(inactiveUserSocket, (e) => { inactiveUserErr = e; r(); }));
        assert.notEqual(inactiveUserErr, null);
        assert.match(inactiveUserErr.message, /deactivated/i);
    });

    // 2. Donation Tracking Rooms Authorization
    await t.test('2. Room Authorization: Only authorized donor, assigned agent, managing NGO, and admin can join tracking room', async () => {
        const donorSocket = await setupConnectedSocket(donorToken);
        const agentSocket = await setupConnectedSocket(agentToken);
        const ngoSocket = await setupConnectedSocket(ngoToken);
        const adminSocket = await setupConnectedSocket(adminToken);
        const otherDonorSocket = await setupConnectedSocket(otherDonorToken);
        const otherAgentSocket = await setupConnectedSocket(otherAgentToken);

        // A. Donor joins: Authorized
        let donorJoinAck = null;
        donorSocket.emit('join:donation', { donationId: donationId.toString() }, (res) => { donorJoinAck = res; });
        await new Promise(r => setTimeout(r, 10));
        assert.equal(donorJoinAck?.success, true, 'Donation owner donor must be authorized to join room');
        assert.equal(donorJoinAck?.authorizedAs, 'donor');
        assert.equal(donorSocket.rooms.has(`donation:${donationId}`), true);

        // B. Assigned Agent joins: Authorized
        let agentJoinAck = null;
        agentSocket.emit('join:donation', { donationId: donationId.toString() }, (res) => { agentJoinAck = res; });
        await new Promise(r => setTimeout(r, 10));
        assert.equal(agentJoinAck?.success, true, 'Assigned agent must be authorized to join room');
        assert.equal(agentJoinAck?.authorizedAs, 'agent');
        assert.equal(agentSocket.rooms.has(`donation:${donationId}`), true);

        // C. Managing NGO joins: Authorized
        let ngoJoinAck = null;
        ngoSocket.emit('join:donation', { donationId: donationId.toString() }, (res) => { ngoJoinAck = res; });
        await new Promise(r => setTimeout(r, 10));
        assert.equal(ngoJoinAck?.success, true, 'Managing NGO must be authorized to join room');
        assert.equal(ngoJoinAck?.authorizedAs, 'ngo');
        assert.equal(ngoSocket.rooms.has(`donation:${donationId}`), true);

        // D. Admin joins: Authorized
        let adminJoinAck = null;
        adminSocket.emit('join:donation', { donationId: donationId.toString() }, (res) => { adminJoinAck = res; });
        await new Promise(r => setTimeout(r, 10));
        assert.equal(adminJoinAck?.success, true, 'Administrator must be authorized to join room');
        assert.equal(adminJoinAck?.authorizedAs, 'admin');
        assert.equal(adminSocket.rooms.has(`donation:${donationId}`), true);

        // E. Other Donor (unrelated): Rejected
        let otherDonorAck = null;
        otherDonorSocket.emit('join:donation', { donationId: donationId.toString() }, (res) => { otherDonorAck = res; });
        await new Promise(r => setTimeout(r, 10));
        assert.equal(otherDonorAck?.success, false, 'Unrelated donor must be blocked from joining tracking room');
        assert.match(otherDonorAck?.message, /unauthorized/i);
        assert.equal(otherDonorSocket.rooms.has(`donation:${donationId}`), false);

        // F. Other Agent (unassigned): Rejected
        let otherAgentAck = null;
        otherAgentSocket.emit('join:donation', { donationId: donationId.toString() }, (res) => { otherAgentAck = res; });
        await new Promise(r => setTimeout(r, 10));
        assert.equal(otherAgentAck?.success, false, 'Unassigned agent must be blocked from joining tracking room');
        assert.match(otherAgentAck?.message, /unauthorized/i);
        assert.equal(otherAgentSocket.rooms.has(`donation:${donationId}`), false);
    });

    // 3. Multi-User Live Tracking & GPS Broadcast (Privacy & Performance)
    await t.test('3. Multi-User Real-time Broadcast: Broadcasts agent:location:update to room without sensitive OTP exposure', async () => {
        let broadcastedRoom = null;
        let broadcastedEvent = null;
        let broadcastedPayload = null;

        const origTo = io.to;
        io.to = (room) => {
            broadcastedRoom = room;
            return {
                emit: (event, payload) => {
                    broadcastedEvent = event;
                    broadcastedPayload = payload;
                }
            };
        };

        emitAgentLocationUpdate({
            donationId: donationId.toString(),
            agentLocation: {
                latitude: 28.6145,
                longitude: 77.2095,
                accuracy: 12,
                heading: 90,
                speed: 35,
                updatedAt: new Date()
            },
            currentDistanceKm: 2.4,
            distanceDetails: {
                straightLineDistanceKm: 2.4,
                estimatedRoadDistanceKm: 3.1
            },
            pickupStatus: 'agent_on_the_way',
            statusChanged: true
        });

        assert.equal(broadcastedRoom, `donation:${donationId}`);
        assert.equal(broadcastedEvent, 'agent:location:update');
        assert.equal(broadcastedPayload.donationId, donationId.toString());
        assert.equal(broadcastedPayload.agentLocation.latitude, 28.6145);
        assert.equal(broadcastedPayload.currentDistanceKm, 2.4);
        assert.equal(broadcastedPayload.pickupStatus, 'agent_on_the_way');

        // Security check: sensitive donor fields are never exposed in broadcast
        assert.equal(broadcastedPayload.verificationCode, undefined, 'Sensitive OTP must NEVER be broadcast');
        assert.equal(broadcastedPayload.password, undefined);

        io.to = origTo;
    });

    // 4. Real-time Pickup Status Transitions & Business Events
    await t.test('4. Status Progression Events: donation:pickup:status, donation:collected, donation:received, donation:completed', async () => {
        const eventsEmitted = [];
        const origTo = io.to;
        io.to = (room) => ({
            emit: (event, payload) => {
                eventsEmitted.push({ room, event, payload });
            }
        });

        // A. Agent assigned
        emitDonationPickupStatus({
            donationId: donationId.toString(),
            pickupStatus: 'agent_assigned',
            status: 'accepted',
            assignedAgent: mockAgent
        });
        assert.equal(eventsEmitted.some(e => e.event === 'donation:pickup:status' && e.payload.pickupStatus === 'agent_assigned'), true);

        // B. Donation Collected (emits both status and donation:collected)
        emitDonationPickupStatus({
            donationId: donationId.toString(),
            pickupStatus: 'donation_collected',
            status: 'picked_up'
        });
        assert.equal(eventsEmitted.some(e => e.event === 'donation:collected' && e.payload.status === 'picked_up'), true);

        // C. Final Delivery & Completion (emits donation:received and donation:completed)
        emitDonationPickupStatus({
            donationId: donationId.toString(),
            pickupStatus: 'completed',
            status: 'received'
        });
        assert.equal(eventsEmitted.some(e => e.event === 'donation:received' && e.payload.status === 'received'), true);
        assert.equal(eventsEmitted.some(e => e.event === 'donation:completed' && e.payload.pickupStatus === 'completed'), true);

        io.to = origTo;
    });

    // 5. Disconnection and Reconnection Handling
    await t.test('5. Disconnection and Reconnection: Gracefully handles socket disconnect, room leave and re-joining', async () => {
        const socket = await setupConnectedSocket(donorToken);

        // Join room
        socket.emit('join:donation', { donationId: donationId.toString() }, () => {});
        await new Promise(r => setTimeout(r, 10));
        assert.equal(socket.rooms.has(`donation:${donationId}`), true);

        // Leave room
        socket.emit('leave:donation', { donationId: donationId.toString() }, () => {});
        assert.equal(socket.rooms.has(`donation:${donationId}`), false, 'Socket should successfully leave room');

        // Re-join room
        socket.emit('join:donation', { donationId: donationId.toString() }, () => {});
        await new Promise(r => setTimeout(r, 10));
        assert.equal(socket.rooms.has(`donation:${donationId}`), true, 'Socket should successfully re-join room upon reconnect');

        // Disconnect event
        socket.emit('disconnect', 'transport close');
    });

    // 6. Real-time Chat Messaging
    await t.test('6. Chat Event: emitChatMessage broadcasts message to recipient and sender personal rooms', async () => {
        const chatBroadcasts = [];
        const origTo = io.to;
        io.to = (room) => ({
            emit: (event, payload) => {
                chatBroadcasts.push({ room, event, payload });
            }
        });

        const testMsg = {
            _id: new mongoose.Types.ObjectId().toString(),
            sender: donorId.toString(),
            receiver: ngoUserId.toString(),
            text: 'Hello from donor!',
            createdAt: new Date().toISOString()
        };

        emitChatMessage({
            senderId: donorId.toString(),
            receiverId: ngoUserId.toString(),
            message: testMsg
        });

        assert.equal(chatBroadcasts.some(b => b.room === `user:${ngoUserId}` && b.event === 'chat:message'), true);
        assert.equal(chatBroadcasts.some(b => b.room === `user:${donorId}` && b.event === 'chat:message'), true);

        io.to = origTo;
    });

    // Restore original model methods
    User.findById = origUserFindById;
    PickupAgent.findById = origAgentFindById;
    PickupAgent.findOne = origAgentFindOne;
    Donation.findById = origDonationFindById;
    NGO.findOne = origNgoFindOne;
});
