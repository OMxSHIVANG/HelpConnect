import { getRedisClient, isRedisReady } from '../config/redis.js';

/**
 * Sanitizes request objects for logging to ensure passwords, OTPs,
 * access tokens, and secrets are NEVER logged.
 */
export const sanitizeForLog = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = [
        'password',
        'confirmpassword',
        'otp',
        'verificationcode',
        'token',
        'accesstoken',
        'jwt',
        'secret',
        'signature',
        'oldpassword',
        'newpassword'
    ];

    for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(k => lowerKey.includes(k))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeForLog(sanitized[key]);
        }
    }
    return sanitized;
};

/**
 * Memory-based sliding-window rate limit store (development / fallback)
 */
export class MemoryRateLimitStore {
    constructor(prefix = 'rl:mem:') {
        this.hits = new Map();
        this.prefix = prefix;

        // Periodic cleanup of expired records every minute
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, record] of this.hits.entries()) {
                if (now >= record.resetTime) {
                    this.hits.delete(key);
                }
            }
        }, 60 * 1000);

        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    increment(key, windowMs) {
        const fullKey = `${this.prefix}${key}`;
        const now = Date.now();
        let record = this.hits.get(fullKey);

        if (!record || now >= record.resetTime) {
            record = {
                count: 1,
                startTime: now,
                resetTime: now + windowMs
            };
            this.hits.set(fullKey, record);
            return { count: 1, ttlMs: windowMs };
        }

        record.count += 1;
        const ttlMs = Math.max(1, record.resetTime - now);
        return { count: record.count, ttlMs };
    }

    resetKey(key) {
        this.hits.delete(`${this.prefix}${key}`);
    }

    clear() {
        this.hits.clear();
    }
}

/**
 * Redis-based distributed rate limit store (production shared cluster)
 */
export class RedisRateLimitStore {
    constructor(client, prefix = 'rl:dist:') {
        this.client = client;
        this.prefix = prefix;
    }

    async increment(key, windowMs) {
        const fullKey = `${this.prefix}${key}`;
        try {
            const count = await this.client.incr(fullKey);
            if (count === 1) {
                await this.client.pexpire(fullKey, windowMs);
            }
            let ttlMs = await this.client.pttl(fullKey);
            if (ttlMs < 0) {
                await this.client.pexpire(fullKey, windowMs);
                ttlMs = windowMs;
            }
            return { count, ttlMs: Math.max(1, ttlMs) };
        } catch (err) {
            console.warn('Redis rate limiter operation error, falling back to local counter:', err.message);
            throw err;
        }
    }

    async resetKey(key) {
        const fullKey = `${this.prefix}${key}`;
        try {
            await this.client.del(fullKey);
        } catch (err) {
            console.warn('Redis del error:', err.message);
        }
    }
}

/**
 * Resolves client IP addressing, correctly prioritizing Express trust proxy
 */
export const getClientIp = (req) => {
    return req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown-ip';
};

/**
 * Factory to create rate limiter middlewares with distributed Redis support
 * and graceful memory fallback.
 */
export const createRateLimiter = ({
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 25, // max hits per windowMs
    message = 'Too many requests from this IP, please try again later.',
    prefix = 'rl:default:',
    keyGenerator = null,
    store = null
} = {}) => {
    const memoryStore = new MemoryRateLimitStore(prefix);

    return (req, res, next) => {
        const identifier = keyGenerator ? keyGenerator(req) : getClientIp(req);
        const effectiveStore = store || (isRedisReady() ? new RedisRateLimitStore(getRedisClient(), prefix) : memoryStore);

        const handleResult = (result) => {
            const { count, ttlMs } = result;
            const now = Date.now();
            const resetTimestampSec = Math.ceil((now + ttlMs) / 1000);
            const retryAfterSec = Math.max(1, Math.ceil(ttlMs / 1000));
            const remaining = Math.max(0, max - count);

            // Standard & widely supported headers
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', resetTimestampSec);
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', remaining);
            res.setHeader('RateLimit-Reset', retryAfterSec);

            if (count > max) {
                res.setHeader('Retry-After', retryAfterSec);

                if (process.env.NODE_ENV !== 'test') {
                    const safeQuery = sanitizeForLog(req.query);
                    console.warn(`[RATE LIMIT EXCEEDED] IP: ${getClientIp(req)} - Path: ${req.method} ${req.baseUrl || req.path} - Query: ${JSON.stringify(safeQuery)}`);
                }

                return res.status(429).json({
                    success: false,
                    message,
                    retryAfterSeconds: retryAfterSec
                });
            }

            return next();
        };

        const resOrPromise = effectiveStore.increment(identifier, windowMs);
        if (resOrPromise && typeof resOrPromise.then === 'function') {
            return resOrPromise
                .then(handleResult)
                .catch(() => handleResult(memoryStore.increment(identifier, windowMs)));
        }
        return handleResult(resOrPromise);
    };
};

// ==========================================
// Specialized Endpoint Rate Limiters (TASK 9)
// ==========================================

// 1. Login Rate Limiter (Brute-force protection)
export const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    prefix: 'rl:login:',
    message: 'Too many login attempts. Please try again after 15 minutes.'
});

// 2. Registration Rate Limiter (Bot spam protection)
export const registerRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour per IP
    prefix: 'rl:register:',
    message: 'Too many account registration attempts. Please try again after an hour.'
});

// 3. Password Recovery Rate Limiter
export const passwordResetRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    prefix: 'rl:pwd-reset:',
    message: 'Too many password reset requests. Please try again after 15 minutes.'
});

// 4. OTP Verification Rate Limiter (Anti-brute-force for 6-digit OTPs)
export const otpVerificationRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    prefix: 'rl:otp:',
    message: 'Too many verification attempts. Please wait 15 minutes before retrying.'
});

// 5. GPS Location Updates (High frequency live tracking)
export const gpsRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute window
    max: 120, // 120 updates per minute (~2 pings per second)
    prefix: 'rl:gps:',
    keyGenerator: (req) => req.agent?._id?.toString() || req.user?._id?.toString() || getClientIp(req),
    message: 'GPS update rate limit exceeded. Maximum 120 updates per minute allowed.'
});

// 6. Donation Creation Rate Limiter
export const donationCreationRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 15, // 15 donations per 10 minutes
    prefix: 'rl:donation:',
    keyGenerator: (req) => req.user?._id?.toString() || getClientIp(req),
    message: 'Too many donation submissions in a short period. Please try again later.'
});

// 7. Messaging Rate Limiter
export const messagingRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 messages per minute
    prefix: 'rl:chat:',
    keyGenerator: (req) => req.user?._id?.toString() || getClientIp(req),
    message: 'Message sending rate limit exceeded. Please slow down.'
});

// 8. General API Rate Limiter
export const generalApiRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 minutes
    prefix: 'rl:general:',
    message: 'API request rate limit exceeded. Please try again later.'
});

// 10. Backward compatibility authRateLimiter
export const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    prefix: 'rl:auth:',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
});
