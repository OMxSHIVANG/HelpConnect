import { getStatusDisplayInfo } from '../services/donationLifecycleService.js';

/**
 * Format donation object for client responses
 * @param {Object} donation - Donation document or plain object
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeVerificationCode - Only true for authorized donor private workflow
 */
export const formatDonation = (donation, options = {}) => {
    if (!donation) return null;
    const donObj = donation.toObject ? donation.toObject() : { ...donation };

    const status = donObj.status || 'pending';
    const pickupStatus = donObj.pickupStatus || 'accepted';
    const displayStatus = getStatusDisplayInfo(status, pickupStatus);

    const formatted = {
        _id: donObj._id,
        donor: donObj.donor,
        ngo: donObj.ngo,
        requirement: donObj.requirement,
        quantity: donObj.quantity,
        description: donObj.description || '',
        pickupAddress: donObj.pickupAddress,
        city: donObj.city,
        state: donObj.state || '',
        image: donObj.image || '',
        clothesType: donObj.clothesType || '',
        targetAgeGroup: donObj.targetAgeGroup || '',
        size: donObj.size || '',
        bookClass: donObj.bookClass || '',
        bookType: donObj.bookType || '',
        bookName: donObj.bookName || '',
        foodType: donObj.foodType || '',
        electronicType: donObj.electronicType || '',
        medicineType: donObj.medicineType || '',
        customItems: donObj.customItems || '',
        extraItems: donObj.extraItems || '',
        evidenceImages: donObj.evidenceImages || [],
        distributionDate: donObj.distributionDate || null,
        distributionNotes: donObj.distributionNotes || '',
        scheduledPickupDate: donObj.scheduledPickupDate || null,
        assignedAgent: donObj.assignedAgent || null,
        assignedAgentId: donObj.assignedAgentId || '',
        assignedNgoId: donObj.assignedNgoId || null,
        assignedAt: donObj.assignedAt || null,
        pickupStatus: donObj.pickupStatus || 'accepted',
        agentLocation: donObj.agentLocation || null,
        trackingSession: donObj.trackingSession || null,
        pickupTimeline: donObj.pickupTimeline || null,
        assignmentHistory: donObj.assignmentHistory || [],
        campaign: donObj.campaign || null,
        isGroupContribution: donObj.isGroupContribution || false,
        isAnonymous: donObj.isAnonymous || false,
        status: donObj.status || 'pending',
        displayStatus,
        createdAt: donObj.createdAt,
        updatedAt: donObj.updatedAt
    };

    // Sensitive OTP: ONLY included when explicitly authorized for the donor's private view
    if (options.includeVerificationCode) {
        formatted.verificationCode = donObj.verificationCode || '';
        formatted.qrPayload = donObj.qrPayload || '';
    }

    return formatted;
};

/**
 * Format an array of donation objects
 * @param {Array} donations 
 */
export const formatDonationList = (donations) => {
    if (!Array.isArray(donations)) return [];
    return donations.map(don => formatDonation(don));
};
