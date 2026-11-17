import express from 'express';
import {
    createDonation,
    getMyDonations,
    getNgoDonations,
    getDonationById,
    updateDonationStatus,
    cancelDonation,
    getDonationTimeline,
    getDonationReceipt
} from '../controllers/donationController.js';
import {
    assignAgentToDonation,
    updatePickupStatus,
    updateLiveLocation,
    confirmCollection,
    confirmDelivery,
    getLiveTrackingData,
    startPickupJourney
} from '../controllers/pickupAgentController.js';
import { protect, protectOptional, protectAgent, protectUserOrAgent } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateObjectId, donationValidationRules } from '../middleware/validationMiddleware.js';
import {
    donationCreationRateLimiter,
    gpsRateLimiter,
    otpVerificationRateLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', protect, donationCreationRateLimiter, donationValidationRules, createDonation);
router.get('/my-donations', protect, getMyDonations);
router.get('/ngo-donations', protect, authorize('ngo', 'admin'), getNgoDonations);
router.post('/:id/assign-agent', protect, authorize('ngo', 'admin'), validateObjectId('id'), assignAgentToDonation);
router.patch('/:id/pickup-status', protect, authorize('ngo', 'admin'), validateObjectId('id'), updatePickupStatus);
router.post('/:id/start-journey', protectAgent, validateObjectId('id'), startPickupJourney);
router.post('/:id/live-location', protectAgent, gpsRateLimiter, validateObjectId('id'), updateLiveLocation);
router.post('/:id/confirm-collection', protectAgent, otpVerificationRateLimiter, validateObjectId('id'), confirmCollection);
router.post('/:id/confirm-delivery', protect, authorize('ngo', 'admin'), validateObjectId('id'), confirmDelivery);
router.get('/:id/live-tracking', protectUserOrAgent, validateObjectId('id'), getLiveTrackingData);
router.get('/:id', protect, validateObjectId('id'), getDonationById);
router.get('/:id/timeline', protect, validateObjectId('id'), getDonationTimeline);
router.get('/:id/receipt', protect, validateObjectId('id'), getDonationReceipt);
router.put('/:id/status', protect, validateObjectId('id'), updateDonationStatus);
router.put('/:id/cancel', protect, validateObjectId('id'), cancelDonation);

export default router;
