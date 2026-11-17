import express from 'express';
import {
    registerNGOProfile,
    getNGOs,
    getNGOProfile,
    updateNGOProfile,
    getNGOById,
    getNGOTransparencyScorecard
} from '../controllers/ngoController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId, ngoRegisterValidationRules } from '../middleware/validationMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { getNGODashboardStats, updateNGOProfileFull, getNGODonationRequests, getNGODonors } from '../controllers/ngoProfileController.js';
import { getDonorNotifications, markNotificationRead, markAllNotificationsRead } from '../controllers/donorController.js';

const router = express.Router();

router.get('/', getNGOs);
router.post('/register', protect, ngoRegisterValidationRules, registerNGOProfile);
router.get('/profile', protect, getNGOProfile);
router.put('/profile', protect, updateNGOProfile);
router.get('/dashboard', protect, authorize('ngo', 'admin'), getNGODashboardStats);
router.put('/profile/full', protect, authorize('ngo', 'admin'), updateNGOProfileFull);
router.get('/donation-requests', protect, authorize('ngo', 'admin'), getNGODonationRequests);
router.get('/donors', protect, authorize('ngo', 'admin'), getNGODonors);
router.get('/notifications', protect, getDonorNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsRead);
router.put('/notifications/:id/read', protect, markNotificationRead);
router.get('/:id', validateObjectId('id'), getNGOById);
router.get('/:id/transparency', validateObjectId('id'), getNGOTransparencyScorecard);

export default router;
