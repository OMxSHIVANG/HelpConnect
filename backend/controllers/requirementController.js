import Requirement from '../models/Requirement.js';
import NGO from '../models/NGO.js';
import Donation from '../models/Donation.js';
import { formatRequirement, formatRequirementList } from '../views/requirementView.js';

// Helper to escape regex special characters in search input
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @desc    Create a new requirement
// @route   POST /api/requirements
// @access  Private (Verified & Active NGO only)
export const createRequirement = async (req, res) => {
    try {
        const {
            title, category, description, quantity, unit, city, urgency, image,
            clothesType, targetAgeGroup, size, bookClass, bookType, bookName,
            foodType, electronicType, medicineType, customItems, deadline,
            isGroupDonation, groupTarget, campaignId
        } = req.body;

        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile required to post requirements' });
        }

        // Enforce verification: Unverified NGOs must not be allowed to publish donation requirements
        if (!ngo.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Your NGO profile is pending verification by administrators. Only verified NGOs can post material requirements.'
            });
        }

        // Enforce active status: Suspended or inactive NGOs must not be allowed to perform restricted operations
        if (!ngo.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your NGO account is currently suspended. Please contact platform administrators.'
            });
        }

        const numQuantity = Number(quantity);
        if (!numQuantity || numQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Requirement quantity must be a positive number greater than 0' });
        }

        const requirement = await Requirement.create({
            ngo: ngo._id,
            user: req.user._id,
            title: title.trim(),
            category,
            description: description.trim(),
            quantity: numQuantity,
            unit: unit ? unit.trim() : 'pieces',
            remainingQuantity: numQuantity,
            city: city ? city.trim() : ngo.city,
            urgency: urgency || 'Medium',
            image: image || '',
            clothesType: clothesType || '',
            targetAgeGroup: targetAgeGroup || '',
            size: size || '',
            bookClass: bookClass || '',
            bookType: bookType || '',
            bookName: bookName || '',
            foodType: foodType || '',
            electronicType: electronicType || '',
            medicineType: medicineType || '',
            customItems: customItems || '',
            deadline: deadline ? new Date(deadline) : null,
            isGroupDonation: Boolean(isGroupDonation),
            groupTarget: isGroupDonation ? (Number(groupTarget) || numQuantity) : 0,
            campaign: campaignId || null,
            status: 'active'
        });

        res.status(201).json(formatRequirement(requirement));
    } catch (error) {
        console.error('Create requirement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all requirements (with search, filter & pagination)
// @route   GET /api/requirements
// @access  Public
export const getRequirements = async (req, res) => {
    try {
        const { category, city, urgency, search, status, page = 1, limit = 50 } = req.query;

        const allowedStatuses = ['active', 'fulfilled', 'cancelled'];
        const query = { status: allowedStatuses.includes(status) ? status : 'active' };

        if (category && category !== 'All') {
            query.category = { $regex: escapeRegex(category.trim()), $options: 'i' };
        }

        if (city && city.trim()) {
            query.city = { $regex: escapeRegex(city.trim()), $options: 'i' };
        }

        if (urgency && urgency !== 'All') {
            query.urgency = urgency;
        }

        if (search && search.trim()) {
            const escaped = escapeRegex(search.trim());
            query.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } },
                { category: { $regex: escaped, $options: 'i' } },
                { bookName: { $regex: escaped, $options: 'i' } },
                { clothesType: { $regex: escaped, $options: 'i' } }
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const requirements = await Requirement.find(query)
            .populate('ngo', 'ngoName phone city address isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json(formatRequirementList(requirements));
    } catch (error) {
        console.error('Get requirements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single requirement by ID
// @route   GET /api/requirements/:id
// @access  Public
export const getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findById(req.params.id)
            .populate('ngo', 'ngoName phone city address isVerified registrationNumber description');

        if (!requirement) {
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }

        res.json(formatRequirement(requirement));
    } catch (error) {
        console.error('Get requirement by ID error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current NGO's posted requirements
// @route   GET /api/requirements/my-requirements
// @access  Private (NGO)
export const getMyRequirements = async (req, res) => {
    try {
        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        const requirements = await Requirement.find({ ngo: ngo._id }).sort({ createdAt: -1 });
        res.json(formatRequirementList(requirements));
    } catch (error) {
        console.error('Get my requirements error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get requirements by NGO ID
// @route   GET /api/requirements/ngo/:ngoId
// @access  Public
export const getRequirementsByNGO = async (req, res) => {
    try {
        const requirements = await Requirement.find({ ngo: req.params.ngoId, status: 'active' })
            .populate('ngo', 'ngoName phone city address isVerified')
            .sort({ createdAt: -1 });
        res.json(formatRequirementList(requirements));
    } catch (error) {
        console.error('Get requirements by NGO error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a requirement
// @route   PUT /api/requirements/:id
// @access  Private (NGO owner / Admin)
export const updateRequirement = async (req, res) => {
    try {
        const requirement = await Requirement.findById(req.params.id);

        if (!requirement) {
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }

        // Verify authorization: logged in user must own requirement or be admin
        if (requirement.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this requirement' });
        }

        const { title, category, description, quantity, unit, city, urgency, image, clothesType, targetAgeGroup, size, bookClass, bookType, bookName, status, deadline } = req.body;

        if (title !== undefined) requirement.title = title.trim();
        if (category !== undefined) requirement.category = category;
        if (description !== undefined) requirement.description = description.trim();
        if (unit !== undefined) requirement.unit = unit.trim();
        if (city !== undefined) requirement.city = city.trim();
        if (urgency !== undefined) requirement.urgency = urgency;
        if (deadline !== undefined) requirement.deadline = deadline ? new Date(deadline) : null;
        if (image !== undefined) requirement.image = image;
        if (clothesType !== undefined) requirement.clothesType = clothesType;
        if (targetAgeGroup !== undefined) requirement.targetAgeGroup = targetAgeGroup;
        if (size !== undefined) requirement.size = size;
        if (bookClass !== undefined) requirement.bookClass = bookClass;
        if (bookType !== undefined) requirement.bookType = bookType;
        if (bookName !== undefined) requirement.bookName = bookName;
        if (status !== undefined && ['active', 'fulfilled', 'cancelled'].includes(status)) {
            requirement.status = status;
        }

        // Handle quantity changes safely
        if (quantity !== undefined && Number(quantity) !== requirement.quantity) {
            const newQty = Number(quantity);
            if (newQty <= 0) {
                return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
            }

            const alreadyDonated = Math.max(0, requirement.quantity - requirement.remainingQuantity);
            if (newQty < alreadyDonated) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot reduce total quantity to ${newQty}. Already ${alreadyDonated} ${requirement.unit} have been donated.`
                });
            }

            requirement.quantity = newQty;
            requirement.remainingQuantity = newQty - alreadyDonated;

            if (requirement.remainingQuantity === 0) {
                requirement.status = 'fulfilled';
            } else if (requirement.status === 'fulfilled' && requirement.remainingQuantity > 0) {
                requirement.status = 'active';
            }
        }

        const updated = await requirement.save();
        res.json(formatRequirement(updated));
    } catch (error) {
        console.error('Update requirement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a requirement safely
// @route   DELETE /api/requirements/:id
// @access  Private (NGO owner / Admin)
export const deleteRequirement = async (req, res) => {
    try {
        const requirement = await Requirement.findById(req.params.id);

        if (!requirement) {
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }

        if (requirement.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this requirement' });
        }

        // Check if there are active donations linked to this requirement
        const activeDonationsCount = await Donation.countDocuments({
            requirement: requirement._id,
            status: { $in: ['pending', 'accepted', 'picked_up', 'received'] }
        });

        if (activeDonationsCount > 0) {
            // Soft-cancel instead of hard delete to avoid orphan donation records
            requirement.status = 'cancelled';
            await requirement.save();
            return res.json({
                success: true,
                message: `Requirement has ${activeDonationsCount} active donation(s). Status set to cancelled to preserve donation records.`
            });
        }

        await requirement.deleteOne();
        res.json({ success: true, message: 'Requirement deleted successfully' });
    } catch (error) {
        console.error('Delete requirement error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    FEATURE 5: Get Community Group Donation progress & contributors
// @route   GET /api/requirements/:id/group-progress
// @access  Public
export const getGroupDonationProgress = async (req, res) => {
    try {
        const requirement = await Requirement.findById(req.params.id)
            .populate('ngo', 'ngoName city logo isVerified')
            .populate('campaign', 'title status');

        if (!requirement) {
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }

        const targetQty = requirement.groupTarget || requirement.quantity;
        const remainingNeeded = requirement.remainingQuantity;
        const verifiedReceived = Math.max(0, requirement.quantity - requirement.remainingQuantity);
        const progressPercentage = Math.min(100, Math.round((verifiedReceived / targetQty) * 100));

        // Fetch contributors
        const donations = await Donation.find({
            requirement: requirement._id,
            status: { $in: ['accepted', 'pickup_scheduled', 'picked_up', 'received', 'distributed', 'completed', 'pending'] }
        })
            .populate('donor', 'name avatar')
            .select('quantity status isAnonymous createdAt')
            .sort({ createdAt: -1 });

        const contributors = donations.map(d => ({
            _id: d._id,
            donorName: d.isAnonymous ? 'Generous Community Member' : (d.donor?.name || 'Anonymous'),
            donorAvatar: d.isAnonymous ? '' : d.donor?.avatar,
            quantity: d.quantity,
            status: d.status,
            date: d.createdAt
        }));

        res.json({
            success: true,
            requirement: {
                _id: requirement._id,
                title: requirement.title,
                category: requirement.category,
                unit: requirement.unit,
                urgency: requirement.urgency,
                deadline: requirement.deadline,
                ngo: requirement.ngo,
                status: requirement.status
            },
            groupProgress: {
                targetQuantity: targetQty,
                verifiedReceived,
                remainingNeeded,
                progressPercentage,
                contributorsCount: contributors.length,
                isCompleted: requirement.remainingQuantity === 0 || requirement.status === 'fulfilled'
            },
            contributors
        });
    } catch (error) {
        console.error('Get group donation progress error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    FEATURE 9: AI-Assisted NGO Requirement Draft Generator
// @route   POST /api/requirements/ai-assist
// @access  Private (NGO / Admin)
export const aiAssistRequirementDraft = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ success: false, message: 'Prompt text is required for AI assistance' });
        }

        const text = prompt.toLowerCase();

        // 1. Natural Language Parser & Knowledge Model
        let category = 'Other';
        let suggestedTitle = '';
        let clothesType = '';
        let targetAgeGroup = '';
        let bookType = '';
        let foodType = '';
        let medicineType = '';
        let electronicType = '';
        let urgency = 'Medium';
        let deadlineDays = 14;

        // Detect category & sub-types
        if (text.includes('clothe') || text.includes('jacket') || text.includes('blanket') || text.includes('sweater') || text.includes('winter') || text.includes('warm') || text.includes('shirt')) {
            category = 'Clothes';
            if (text.includes('blanket')) clothesType = 'Blankets & Quilts';
            else if (text.includes('jacket')) clothesType = 'Winter Jackets / Coats';
            else if (text.includes('sweater')) clothesType = 'Sweaters / Hoodies';
            else clothesType = 'Daily Wear Clothes';
            if (text.includes('winter') || text.includes('emergency')) urgency = 'High';
        } else if (text.includes('book') || text.includes('school') || text.includes('stationery') || text.includes('notebook') || text.includes('bag') || text.includes('education')) {
            category = text.includes('bag') || text.includes('stationery') ? 'School Supplies' : 'Books';
            bookType = text.includes('ncert') ? 'NCERT Textbooks' : 'Notebooks & Registers';
            if (text.includes('exam') || text.includes('session')) urgency = 'High';
        } else if (text.includes('food') || text.includes('ration') || text.includes('rice') || text.includes('wheat') || text.includes('meal') || text.includes('hunger')) {
            category = 'Food';
            foodType = text.includes('ration') ? 'Dry Grocery Kits (Rice, Flour, Oil)' : 'Packaged Nutritious Food';
            urgency = 'High';
            deadlineDays = 7;
        } else if (text.includes('medicine') || text.includes('health') || text.includes('first aid') || text.includes('bandage') || text.includes('doctor')) {
            category = 'Medicine';
            medicineType = 'First-Aid Kits & Essential Medications';
            urgency = 'Critical';
            deadlineDays = 4;
        } else if (text.includes('laptop') || text.includes('computer') || text.includes('tablet') || text.includes('electronic')) {
            category = 'Electronics';
            electronicType = 'Learning Tablets / Desktops';
            deadlineDays = 30;
        }

        // Detect target age
        if (text.includes('child') || text.includes('kid')) targetAgeGroup = 'Children (8-12 yrs)';
        else if (text.includes('baby') || text.includes('infant') || text.includes('toddler')) targetAgeGroup = 'Infants (0-2 yrs)';
        else if (text.includes('teen') || text.includes('student')) targetAgeGroup = 'Teens (13-18 yrs)';
        else if (text.includes('elder') || text.includes('senior') || text.includes('old age')) targetAgeGroup = 'Seniors (50+ yrs)';
        else targetAgeGroup = 'All Ages';

        // Detect quantity
        const qtyMatch = text.match(/\b(\d+)\b/);
        const suggestedQuantity = qtyMatch ? Math.min(10000, Math.max(1, parseInt(qtyMatch[1], 10))) : 50;

        // Detect urgency keywords
        if (text.includes('urgent') || text.includes('immediate') || text.includes('critical') || text.includes('flood') || text.includes('disaster')) {
            urgency = 'Critical';
            deadlineDays = 3;
        }

        // Formulate professional title & description
        suggestedTitle = `${urgency === 'Critical' ? 'Urgent ' : ''}${category}: ${prompt.trim().slice(0, 60)}`;
        if (category === 'Clothes' && text.includes('winter')) {
            suggestedTitle = `Winter Warm Essentials & Blankets for ${targetAgeGroup}`;
        } else if (category === 'Books') {
            suggestedTitle = `Educational Books & Study Materials for ${targetAgeGroup}`;
        } else if (category === 'Food') {
            suggestedTitle = `Nutritional Ration & Food Support for Families`;
        }

        const suggestedDeadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        res.json({
            success: true,
            source: 'Rule-Based & Natural Language Engine (AI Ready)',
            draft: {
                title: suggestedTitle,
                category,
                description: `We are requesting support for ${prompt.trim()}. Every contribution will be distributed with photo evidence to ensure transparency.`,
                quantity: suggestedQuantity,
                unit: category === 'Food' ? 'kits' : category === 'Clothes' ? 'pieces' : category === 'Books' ? 'sets' : 'units',
                targetAgeGroup,
                clothesType,
                bookType,
                foodType,
                medicineType,
                electronicType,
                urgency,
                suggestedDeadline,
                isGroupDonation: suggestedQuantity >= 50
            }
        });
    } catch (error) {
        console.error('AI Assist error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    FEATURE 10: Duplicate Requirement Detection
// @route   POST /api/requirements/check-duplicate
// @access  Private (NGO / Admin)
export const checkDuplicateRequirement = async (req, res) => {
    try {
        const { title, category, city } = req.body;
        if (!title || !category) {
            return res.status(400).json({ success: false, message: 'Title and category are required to check duplicates' });
        }

        const ngo = await NGO.findOne({ user: req.user._id });
        if (!ngo) {
            return res.status(404).json({ success: false, message: 'NGO profile not found' });
        }

        const titleWords = title
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3 && !['need', 'urgent', 'help', 'with', 'from', 'this', 'that'].includes(w));

        // Find active requirements from same NGO or nearby in same category
        const existingReqs = await Requirement.find({
            ngo: ngo._id,
            status: 'active'
        }).select('title category quantity remainingQuantity createdAt');

        let possibleDuplicates = [];

        existingReqs.forEach(reqItem => {
            const itemTitleLower = reqItem.title.toLowerCase();
            let matchedWords = 0;
            titleWords.forEach(word => {
                if (itemTitleLower.includes(word)) matchedWords++;
            });

            const categoryMatch = reqItem.category.toLowerCase() === category.toLowerCase();
            const similarityPercentage = Math.round(
                (categoryMatch ? 40 : 0) + (titleWords.length > 0 ? (matchedWords / titleWords.length) * 60 : 0)
            );

            if (similarityPercentage >= 60) {
                possibleDuplicates.push({
                    _id: reqItem._id,
                    title: reqItem.title,
                    category: reqItem.category,
                    remainingQuantity: reqItem.remainingQuantity,
                    similarityPercentage,
                    createdAt: reqItem.createdAt
                });
            }
        });

        res.json({
            success: true,
            hasDuplicateWarning: possibleDuplicates.length > 0,
            possibleDuplicates,
            warningMessage: possibleDuplicates.length > 0
                ? `You already have an active requirement similar to this: "${possibleDuplicates[0].title}". Consider updating the quantity of the existing request instead of creating a duplicate.`
                : null
        });
    } catch (error) {
        console.error('Check duplicate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
