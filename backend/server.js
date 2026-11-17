import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import validateEnv from './config/validateEnv.js';
import { initRedis } from './config/redis.js';
import { initSocket } from './socket.js';
import { generalApiRateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import ngoRoutes from './routes/ngoRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requirementRoutes from './routes/requirementRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import pickupRoutes from './routes/pickupRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import agentRoutes from './routes/agentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env and current working directory
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

// Validate critical environment variables before startup
validateEnv();

// Initialize distributed Redis client if configured
initRedis();

const app = express();

// Trust Proxy Configuration for Load Balancers & Reverse Proxies (Cloudflare, AWS ALB, Nginx, Render)
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv !== undefined && trustProxyEnv !== '') {
    if (trustProxyEnv === 'true' || trustProxyEnv === '1') {
        app.set('trust proxy', 1);
    } else if (trustProxyEnv === 'false' || trustProxyEnv === '0') {
        app.set('trust proxy', false);
    } else {
        const hops = Number(trustProxyEnv);
        app.set('trust proxy', isNaN(hops) ? trustProxyEnv : hops);
    }
} else if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
// Consistent support for CLIENT_URL or FRONTEND_URL
const rawOrigins = process.env.CLIENT_URL || process.env.FRONTEND_URL;
let corsOptions;

if (rawOrigins && rawOrigins.trim()) {
    const allowedList = rawOrigins.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
    corsOptions = {
        origin: (origin, callback) => {
            // Allow server-to-server or tools with no origin (like Postman or curl)
            if (!origin) return callback(null, true);
            const normalizedOrigin = origin.replace(/\/$/, '');
            if (allowedList.includes(normalizedOrigin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
        },
        credentials: true
    };
} else if (process.env.NODE_ENV === 'production') {
    if (process.env.SERVE_FRONTEND === 'true') {
        // Combined production deployment (Express serves Vite static assets):
        // Allow same-origin requests (no Origin header), restrict external cross-origin requests
        corsOptions = {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                return callback(new Error(`CORS policy restricts cross-origin access from: ${origin}`));
            },
            credentials: true
        };
    } else {
        // Decoupled production without origins configured: strictly disallow wildcard
        corsOptions = {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                return callback(new Error('CORS policy restricts access: CLIENT_URL / FRONTEND_URL must be configured in production.'));
            },
            credentials: false
        };
    }
} else {
    // In local development with no specified origin, default to localhost Vite port with credentials
    corsOptions = {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true
    };
}

app.use(cors(corsOptions));

// Request body parsers with limits
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Global baseline API rate limiting
app.use('/api', generalApiRateLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);

// Serve static frontend in production if configured and built
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const hasFrontendBuild = fs.existsSync(path.resolve(frontendDistPath, 'index.html'));

if (hasFrontendBuild && (process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true')) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => {
        if (!req.originalUrl.startsWith('/api')) {
            res.sendFile(path.resolve(frontendDistPath, 'index.html'));
        } else {
            res.status(404).json({ success: false, message: `API Route not found: ${req.originalUrl}` });
        }
    });
    // 404 Handler for undefined non-GET API routes
    app.use((req, res) => {
        res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
    });
} else {
    // Base route for API
    app.get('/', (req, res) => {
        res.json({
            message: 'HelpConnect API Server is active and ready',
            status: 'online',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    });

    // 404 Handler for undefined API routes
    app.use((req, res) => {
        res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
    });
}

// Multer & Global Error handling middleware
app.use((err, req, res, next) => {
    // Multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Maximum allowed size is 5MB.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }

    // Invalid file type error from fileFilter
    if (err.message && err.message.startsWith('Invalid file type')) {
        return res.status(400).json({ success: false, message: err.message });
    }

    // CORS policy error
    if (err.message && err.message.includes('CORS policy')) {
        return res.status(403).json({ success: false, message: err.message });
    }

    // Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid ID format for ${err.path}: ${err.value}` });
    }

    // Mongoose duplicate key error (11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(400).json({ success: false, message: `Duplicate value entered for ${field}. Please use another value.` });
    }

    // Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors || {}).map(e => e.message);
        return res.status(400).json({ success: false, message: messages[0] || 'Validation Error', errors: messages });
    }

    console.error('Unhandled Server Error:', err);
    const statusCode = err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, mask internal server errors to avoid leaking stack traces, database details, or credentials
    const clientMessage = (statusCode >= 500 && isProduction)
        ? 'Internal Server Error'
        : (err.message || 'Internal Server Error');

    res.status(statusCode).json({
        success: false,
        message: clientMessage
    });
});

const PORT = Number(process.env.PORT) || 5000;

// Create HTTP server wrapping Express app and initialize Socket.IO
const httpServer = http.createServer(app);
const io = initSocket(httpServer, corsOptions);

// Start database connection before listening for incoming requests
let server;
const startServer = async () => {
    try {
        await connectDB();
        server = httpServer.listen(PORT, () => {
            console.log(`🚀 HelpConnect Server & Socket.IO running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start HelpConnect server:', error.message);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections & graceful shutdown
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection Error: ${err.message}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    if (server) {
        server.close(() => {
            console.log('Process terminated.');
        });
    }
});

export { app, httpServer, io };
export default app;
