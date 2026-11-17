import express from 'express';
import {
    registerUser,
    loginUser,
    getMe,
    updateUserProfile,
    googleAuth,
    getGoogleClientId,
    deleteMyProfile,
    sendEmailVerificationOtp,
    verifyEmailOtp
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { registerRateLimiter, loginRateLimiter, otpVerificationRateLimiter } from '../middleware/rateLimiter.js';
import { registerValidationRules, loginValidationRules } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/register', registerRateLimiter, registerValidationRules, registerUser);
router.post('/login', loginRateLimiter, loginValidationRules, loginUser);
router.post('/google', loginRateLimiter, googleAuth);
router.get('/google/client-id', getGoogleClientId);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteMyProfile);

// Email Verification Routes
router.post('/send-email-otp', protect, otpVerificationRateLimiter, sendEmailVerificationOtp);
router.post('/verify-email', protect, otpVerificationRateLimiter, verifyEmailOtp);
router.post('/verify-registration-otp', otpVerificationRateLimiter, verifyEmailOtp);
router.post('/resend-registration-otp', otpVerificationRateLimiter, sendEmailVerificationOtp);

export default router;
