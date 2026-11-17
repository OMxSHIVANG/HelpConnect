import express from 'express';
import {
    getNgoAgents,
    createAgent,
    updateAgent,
    toggleAgentStatus,
    getAgentOrders,
    agentLogin,
    agentActivate,
    getAgentProfile,
    agentLogout,
    getAgentAssignedOrders,
    generateAgentInvite
} from '../controllers/pickupAgentController.js';
import { protect, protectAgent } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';
import { loginRateLimiter, otpVerificationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ==========================================
// Pickup Agent Authentication APIs (Separate from User Auth)
// ==========================================
router.post('/auth/login', loginRateLimiter, agentLogin);
router.post('/auth/activate', otpVerificationRateLimiter, agentActivate);
router.post('/auth/logout', agentLogout);
router.get('/auth/profile', protectAgent, getAgentProfile);

// Authenticated Agent Dashboard routes
router.get('/my-orders', protectAgent, getAgentAssignedOrders);
router.get('/donations', protectAgent, getAgentAssignedOrders);

// ==========================================
// NGO / Admin Agent Management Routes
// ==========================================
router.post('/:id/invite', protect, authorize('ngo', 'admin'), validateObjectId('id'), generateAgentInvite);

router.route('/')
    .get(protect, authorize('ngo', 'admin'), getNgoAgents)
    .post(protect, authorize('ngo', 'admin'), createAgent);

router.route('/:id')
    .put(protect, authorize('ngo', 'admin'), validateObjectId('id'), updateAgent);

router.route('/:id/status')
    .patch(protect, authorize('ngo', 'admin'), validateObjectId('id'), toggleAgentStatus);

router.route('/:id/orders')
    .get(protect, authorize('ngo', 'admin'), validateObjectId('id'), getAgentOrders);

export default router;
