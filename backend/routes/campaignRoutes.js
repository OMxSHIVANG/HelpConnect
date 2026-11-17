import express from 'express';
import {
    createCampaign,
    getCampaigns,
    getCampaignById,
    getMyCampaigns,
    updateCampaign,
    submitCampaignCompletionReport
} from '../controllers/campaignController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/', getCampaigns);
router.get('/my-campaigns', protect, authorize('ngo', 'admin'), getMyCampaigns);
router.get('/:id', validateObjectId('id'), getCampaignById);
router.post('/', protect, authorize('ngo', 'admin'), createCampaign);
router.put('/:id', protect, validateObjectId('id'), updateCampaign);
router.post('/:id/completion-report', protect, validateObjectId('id'), submitCampaignCompletionReport);

export default router;
