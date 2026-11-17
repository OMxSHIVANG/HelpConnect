/**
 * Format user object for client responses (strips sensitive fields like password)
 * @param {Object} user - User document or plain object
 * @param {String} [token] - Optional JWT token
 * @param {Object} [ngoProfile] - Optional NGO profile document
 */
export const formatUser = (user, token, ngoProfile = null) => {
    if (!user) return null;
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;

    const response = {
        _id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        phone: userObj.phone || '',
        location: userObj.location || '',
        googleId: userObj.googleId || null,
        avatar: userObj.avatar || '',
        isActive: userObj.isActive !== undefined ? userObj.isActive : true,
        isEmailVerified: Boolean(userObj.isEmailVerified || userObj.emailVerified),
        emailVerified: Boolean(userObj.isEmailVerified || userObj.emailVerified),
        emailVerifiedAt: userObj.emailVerifiedAt || null,
        createdAt: userObj.createdAt,
        updatedAt: userObj.updatedAt
    };

    if (ngoProfile !== null) {
        response.ngoProfile = ngoProfile;
    }

    if (token) {
        response.token = token;
    }

    return response;
};

/**
 * Format an array of user objects
 * @param {Array} users 
 */
export const formatUserList = (users) => {
    if (!Array.isArray(users)) return [];
    return users.map(user => formatUser(user));
};
