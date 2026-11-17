import express from 'express';
import { getHealthStatus } from '../controllers/healthController.js';

const router = express.Router();

// @desc    Get API health status
// @route   GET /api/health
// @access  Public
router.get('/', getHealthStatus);

export default router;
