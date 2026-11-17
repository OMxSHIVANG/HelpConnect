import { getStatusDisplayInfo } from '../services/donationLifecycleService.js';

const ACTIVE_PICKUP_STATUSES = ['agent_assigned', 'agent_on_the_way', 'agent_nearby', 'agent_arrived'];

/**
 * Check if the donation is currently undergoing active pickup
 * Live coordinates are strictly withheld once completed or cancelled.
 */
export const isPickupActive = (pickupStatus, status) => {
    if (['completed', 'cancelled', 'rejected'].includes(status)) return false;
    if (['completed', 'cancelled'].includes(pickupStatus)) return false;
    return ACTIVE_PICKUP_STATUSES.includes(pickupStatus);
};

/**
 * Determine requester's authorized role for this donation
 * @param {Object} donation 
 * @param {Object} requester - { user, agent, role, _id, ngoId }
 * @returns {'donor'|'ngo'|'agent'|'admin'|null}
 */
export const determineTrackingRole = (donation, requester) => {
    if (!donation || !requester) return null;

    // 1. Admin
    if (requester.user?.role === 'admin' || requester.role === 'admin') {
        return 'admin';
    }

    // 2. Pickup Agent (Must be assigned to this donation)
    if (requester.agent || requester.userType === 'agent' || requester.role === 'agent') {
        const reqAgentId = (requester.agent?._id || requester.agentId || requester._id)?.toString();
        const assignedAgentId = (donation.assignedAgent?._id || donation.assignedAgent)?.toString();
        if (reqAgentId && assignedAgentId && reqAgentId === assignedAgentId) {
            return 'agent';
        }
    }

    const reqUserId = (requester.user?._id || requester._id)?.toString();

    // 3. Donor (Must own the donation offer)
    const donorId = (donation.donor?._id || donation.donor)?.toString();
    if (reqUserId && donorId && reqUserId === donorId) {
        return 'donor';
    }

    // 4. Managing NGO (Must own the recipient NGO facility)
    const donationNgo = donation.ngo;
    const donationNgoUserId = (donationNgo?.user?._id || donationNgo?.user)?.toString();
    const donationNgoId = (donationNgo?._id || donationNgo)?.toString();
    const userNgoId = (requester.ngoId || requester.user?.ngoId)?.toString();

    if (reqUserId && donationNgoUserId && reqUserId === donationNgoUserId) {
        return 'ngo';
    }
    if (userNgoId && donationNgoId && userNgoId === donationNgoId) {
        return 'ngo';
    }

    return null;
};

/**
 * Role-Based Serializer: Donor View
 * Only returns:
 * - Pickup status
 * - Assigned agent's name
 * - Agent vehicle info
 * - Agent profile photo
 * - Agent live location while pickup is active
 * - Estimated distance
 * - Pickup timeline
 * NEVER exposes OTP, password hashes, agent phone, or internal DB fields.
 */
export const serializeDonorTracking = (donation, context = {}) => {
    const pickupStatus = donation.pickupStatus || 'accepted';
    const status = donation.status || 'pending';
    const active = isPickupActive(pickupStatus, status);
    const hasLocation = Boolean(active && donation.agentLocation?.latitude != null && donation.agentLocation?.longitude != null);

    return {
        success: true,
        donationId: donation._id,
        role: 'donor',
        status,
        pickupStatus,
        displayStatus: getStatusDisplayInfo(status, pickupStatus),
        assignedAgent: donation.assignedAgent ? {
            fullName: donation.assignedAgent.fullName || 'Assigned Pickup Agent',
            vehicleType: donation.assignedAgent.vehicleType || '',
            vehicleNumber: donation.assignedAgent.vehicleNumber || '',
            profilePhoto: donation.assignedAgent.profilePhoto || ''
        } : null,
        agentLocation: hasLocation ? {
            latitude: donation.agentLocation.latitude,
            longitude: donation.agentLocation.longitude,
            accuracy: donation.agentLocation.accuracy || null,
            updatedAt: donation.agentLocation.updatedAt || null
        } : null,
        agentStatusMessage: hasLocation
            ? 'Agent Live GPS Active'
            : (active ? 'Waiting for Agent GPS Signal' : 'Pickup Inactive or Concluded'),
        currentDistanceKm: active ? context.currentDistanceKm ?? null : null,
        distanceDetails: context.distanceDetails ?? null,
        donorDestination: {
            address: donation.pickupAddress || '',
            city: donation.city || donation.donor?.city || '',
            isVerified: context.isDonorLocationVerified || false,
            coordinates: context.donorCoords || null,
            latitude: context.donorCoords ? context.donorCoords[1] : null,
            longitude: context.donorCoords ? context.donorCoords[0] : null,
            statusMessage: context.isDonorLocationVerified ? 'Verified Pickup Location' : 'Location Not Verified'
        },
        ngoDestination: {
            ngoName: donation.ngo?.ngoName || 'NGO Center',
            address: donation.ngo?.address || '',
            city: donation.ngo?.city || '',
            coordinates: context.ngoCoords || null,
            latitude: context.ngoCoords ? context.ngoCoords[1] : null,
            longitude: context.ngoCoords ? context.ngoCoords[0] : null,
            isVerified: context.isNgoLocationVerified || false
        },
        pickupTimeline: donation.pickupTimeline || {
            agentAssignedAt: donation.assignedAt || null
        }
    };
};

/**
 * Role-Based Serializer: NGO View
 * Returns:
 * - Complete donation pickup status
 * - Agent details (name, phone, vehicle info, status)
 * - Live agent location while pickup is active
 * - Donor pickup information (address, city, contact info)
 * - Collection and delivery timestamps
 * NEVER exposes donor verification OTP or password hashes.
 */
export const serializeNgoTracking = (donation, context = {}) => {
    const pickupStatus = donation.pickupStatus || 'accepted';
    const status = donation.status || 'pending';
    const active = isPickupActive(pickupStatus, status) || pickupStatus === 'donation_collected';
    const hasLocation = Boolean(active && donation.agentLocation?.latitude != null && donation.agentLocation?.longitude != null);

    return {
        success: true,
        donationId: donation._id,
        role: 'ngo',
        status,
        pickupStatus,
        displayStatus: getStatusDisplayInfo(status, pickupStatus),
        assignedAgent: donation.assignedAgent ? {
            _id: donation.assignedAgent._id,
            agentId: donation.assignedAgent.agentId,
            fullName: donation.assignedAgent.fullName,
            phone: donation.assignedAgent.phone,
            vehicleType: donation.assignedAgent.vehicleType,
            vehicleNumber: donation.assignedAgent.vehicleNumber,
            profilePhoto: donation.assignedAgent.profilePhoto || '',
            status: donation.assignedAgent.status
        } : null,
        agentLocation: hasLocation ? {
            latitude: donation.agentLocation.latitude,
            longitude: donation.agentLocation.longitude,
            accuracy: donation.agentLocation.accuracy || null,
            heading: donation.agentLocation.heading || null,
            speed: donation.agentLocation.speed || null,
            updatedAt: donation.agentLocation.updatedAt || null
        } : null,
        donorPickupInfo: {
            name: donation.donor?.name || 'Donor',
            phone: donation.donor?.phone || '',
            pickupAddress: donation.pickupAddress || '',
            city: donation.city || donation.donor?.city || '',
            coordinates: context.donorCoords || null,
            isVerified: context.isDonorLocationVerified || false
        },
        donorDestination: {
            name: donation.donor?.name || 'Donor',
            phone: donation.donor?.phone || '',
            address: donation.pickupAddress || '',
            city: donation.city || donation.donor?.city || '',
            coordinates: context.donorCoords || null,
            isVerified: context.isDonorLocationVerified || false
        },
        ngoDestination: {
            ngoName: donation.ngo?.ngoName || 'NGO Center',
            phone: donation.ngo?.phone || '',
            address: donation.ngo?.address || '',
            city: donation.ngo?.city || '',
            coordinates: context.ngoCoords || null,
            isVerified: context.isNgoLocationVerified || false
        },
        pickupTimeline: donation.pickupTimeline || {},
        collectionTimestamp: donation.pickupTimeline?.donationCollectedAt || null,
        deliveryTimestamp: donation.pickupTimeline?.completedAt || null,
        trackingSession: donation.trackingSession ? {
            initialRouteDistanceKm: donation.trackingSession.initialRouteDistanceKm,
            distanceToDonorKm: donation.trackingSession.distanceToDonorKm,
            startedAt: donation.trackingSession.startedAt,
            lastActiveAt: donation.trackingSession.lastActiveAt
        } : null,
        currentDistanceKm: context.currentDistanceKm ?? null,
        distanceDetails: context.distanceDetails ?? null
    };
};

/**
 * Role-Based Serializer: Assigned Pickup Agent View
 * Returns:
 * - Only the assigned donation information
 * - Donor pickup address and contact details (redacted after pickup completed)
 * - NGO destination
 * - Pickup instructions
 * NEVER exposes donor verification OTP.
 */
export const serializeAgentTracking = (donation, context = {}) => {
    const pickupStatus = donation.pickupStatus || 'accepted';
    const status = donation.status || 'pending';
    const active = isPickupActive(pickupStatus, status);
    const isCollectedOrLater = ['donation_collected', 'completed'].includes(pickupStatus) || ['picked_up', 'received', 'completed'].includes(status);

    return {
        success: true,
        donationId: donation._id,
        role: 'agent',
        status,
        pickupStatus,
        displayStatus: getStatusDisplayInfo(status, pickupStatus),
        assignedAgent: {
            _id: donation.assignedAgent?._id || donation.assignedAgent,
            agentId: donation.assignedAgent?.agentId || '',
            fullName: donation.assignedAgent?.fullName || ''
        },
        assignedDonation: {
            category: donation.requirement?.category || donation.category || 'Donation Package',
            quantity: donation.quantity,
            unit: donation.requirement?.unit || 'items',
            description: donation.description || '',
            pickupAddress: donation.pickupAddress || '',
            city: donation.city || donation.donor?.city || '',
            scheduledPickupDate: donation.scheduledPickupDate || null
        },
        pickupAddress: donation.pickupAddress || '',
        pickupInstructions: donation.pickupInstructions || donation.description || 'Proceed to donor pickup location.',
        donorContact: !isCollectedOrLater ? {
            name: donation.donor?.name || 'Donor',
            phone: donation.donor?.phone || '',
            city: donation.city || donation.donor?.city || ''
        } : {
            name: donation.donor?.name || 'Donor',
            city: donation.city || donation.donor?.city || '',
            phone: '[Redacted - Parcel Collected]'
        },
        donorDestination: {
            name: donation.donor?.name || 'Donor',
            phone: !isCollectedOrLater ? (donation.donor?.phone || '') : '[Redacted - Parcel Collected]',
            address: donation.pickupAddress || '',
            city: donation.city || donation.donor?.city || '',
            isVerified: context.isDonorLocationVerified || false,
            coordinates: context.donorCoords || null,
            latitude: context.donorCoords ? context.donorCoords[1] : null,
            longitude: context.donorCoords ? context.donorCoords[0] : null
        },
        ngoDestination: {
            ngoName: donation.ngo?.ngoName || 'NGO Center',
            phone: donation.ngo?.phone || '',
            address: donation.ngo?.address || '',
            city: donation.ngo?.city || '',
            coordinates: context.ngoCoords || null,
            latitude: context.ngoCoords ? context.ngoCoords[1] : null,
            longitude: context.ngoCoords ? context.ngoCoords[0] : null,
            isVerified: context.isNgoLocationVerified || false
        },
        agentLocation: donation.agentLocation ? {
            latitude: donation.agentLocation.latitude,
            longitude: donation.agentLocation.longitude,
            accuracy: donation.agentLocation.accuracy || null,
            heading: donation.agentLocation.heading || null,
            speed: donation.agentLocation.speed || null,
            updatedAt: donation.agentLocation.updatedAt || null
        } : null,
        pickupTimeline: donation.pickupTimeline || {},
        currentDistanceKm: context.currentDistanceKm ?? null,
        distanceDetails: context.distanceDetails ?? null
    };
};

/**
 * Role-Based Serializer: Admin View
 * Full audit and tracking access without exposing password hashes or private tokens.
 */
export const serializeAdminTracking = (donation, context = {}) => {
    const pickupStatus = donation.pickupStatus || 'accepted';
    const status = donation.status || 'pending';

    return {
        success: true,
        donationId: donation._id,
        role: 'admin',
        status,
        pickupStatus,
        displayStatus: getStatusDisplayInfo(status, pickupStatus),
        assignedAgent: donation.assignedAgent ? {
            _id: donation.assignedAgent._id,
            agentId: donation.assignedAgent.agentId,
            fullName: donation.assignedAgent.fullName,
            phone: donation.assignedAgent.phone,
            vehicleType: donation.assignedAgent.vehicleType,
            vehicleNumber: donation.assignedAgent.vehicleNumber,
            status: donation.assignedAgent.status
        } : null,
        donorDestination: {
            name: donation.donor?.name || 'Donor',
            phone: donation.donor?.phone || '',
            address: donation.pickupAddress || '',
            city: donation.city || donation.donor?.city || '',
            coordinates: context.donorCoords || null,
            isVerified: context.isDonorLocationVerified || false
        },
        ngoDestination: {
            ngoName: donation.ngo?.ngoName || 'NGO Center',
            phone: donation.ngo?.phone || '',
            address: donation.ngo?.address || '',
            city: donation.ngo?.city || '',
            coordinates: context.ngoCoords || null,
            isVerified: context.isNgoLocationVerified || false
        },
        agentLocation: donation.agentLocation || null,
        trackingSession: donation.trackingSession || null,
        pickupTimeline: donation.pickupTimeline || null,
        currentDistanceKm: context.currentDistanceKm ?? null,
        distanceDetails: context.distanceDetails ?? null,
        isVerificationCodeUsed: donation.isVerificationCodeUsed || false,
        verificationCodeExpiresAt: donation.verificationCodeExpiresAt || null
    };
};

/**
 * Main Entry Point: Safe Tracking Response Serializer
 * Selects only permitted fields based on caller role.
 */
export const serializeTrackingResponse = (donation, requester, context = {}) => {
    const role = determineTrackingRole(donation, requester);

    switch (role) {
        case 'donor':
            return serializeDonorTracking(donation, context);
        case 'ngo':
            return serializeNgoTracking(donation, context);
        case 'agent':
            return serializeAgentTracking(donation, context);
        case 'admin':
            return serializeAdminTracking(donation, context);
        default:
            return null;
    }
};
