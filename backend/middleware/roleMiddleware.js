/**
 * Role-based authorization middleware
 * @param  {...String} roles - Allowed roles (e.g. 'admin', 'ngo', 'user')
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: User role '${req.user.role}' does not have permission to access this resource`
            });
        }

        next();
    };
};

export default authorize;
