import NGO from '../models/NGO.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Requirement from '../models/Requirement.js';
import Notification from '../models/Notification.js';

export const createNotification = async (recipientId, type, title, message, relatedId = null, relatedModel = '') => {
    try {
        await Notification.create({ recipient: recipientId, type, title, message, relatedId, relatedModel });
    } catch (e) {
        console.error('Notification error:', e.message);
    }
};

export const getNGODashboardStats = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' });
        const ngoId = ngo._id;
        const [total, pending, accepted, completed, rejected, activeRequirements, donors] = await Promise.all([
            Donation.countDocuments({ ngo: ngoId }),
            Donation.countDocuments({ ngo: ngoId, status: 'pending' }),
            Donation.countDocuments({ ngo: ngoId, status: 'accepted' }),
            Donation.countDocuments({ ngo: ngoId, status: 'completed' }),
            Donation.countDocuments({ ngo: ngoId, status: 'rejected' }),
            Requirement.countDocuments({ ngo: ngoId, status: 'active' }),
            Donation.distinct('donor', { ngo: ngoId })
        ]);
        res.json({
            success: true,
            ngoProfile: ngo,
            stats: { totalDonations: total, pending, accepted, completed, rejected, activeRequirements, totalDonors: donors.length }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateNGOProfileFull = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' });
        const allowed = ['ngoName','phone','address','city','state','description','logo','ngoType','establishedYear','website','mission','vision','workingAreas'];
        allowed.forEach(field => {
            if (req.body[field] !== undefined) ngo[field] = req.body[field];
        });
        const updated = await ngo.save();
        res.json({ success: true, ngo: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getNGODonationRequests = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' });
        const { status, page = 1, limit = 20 } = req.query;
        const filter = { ngo: ngo._id };
        if (status) filter.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [donations, total] = await Promise.all([
            Donation.find(filter)
                .populate('donor', 'name email phone avatar city')
                .populate('requirement', 'title category quantity unit')
                .populate('assignedAgent')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Donation.countDocuments(filter)
        ]);
        res.json({ success: true, donations, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getNGODonors = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' });
        const donorIds = await Donation.distinct('donor', { ngo: ngo._id });
        const donors = await Promise.all(donorIds.map(async (donorId) => {
            const [user, donationCount, donationsList] = await Promise.all([
                User.findById(donorId).select('name email phone avatar city address state pincode createdAt'),
                Donation.countDocuments({ donor: donorId, ngo: ngo._id }),
                Donation.find({ donor: donorId, ngo: ngo._id })
                    .populate('requirement', 'title category unit')
                    .sort({ createdAt: -1 })
            ]);
            return {
                user,
                donationCount,
                lastDonation: donationsList[0] || null,
                donations: donationsList
            };
        }));
        res.json({ success: true, donors: donors.filter(d => d.user) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
