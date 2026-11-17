import express from 'express';
import {
    createRequirement,
    getRequirements,
    getRequirementById,
    getMyRequirements,
    getRequirementsByNGO,
    updateRequirement,
    deleteRequirement,
    getGroupDonationProgress,
    aiAssistRequirementDraft,
    checkDuplicateRequirement
} from '../controllers/requirementController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateObjectId, requirementValidationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/', getRequirements);
router.get('/my-requirements', protect, authorize('ngo', 'admin'), getMyRequirements);
router.post('/ai-assist', protect, authorize('ngo', 'admin'), aiAssistRequirementDraft);
router.post('/check-duplicate', protect, authorize('ngo', 'admin'), checkDuplicateRequirement);
router.get('/ngo/:ngoId', validateObjectId('ngoId'), getRequirementsByNGO);
router.get('/:id', validateObjectId('id'), getRequirementById);
router.get('/:id/group-progress', validateObjectId('id'), getGroupDonationProgress);
router.post('/', protect, authorize('ngo', 'admin'), requirementValidationRules, createRequirement);
router.put('/:id', protect, validateObjectId('id'), updateRequirement);
router.delete('/:id', protect, validateObjectId('id'), deleteRequirement);

export default router;
