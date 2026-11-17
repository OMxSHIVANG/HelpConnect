import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from './models/User.js';
import PickupAgent from './models/PickupAgent.js';
import Donation from './models/Donation.js';
import NGO from './models/NGO.js';
import {
    validateCoordinates,
    calculateDistanceKm,
    getDistanceDetails,
    determineNextPickupStatus,
    isValidPickupTransition,
    PICKUP_NOTIFICATION_MESSAGES
} from './utils/geoUtils.js';
import DonationAudit from './models/DonationAudit.js';

let io = null;

/**
 * Get active Socket.IO server instance
 */
export const getIO = () => io;

/**
 * Initialize Socket.IO with HTTP server and CORS settings
 */
export const initSocket = (httpServer, corsOptions) => {
    io = new Server(httpServer, {
        cors: corsOptions || {
            origin: '*',
            credentials: false
        },
        pingTimeout: 30000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });

    // Authenticate socket connections using JWT (User or PickupAgent)
    io.use(async (socket, next) => {
        try {
            const rawToken = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization ||
                socket.handshake.query?.token;

            if (!rawToken) {
                return next(new Error('Authentication failed: Token required'));
            }

            const token = rawToken.replace(/^Bearer\s+/i, '').trim();
            if (!token) {
                return next(new Error('Authentication failed: Malformed token'));
            }

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                return next(new Error('Server configuration error: JWT_SECRET not configured'));
            }

            let decoded;
            try {
                decoded = jwt.verify(token, jwtSecret);
            } catch (err) {
                return next(new Error(`Authentication failed: ${err.message}`));
            }

            // Verify role and identity
            if (decoded.role === 'agent' || decoded.agentCode || decoded.agentId) {
                const agentMongoId = (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id))
                    ? decoded.id
                    : (decoded.agentId && mongoose.Types.ObjectId.isValid(decoded.agentId))
                        ? decoded.agentId
                        : null;
                const agentCode = decoded.agentCode || (decoded.agentId && !mongoose.Types.ObjectId.isValid(decoded.agentId) ? decoded.agentId : null);

                let agent = null;
                if (agentMongoId) {
                    agent = await PickupAgent.findById(agentMongoId);
                }
                if (!agent && (agentCode || decoded.agentId)) {
                    agent = await PickupAgent.findOne({ agentId: agentCode || decoded.agentId });
                }

                if (!agent) {
                    return next(new Error('Authentication failed: Pickup agent not found'));
                }
                if (agent.status !== 'active') {
                    return next(new Error('Authentication failed: Pickup agent account is inactive'));
                }

                socket.agent = agent;
                socket.userType = 'agent';
                socket.authId = agent._id.toString();
                socket.role = 'agent';
                return next();
            } else {
                const userId = decoded.id;
                if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
                    return next(new Error('Authentication failed: Invalid user ID in token'));
                }

                const user = await User.findById(userId);
                if (!user) {
                    return next(new Error('Authentication failed: User not found'));
                }
                if (user.isActive === false) {
                    return next(new Error('Authentication failed: User account is deactivated'));
                }

                socket.user = user;
                socket.userType = 'user';
                socket.authId = user._id.toString();
                socket.role = user.role || 'donor';

                // Look up NGO profile for NGO users
                if (user.role === 'ngo') {
                    try {
                        const ngo = await NGO.findOne({ user: user._id });
                        if (ngo) {
                            socket.ngoId = ngo._id.toString();
                        }
                    } catch (e) {
                        console.error('Error attaching ngoId to socket:', e.message);
                    }
                }

                return next();
            }
        } catch (error) {
            console.error('Socket authentication error:', error.message);
            return next(new Error('Authentication failed: Server error'));
        }
    });

    // Connection event
    io.on('connection', (socket) => {
        // Auto-join personal user/agent room for private notifications & chat
        const personalRoom = `${socket.userType}:${socket.authId}`;
        socket.join(personalRoom);

        // If user is also an NGO representative, join their ngo room
        if (socket.ngoId) {
            socket.join(`ngo:${socket.ngoId}`);
        }

        /**
         * Secure Donation Room Join
         * Event: 'join:donation'
         * Only allows:
         * - Donation owner (donor)
         * - Managing NGO
         * - Assigned pickup agent
         * - Authorized administrator
         */
        socket.on('join:donation', async (payload, callback) => {
            try {
                const donationId = typeof payload === 'string' ? payload : payload?.donationId;

                if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
                    const errRes = { success: false, message: 'Valid donation ID is required' };
                    socket.emit('error', errRes);
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                const donation = await Donation.findById(donationId).populate('ngo');
                if (!donation) {
                    const errRes = { success: false, message: 'Donation not found' };
                    socket.emit('error', errRes);
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                const authId = socket.authId;
                const isAdmin = socket.role === 'admin';
                const isDonor = socket.userType === 'user' && donation.donor?.toString() === authId;
                const isAssignedAgent = socket.userType === 'agent' &&
                    donation.assignedAgent?.toString() === authId &&
                    socket.agent?.status === 'active';

                const donationNgoId = (donation.ngo?._id || donation.ngo)?.toString();
                const isManagingNgo = socket.userType === 'user' && (
                    donation.ngo?.user?.toString() === authId ||
                    (socket.ngoId && donationNgoId === socket.ngoId)
                );

                if (!isAdmin && !isDonor && !isAssignedAgent && !isManagingNgo) {
                    const errRes = {
                        success: false,
                        message: 'Unauthorized: You are not authorized to track this donation'
                    };
                    socket.emit('error', errRes);
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                const roomName = `donation:${donationId}`;
                socket.join(roomName);

                const successRes = {
                    success: true,
                    room: roomName,
                    donationId,
                    authorizedAs: isAdmin ? 'admin' : (isDonor ? 'donor' : (isAssignedAgent ? 'agent' : 'ngo'))
                };

                socket.emit('room:joined', successRes);
                if (typeof callback === 'function') callback(successRes);
            } catch (err) {
                console.error('join:donation error:', err);
                const errRes = { success: false, message: 'Failed to join donation room' };
                socket.emit('error', errRes);
                if (typeof callback === 'function') callback(errRes);
            }
        });

        /**
         * Leave Donation Room
         * Event: 'leave:donation'
         */
        socket.on('leave:donation', (payload, callback) => {
            const donationId = typeof payload === 'string' ? payload : payload?.donationId;
            if (donationId) {
                const roomName = `donation:${donationId}`;
                socket.leave(roomName);
                if (typeof callback === 'function') {
                    callback({ success: true, room: roomName });
                }
            }
        });

        /**
         * Live Agent Location Broadcast via Socket
         * Event: 'agent:location:send'
         */
        socket.on('agent:location:send', async (payload, callback) => {
            try {
                if (socket.userType !== 'agent' || !socket.agent) {
                    const errRes = { success: false, message: 'Only authenticated pickup agents can send live GPS coordinates' };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                if (socket.agent.status !== 'active') {
                    const errRes = { success: false, message: 'Deactivated agent accounts cannot send live GPS coordinates' };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                const { donationId, latitude, longitude, accuracy, heading, speed, timestamp } = payload || {};

                if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
                    const errRes = { success: false, message: 'Valid donation ID is required' };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);

                if (!validateCoordinates(lat, lng)) {
                    const errRes = { success: false, message: 'Invalid GPS coordinates' };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                if (accuracy !== undefined && accuracy !== null) {
                    const acc = parseFloat(accuracy);
                    if (isNaN(acc) || acc < 0 || acc > 500) {
                        const errRes = { success: false, message: 'GPS accuracy outside acceptable threshold (max 500m)' };
                        if (typeof callback === 'function') callback(errRes);
                        return;
                    }
                }

                const donation = await Donation.findById(donationId)
                    .populate('assignedAgent')
                    .populate('donor', 'name email phone city location')
                    .populate('ngo', 'ngoName user address city phone');

                if (!donation) {
                    const errRes = { success: false, message: 'Donation not found' };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                if (donation.pickupStatus === 'completed' || donation.status === 'completed' ||
                    donation.pickupStatus === 'cancelled' || donation.status === 'cancelled') {
                    const errRes = { success: false, message: `Donation is already ${donation.pickupStatus || donation.status}` };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                const assignedId = (donation.assignedAgent?._id || donation.assignedAgent)?.toString();
                if (assignedId !== socket.authId) {
                    const errRes = { success: false, message: 'Not authorized: You are not assigned to this donation' };
                    if (typeof callback === 'function') callback(errRes);
                    return;
                }

                // Check speed jump
                if (donation.agentLocation?.latitude != null && donation.agentLocation?.longitude != null && donation.agentLocation?.updatedAt) {
                    const prevTime = new Date(donation.agentLocation.updatedAt).getTime();
                    const timeElapsedSeconds = Math.max(1, (Date.now() - prevTime) / 1000);
                    if (timeElapsedSeconds < 3600) {
                        const jumpDist = calculateDistanceKm(
                            donation.agentLocation.latitude,
                            donation.agentLocation.longitude,
                            lat,
                            lng
                        );
                        const impliedSpeed = jumpDist / (timeElapsedSeconds / 3600);
                        if (jumpDist > 1 && impliedSpeed > 160) {
                            const errRes = { success: false, message: 'Suspicious location jump detected. Coordinates rejected.' };
                            if (typeof callback === 'function') callback(errRes);
                            return;
                        }
                    }
                }

                // Donor coordinates check
                let donorLat = donation.pickupLocation?.latitude;
                let donorLng = donation.pickupLocation?.longitude;
                if (!validateCoordinates(donorLat, donorLng) && Array.isArray(donation.pickupLocation?.coordinates)) {
                    donorLng = donation.pickupLocation.coordinates[0];
                    donorLat = donation.pickupLocation.coordinates[1];
                }

                const currentPickup = donation.pickupStatus || 'agent_assigned';
                let currentDistanceKm = null;
                let distanceDetails = null;
                let newStatus = null;

                if (validateCoordinates(donorLat, donorLng)) {
                    currentDistanceKm = calculateDistanceKm(lat, lng, donorLat, donorLng);
                    distanceDetails = getDistanceDetails(lat, lng, donorLat, donorLng);

                    if (!donation.trackingSession) donation.trackingSession = {};
                    if (!donation.trackingSession.initialRouteDistanceKm || donation.trackingSession.initialRouteDistanceKm <= 0) {
                        donation.trackingSession.initialRouteDistanceKm = currentDistanceKm > 0 ? currentDistanceKm : 1;
                        donation.trackingSession.startedAt = new Date();
                    }

                    newStatus = determineNextPickupStatus({
                        currentStatus: currentPickup,
                        currentDistanceKm,
                        initialRouteDistanceKm: donation.trackingSession.initialRouteDistanceKm,
                        isFirstUpdate: !donation.agentLocation?.updatedAt
                    });
                }

                // Update location object
                donation.agentLocation = {
                    latitude: lat,
                    longitude: lng,
                    accuracy: accuracy ? Number(accuracy) : null,
                    heading: heading ? Number(heading) : null,
                    speed: speed ? Number(speed) : null,
                    updatedAt: new Date()
                };

                if (donation.trackingSession) {
                    donation.trackingSession.lastActiveAt = new Date();
                    if (currentDistanceKm != null) {
                        donation.trackingSession.distanceToDonorKm = currentDistanceKm;
                    }
                }

                if (newStatus && isValidPickupTransition(currentPickup, newStatus)) {
                    donation.pickupStatus = newStatus;
                    if (!donation.pickupTimeline) donation.pickupTimeline = {};
                    if (newStatus === 'agent_on_the_way') donation.pickupTimeline.agentOnTheWayAt = new Date();
                    if (newStatus === 'agent_nearby') donation.pickupTimeline.agentNearbyAt = new Date();
                    if (newStatus === 'agent_arrived') donation.pickupTimeline.agentArrivedAt = new Date();

                    await DonationAudit.create({
                        donation: donation._id,
                        action: newStatus,
                        fromStatus: currentPickup,
                        toStatus: newStatus,
                        performedBy: socket.agent._id,
                        performerRole: 'agent',
                        notes: `Status automatically updated to ${newStatus} via real-time GPS update.`
                    });
                }

                await donation.save();

                socket.agent.currentLocation = {
                    latitude: lat,
                    longitude: lng,
                    updatedAt: new Date()
                };
                await socket.agent.save();

                // Broadcast real-time location update to authorized room members
                emitAgentLocationUpdate({
                    donationId: donation._id.toString(),
                    agentLocation: donation.agentLocation,
                    currentDistanceKm,
                    distanceDetails,
                    pickupStatus: donation.pickupStatus,
                    statusChanged: Boolean(newStatus)
                });

                if (newStatus) {
                    emitDonationPickupStatus({
                        donationId: donation._id.toString(),
                        pickupStatus: newStatus,
                        status: donation.status,
                        timeline: donation.pickupTimeline,
                        agentLocation: donation.agentLocation,
                        assignedAgent: donation.assignedAgent
                    });
                }

                const successRes = {
                    success: true,
                    pickupStatus: donation.pickupStatus,
                    statusChanged: Boolean(newStatus),
                    currentDistanceKm,
                    distanceDetails,
                    agentLocation: donation.agentLocation
                };

                if (typeof callback === 'function') callback(successRes);
            } catch (err) {
                console.error('agent:location:send error:', err);
                const errRes = { success: false, message: err.message };
                if (typeof callback === 'function') callback(errRes);
            }
        });

        socket.on('disconnect', (reason) => {
            // Clean up socket on disconnect
        });
    });

    return io;
};

/**
 * Emit Agent Location Update to Room
 * Event: 'agent:location:update'
 */
export const emitAgentLocationUpdate = ({
    donationId,
    agentLocation,
    currentDistanceKm,
    distanceDetails,
    pickupStatus,
    statusChanged = false
}) => {
    if (!io || !donationId) return;

    // Sanitize payload to never expose sensitive donor details
    const payload = {
        donationId: donationId.toString(),
        agentLocation: {
            latitude: agentLocation.latitude,
            longitude: agentLocation.longitude,
            accuracy: agentLocation.accuracy,
            heading: agentLocation.heading,
            speed: agentLocation.speed,
            updatedAt: agentLocation.updatedAt || new Date()
        },
        currentDistanceKm: currentDistanceKm != null ? Number(currentDistanceKm) : null,
        distanceDetails: distanceDetails || null,
        pickupStatus,
        statusChanged,
        timestamp: new Date().toISOString()
    };

    io.to(`donation:${donationId}`).emit('agent:location:update', payload);
};

/**
 * Emit Donation Pickup Status & Progression to Room
 * Events:
 * - 'donation:pickup:status'
 * - 'donation:collected' (when collected)
 * - 'donation:received' (when received at NGO)
 * - 'donation:completed' (when pickup lifecycle complete)
 */
export const emitDonationPickupStatus = ({
    donationId,
    pickupStatus,
    status,
    timeline,
    agentLocation,
    assignedAgent,
    message
}) => {
    if (!io || !donationId) return;

    const notifConfig = PICKUP_NOTIFICATION_MESSAGES[pickupStatus];
    const payload = {
        donationId: donationId.toString(),
        pickupStatus,
        status,
        timeline: timeline || null,
        agentLocation: agentLocation || null,
        assignedAgent: assignedAgent ? {
            _id: assignedAgent._id,
            name: assignedAgent.name,
            phone: assignedAgent.phone,
            vehicleType: assignedAgent.vehicleType,
            vehicleNumber: assignedAgent.vehicleNumber
        } : null,
        stageKey: pickupStatus,
        stageLabel: notifConfig?.title || pickupStatus?.replace(/_/g, ' '),
        message: message || notifConfig?.donorMessage || `Pickup status updated to ${pickupStatus}`,
        timestamp: new Date().toISOString()
    };

    // Primary status event
    io.to(`donation:${donationId}`).emit('donation:pickup:status', payload);

    // Specific business event emissions
    if (pickupStatus === 'donation_collected' || status === 'picked_up') {
        io.to(`donation:${donationId}`).emit('donation:collected', payload);
    }

    if (status === 'received') {
        io.to(`donation:${donationId}`).emit('donation:received', payload);
    }

    if (pickupStatus === 'completed' || status === 'completed') {
        io.to(`donation:${donationId}`).emit('donation:completed', payload);
    }
};

/**
 * Emit Real-Time Chat Message
 * Event: 'chat:message'
 */
export const emitChatMessage = ({ senderId, receiverId, message }) => {
    if (!io) return;

    if (receiverId) {
        io.to(`user:${receiverId}`).emit('chat:message', message);
    }
    if (senderId) {
        io.to(`user:${senderId}`).emit('chat:message', message);
    }
};

/**
 * Emit In-App Real-Time Notification
 * Event: 'notification:new'
 */
export const emitNotification = ({ userId, notification }) => {
    if (!io || !userId) return;
    io.to(`user:${userId}`).emit('notification:new', notification);
};
