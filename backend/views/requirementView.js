/**
 * Format requirement object for client responses
 * @param {Object} requirement - Requirement document or plain object
 */
export const formatRequirement = (requirement) => {
    if (!requirement) return null;
    const reqObj = requirement.toObject ? requirement.toObject() : { ...requirement };

    return {
        _id: reqObj._id,
        ngo: reqObj.ngo,
        user: reqObj.user,
        title: reqObj.title,
        category: reqObj.category,
        description: reqObj.description,
        quantity: reqObj.quantity,
        unit: reqObj.unit || 'pieces',
        remainingQuantity: reqObj.remainingQuantity !== undefined ? reqObj.remainingQuantity : reqObj.quantity,
        city: reqObj.city,
        urgency: reqObj.urgency || 'Medium',
        deadline: reqObj.deadline || null,
        image: reqObj.image || '',
        clothesType: reqObj.clothesType || '',
        targetAgeGroup: reqObj.targetAgeGroup || '',
        size: reqObj.size || '',
        bookClass: reqObj.bookClass || '',
        bookType: reqObj.bookType || '',
        bookName: reqObj.bookName || '',
        foodType: reqObj.foodType || '',
        electronicType: reqObj.electronicType || '',
        medicineType: reqObj.medicineType || '',
        customItems: reqObj.customItems || '',
        status: reqObj.status || 'active',
        createdAt: reqObj.createdAt,
        updatedAt: reqObj.updatedAt
    };
};

/**
 * Format an array of requirement objects
 * @param {Array} requirements 
 */
export const formatRequirementList = (requirements) => {
    if (!Array.isArray(requirements)) return [];
    return requirements.map(req => formatRequirement(req));
};
