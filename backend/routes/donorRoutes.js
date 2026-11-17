import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getDonorStats,
    getDonorDashboard,
    getDonorProfile,
    updateDonorProfile,
    getFavouriteNGOs,
    toggleFavouriteNGO,
    getDonorNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    submitReview,
    getUrgentNearbyRequirements,
    getSmartDonationRecommendations,
    getDonorImpactPassport,
    updateImpactPrivacy,
    getPublicImpactProfile
} from '../controllers/donorController.js';
import { deleteMyProfile } from '../controllers/authController.js';

const router = express.Router();

// Publicly shareable donor impact passport route
router.get('/impact-passport/public/:donorId', getPublicImpactProfile);

// Authenticated donor routes
router.use(protect);
router.get('/stats', getDonorStats);
router.get('/dashboard', getDonorDashboard);
router.get('/urgent-nearby', getUrgentNearbyRequirements);
router.post('/recommendations', getSmartDonationRecommendations);
router.get('/impact-passport', getDonorImpactPassport);
router.put('/impact-passport/privacy', updateImpactPrivacy);
router.get('/profile', getDonorProfile);
router.put('/profile', updateDonorProfile);
router.delete('/profile', deleteMyProfile);
router.get('/favourites', getFavouriteNGOs);
router.post('/favourites/:ngoId', toggleFavouriteNGO);
router.get('/notifications', getDonorNotifications);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);
router.post('/reviews', submitReview);
export default router;
