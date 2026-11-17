import express from 'express';
import {
    createCommitment,
    getMyCommitments,
    updateCommitmentStatus,
    fulfillCommitmentPledge
} from '../controllers/recurringCommitmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(protect);
router.post('/', createCommitment);
router.get('/my-commitments', getMyCommitments);
router.put('/:id/status', validateObjectId('id'), updateCommitmentStatus);
router.post('/:id/fulfill', validateObjectId('id'), fulfillCommitmentPledge);

export default router;
