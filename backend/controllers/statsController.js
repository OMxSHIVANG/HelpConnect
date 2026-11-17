import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import Requirement from '../models/Requirement.js';

// @desc    Get public platform statistics (safe subset, no auth required)
// @route   GET /api/stats
// @access  Public
export const getPublicStats = async (req, res) => {
    try {
        const [verifiedNGOs, completedDonations, fulfilledRequirements, activeRequirements] = await Promise.all([
            NGO.countDocuments({ isVerified: true }),
            Donation.countDocuments({ status: 'completed' }),
            Requirement.countDocuments({ status: 'fulfilled' }),
            Requirement.countDocuments({ status: 'active' })
        ]);

        res.json({
            verifiedNGOs,
            completedDonations,
            fulfilledRequirements,
            activeRequirements
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
