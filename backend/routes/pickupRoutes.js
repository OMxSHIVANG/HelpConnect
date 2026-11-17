import express from 'express';
import {
    schedulePickup,
    getPickupScheduleByDonation,
    getNgoPickups,
    reschedulePickup,
    updatePickupStatus
} from '../controllers/pickupScheduleController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(protect);
router.post('/', schedulePickup);
router.get('/donation/:donationId', validateObjectId('donationId'), getPickupScheduleByDonation);
router.get('/ngo-calendar', authorize('ngo', 'admin'), getNgoPickups);
router.put('/:id/reschedule', validateObjectId('id'), reschedulePickup);
router.put('/:id/status', authorize('ngo', 'admin'), validateObjectId('id'), updatePickupStatus);

export default router;
