import mongoose from 'mongoose';
import { formatHealthCheck } from '../views/apiView.js';

// @desc    Get API health status
// @route   GET /api/health
// @access  Public
export const getHealthStatus = (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;

    const healthPayload = formatHealthCheck({
        status: isDbConnected ? 'OK' : 'DEGRADED',
        database: isDbConnected ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });

    res.status(isDbConnected ? 200 : 503).json(healthPayload);
};
