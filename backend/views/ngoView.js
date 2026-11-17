/**
 * Format NGO object for client responses
 * @param {Object} ngo - NGO document or plain object
 */
export const formatNGO = (ngo) => {
    if (!ngo) return null;
    const ngoObj = ngo.toObject ? ngo.toObject() : { ...ngo };

    return {
        _id: ngoObj._id,
        user: ngoObj.user,
        ngoName: ngoObj.ngoName,
        registrationNumber: ngoObj.registrationNumber,
        phone: ngoObj.phone || '',
        address: ngoObj.address,
        city: ngoObj.city,
        state: ngoObj.state || '',
        description: ngoObj.description || '',
        logo: ngoObj.logo || '',
        location: ngoObj.location || { type: 'Point', coordinates: [0, 0] },
        isVerified: ngoObj.isVerified || false,
        isActive: ngoObj.isActive !== undefined ? ngoObj.isActive : true,
        createdAt: ngoObj.createdAt,
        updatedAt: ngoObj.updatedAt
    };
};

/**
 * Format an array of NGO objects
 * @param {Array} ngos 
 */
export const formatNGOList = (ngos) => {
    if (!Array.isArray(ngos)) return [];
    return ngos.map(ngo => formatNGO(ngo));
};
