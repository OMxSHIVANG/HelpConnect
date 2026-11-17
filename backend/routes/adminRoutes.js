import express from 'express';
import {
    getAdminStats,
    getAllUsers,
    deleteUserByAdmin,
    getAllNGOs,
    toggleNGOVerification,
    deleteNGOByAdmin,
    getAllDonations,
    toggleUserSuspension,
    getAdminAuditLogs,
    getSuspiciousActivityAlerts,
    getAllCampaignsAdmin,
    getAllReviewsAdmin,
    deleteReviewByAdmin
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Apply auth and admin authorization to all admin routes
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', validateObjectId('id'), toggleUserSuspension);
router.delete('/users/:id', validateObjectId('id'), deleteUserByAdmin);
router.get('/ngos', getAllNGOs);
router.put('/ngos/:id/verify', validateObjectId('id'), toggleNGOVerification);
router.delete('/ngos/:id', validateObjectId('id'), deleteNGOByAdmin);
router.get('/donations', getAllDonations);
router.get('/campaigns', getAllCampaignsAdmin);
router.get('/audit-logs', getAdminAuditLogs);
router.get('/suspicious-alerts', getSuspiciousActivityAlerts);
router.get('/reviews', getAllReviewsAdmin);
router.delete('/reviews/:id', validateObjectId('id'), deleteReviewByAdmin);

export default router;
