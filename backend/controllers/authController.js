import crypto from 'crypto';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import Donation from '../models/Donation.js';
import Requirement from '../models/Requirement.js';
import Notification from '../models/Notification.js';
import FavouriteNGO from '../models/FavouriteNGO.js';
import Review from '../models/Review.js';
import { OAuth2Client } from 'google-auth-library';
import { formatUser } from '../views/userView.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { sendEmail } from '../utils/emailService.js';

let googleClient = null;
const getGoogleClient = () => {
    if (!googleClient && process.env.GOOGLE_CLIENT_ID) {
        googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID.trim());
    }
    return googleClient;
};

// @desc    Register new user or NGO user (Public)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, location, role } = req.body;

        const normalizedEmail = email?.toLowerCase().trim();
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists' });
        }

        // Public registration MUST NEVER allow 'admin' role
        // Only 'user' or 'ngo' are valid public registration roles
        const validRole = role === 'ngo' ? 'ngo' : 'user';

        // Generate 6-digit OTP for email verification upon registration
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            phone: phone ? phone.trim() : '',
            location: location ? location.trim() : '',
            role: validRole,
            isEmailVerified: false,
            emailVerificationOtp: otp,
            emailVerificationOtpExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        });

        // Send Email Verification OTP immediately
        await sendEmail({
            to: user.email,
            subject: 'HelpConnect - Your Email Verification Code',
            text: `Welcome to HelpConnect! Your email verification code is: ${otp}. It will expire in 10 minutes.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Welcome to HelpConnect! ✨</h2>
                    <p style="color: #475569; font-size: 14px;">Thank you for registering. Please enter the following 6-digit code on the registration page to verify your email address and activate your account:</p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #16a34a; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 12px;">This verification code expires in 10 minutes.</p>
                </div>
            `
        });

        const token = generateToken(user);
        const responseData = {
            ...formatUser(user, token),
            requiresEmailVerification: true,
            message: 'Registration successful! Verification code sent to your email.'
        };
        res.status(201).json(responseData);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal registration error' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide both email and password' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                success: false,
                notFound: true,
                notRegistered: true,
                message: 'User not found. Please register first.'
            });
        }

        if (await user.matchPassword(password)) {
            if (user.isActive === false) {
                return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
            }

            let ngoProfile = null;
            if (user.role === 'ngo') {
                ngoProfile = await NGO.findOne({ user: user._id });
            }

            const token = generateToken(user);
            res.json(formatUser(user, token, ngoProfile));
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal login error' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let ngoProfile = null;
        if (user.role === 'ngo') {
            ngoProfile = await NGO.findOne({ user: user._id });
        }

        res.json(formatUser(user, null, ngoProfile));
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal profile error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Strictly allow-list editable fields to prevent mass assignment (e.g. role tampering)
        if (req.body.name && typeof req.body.name === 'string') {
            user.name = req.body.name.trim();
        }
        if (req.body.phone !== undefined && typeof req.body.phone === 'string') {
            user.phone = req.body.phone.trim();
        }
        if (req.body.location !== undefined && typeof req.body.location === 'string') {
            user.location = req.body.location.trim();
        }

        const extraFields = ['username', 'gender', 'dateOfBirth', 'address', 'city', 'state', 'pincode', 'bio', 'avatar'];
        extraFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
            }
        });

        if (req.body.password) {
            if (req.body.password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
            }
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        let ngoProfile = null;
        if (updatedUser.role === 'ngo') {
            ngoProfile = await NGO.findOne({ user: updatedUser._id });
        }

        const token = generateToken(updatedUser);
        res.json(formatUser(updatedUser, token, ngoProfile));
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal update error' });
    }
};

// @desc    Authenticate or register user via Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
    try {
        const { credential, role } = req.body;

        if (!credential) {
            return res.status(400).json({ success: false, message: 'Google credential is required' });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            return res.status(500).json({ success: false, message: 'Google OAuth is not configured on the server' });
        }

        const client = getGoogleClient();
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: clientId
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(401).json({ success: false, message: 'Invalid Google token payload' });
        }

        const { sub: googleId, email, name, picture } = payload;
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

        if (user) {
            if (user.isActive === false) {
                return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
            }
            if (!user.googleId) {
                user.googleId = googleId;
                if (picture && !user.avatar) {
                    user.avatar = picture;
                }
            }
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                user.emailVerifiedAt = new Date();
            }
            await user.save();
        } else {
            // New user registration via Google:
            // If user is trying to log in for the first time without having registered, do NOT auto-create account
            if (!role && !req.body.isRegistration) {
                return res.status(404).json({
                    success: false,
                    notFound: true,
                    notRegistered: true,
                    message: 'User not found. Please register first.'
                });
            }

            // Strictly restrict role to 'user' or 'ngo'
            const validRole = role === 'ngo' ? 'ngo' : 'user';

            user = await User.create({
                name: name || 'Google User',
                email: normalizedEmail,
                googleId,
                avatar: picture || '',
                role: validRole,
                phone: '',
                location: '',
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            });
        }

        let ngoProfile = null;
        if (user.role === 'ngo') {
            ngoProfile = await NGO.findOne({ user: user._id });
        }

        const token = generateToken(user);
        res.json(formatUser(user, token, ngoProfile));
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(400).json({
            success: false,
            message: error.message ? `Google authentication failed: ${error.message}` : 'Google authentication failed'
        });
    }
};

// @desc    Delete current user profile and account
// @route   DELETE /api/auth/profile
// @access  Private
export const deleteMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deleting the primary admin account if role is admin
        if (user.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Admin accounts cannot be self-deleted.' });
        }

        // If NGO user, clean up associated NGO documents
        const ngo = await NGO.findOne({ user: userId });
        if (ngo) {
            await Requirement.deleteMany({ ngo: ngo._id });
            await Donation.deleteMany({ ngo: ngo._id });
            await FavouriteNGO.deleteMany({ ngo: ngo._id });
            await Review.deleteMany({ ngo: ngo._id });
            await ngo.deleteOne();
        }

        // Clean up donor/user related records
        await Donation.deleteMany({ donor: userId });
        await FavouriteNGO.deleteMany({ user: userId });
        await Review.deleteMany({ donor: userId });
        await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

        // Delete user account
        await user.deleteOne();

        res.json({ success: true, message: 'Your profile and account have been permanently deleted.' });
    } catch (error) {
        console.error('Delete my profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete account' });
    }
};

// @desc    Send Email Verification OTP
// @route   POST /api/auth/send-email-otp
// @access  Private
export const sendEmailVerificationOtp = async (req, res) => {
    try {
        const email = req.body?.email?.toLowerCase().trim();
        let user = null;
        if (req.user?._id) {
            user = await User.findById(req.user._id);
        } else if (email) {
            user = await User.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'Your email address is already verified' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailVerificationOtp = otp;
        user.emailVerificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save();

        // Send Email
        const emailResult = await sendEmail({
            to: user.email,
            subject: 'HelpConnect - Email Verification Code',
            text: `Your HelpConnect email verification code is: ${otp}. It will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <h2 style="color: #0f172a; margin-top: 0;">HelpConnect Email Verification</h2>
                    <p style="color: #475569; font-size: 14px;">Please use the following 6-digit code to verify your email address:</p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #16a34a; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 12px;">This verification code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: emailResult?.success
                ? `Verification code sent to ${user.email}`
                : `Verification code generated for ${user.email}`,
            emailDelivered: Boolean(emailResult?.success),
            simulated: Boolean(emailResult?.simulated)
        });
    } catch (error) {
        console.error('Send email OTP error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to send verification email' });
    }
};

// @desc    Verify Email with OTP
// @route   POST /api/auth/verify-email
// @access  Private / Registration
export const verifyEmailOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.body?.email?.toLowerCase().trim();

        if (!otp || typeof otp !== 'string' || !otp.trim()) {
            return res.status(400).json({ success: false, message: 'Please provide the 6-digit verification code' });
        }

        let user = null;
        if (req.user?._id) {
            user = await User.findById(req.user._id).select('+emailVerificationOtp +emailVerificationOtpExpires');
        } else if (email) {
            user = await User.findOne({ email }).select('+emailVerificationOtp +emailVerificationOtpExpires');
        } else {
            return res.status(400).json({ success: false, message: 'User authentication or email address is required' });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isEmailVerified) {
            const token = generateToken(user);
            return res.json({
                success: true,
                message: 'Email is already verified',
                isEmailVerified: true,
                token,
                user: formatUser(user, token)
            });
        }

        if (!user.emailVerificationOtp) {
            return res.status(400).json({ success: false, message: 'No pending verification code found. Please request a new code.' });
        }

        if (user.emailVerificationOtpExpires && user.emailVerificationOtpExpires < new Date()) {
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
        }

        if (user.emailVerificationOtp.trim() !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
        }

        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
        user.emailVerificationOtp = undefined;
        user.emailVerificationOtpExpires = undefined;
        await user.save();

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Email address verified successfully! 🎉',
            isEmailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt,
            token,
            user: formatUser(user, token)
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to verify email' });
    }
};
