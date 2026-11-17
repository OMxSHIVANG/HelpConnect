import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

// @desc    Upload image to Cloudinary (or fallback Data URI)
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.any(), uploadImage);

export default router;
