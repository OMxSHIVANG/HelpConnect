import express from 'express';
import { getPublicStats } from '../controllers/statsController.js';

const router = express.Router();

// @route   GET /api/stats
// @access  Public
router.get('/', getPublicStats);

export default router;
