import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PickupAgent from '../models/PickupAgent.js';

/**
 * Generate signed JWT token for standard users (donor, NGO, admin)
 * @param {Object} user - User document or object with _id and role
 * @returns {String} JWT token
 */
export const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured on server.');
    }

    const userId = user._id ? user._id.toString() : user.id;
    return jwt.sign(
        { id: userId, role: user.role || 'user' },
        secret,
        { expiresIn: '7d' }
    );
};

/**
 * Generate signed JWT token specifically for pickup agents
 * @param {Object} agent - PickupAgent document or object with _id and agentId
 * @returns {String} JWT token
 */
export const generateAgentToken = (agent) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured on server.');
    }

    const agentDbId = agent._id ? agent._id.toString() : agent.id;
    return jwt.sign(
        { id: agentDbId, agentCode: agent.agentId, role: 'agent' },
        secret,
        { expiresIn: '7d' }
    );
};

/**
 * Protect routes: verify JWT Bearer token for standard users
 */
export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return res.status(500).json({ success: false, message: 'Server configuration error: JWT_SECRET missing' });
            }

            const decoded = jwt.verify(token, secret);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authorized: user account not found' });
            }

            if (req.user.isActive === false) {
                return res.status(403).json({ success: false, message: 'Account has been suspended. Please contact support.' });
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    expired: true,
                    message: 'Session expired. Please log in again.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Not authorized: invalid or corrupted token'
            });
        }
    } else {
        return res.status(401).json({
            success: false,
            message: 'Not authorized: no authentication token provided'
        });
    }
};

/**
 * Pickup Agent authorization middleware:
 * - Verifies agent JWT
 * - Identifies authenticated agent
 * - Checks whether agent account is active
 * - Rejects expired or invalid tokens
 * - Attaches verified agent document to req.agent
 */
export const protectAgent = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return res.status(500).json({ success: false, message: 'Server configuration error: JWT_SECRET missing' });
            }

            const decoded = jwt.verify(token, secret);

            // Rejects non-agent tokens (e.g. standard donor/ngo trying to perform agent operations)
            if (decoded.role !== 'agent') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Requires valid pickup agent credentials'
                });
            }

            const agent = await PickupAgent.findById(decoded.id).select('-password').populate('ngoId', 'ngoName phone email address city');

            if (!agent) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized: Pickup agent account not found'
                });
            }

            // Checks whether agent account is active
            if (agent.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'This pickup agent account has been deactivated. Access denied.'
                });
            }

            req.agent = agent;
            req.user = {
                _id: agent._id,
                role: 'agent',
                agentId: agent.agentId,
                name: agent.fullName
            };

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    expired: true,
                    message: 'Session expired. Please log in again.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Not authorized: invalid or corrupted token'
            });
        }
    } else {
        return res.status(401).json({
            success: false,
            message: 'Not authorized: no authentication token provided'
        });
    }
};

/**
 * Dual authorization middleware:
 * Accepts valid JWT from either standard users (donor, NGO, admin) or pickup agents.
 */
export const protectUserOrAgent = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return res.status(500).json({ success: false, message: 'Server configuration error: JWT_SECRET missing' });
            }

            const decoded = jwt.verify(token, secret);

            if (decoded.role === 'agent') {
                const agent = await PickupAgent.findById(decoded.id).select('-password').populate('ngoId', 'ngoName phone email address city');
                if (!agent) {
                    return res.status(401).json({ success: false, message: 'Not authorized: Pickup agent not found' });
                }
                if (agent.status !== 'active') {
                    return res.status(403).json({ success: false, message: 'This pickup agent account has been deactivated.' });
                }
                req.agent = agent;
                req.user = {
                    _id: agent._id,
                    role: 'agent',
                    agentId: agent.agentId,
                    name: agent.fullName
                };
            } else {
                const user = await User.findById(decoded.id).select('-password');
                if (!user) {
                    return res.status(401).json({ success: false, message: 'Not authorized: user account not found' });
                }
                req.user = user;
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    expired: true,
                    message: 'Session expired. Please log in again.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Not authorized: invalid or corrupted token'
            });
        }
    } else {
        return res.status(401).json({
            success: false,
            message: 'Not authorized: authentication token required'
        });
    }
};

/**
 * Optional authentication: populates req.user if valid token provided, continues otherwise
 */
export const protectOptional = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET;
            if (secret) {
                const decoded = jwt.verify(token, secret);
                if (decoded.role === 'agent') {
                    const agent = await PickupAgent.findById(decoded.id).select('-password');
                    if (agent && agent.status === 'active') {
                        req.agent = agent;
                        req.user = {
                            _id: agent._id,
                            role: 'agent',
                            agentId: agent.agentId,
                            name: agent.fullName
                        };
                    }
                } else {
                    req.user = await User.findById(decoded.id).select('-password');
                }
            }
        } catch {
            // Ignore optional auth error and continue
        }
    }
    next();
};

export default protect;
