/**
 * Format health check response
 * @param {Object} healthInfo 
 */
export const formatHealthCheck = (healthInfo = {}) => {
    return {
        status: healthInfo.status || 'OK',
        database: healthInfo.database || 'connected',
        uptime: healthInfo.uptime ? `${Math.floor(healthInfo.uptime)}s` : '0s',
        message: healthInfo.status === 'OK' ? 'HelpConnect API is running smoothly' : 'Database connection unavailable',
        timestamp: new Date().toISOString(),
        environment: healthInfo.environment || process.env.NODE_ENV || 'development'
    };
};

/**
 * Format image upload response
 * @param {Object} uploadResult - { url, public_id }
 */
export const formatUploadResponse = ({ url, public_id }) => {
    return {
        success: true,
        url,
        imageUrl: url,
        fileUrl: url,
        path: url,
        public_id: public_id || 'upload'
    };
};
