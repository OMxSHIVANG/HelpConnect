import RecurringCommitment from '../models/RecurringCommitment.js';
import NGO from '../models/NGO.js';

// Helper to compute next pledge date based on frequency
const computeNextDate = (currentDate, frequency) => {
    const d = new Date(currentDate);
    if (frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
    else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
};

// @desc    Create a new recurring donation commitment
// @route   POST /api/recurring
// @access  Private (Donor)
export const createCommitment = async (req, res) => {
    try {
        const { category, itemName, quantity, unit, frequency = 'monthly', ngoId, startDate, notes } = req.body;

        if (!category || !itemName || !quantity) {
            return res.status(400).json({ success: false, message: 'Category, item name, and pledge quantity are required' });
        }

        const qtyNum = Number(quantity);
        if (!qtyNum || qtyNum <= 0) {
            return res.status(400).json({ success: false, message: 'Pledge quantity must be greater than 0' });
        }

        let targetNgo = null;
        if (ngoId) {
            const ngo = await NGO.findById(ngoId);
            if (ngo) targetNgo = ngo._id;
        }

        const start = startDate ? new Date(startDate) : new Date();
        const nextPledge = computeNextDate(start, frequency);

        const commitment = await RecurringCommitment.create({
            donor: req.user._id,
            ngo: targetNgo,
            category: category.trim(),
            itemName: itemName.trim(),
            quantity: qtyNum,
            unit: unit ? unit.trim() : 'items',
            frequency,
            startDate: start,
            nextPledgeDate: nextPledge,
            notes: notes ? notes.trim() : '',
            status: 'active'
        });

        res.status(201).json({ success: true, commitment });
    } catch (error) {
        console.error('Create recurring commitment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get donor's own recurring commitments
// @route   GET /api/recurring/my-commitments
// @access  Private (Donor)
export const getMyCommitments = async (req, res) => {
    try {
        const commitments = await RecurringCommitment.find({ donor: req.user._id })
            .populate('ngo', 'ngoName city logo isVerified')
            .sort({ nextPledgeDate: 1 });

        res.json({ success: true, count: commitments.length, commitments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update commitment status (pause, resume, cancel)
// @route   PUT /api/recurring/:id/status
// @access  Private (Donor owner)
export const updateCommitmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const commitment = await RecurringCommitment.findOne({ _id: req.params.id, donor: req.user._id });

        if (!commitment) {
            return res.status(404).json({ success: false, message: 'Commitment not found' });
        }

        const allowed = ['active', 'paused', 'cancelled'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status '${status}'` });
        }

        commitment.status = status;
        const updated = await commitment.save();

        res.json({ success: true, message: `Commitment status updated to ${status}`, commitment: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Record fulfillment of a commitment pledge cycle and advance schedule
// @route   POST /api/recurring/:id/fulfill
// @access  Private (Donor)
export const fulfillCommitmentPledge = async (req, res) => {
    try {
        const commitment = await RecurringCommitment.findOne({ _id: req.params.id, donor: req.user._id });
        if (!commitment) {
            return res.status(404).json({ success: false, message: 'Commitment not found' });
        }

        commitment.fulfilledDonationsCount += 1;
        commitment.lastFulfilledAt = new Date();
        commitment.nextPledgeDate = computeNextDate(commitment.nextPledgeDate || new Date(), commitment.frequency);
        const updated = await commitment.save();

        res.json({
            success: true,
            message: 'Pledge cycle fulfilled! Next scheduled pledge updated.',
            commitment: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
