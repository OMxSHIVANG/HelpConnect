import Campaign from '../models/Campaign.js';
import NGO from '../models/NGO.js';
import Donation from '../models/Donation.js';
import Requirement from '../models/Requirement.js';

// Helper to escape regex special characters
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @desc    Create a new NGO Campaign
// @route   POST /api/campaigns
// @access  Private (Verified & Active NGO only)
export const createCampaign = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            targetQuantity,
            unit,
            coverImage,
            startDate,
            endDate,
            location,
            city,
            urgency
        } = req.body;

        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile required to create campaigns' });
        }

        if (!ngo.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Only administrator-verified NGOs can launch public donation campaigns.'
            });
        }

        if (!ngo.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your NGO account is currently suspended.'
            });
        }

        const targetQtyNum = Number(targetQuantity);
        if (!targetQtyNum || targetQtyNum <= 0) {
            return res.status(400).json({ success: false, message: 'Target quantity must be greater than 0' });
        }

        if (!endDate || new Date(endDate) <= new Date()) {
            return res.status(400).json({ success: false, message: 'Campaign end date must be in the future' });
        }

        const campaign = await Campaign.create({
            ngo: ngo._id,
            user: req.user._id,
            title: title.trim(),
            description: description.trim(),
            category: category ? category.trim() : 'General',
            targetQuantity: targetQtyNum,
            unit: unit ? unit.trim() : 'items',
            receivedQuantity: 0,
            coverImage: coverImage || '',
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: new Date(endDate),
            location: location ? location.trim() : ngo.address,
            city: city ? city.trim() : ngo.city,
            urgency: urgency || 'High',
            status: 'active'
        });

        res.status(201).json({ success: true, campaign });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all active campaigns (with filters & search)
// @route   GET /api/campaigns
// @access  Public
export const getCampaigns = async (req, res) => {
    try {
        const { category, city, urgency, search, status = 'active', page = 1, limit = 20 } = req.query;

        const query = {};
        if (status && status !== 'all') query.status = status;
        if (category && category !== 'All') query.category = { $regex: escapeRegex(category.trim()), $options: 'i' };
        if (city && city.trim()) query.city = { $regex: escapeRegex(city.trim()), $options: 'i' };
        if (urgency && urgency !== 'All') query.urgency = urgency;

        if (search && search.trim()) {
            const escaped = escapeRegex(search.trim());
            query.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
                { category: { $regex: escaped, $options: 'i' } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [campaigns, total] = await Promise.all([
            Campaign.find(query)
                .populate('ngo', 'ngoName phone city address logo isVerified transparencyScore')
                .sort({ urgency: 1, endDate: 1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Campaign.countDocuments(query)
        ]);

        const formatted = campaigns.map(c => {
            const progressPercentage = Math.min(100, Math.round((c.receivedQuantity / c.targetQuantity) * 100));
            const remainingQuantity = Math.max(0, c.targetQuantity - c.receivedQuantity);
            return {
                ...c.toObject(),
                progressPercentage,
                remainingQuantity
            };
        });

        res.json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            campaigns: formatted
        });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single campaign by ID with verified contribution history
// @route   GET /api/campaigns/:id
// @access  Public
export const getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('ngo', 'ngoName phone city address logo website isVerified registrationNumber description transparencyScore');

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        // Fetch verified contributions strictly
        const contributions = await Donation.find({ campaign: campaign._id, status: { $in: ['accepted', 'picked_up', 'received', 'distributed', 'completed'] } })
            .populate('donor', 'name avatar')
            .select('quantity createdAt status isAnonymous evidenceImages')
            .sort({ createdAt: -1 })
            .limit(20);

        const progressPercentage = Math.min(100, Math.round((campaign.receivedQuantity / campaign.targetQuantity) * 100));
        const remainingQuantity = Math.max(0, campaign.targetQuantity - campaign.receivedQuantity);

        // Sanitize donor names if anonymous
        const sanitizedContributions = contributions.map(c => ({
            _id: c._id,
            donorName: c.isAnonymous ? 'Generous Community Donor' : (c.donor?.name || 'Anonymous'),
            donorAvatar: c.isAnonymous ? '' : c.donor?.avatar,
            quantity: c.quantity,
            status: c.status,
            date: c.createdAt,
            hasEvidence: c.evidenceImages && c.evidenceImages.length > 0
        }));

        res.json({
            success: true,
            campaign: {
                ...campaign.toObject(),
                progressPercentage,
                remainingQuantity
            },
            contributions: sanitizedContributions
        });
    } catch (error) {
        console.error('Get campaign by ID error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current NGO's campaigns
// @route   GET /api/campaigns/my-campaigns
// @access  Private (NGO)
export const getMyCampaigns = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        const campaigns = await Campaign.find({ ngo: ngo._id }).sort({ createdAt: -1 });
        const formatted = campaigns.map(c => ({
            ...c.toObject(),
            progressPercentage: Math.min(100, Math.round((c.receivedQuantity / c.targetQuantity) * 100)),
            remainingQuantity: Math.max(0, c.targetQuantity - c.receivedQuantity)
        }));

        res.json({ success: true, campaigns: formatted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update campaign details
// @route   PUT /api/campaigns/:id
// @access  Private (NGO owner / Admin)
export const updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const isOwner = campaign.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this campaign' });
        }

        const { title, description, coverImage, endDate, location, city, urgency, status } = req.body;
        if (title !== undefined) campaign.title = title.trim();
        if (description !== undefined) campaign.description = description.trim();
        if (coverImage !== undefined) campaign.coverImage = coverImage;
        if (endDate !== undefined) campaign.endDate = new Date(endDate);
        if (location !== undefined) campaign.location = location.trim();
        if (city !== undefined) campaign.city = city.trim();
        if (urgency !== undefined) campaign.urgency = urgency;
        if (status !== undefined && ['active', 'completed', 'cancelled'].includes(status)) {
            campaign.status = status;
        }

        const updated = await campaign.save();
        res.json({ success: true, campaign: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit campaign completion report with distribution evidence
// @route   POST /api/campaigns/:id/completion-report
// @access  Private (NGO owner / Admin)
export const submitCampaignCompletionReport = async (req, res) => {
    try {
        const { summary, beneficiariesCount, distributedDate, evidenceImages } = req.body;
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Campaign not found' });
        }

        const isOwner = campaign.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to complete this campaign' });
        }

        campaign.status = 'completed';
        campaign.completionReport = {
            summary: summary ? summary.trim() : 'Campaign distribution completed successfully.',
            beneficiariesCount: Number(beneficiariesCount) || 0,
            distributedDate: distributedDate ? new Date(distributedDate) : new Date(),
            evidenceImages: Array.isArray(evidenceImages) ? evidenceImages : [],
            reportedAt: new Date()
        };

        const updated = await campaign.save();
        res.json({ success: true, message: 'Campaign completion report published', campaign: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
