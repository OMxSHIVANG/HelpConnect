import User from '../models/User.js';
import NGO from '../models/NGO.js';
import Requirement from '../models/Requirement.js';
import Donation from '../models/Donation.js';
import Campaign from '../models/Campaign.js';
import DonationAudit from '../models/DonationAudit.js';
import Review from '../models/Review.js';
import { formatUserList } from '../views/userView.js';
import { formatNGO, formatNGOList } from '../views/ngoView.js';
import { formatDonationList } from '../views/donationView.js';

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getAdminStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalNGOs,
            verifiedNGOs,
            pendingNGOs,
            totalRequirements,
            activeRequirements,
            fulfilledRequirements,
            totalDonations,
            pendingDonations,
            acceptedDonations,
            completedDonations
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            NGO.countDocuments(),
            NGO.countDocuments({ isVerified: true }),
            NGO.countDocuments({ isVerified: false }),
            Requirement.countDocuments(),
            Requirement.countDocuments({ status: 'active' }),
            Requirement.countDocuments({ status: 'fulfilled' }),
            Donation.countDocuments(),
            Donation.countDocuments({ status: 'pending' }),
            Donation.countDocuments({ status: 'accepted' }),
            Donation.countDocuments({ status: 'completed' })
        ]);

        res.json({
            totalUsers,
            totalNGOs,
            verifiedNGOs,
            pendingNGOs,
            totalRequirements,
            activeRequirements,
            fulfilledRequirements,
            totalDonations,
            pendingDonations,
            acceptedDonations,
            completedDonations
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(formatUserList(users));
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user by admin
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUserByAdmin = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Administrators cannot delete their own account' });
        }

        // If NGO user, delete associated NGO profile, requirements, and donations
        const ngo = await NGO.findOne({ user: user._id });
        if (ngo) {
            await Requirement.deleteMany({ ngo: ngo._id });
            await Donation.deleteMany({ ngo: ngo._id });
            await ngo.deleteOne();
        }

        await Donation.deleteMany({ donor: user._id });
        await user.deleteOne();

        res.json({ success: true, message: 'User account and associated records deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all NGOs (verified & pending)
// @route   GET /api/admin/ngos
// @access  Private (Admin)
export const getAllNGOs = async (req, res) => {
    try {
        const ngos = await NGO.find().populate('user', 'name email phone').sort({ createdAt: -1 });
        const formatted = ngos.map(formatNGO);
        res.json(formatted);
    } catch (error) {
        console.error('Get all NGOs error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle or set NGO verification status
// @route   PUT /api/admin/ngos/:id/verify
// @access  Private (Admin)
export const toggleNGOVerification = async (req, res) => {
    try {
        const ngo = await NGO.findById(req.params.id);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }

        if (typeof req.body.isVerified === 'boolean') {
            ngo.isVerified = req.body.isVerified;
        } else {
            ngo.isVerified = !ngo.isVerified;
        }

        await ngo.save();
        res.json(formatNGO(ngo));
    } catch (error) {
        console.error('Toggle NGO verification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete NGO by admin
// @route   DELETE /api/admin/ngos/:id
// @access  Private (Admin)
export const deleteNGOByAdmin = async (req, res) => {
    try {
        const ngo = await NGO.findById(req.params.id);
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO not found' });
        }

        await Requirement.deleteMany({ ngo: ngo._id });
        await Donation.deleteMany({ ngo: ngo._id });
        await ngo.deleteOne();

        res.json({ success: true, message: 'NGO profile and associated requirements/donations deleted successfully' });
    } catch (error) {
        console.error('Delete NGO error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all donations
// @route   GET /api/admin/donations
// @access  Private (Admin)
export const getAllDonations = async (req, res) => {
    try {
        const donations = await Donation.find()
            .populate('donor', 'name email')
            .populate('ngo', 'ngoName')
            .populate('requirement', 'title category')
            .populate('assignedAgent')
            .sort({ createdAt: -1 });

        res.json(formatDonationList(donations));
    } catch (error) {
        console.error('Get all donations error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Suspend/unsuspend a user (toggle isActive)
// @route   PUT /api/admin/users/:id/suspend
// @access  Private (Admin)
export const toggleUserSuspension = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot suspend your own account' });
        }
        // Add isActive field to user (default true in schema)
        user.isActive = user.isActive === false ? true : false;
        await user.save();
        res.json({ success: true, message: `User ${user.isActive ? 'unsuspended' : 'suspended'} successfully`, user: { _id: user._id, name: user.name, isActive: user.isActive } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get system-wide audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
export const getAdminAuditLogs = async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            DonationAudit.find()
                .populate('performedBy', 'name email role')
                .populate({
                    path: 'donation',
                    select: 'quantity verificationCode status requirement ngo donor',
                    populate: [
                        { path: 'requirement', select: 'title category' },
                        { path: 'ngo', select: 'ngoName' },
                        { path: 'donor', select: 'name email' }
                    ]
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            DonationAudit.countDocuments()
        ]);

        res.json({ success: true, total, page: pageNum, pages: Math.ceil(total / limitNum), logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get suspicious activity alerts & system anomalies
// @route   GET /api/admin/suspicious-alerts
// @access  Private (Admin)
export const getSuspiciousActivityAlerts = async (req, res) => {
    try {
        const alerts = [];
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Detect rapid multiple donations from the same donor (potential spam/bot)
        const rapidDonations = await Donation.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            { $group: { _id: '$donor', count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } },
            { $match: { count: { $gt: 5 } } }
        ]);

        for (const item of rapidDonations) {
            const donor = await User.findById(item._id).select('name email');
            alerts.push({
                id: `alert-rapid-${item._id}`,
                severity: 'medium',
                type: 'rapid_donations',
                title: 'High Donation Frequency Detected',
                description: `User "${donor?.name || item._id}" submitted ${item.count} donation requests in the last 24 hours.`,
                timestamp: new Date(),
                entityId: item._id
            });
        }

        // 2. Unverified NGOs with active unverified attempts
        const pendingNgosCount = await NGO.countDocuments({ isVerified: false });
        if (pendingNgosCount > 0) {
            alerts.push({
                id: 'alert-pending-ngos',
                severity: 'low',
                type: 'pending_verifications',
                title: 'NGO Profiles Awaiting Verification',
                description: `There are ${pendingNgosCount} registered NGOs pending identity verification before they can post requests.`,
                timestamp: new Date(),
                actionUrl: '/admin/ngos'
            });
        }

        // 3. Rejected or high cancellation rate detection
        const highCancelledDonations = await Donation.countDocuments({
            status: 'cancelled',
            createdAt: { $gte: oneDayAgo }
        });
        if (highCancelledDonations >= 5) {
            alerts.push({
                id: 'alert-cancellations',
                severity: 'medium',
                type: 'high_cancellations',
                title: 'Unusual Cancellation Rate',
                description: `${highCancelledDonations} donations have been cancelled within the past 24 hours.`,
                timestamp: new Date()
            });
        }

        res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all campaigns for admin moderation
// @route   GET /api/admin/campaigns
// @access  Private (Admin)
export const getAllCampaignsAdmin = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .populate('ngo', 'ngoName city isVerified logo')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: campaigns.length, campaigns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all reviews for admin moderation
// @route   GET /api/admin/reviews
// @access  Private (Admin)
export const getAllReviewsAdmin = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('donor', 'name email avatar')
            .populate('ngo', 'ngoName city')
            .populate('donation', 'quantity status')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: reviews.length, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a review (moderation action)
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin)
export const deleteReviewByAdmin = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
        await review.deleteOne();
        res.json({ success: true, message: 'Review deleted successfully by administrator' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
