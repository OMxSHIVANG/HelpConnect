import crypto from 'crypto';
import PickupAgent from '../models/PickupAgent.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import Requirement from '../models/Requirement.js';
import Campaign from '../models/Campaign.js';
import Notification from '../models/Notification.js';
import DonationAudit from '../models/DonationAudit.js';
import { formatDonation, formatDonationList } from '../views/donationView.js';
import { runTransactionSafe } from '../utils/transactionHelper.js';
import {
    calculateDistanceKm,
    getCoordinatesForCity,
    validateCoordinates,
    getDistanceDetails,
    estimateRoadDistanceKm,
    PICKUP_STATUS_ORDER,
    VALID_PICKUP_TRANSITIONS,
    isValidPickupTransition,
    PICKUP_NOTIFICATION_MESSAGES,
    determineNextPickupStatus
} from '../utils/geoUtils.js';
import { generateAgentToken } from '../middleware/authMiddleware.js';
import {
    transitionPickupStatus,
    confirmCollectionWithOtp,
    confirmDeliveryAtNgo,
    getStatusDisplayInfo
} from '../services/donationLifecycleService.js';
import {
    emitAgentLocationUpdate,
    emitDonationPickupStatus
} from '../socket.js';
import {
    serializeTrackingResponse,
    determineTrackingRole
} from '../serializers/trackingSerializer.js';

export { VALID_PICKUP_TRANSITIONS, PICKUP_STATUS_ORDER, isValidPickupTransition, determineNextPickupStatus, PICKUP_NOTIFICATION_MESSAGES, getStatusDisplayInfo };

// Helper to get NGO profile for logged-in user or admin override
const getAuthorizedNGO = async (req) => {
    const targetNgoId = req.query.ngoId || req.body?.ngoId;
    if (req.user?.role === 'admin') {
        if (targetNgoId) {
            const explicitNgo = await NGO.findById(targetNgoId);
            if (explicitNgo) return explicitNgo;
        }
        // Fall back to admin's linked NGO or any active registered NGO
        return await NGO.findOne({ user: req.user._id }) || await NGO.findOne({ isVerified: true }) || await NGO.findOne();
    }
    let ngo = await NGO.findOne({ user: req.user._id });
    if (!ngo && req.user?.ngoId) {
        ngo = await NGO.findById(req.user.ngoId);
    }
    return ngo;
};

// @desc    Get all pickup agents for the current NGO
// @route   GET /api/agents
// @access  Private (NGO / Admin)
export const getNgoAgents = async (req, res) => {
    try {
        const ngo = await getAuthorizedNGO(req);
        if (!ngo) {
            if (req.user.role === 'admin') {
                const agents = await PickupAgent.find().select('-password').sort({ createdAt: -1 });
                const agentIds = agents.map(a => a._id);

                // PERFORMANCE OPTIMIZATION: Single batch aggregation replaces N+1 count queries
                const countAggregation = agentIds.length > 0 ? await Donation.aggregate([
                    { $match: { assignedAgent: { $in: agentIds } } },
                    {
                        $group: {
                            _id: '$assignedAgent',
                            totalOrdersCount: { $sum: 1 },
                            activeOrdersCount: {
                                $sum: {
                                    $cond: [{ $in: ['$status', ['accepted', 'picked_up']] }, 1, 0]
                                }
                            }
                        }
                    }
                ]) : [];

                const countMap = new Map();
                for (const row of countAggregation) {
                    countMap.set(row._id.toString(), {
                        totalOrdersCount: row.totalOrdersCount,
                        activeOrdersCount: row.activeOrdersCount
                    });
                }

                const agentsWithCounts = agents.map(agent => {
                    const counts = countMap.get(agent._id.toString()) || { totalOrdersCount: 0, activeOrdersCount: 0 };
                    return {
                        ...agent.toObject(),
                        activeOrdersCount: counts.activeOrdersCount,
                        totalOrdersCount: counts.totalOrdersCount
                    };
                });

                return res.json({
                    success: true,
                    count: agentsWithCounts.length,
                    agents: agentsWithCounts
                });
            }
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit);
        let agentQuery = PickupAgent.find({ ngoId: ngo._id }).select('-password').sort({ createdAt: -1 });

        if (limit > 0) {
            agentQuery = agentQuery.skip((page - 1) * limit).limit(limit);
        }

        const agents = await agentQuery;
        const agentIds = agents.map(a => a._id);

        // PERFORMANCE OPTIMIZATION: Single batch aggregation replaces N+1 count queries
        const countAggregation = agentIds.length > 0 ? await Donation.aggregate([
            { $match: { assignedAgent: { $in: agentIds } } },
            {
                $group: {
                    _id: '$assignedAgent',
                    totalOrdersCount: { $sum: 1 },
                    activeOrdersCount: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['accepted', 'picked_up']] }, 1, 0]
                        }
                    }
                }
            }
        ]) : [];

        const countMap = new Map();
        for (const row of countAggregation) {
            countMap.set(row._id.toString(), {
                totalOrdersCount: row.totalOrdersCount,
                activeOrdersCount: row.activeOrdersCount
            });
        }

        const agentsWithCounts = agents.map(agent => {
            const counts = countMap.get(agent._id.toString()) || { totalOrdersCount: 0, activeOrdersCount: 0 };
            return {
                ...agent.toObject(),
                activeOrdersCount: counts.activeOrdersCount,
                totalOrdersCount: counts.totalOrdersCount
            };
        });

        res.json({
            success: true,
            count: agentsWithCounts.length,
            agents: agentsWithCounts
        });
    } catch (error) {
        console.error('getNgoAgents error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Register a new pickup agent
// @route   POST /api/agents
// @access  Private (NGO / Admin)
export const createAgent = async (req, res) => {
    try {
        const ngo = await getAuthorizedNGO(req);
        if (!ngo) {
            return res.status(404).json({
                success: false,
                message: 'NGO profile not found. Please complete your NGO registration before creating pickup agents.'
            });
        }

        const { fullName, profilePhoto, phone, vehicleType, vehicleNumber, address, additionalDetails, password } = req.body;

        if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
            return res.status(400).json({ success: false, message: 'Agent full name is required' });
        }
        if (fullName.trim().length < 2 || fullName.trim().length > 100) {
            return res.status(400).json({ success: false, message: 'Agent full name must be between 2 and 100 characters' });
        }

        if (!phone || typeof phone !== 'string' || !phone.trim()) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }
        const cleanedPhone = phone.trim().replace(/[\s-]/g, '');
        if (!/^\+?[0-9]{10,15}$/.test(cleanedPhone)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid 10 to 15 digit mobile number' });
        }

        if (!vehicleType || typeof vehicleType !== 'string' || !vehicleType.trim()) {
            return res.status(400).json({ success: false, message: 'Vehicle type is required (e.g. Bike, Car, Auto, Van)' });
        }

        if (!vehicleNumber || typeof vehicleNumber !== 'string' || !vehicleNumber.trim()) {
            return res.status(400).json({ success: false, message: 'Vehicle registration number is required' });
        }
        if (vehicleNumber.trim().length < 4 || vehicleNumber.trim().length > 25) {
            return res.status(400).json({ success: false, message: 'Vehicle registration number must be between 4 and 25 characters' });
        }

        const activationToken = crypto.randomBytes(24).toString('hex');
        const activationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const agentData = {
            ngoId: ngo._id,
            fullName: fullName.trim(),
            profilePhoto: profilePhoto ? String(profilePhoto).trim() : '',
            phone: cleanedPhone,
            vehicleType: vehicleType.trim(),
            vehicleNumber: vehicleNumber.trim().toUpperCase(),
            address: address ? String(address).trim() : '',
            additionalDetails: additionalDetails ? String(additionalDetails).trim() : '',
            status: 'active',
            activationToken,
            activationTokenExpires,
            isActivated: false
        };

        if (password && typeof password === 'string' && password.trim().length >= 6) {
            agentData.password = password.trim();
            agentData.isActivated = true;
            agentData.activatedAt = new Date();
        }

        const agent = await PickupAgent.create(agentData);

        const origin = req.get('origin') || process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
        const clientBaseUrl = origin.replace(/\/$/, '');
        const activationLink = `${clientBaseUrl}/agent/activate?token=${activationToken}&agentId=${agent.agentId}`;

        res.status(201).json({
            success: true,
            message: 'Pickup agent registered successfully',
            agent,
            activationToken,
            activationLink
        });
    } catch (error) {
        console.error('createAgent error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Generate or regenerate activation invite for a pickup agent
// @route   POST /api/agents/:id/invite
// @access  Private (NGO / Admin)
export const generateAgentInvite = async (req, res) => {
    try {
        const agent = await PickupAgent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Pickup agent not found' });
        }

        // Authorization check: Admin has global authority, NGO user must own the agent's NGO
        if (req.user.role !== 'admin') {
            const ngo = await getAuthorizedNGO(req);
            if (!ngo) {
                return res.status(404).json({ success: false, message: 'NGO profile not found' });
            }
            if (agent.ngoId.toString() !== ngo._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to invite this pickup agent' });
            }
        }

        const activationToken = crypto.randomBytes(24).toString('hex');
        const activationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        agent.activationToken = activationToken;
        agent.activationTokenExpires = activationTokenExpires;
        agent.isActivated = false;
        await agent.save();

        const origin = req.get('origin') || process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
        const clientBaseUrl = origin.replace(/\/$/, '');
        const activationLink = `${clientBaseUrl}/agent/activate?token=${activationToken}&agentId=${agent.agentId}`;

        res.json({
            success: true,
            message: `Activation invitation generated for ${agent.fullName}`,
            agentId: agent.agentId,
            activationToken,
            activationLink,
            expiresAt: activationTokenExpires
        });
    } catch (error) {
        console.error('generateAgentInvite error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate pickup agent and return JWT token
// @route   POST /api/agents/auth/login
// @access  Public
export const agentLogin = async (req, res) => {
    try {
        const { agentId, phone, login, password } = req.body;
        const identifier = (login || agentId || phone || '').trim();

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your Agent ID or phone number and password'
            });
        }

        const cleanedPhone = identifier.replace(/[\s-]/g, '');

        const agent = await PickupAgent.findOne({
            $or: [
                { agentId: identifier.toUpperCase() },
                { phone: identifier },
                { phone: cleanedPhone }
            ]
        }).select('+password').populate('ngoId', 'ngoName phone email address city');

        if (!agent) {
            return res.status(404).json({
                success: false,
                notFound: true,
                notRegistered: true,
                message: 'User not found. Please register.'
            });
        }

        if (agent.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your agent account has been deactivated. Please contact your NGO coordinator.'
            });
        }

        if (!agent.password) {
            return res.status(400).json({
                success: false,
                notActivated: true,
                message: 'Your agent account is pending activation. Please use your activation link to set your password.'
            });
        }

        const isMatch = await agent.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid agent credentials'
            });
        }

        const token = generateAgentToken(agent);

        res.json({
            success: true,
            message: 'Pickup agent logged in successfully',
            token,
            agent: {
                _id: agent._id,
                agentId: agent.agentId,
                fullName: agent.fullName,
                phone: agent.phone,
                profilePhoto: agent.profilePhoto,
                vehicleType: agent.vehicleType,
                vehicleNumber: agent.vehicleNumber,
                address: agent.address,
                additionalDetails: agent.additionalDetails,
                status: agent.status,
                isActivated: agent.isActivated,
                ngo: agent.ngoId,
                currentLocation: agent.currentLocation
            }
        });
    } catch (error) {
        console.error('agentLogin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Activate pickup agent account and set password
// @route   POST /api/agents/auth/activate
// @access  Public
export const agentActivate = async (req, res) => {
    try {
        const { activationToken, agentId, phone, password, confirmPassword } = req.body;

        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password and confirmation password do not match'
            });
        }

        const tokenInput = (activationToken || '').trim();
        const agentIdInput = (agentId || '').trim().toUpperCase();
        const phoneInput = (phone || '').trim().replace(/[\s-]/g, '');

        if (!tokenInput && !agentIdInput && !phoneInput) {
            return res.status(400).json({
                success: false,
                message: 'Activation token or Agent ID is required'
            });
        }

        let agent = null;
        if (tokenInput) {
            agent = await PickupAgent.findOne({
                activationToken: tokenInput,
                activationTokenExpires: { $gt: Date.now() }
            }).select('+password').populate('ngoId', 'ngoName phone email address city');
        }

        if (!agent && (agentIdInput || phoneInput) && tokenInput) {
            agent = await PickupAgent.findOne({
                $or: [{ agentId: agentIdInput }, { phone: phoneInput }],
                activationToken: tokenInput
            }).select('+password').populate('ngoId', 'ngoName phone email address city');
        }

        if (!agent) {
            const existing = await PickupAgent.findOne({
                $or: [
                    { activationToken: tokenInput },
                    ...(agentIdInput ? [{ agentId: agentIdInput }] : []),
                    ...(phoneInput ? [{ phone: phoneInput }] : [])
                ]
            });
            if (existing && existing.isActivated) {
                return res.status(400).json({
                    success: false,
                    message: 'This agent account has already been activated. Please log in directly.'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired activation token. Please request a new invite from your NGO.'
            });
        }

        agent.password = password;
        agent.isActivated = true;
        agent.status = 'active';
        agent.activationToken = undefined;
        agent.activationTokenExpires = undefined;
        agent.activatedAt = new Date();

        await agent.save();

        const token = generateAgentToken(agent);

        res.json({
            success: true,
            message: 'Agent account activated successfully! You are now logged in.',
            token,
            agent: {
                _id: agent._id,
                agentId: agent.agentId,
                fullName: agent.fullName,
                phone: agent.phone,
                profilePhoto: agent.profilePhoto,
                vehicleType: agent.vehicleType,
                vehicleNumber: agent.vehicleNumber,
                address: agent.address,
                additionalDetails: agent.additionalDetails,
                status: agent.status,
                isActivated: true,
                ngo: agent.ngoId,
                currentLocation: agent.currentLocation
            }
        });
    } catch (error) {
        console.error('agentActivate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get authenticated pickup agent profile
// @route   GET /api/agents/auth/profile
// @access  Private (Agent)
export const getAgentProfile = async (req, res) => {
    try {
        const agent = req.agent;
        if (!agent) {
            return res.status(401).json({ success: false, message: 'Pickup agent not authenticated' });
        }

        res.json({
            success: true,
            agent: {
                _id: agent._id,
                agentId: agent.agentId,
                fullName: agent.fullName,
                phone: agent.phone,
                profilePhoto: agent.profilePhoto,
                vehicleType: agent.vehicleType,
                vehicleNumber: agent.vehicleNumber,
                address: agent.address,
                additionalDetails: agent.additionalDetails,
                status: agent.status,
                isActivated: agent.isActivated,
                ngo: agent.ngoId,
                currentLocation: agent.currentLocation
            }
        });
    } catch (error) {
        console.error('getAgentProfile error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout pickup agent
// @route   POST /api/agents/auth/logout
// @access  Public / Private
export const agentLogout = async (req, res) => {
    res.json({
        success: true,
        message: 'Pickup agent logged out successfully'
    });
};

// @desc    Get all orders assigned to authenticated agent
// @route   GET /api/agents/my-orders
// @access  Private (Agent)
export const getAgentAssignedOrders = async (req, res) => {
    try {
        const agent = req.agent;
        if (!agent) {
            return res.status(401).json({ success: false, message: 'Pickup agent not authenticated' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit);
        let query = Donation.find({ assignedAgent: agent._id })
            .select('status pickupStatus quantity description pickupAddress pickupLocation assignedAt city scheduledPickupDate agentLocation trackingSession pickupTimeline requirement ngo donor createdAt')
            .populate('donor', 'name phone email city')
            .populate('ngo', 'ngoName phone address city')
            .populate('requirement', 'title category unit')
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const orders = await query;

        const formattedOrders = orders.map(order => {
            const isActive = ['agent_assigned', 'agent_on_the_way', 'agent_nearby', 'agent_arrived'].includes(order.pickupStatus);
            return {
                _id: order._id,
                status: order.status,
                pickupStatus: order.pickupStatus,
                quantity: order.quantity,
                description: order.description,
                pickupAddress: order.pickupAddress,
                pickupLocation: order.pickupLocation,
                assignedAt: order.assignedAt,
                city: order.city,
                scheduledPickupDate: order.scheduledPickupDate,
                agentLocation: order.agentLocation,
                trackingSession: order.trackingSession,
                pickupTimeline: order.pickupTimeline,
                requirement: order.requirement,
                ngo: {
                    ngoName: order.ngo?.ngoName || 'NGO',
                    phone: order.ngo?.phone || '',
                    address: order.ngo?.address || '',
                    city: order.ngo?.city || ''
                },
                // Only provide donor contact info when needed for active pickup
                donor: isActive ? {
                    name: order.donor?.name || 'Donor',
                    phone: order.donor?.phone || '',
                    city: order.donor?.city || order.city
                } : {
                    name: order.donor?.name || 'Donor',
                    city: order.city
                },
                createdAt: order.createdAt
            };
        });

        res.json({
            success: true,
            count: formattedOrders.length,
            orders: formattedOrders
        });
    } catch (error) {
        console.error('getAgentAssignedOrders error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Start pickup journey (agent on the way)
// @route   POST /api/donations/:id/start-journey
// @access  Private (Assigned Agent)
export const startPickupJourney = async (req, res) => {
    try {
        const agent = req.agent;
        if (!agent) {
            return res.status(401).json({ success: false, message: 'Pickup agent not authenticated' });
        }

        const donation = await Donation.findById(req.params.id)
            .populate('donor', 'name phone email')
            .populate('ngo', 'ngoName user phone address');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        if (!donation.assignedAgent || donation.assignedAgent.toString() !== agent._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized: You are not the assigned pickup agent for this donation.'
            });
        }

        if (donation.status === 'completed' || donation.pickupStatus === 'completed') {
            return res.status(400).json({ success: false, message: 'This donation is already completed.' });
        }
        if (donation.status === 'cancelled' || donation.pickupStatus === 'cancelled') {
            return res.status(400).json({ success: false, message: 'This donation has been cancelled.' });
        }

        const oldPickupStatus = donation.pickupStatus;

        // Prevent duplicate transition or backward movement
        if (oldPickupStatus === 'agent_on_the_way') {
            return res.json({
                success: true,
                message: 'Journey is already in progress.',
                donation: formatDonation(donation)
            });
        }

        if (!isValidPickupTransition(oldPickupStatus, 'agent_on_the_way')) {
            return res.status(400).json({
                success: false,
                message: `Cannot start journey from current status '${oldPickupStatus}'.`
            });
        }

        const updatedDonation = await transitionPickupStatus({
            donationId: donation._id,
            targetPickupStatus: 'agent_on_the_way',
            performedBy: agent._id,
            performerRole: 'agent',
            performedByModel: 'PickupAgent',
            reason: `Agent ${agent.fullName} started journey to pickup location.`,
            notes: 'Journey started'
        });

        res.json({
            success: true,
            message: 'Journey started! Status updated to Agent On The Way.',
            donation: formatDonation(updatedDonation)
        });
    } catch (error) {
        console.error('startPickupJourney error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update pickup agent details
// @route   PUT /api/agents/:id
// @access  Private (NGO / Admin)
export const updateAgent = async (req, res) => {
    try {
        const agent = await PickupAgent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Pickup agent not found' });
        }

        // Authorization check: Only owner NGO or Admin can edit
        if (req.user.role !== 'admin') {
            const ngo = await getAuthorizedNGO(req);
            if (!ngo || agent.ngoId.toString() !== ngo._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to edit this pickup agent' });
            }
        }

        const { fullName, profilePhoto, phone, vehicleType, vehicleNumber, address, additionalDetails, status } = req.body;

        if (fullName !== undefined) {
            if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
                return res.status(400).json({ success: false, message: 'Agent full name must be between 2 and 100 characters' });
            }
            agent.fullName = fullName.trim();
        }

        if (profilePhoto !== undefined) {
            agent.profilePhoto = String(profilePhoto).trim();
        }

        if (phone !== undefined) {
            const cleaned = String(phone).trim().replace(/[\s-]/g, '');
            if (!/^\+?[0-9]{10,15}$/.test(cleaned)) {
                return res.status(400).json({ success: false, message: 'Please enter a valid 10 to 15 digit mobile number' });
            }
            agent.phone = cleaned;
        }

        if (vehicleType !== undefined) {
            if (typeof vehicleType !== 'string' || !vehicleType.trim()) {
                return res.status(400).json({ success: false, message: 'Vehicle type cannot be empty' });
            }
            agent.vehicleType = vehicleType.trim();
        }

        if (vehicleNumber !== undefined) {
            if (typeof vehicleNumber !== 'string' || vehicleNumber.trim().length < 4 || vehicleNumber.trim().length > 25) {
                return res.status(400).json({ success: false, message: 'Vehicle registration number must be between 4 and 25 characters' });
            }
            agent.vehicleNumber = vehicleNumber.trim().toUpperCase();
        }

        if (address !== undefined) {
            agent.address = String(address).trim();
        }

        if (additionalDetails !== undefined) {
            agent.additionalDetails = String(additionalDetails).trim();
        }

        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({ success: false, message: "Status must be either 'active' or 'inactive'" });
            }
            agent.status = status;
        }

        await agent.save();

        res.json({
            success: true,
            message: 'Pickup agent updated successfully',
            agent
        });
    } catch (error) {
        console.error('updateAgent error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle agent status between active and inactive
// @route   PATCH /api/agents/:id/status
// @access  Private (NGO / Admin)
export const toggleAgentStatus = async (req, res) => {
    try {
        const agent = await PickupAgent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Pickup agent not found' });
        }

        if (req.user.role !== 'admin') {
            const ngo = await getAuthorizedNGO(req);
            if (!ngo || agent.ngoId.toString() !== ngo._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to modify this agent' });
            }
        }

        agent.status = agent.status === 'active' ? 'inactive' : 'active';
        await agent.save();

        res.json({
            success: true,
            message: `Agent ${agent.fullName} is now ${agent.status}`,
            agent
        });
    } catch (error) {
        console.error('toggleAgentStatus error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all donation orders assigned to an agent
// @route   GET /api/agents/:id/orders
// @access  Private (NGO / Admin)
export const getAgentOrders = async (req, res) => {
    try {
        const agent = await PickupAgent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Pickup agent not found' });
        }

        if (req.user.role !== 'admin') {
            const ngo = await getAuthorizedNGO(req);
            if (!ngo || agent.ngoId.toString() !== ngo._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to view this agent\'s orders' });
            }
        }

        const orders = await Donation.find({ assignedAgent: agent._id })
            .populate('donor', 'name email phone')
            .populate('requirement', 'title category unit')
            .populate('assignedAgent')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: orders.length,
            orders: formatDonationList(orders)
        });
    } catch (error) {
        console.error('getAgentOrders error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Assign or change pickup agent for a donation order
// @route   POST /api/donations/:id/assign-agent
// @access  Private (NGO / Admin)
export const assignAgentToDonation = async (req, res) => {
    try {
        const { agentId, reason } = req.body;
        if (!agentId) {
            return res.status(400).json({ success: false, message: 'Please select a pickup agent' });
        }

        const donation = await Donation.findById(req.params.id)
            .populate('donor', 'name email phone')
            .populate('assignedAgent');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const ngoId = donation.ngo?._id || donation.ngo;
        const ngo = req.user.role === 'admin'
            ? await NGO.findById(ngoId)
            : await NGO.findOne({ user: req.user._id });

        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        // Verify NGO ownership: One NGO cannot assign/manage another NGO's orders
        const donNgoId = (donation.ngo?._id || donation.ngo)?.toString();
        if (donNgoId !== ngo._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this donation order' });
        }

        // 1. Prevent assigning agents to rejected, cancelled or completed donations
        if (['rejected', 'cancelled', 'completed'].includes(donation.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot assign a pickup agent to a ${donation.status} donation order.`
            });
        }

        // 2. Prevent conflicting/redundant duplicate assignment of the same agent
        if (donation.assignedAgent && donation.assignedAgent._id.toString() === agentId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'This pickup agent is already assigned to this donation order.'
            });
        }

        // 3. Find agent and enforce security checks
        const agent = await PickupAgent.findById(agentId);
        if (!agent) {
            return res.status(404).json({ success: false, message: 'Selected pickup agent not found' });
        }

        // STRICT SECURITY: An NGO must never assign an agent belonging to another NGO
        if (agent.ngoId.toString() !== ngo._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You can only assign pickup agents registered with your NGO.'
            });
        }

        // STRICT SECURITY: Inactive agents cannot be assigned
        if (agent.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot assign an inactive pickup agent. Please activate the agent first.'
            });
        }

        const isReassignment = Boolean(donation.assignedAgent && donation.assignedAgent._id.toString() !== agent._id.toString());
        const isFirstAssignment = !donation.assignedAgent;
        const oldStatus = donation.status;
        const prevAgent = isReassignment ? donation.assignedAgent : null;

        // Use MongoDB transaction for atomic acceptance, quantity deduction, agent assignment and audit logging
        let savedDonation;
        await runTransactionSafe(async (session, context) => {
            const opts = session ? { session } : {};

            // If donation was pending, accepting it now: deduct requirement remaining quantity safely
            if (donation.status === 'pending') {
                const updatedReq = await Requirement.findOneAndUpdate(
                    {
                        _id: donation.requirement,
                        remainingQuantity: { $gte: donation.quantity }
                    },
                    {
                        $inc: { remainingQuantity: -donation.quantity }
                    },
                    { new: true, ...opts }
                );

                if (!updatedReq) {
                    throw new Error(`Cannot accept donation: requested quantity (${donation.quantity}) exceeds available remaining needed quantity.`);
                }

                if (updatedReq.remainingQuantity === 0) {
                    await Requirement.findByIdAndUpdate(donation.requirement, { status: 'fulfilled' }, opts);
                }

                donation.status = 'accepted';
            }

            // If changing agent, push old assignment to history
            if (isReassignment && prevAgent) {
                donation.assignmentHistory.push({
                    agent: prevAgent._id,
                    agentId: donation.assignedAgentId || prevAgent.agentId,
                    agentName: prevAgent.fullName,
                    assignedAt: donation.assignedAt || donation.createdAt,
                    changedAt: new Date(),
                    reason: reason ? String(reason).trim() : 'Pickup agent changed by NGO'
                });
            }

            // Set assignment details
            donation.assignedAgent = agent._id;
            donation.assignedAgentId = agent.agentId;
            donation.assignedNgoId = ngo._id;
            donation.assignedAt = new Date();
            donation.pickupStatus = 'agent_assigned';
            if (!donation.pickupTimeline) donation.pickupTimeline = {};
            donation.pickupTimeline.agentAssignedAt = new Date();

            savedDonation = await donation.save(opts);

            // Audit log
            await DonationAudit.create(
                [
                    {
                        donation: donation._id,
                        action: isReassignment ? 'agent_reassigned' : 'agent_assigned',
                        fromStatus: oldStatus,
                        toStatus: donation.status,
                        performedBy: req.user._id,
                        performerRole: req.user.role,
                        notes: isReassignment
                            ? `Agent changed to ${agent.fullName} (${agent.agentId})`
                            : `Order accepted and assigned to ${agent.fullName} (${agent.agentId})`
                    }
                ],
                opts
            );

            // Post-Commit Notification Registration (Never sent before transaction commits!)
            const sendNotifications = async () => {
                try {
                    if (isReassignment) {
                        await Notification.create({
                            recipient: donation.donor._id || donation.donor,
                            sender: req.user._id,
                            type: 'agent_changed',
                            title: 'Pickup Agent Changed',
                            message: `Update on your donation order: ${ngo.ngoName} has assigned a new pickup agent ${agent.fullName} (Agent ID: ${agent.agentId}, ${agent.vehicleType}: ${agent.vehicleNumber}) for pickup.`,
                            relatedId: donation._id,
                            relatedModel: 'Donation'
                        });
                    } else if (isFirstAssignment) {
                        await Notification.create({
                            recipient: donation.donor._id || donation.donor,
                            sender: req.user._id,
                            type: 'agent_assigned',
                            title: PICKUP_NOTIFICATION_MESSAGES.agent_assigned.title,
                            message: PICKUP_NOTIFICATION_MESSAGES.agent_assigned.donorMessage,
                            relatedId: donation._id,
                            relatedModel: 'Donation'
                        });
                        if (ngo?.user) {
                            await Notification.create({
                                recipient: ngo.user,
                                sender: req.user._id,
                                type: 'agent_assigned',
                                title: PICKUP_NOTIFICATION_MESSAGES.agent_assigned.title,
                                message: `Order #${donation._id.toString().slice(-6).toUpperCase()}: ${PICKUP_NOTIFICATION_MESSAGES.agent_assigned.ngoMessage}`,
                                relatedId: donation._id,
                                relatedModel: 'Donation'
                            });
                        }
                    }
                } catch (notifyErr) {
                    console.error('Asynchronous notification delivery error:', notifyErr.message);
                }
            };

            if (context?.onCommit) {
                context.onCommit(sendNotifications);
            } else {
                sendNotifications().catch(() => {});
            }
        });

        const populatedDonation = await Donation.findById(savedDonation._id)
            .populate('donor', 'name email phone')
            .populate('ngo', 'ngoName phone address city state')
            .populate('requirement', 'title category quantity remainingQuantity unit')
            .populate('assignedAgent');

        emitDonationPickupStatus({
            donationId: populatedDonation._id.toString(),
            pickupStatus: 'agent_assigned',
            status: populatedDonation.status,
            timeline: populatedDonation.pickupTimeline,
            agentLocation: populatedDonation.agentLocation,
            assignedAgent: populatedDonation.assignedAgent,
            message: isReassignment ? 'Pickup agent changed' : 'Pickup agent assigned'
        });

        res.json({
            success: true,
            message: isReassignment ? 'Pickup agent replaced successfully' : 'Donation accepted and agent assigned successfully',
            donation: formatDonation(populatedDonation)
        });
    } catch (error) {
        console.error('assignAgentToDonation error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update pickup status (Accepted, Agent Assigned, On the Way, Arrived, Collected, Completed)
// @route   PATCH /api/donations/:id/pickup-status
// @access  Private (NGO / Admin)
export const updatePickupStatus = async (req, res) => {
    try {
        const { pickupStatus, notes } = req.body;
        const validStatusList = Object.keys(VALID_PICKUP_TRANSITIONS);

        if (!validStatusList.includes(pickupStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid pickup status. Allowed values: ${validStatusList.join(', ')}`
            });
        }

        const donation = await Donation.findById(req.params.id)
            .populate('donor', 'name email phone')
            .populate('assignedAgent');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const ngoId = donation.ngo?._id || donation.ngo;
        const ngo = req.user.role === 'admin'
            ? await NGO.findById(ngoId)
            : await NGO.findOne({ user: req.user._id });

        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        const donNgoId = (donation.ngo?._id || donation.ngo)?.toString();
        if (donNgoId !== ngo._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update status for this donation' });
        }

        // 1. Prevent completed or cancelled donations from moving backwards or changing status
        if (donation.pickupStatus === 'completed' || donation.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'This donation pickup has already been completed and cannot be modified.'
            });
        }
        if (donation.pickupStatus === 'cancelled' || donation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This donation pickup has been cancelled and cannot be modified.'
            });
        }

        // 2. Prevent pickup progress updates when no agent is assigned
        if (!donation.assignedAgent && pickupStatus !== 'accepted' && pickupStatus !== 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update pickup progress until a pickup agent has been assigned to this donation.'
            });
        }

        // 3. Enforce valid pickup status transitions (prevents moving backwards)
        const currentPickup = donation.pickupStatus || 'accepted';
        if (!isValidPickupTransition(currentPickup, pickupStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid pickup status transition: cannot change from '${currentPickup}' to '${pickupStatus}'.`
            });
        }

        const updatedDonation = await transitionPickupStatus({
            donationId: req.params.id,
            targetPickupStatus: pickupStatus,
            performedBy: req.user._id,
            performerRole: req.user.role === 'admin' ? 'admin' : 'ngo',
            reason: notes || `Pickup status manually updated to ${pickupStatus}`,
            notes
        });

        res.json({
            success: true,
            message: `Pickup status updated to ${pickupStatus}`,
            donation: formatDonation(updatedDonation)
        });
    } catch (error) {
        console.error('updatePickupStatus error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update live GPS location of assigned pickup agent
// @route   POST /api/donations/:id/live-location
// @access  Private (Assigned Pickup Agent only)
export const updateLiveLocation = async (req, res) => {
    try {
        if (!req.agent) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized: Pickup agent authentication credentials required'
            });
        }

        if (req.agent.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'This pickup agent account has been deactivated. Cannot track live location. Please contact the NGO coordinator.'
            });
        }

        const { latitude, longitude, accuracy, heading, speed, timestamp } = req.body;

        if (latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude coordinates are required for live GPS tracking'
            });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (!validateCoordinates(lat, lng)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid GPS coordinates provided'
            });
        }

        // Validate GPS accuracy (must be between 0 and 500 meters)
        if (accuracy !== undefined && accuracy !== null) {
            const acc = parseFloat(accuracy);
            if (isNaN(acc) || acc < 0 || acc > 500) {
                return res.status(400).json({
                    success: false,
                    message: 'GPS accuracy is outside acceptable threshold (must be within 500 meters)'
                });
            }
        }

        // Validate timestamp recency (within 10 minutes in the past and max 2 minutes in the future)
        if (timestamp) {
            const recorded = new Date(timestamp).getTime();
            const now = Date.now();
            if (isNaN(recorded) || (now - recorded) > 10 * 60 * 1000 || (recorded - now) > 2 * 60 * 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Location timestamp is stale or invalid'
                });
            }
        }

        const donation = await Donation.findById(req.params.id)
            .populate('assignedAgent')
            .populate('donor', 'name email phone city location')
            .populate('ngo', 'ngoName user address city phone');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // Check if order is completed or cancelled
        if (donation.pickupStatus === 'completed' || donation.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'This donation pickup has already been completed.'
            });
        }
        if (donation.pickupStatus === 'cancelled' || donation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This donation pickup has been cancelled.'
            });
        }

        // Verify assigned agent existence
        if (!donation.assignedAgent) {
            return res.status(400).json({
                success: false,
                message: 'No pickup agent is currently assigned to this donation.'
            });
        }

        // Strict Agent Identity & Assignment Verification: Never trust agentId from req.body
        const assignedDbId = (donation.assignedAgent._id || donation.assignedAgent).toString();
        if (assignedDbId !== req.agent._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized: You are not the assigned pickup agent for this donation.'
            });
        }

        // Check for suspicious location jumps / teleportation (> 160 km/h or impossible jumps)
        if (donation.agentLocation?.latitude != null && donation.agentLocation?.longitude != null && donation.agentLocation?.updatedAt) {
            const prevTime = new Date(donation.agentLocation.updatedAt).getTime();
            const timeElapsedSeconds = Math.max(1, (Date.now() - prevTime) / 1000);
            if (timeElapsedSeconds < 3600) {
                const jumpDistanceKm = calculateDistanceKm(
                    donation.agentLocation.latitude,
                    donation.agentLocation.longitude,
                    lat,
                    lng
                );
                const impliedSpeedKmh = jumpDistanceKm / (timeElapsedSeconds / 3600);
                if (jumpDistanceKm > 1 && impliedSpeedKmh > 160) {
                    return res.status(400).json({
                        success: false,
                        message: 'Suspicious location jump detected. Coordinates rejected.'
                    });
                }
            }
        }

        const agent = req.agent;

        // Resolve donor destination coordinates from pickupLocation or geocode lookup
        let donorLat = null;
        let donorLng = null;
        let isDonorLocationVerified = false;

        if (validateCoordinates(donation.pickupLocation?.latitude, donation.pickupLocation?.longitude)) {
            donorLat = donation.pickupLocation.latitude;
            donorLng = donation.pickupLocation.longitude;
            isDonorLocationVerified = donation.pickupLocation.verificationStatus !== 'unverified';
        } else if (donation.pickupLocation?.coordinates && Array.isArray(donation.pickupLocation.coordinates) && donation.pickupLocation.coordinates.length === 2) {
            const [lngCoord, latCoord] = donation.pickupLocation.coordinates;
            if (validateCoordinates(latCoord, lngCoord)) {
                donorLat = latCoord;
                donorLng = lngCoord;
                isDonorLocationVerified = donation.pickupLocation.verificationStatus !== 'unverified';
            }
        }

        if (donorLat == null || donorLng == null) {
            const donorCity = donation.city || donation.donor?.city || donation.donor?.location || '';
            const resolved = getCoordinatesForCity(donorCity, donation.pickupAddress);
            if (resolved && validateCoordinates(resolved[1], resolved[0])) {
                donorLng = resolved[0];
                donorLat = resolved[1];
                isDonorLocationVerified = true;
            }
        }

        const currentPickup = donation.pickupStatus || 'agent_assigned';

        // Requirement 6: If donor coordinates are missing / unverified:
        // Do not trigger automatic distance-based status updates.
        // Sync agent location safely and inform client.
        if (donorLat == null || donorLng == null) {
            donation.agentLocation = {
                latitude: lat,
                longitude: lng,
                accuracy: accuracy ? Number(accuracy) : null,
                heading: heading ? Number(heading) : null,
                speed: speed ? Number(speed) : null,
                updatedAt: new Date()
            };
            if (!donation.trackingSession) donation.trackingSession = {};
            donation.trackingSession.lastActiveAt = new Date();
            await donation.save();

            req.agent.currentLocation = {
                latitude: lat,
                longitude: lng,
                updatedAt: new Date()
            };
            await req.agent.save();

            emitAgentLocationUpdate({
                donationId: donation._id.toString(),
                agentLocation: donation.agentLocation,
                currentDistanceKm: null,
                distanceDetails: null,
                pickupStatus: donation.pickupStatus,
                statusChanged: false
            });

            return res.json({
                success: true,
                pickupStatus: donation.pickupStatus,
                previousStatus: currentPickup,
                statusChanged: false,
                donorLocationVerified: false,
                currentDistanceKm: null,
                distanceDetails: null,
                agentLocation: donation.agentLocation,
                pickupTimeline: donation.pickupTimeline,
                message: 'Live location synced (Donor location not verified; automated distance triggers paused)'
            });
        }

        // Calculate current distance from agent to donor in KM
        const currentDistanceKm = calculateDistanceKm(lat, lng, donorLat, donorLng);
        const distanceDetails = getDistanceDetails(lat, lng, donorLat, donorLng);

        // Check if this is the very first GPS update for this trip
        const isFirstUpdate = !donation.trackingSession || !donation.trackingSession.startedAt;

        // Initialize or update tracking session
        if (!donation.trackingSession) {
            donation.trackingSession = {};
        }
        if (!donation.trackingSession.initialRouteDistanceKm || donation.trackingSession.initialRouteDistanceKm <= 0) {
            donation.trackingSession.initialRouteDistanceKm = currentDistanceKm > 0 ? currentDistanceKm : 1;
            donation.trackingSession.startLocation = { latitude: lat, longitude: lng };
            donation.trackingSession.startedAt = new Date();
        }

        const initialDist = donation.trackingSession.initialRouteDistanceKm;

        // Determine next status according to sequence:
        // accepted -> agent_assigned -> agent_on_the_way -> agent_nearby -> agent_arrived -> donation_collected -> completed
        const newStatus = determineNextPickupStatus({
            currentStatus: currentPickup,
            currentDistanceKm,
            initialRouteDistanceKm: initialDist,
            isFirstUpdate
        });

        // Apply status transition atomically if valid and not duplicate
        if (newStatus && isValidPickupTransition(currentPickup, newStatus)) {
            donation.pickupStatus = newStatus;
            if (!donation.pickupTimeline) donation.pickupTimeline = {};

            if (newStatus === 'agent_on_the_way' && !donation.pickupTimeline.agentOnTheWayAt) {
                donation.pickupTimeline.agentOnTheWayAt = new Date();
            } else if (newStatus === 'agent_nearby' && !donation.pickupTimeline.agentNearbyAt) {
                donation.pickupTimeline.agentNearbyAt = new Date();
            } else if (newStatus === 'agent_arrived' && !donation.pickupTimeline.agentArrivedAt) {
                donation.pickupTimeline.agentArrivedAt = new Date();
            }

            // Create immutable audit log entry
            const performerUserId = req.agent._id;
            const performerRole = 'agent';
            const statusNote = `Status automatically updated to ${newStatus} based on live GPS position (${currentDistanceKm} km from donor).`;

            await DonationAudit.create({
                donation: donation._id,
                action: newStatus,
                fromStatus: currentPickup,
                toStatus: newStatus,
                performedBy: performerUserId,
                performerRole: performerRole,
                notes: statusNote
            });

            // Standard real-time notifications to Donor AND NGO
            const orderRef = donation._id.toString().slice(-6).toUpperCase();
            const notifConfig = PICKUP_NOTIFICATION_MESSAGES[newStatus];

            if (notifConfig) {
                (async () => {
                    try {
                        if (donation.donor?._id || donation.donor) {
                            await Notification.create({
                                recipient: donation.donor._id || donation.donor,
                                type: newStatus,
                                title: notifConfig.title,
                                message: notifConfig.donorMessage,
                                relatedId: donation._id,
                                relatedModel: 'Donation'
                            });
                        }
                        if (donation.ngo?.user) {
                            await Notification.create({
                                recipient: donation.ngo.user,
                                type: newStatus,
                                title: notifConfig.title,
                                message: `Order #${orderRef}: ${notifConfig.ngoMessage}`,
                                relatedId: donation._id,
                                relatedModel: 'Donation'
                            });
                        }
                    } catch (notifErr) {
                        console.error('Error sending location status notification:', notifErr.message);
                    }
                })();
            }
        }

        // Save latest agent location
        donation.agentLocation = {
            latitude: lat,
            longitude: lng,
            accuracy: accuracy ? Number(accuracy) : null,
            heading: heading ? Number(heading) : null,
            speed: speed ? Number(speed) : null,
            updatedAt: new Date()
        };
        donation.trackingSession.distanceToDonorKm = currentDistanceKm;
        donation.trackingSession.lastActiveAt = new Date();

        await donation.save();

        // Also update agent document's currentLocation
        req.agent.currentLocation = {
            latitude: lat,
            longitude: lng,
            updatedAt: new Date()
        };
        await req.agent.save();

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

        res.json({
            success: true,
            pickupStatus: donation.pickupStatus,
            previousStatus: currentPickup,
            statusChanged: Boolean(newStatus),
            currentDistanceKm,
            distanceDetails,
            donorLocationVerified: true,
            initialRouteDistanceKm: donation.trackingSession.initialRouteDistanceKm,
            agentLocation: donation.agentLocation,
            pickupTimeline: donation.pickupTimeline,
            message: newStatus ? `Status automatically updated to ${newStatus.replace(/_/g, ' ')}` : 'Live location synced'
        });
    } catch (error) {
        console.error('updateLiveLocation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Confirm parcel collection by assigned agent
// @route   POST /api/donations/:id/confirm-collection
// @access  Private (Assigned Pickup Agent only)
export const confirmCollection = async (req, res) => {
    try {
        if (!req.agent) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized: Pickup agent authentication required'
            });
        }

        if (req.agent.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'This pickup agent account is inactive. Cannot confirm collection.'
            });
        }

        const { otp, verificationCode, notes } = req.body;
        const enteredOtp = (otp || verificationCode || '').toString().trim().toUpperCase();
        if (!enteredOtp) {
            return res.status(400).json({
                success: false,
                message: 'Donor verification OTP is required to confirm collection.'
            });
        }

        const updatedDonation = await confirmCollectionWithOtp({
            donationId: req.params.id,
            agentId: req.agent._id,
            verificationCode: enteredOtp,
            notes
        });

        res.json({
            success: true,
            message: 'Donation parcel collection confirmed successfully with verified OTP! Status updated to Donation Collected.',
            donation: formatDonation(updatedDonation)
        });
    } catch (error) {
        console.error('confirmCollection error:', error);
        const statusCode = error.message.includes('Not authorized') ? 403 : (error.message.includes('not found') ? 404 : 400);
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Confirm delivery at NGO collection centre and complete pickup
// @route   POST /api/donations/:id/confirm-delivery
// @access  Private (NGO / Admin)
export const confirmDelivery = async (req, res) => {
    try {
        const { notes, verificationCode } = req.body;

        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        const ngoId = donation.ngo?._id || donation.ngo;
        const ngo = req.user.role === 'admin'
            ? await NGO.findById(ngoId)
            : await NGO.findOne({ user: req.user._id });

        if (!ngo && req.user.role !== 'admin') {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        const donNgoId = (donation.ngo?._id || donation.ngo)?.toString();
        if (ngo && donNgoId !== ngo._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to confirm delivery for this donation' });
        }

        const updatedDonation = await confirmDeliveryAtNgo({
            donationId: req.params.id,
            ngoId: ngo?._id,
            userId: req.user._id,
            userRole: req.user.role,
            verificationCode,
            notes
        });

        res.json({
            success: true,
            message: 'Parcel verified and delivery confirmed! Order successfully marked Pickup Completed.',
            donation: formatDonation(updatedDonation)
        });
    } catch (error) {
        console.error('confirmDelivery error:', error);
        const statusCode = error.message.includes('Not authorized') ? 403 : (error.message.includes('not found') ? 404 : 400);
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Get live tracking data for a donation order (Strictly Role-Based & Serialized)
// @route   GET /api/donations/:id/live-tracking
// @access  Private (Donor owner, managing NGO, assigned Agent, Admin)
export const getLiveTrackingData = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id)
            .populate('assignedAgent')
            .populate('donor', 'name phone city location')
            .populate('ngo', 'ngoName phone address city location user');

        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found' });
        }

        // Build requester context without hanging unmocked mongoose operations
        let userNgoId = req.user?.ngoId;
        if (!userNgoId && req.user && req.user.role === 'ngo' && mongoose.connection?.readyState === 1) {
            try {
                const userNgo = await NGO.findOne({ user: req.user._id });
                if (userNgo) userNgoId = userNgo._id;
            } catch (ngoLookupErr) {}
        }

        const requester = {
            user: req.user,
            agent: req.agent,
            role: req.user?.role || (req.agent ? 'agent' : null),
            _id: req.user?._id || req.agent?._id,
            ngoId: userNgoId
        };

        const role = determineTrackingRole(donation, requester);
        if (!role) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized: You do not have permission to access private tracking details for this donation.'
            });
        }

        const donorCity = donation.city || donation.donor?.city || donation.donor?.location || '';
        let donorCoords = null;
        let isDonorLocationVerified = false;

        if (validateCoordinates(donation.pickupLocation?.latitude, donation.pickupLocation?.longitude)) {
            donorCoords = [donation.pickupLocation.longitude, donation.pickupLocation.latitude];
            isDonorLocationVerified = donation.pickupLocation.verificationStatus !== 'unverified';
        } else if (donation.pickupLocation?.coordinates && Array.isArray(donation.pickupLocation.coordinates) && donation.pickupLocation.coordinates.length === 2) {
            const [lng, lat] = donation.pickupLocation.coordinates;
            if (validateCoordinates(lat, lng)) {
                donorCoords = [lng, lat];
                isDonorLocationVerified = donation.pickupLocation.verificationStatus !== 'unverified';
            }
        }

        if (!donorCoords && donorCity) {
            const resolved = getCoordinatesForCity(donorCity, donation.pickupAddress);
            if (resolved && validateCoordinates(resolved[1], resolved[0])) {
                donorCoords = resolved;
                isDonorLocationVerified = true;
            }
        }

        const hasValidNgoCoords = Array.isArray(donation.ngo?.location?.coordinates) &&
            donation.ngo.location.coordinates.length === 2 &&
            (donation.ngo.location.coordinates[0] !== 0 || donation.ngo.location.coordinates[1] !== 0);

        let ngoCoords = null;
        let isNgoLocationVerified = false;

        if (validateCoordinates(donation.ngo?.location?.latitude, donation.ngo?.location?.longitude)) {
            ngoCoords = [donation.ngo.location.longitude, donation.ngo.location.latitude];
            isNgoLocationVerified = true;
        } else if (hasValidNgoCoords) {
            ngoCoords = donation.ngo.location.coordinates;
            isNgoLocationVerified = true;
        } else if (donation.ngo?.city) {
            const resolvedNgo = getCoordinatesForCity(donation.ngo.city, donation.ngo.address);
            if (resolvedNgo) {
                ngoCoords = resolvedNgo;
                isNgoLocationVerified = true;
            }
        }

        const hasAgentLocation = Boolean(
            donation.agentLocation &&
            validateCoordinates(donation.agentLocation.latitude, donation.agentLocation.longitude)
        );

        let currentDistanceKm = null;
        let distanceDetails = null;

        if (hasAgentLocation && donorCoords) {
            distanceDetails = getDistanceDetails(
                donation.agentLocation.latitude,
                donation.agentLocation.longitude,
                donorCoords[1],
                donorCoords[0]
            );
            currentDistanceKm = distanceDetails ? distanceDetails.straightLineDistanceKm : null;
        }

        const context = {
            donorCoords,
            isDonorLocationVerified,
            ngoCoords,
            isNgoLocationVerified,
            currentDistanceKm: currentDistanceKm != null ? currentDistanceKm : donation.trackingSession?.distanceToDonorKm,
            distanceDetails
        };

        // Serialize response strictly based on authorized role
        const responsePayload = serializeTrackingResponse(donation, requester, context);
        if (!responsePayload) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized: You do not have permission to access private tracking details for this donation.'
            });
        }

        res.json(responsePayload);
    } catch (error) {
        console.error('getLiveTrackingData error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
