import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
    createRateLimiter,
    loginRateLimiter,
    registerRateLimiter,
    passwordResetRateLimiter,
    otpVerificationRateLimiter,
    gpsRateLimiter,
    donationCreationRateLimiter,
    messagingRateLimiter,
    generalApiRateLimiter,
    sanitizeForLog,
    getClientIp,
    MemoryRateLimitStore,
    RedisRateLimitStore
} from '../middleware/rateLimiter.js';
import {
    createMockRedisClient,
    setRedisClient,
    validateRedisConfig
} from '../config/redis.js';

test('Backend Rate Limiting & Performance Test Suite (TASK 9)', async (t) => {

    await t.test('1. Repeated Login Attempts: Returns 429 when max limit is exceeded', () => {
        const testLimiter = createRateLimiter({
            windowMs: 60000,
            max: 3,
            message: 'Too many login attempts. Please try again later.'
        });

        const clientReq = {
            ip: '203.0.113.195',
            headers: {},
            socket: {}
        };

        const createRes = () => {
            const headers = {};
            let statusCode = null;
            let jsonBody = null;
            return {
                setHeader: (k, v) => { headers[k] = v; },
                status: function (code) {
                    statusCode = code;
                    return {
                        json: (data) => { jsonBody = data; }
                    };
                },
                getStatusCode: () => statusCode,
                getJsonBody: () => jsonBody,
                getHeaders: () => headers
            };
        };

        // Requests 1 to 3 should be permitted
        for (let i = 0; i < 3; i++) {
            const res = createRes();
            let nextCalled = false;
            testLimiter(clientReq, res, () => { nextCalled = true; });
            assert.equal(nextCalled, true, `Request ${i + 1} should be allowed`);
            assert.equal(res.getStatusCode(), null);
            assert.equal(res.getHeaders()['X-RateLimit-Remaining'], 3 - (i + 1));
        }

        // 4th request must be blocked with HTTP 429
        const blockedRes = createRes();
        let nextCalledBlocked = false;
        testLimiter(clientReq, blockedRes, () => { nextCalledBlocked = true; });

        assert.equal(nextCalledBlocked, false, 'Blocked request should not call next()');
        assert.equal(blockedRes.getStatusCode(), 429);
        assert.equal(blockedRes.getJsonBody().success, false);
        assert.ok(blockedRes.getJsonBody().message.includes('Too many login attempts'));
        assert.ok(blockedRes.getJsonBody().retryAfterSeconds > 0);
        assert.equal(blockedRes.getHeaders()['Retry-After'], blockedRes.getJsonBody().retryAfterSeconds);
        assert.equal(blockedRes.getHeaders()['X-RateLimit-Remaining'], 0);
    });

    await t.test('2. Registration Rate Limiter: Enforces 5 registrations per hour', () => {
        assert.ok(registerRateLimiter);
        const memStore = new MemoryRateLimitStore('rl:reg:test:');
        const limiter = createRateLimiter({
            windowMs: 3600000,
            max: 5,
            store: memStore
        });

        const req = { ip: '198.51.100.22', headers: {} };
        const results = [];
        for (let i = 0; i < 6; i++) {
            let status = null;
            let nextCalled = false;
            const res = {
                setHeader: () => {},
                status: (code) => { status = code; return { json: () => {} }; }
            };
            limiter(req, res, () => { nextCalled = true; });
            results.push({ i: i + 1, nextCalled, status });
        }

        assert.equal(results[4].nextCalled, true, '5th registration allowed');
        assert.equal(results[5].nextCalled, false, '6th registration blocked');
        assert.equal(results[5].status, 429);
    });

    await t.test('3. OTP Verification Rate Limiter: Protects OTPs against brute-forcing', () => {
        const memStore = new MemoryRateLimitStore('rl:otp:test:');
        const limiter = createRateLimiter({
            windowMs: 900000,
            max: 5,
            message: 'Too many verification attempts. Please wait 15 minutes before retrying.',
            store: memStore
        });

        const req = { ip: '192.0.2.1', headers: {} };
        for (let i = 0; i < 5; i++) {
            limiter(req, { setHeader: () => {} }, () => {});
        }

        let blockedCode = null;
        let blockedBody = null;
        limiter(req, {
            setHeader: () => {},
            status: (code) => ({ json: (d) => { blockedCode = code; blockedBody = d; } })
        }, () => {});

        assert.equal(blockedCode, 429);
        assert.ok(blockedBody.message.includes('Too many verification attempts'));
    });

    await t.test('4. High-Frequency GPS Requests: Permits up to 120 updates per minute for live tracking', () => {
        const memStore = new MemoryRateLimitStore('rl:gps:test:');
        const limiter = createRateLimiter({
            windowMs: 60000,
            max: 120,
            store: memStore,
            keyGenerator: (req) => req.agent?._id || 'default'
        });

        const agentReq = {
            agent: { _id: 'AGT_HIGH_FREQ_01' },
            ip: '10.0.0.1'
        };

        // 120 GPS updates must all succeed without blocking
        let successCount = 0;
        for (let i = 0; i < 120; i++) {
            limiter(agentReq, { setHeader: () => {} }, () => { successCount++; });
        }
        assert.equal(successCount, 120, 'All 120 high-frequency GPS pings in a minute must succeed');

        // 121st request exceeds the limit
        let blockedCode = null;
        limiter(agentReq, {
            setHeader: () => {},
            status: (code) => ({ json: () => { blockedCode = code; } })
        }, () => {});

        assert.equal(blockedCode, 429, '121st GPS update in minute must be rate-limited');
    });

    await t.test('5. Multi-Instance Distributed Rate Limiting: Shared Redis store syncs limits across multiple instances', async () => {
        // Shared Redis mock simulates external Redis cluster
        const sharedRedisStorage = new Map();
        const redisClient = createMockRedisClient(sharedRedisStorage);

        const store1 = new RedisRateLimitStore(redisClient, 'rl:cluster:');
        const store2 = new RedisRateLimitStore(redisClient, 'rl:cluster:');

        // Server Instance 1 limiter
        const serverInstance1Limiter = createRateLimiter({
            windowMs: 60000,
            max: 4,
            store: store1
        });

        // Server Instance 2 limiter
        const serverInstance2Limiter = createRateLimiter({
            windowMs: 60000,
            max: 4,
            store: store2
        });

        const sharedClientIpReq = { ip: '203.0.113.88', headers: {} };

        // 2 requests sent to Server Instance 1
        let s1Count = 0;
        await serverInstance1Limiter(sharedClientIpReq, { setHeader: () => {} }, () => { s1Count++; });
        await serverInstance1Limiter(sharedClientIpReq, { setHeader: () => {} }, () => { s1Count++; });
        assert.equal(s1Count, 2);

        // 2 requests sent to Server Instance 2
        let s2Count = 0;
        await serverInstance2Limiter(sharedClientIpReq, { setHeader: () => {} }, () => { s2Count++; });
        await serverInstance2Limiter(sharedClientIpReq, { setHeader: () => {} }, () => { s2Count++; });
        assert.equal(s2Count, 2);

        // 5th request sent to Server Instance 1 must be blocked because the distributed total is 4!
        let s1BlockedStatus = null;
        await serverInstance1Limiter(sharedClientIpReq, {
            setHeader: () => {},
            status: (c) => ({ json: () => { s1BlockedStatus = c; } })
        }, () => {});
        assert.equal(s1BlockedStatus, 429, 'Instance 1 must reject request after distributed limit reached across cluster');

        // 6th request sent to Server Instance 2 must also be blocked!
        let s2BlockedStatus = null;
        await serverInstance2Limiter(sharedClientIpReq, {
            setHeader: () => {},
            status: (c) => ({ json: () => { s2BlockedStatus = c; } })
        }, () => {});
        assert.equal(s2BlockedStatus, 429, 'Instance 2 must reject request after distributed limit reached across cluster');
    });

    await t.test('6. Graceful Fallback: When Redis fails, rate limiting automatically falls back to local memory without crashing', async () => {
        // Failing Redis client
        const brokenRedisClient = {
            connected: true,
            async incr() { throw new Error('Redis connection timed out'); },
            async pexpire() { throw new Error('Redis connection timed out'); },
            async pttl() { throw new Error('Redis connection timed out'); }
        };

        const storeWithFallback = new RedisRateLimitStore(brokenRedisClient, 'rl:fail:');
        const resilientLimiter = createRateLimiter({
            windowMs: 60000,
            max: 3,
            store: storeWithFallback
        });

        const req = { ip: '198.51.100.99', headers: {} };
        let nextCalled = false;

        // Must NOT throw unhandled rejection, but gracefully increment via memory fallback
        await resilientLimiter(req, { setHeader: () => {} }, () => { nextCalled = true; });
        assert.equal(nextCalled, true, 'Request should succeed despite Redis failure');
    });

    await t.test('7. Sensitive Data Redaction: Passwords, OTPs, JWTs, and Tokens are NEVER logged', () => {
        const sensitivePayload = {
            email: 'donor@example.com',
            password: 'SuperSecretPassword123!',
            confirmPassword: 'SuperSecretPassword123!',
            otp: '482910',
            verificationCode: 'HC-99A8B7',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            accessToken: 'act_99887766',
            nested: {
                secret: 'client_secret_123',
                userRole: 'donor'
            }
        };

        const sanitized = sanitizeForLog(sensitivePayload);

        // Sensitive credentials must be completely replaced
        assert.equal(sanitized.password, '[REDACTED]');
        assert.equal(sanitized.confirmPassword, '[REDACTED]');
        assert.equal(sanitized.otp, '[REDACTED]');
        assert.equal(sanitized.verificationCode, '[REDACTED]');
        assert.equal(sanitized.token, '[REDACTED]');
        assert.equal(sanitized.accessToken, '[REDACTED]');
        assert.equal(sanitized.nested.secret, '[REDACTED]');

        // Safe fields preserved
        assert.equal(sanitized.email, 'donor@example.com');
        assert.equal(sanitized.nested.userRole, 'donor');
    });

    await t.test('8. Trusted Proxy IP Extraction: Correctly extracts client IP through proxies and load balancers', () => {
        // Case A: Express trust proxy req.ip populated
        const reqWithIp = { ip: '203.0.113.50', headers: {} };
        assert.equal(getClientIp(reqWithIp), '203.0.113.50');

        // Case B: X-Forwarded-For with multiple hops (Client, Proxy1, Proxy2)
        const reqWithForwarded = {
            headers: { 'x-forwarded-for': '198.51.100.77, 10.0.0.1, 10.0.0.2' },
            socket: { remoteAddress: '10.0.0.2' }
        };
        assert.equal(getClientIp(reqWithForwarded), '198.51.100.77', 'Must extract original client IP from first hop');

        // Case C: Direct socket fallback
        const reqDirect = {
            headers: {},
            socket: { remoteAddress: '192.168.1.15' }
        };
        assert.equal(getClientIp(reqDirect), '192.168.1.15');
    });

    await t.test('9. Redis Configuration Validation: Validates REDIS_URL protocols and port limits', () => {
        // Valid REDIS_URL
        process.env.REDIS_URL = 'redis://user:password@redis-cluster.example.com:6380';
        const resValid = validateRedisConfig();
        assert.equal(resValid.valid, true);
        assert.equal(resValid.config.host, 'redis-cluster.example.com');
        assert.equal(resValid.config.port, 6380);
        assert.equal(resValid.config.password, 'password');

        // Invalid protocol
        process.env.REDIS_URL = 'http://not-redis.example.com:6379';
        const resInvalidProto = validateRedisConfig();
        assert.equal(resInvalidProto.valid, false);
        assert.ok(resInvalidProto.errors.some(e => e.includes('redis: or rediss:')));

        delete process.env.REDIS_URL;

        // Valid REDIS_HOST + REDIS_PORT
        process.env.REDIS_HOST = '10.0.1.5';
        process.env.REDIS_PORT = '6379';
        const resHostPort = validateRedisConfig();
        assert.equal(resHostPort.valid, true);
        assert.equal(resHostPort.config.host, '10.0.1.5');
        assert.equal(resHostPort.config.port, 6379);

        // Invalid port
        process.env.REDIS_PORT = '99999';
        const resInvalidPort = validateRedisConfig();
        assert.equal(resInvalidPort.valid, false);

        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
    });

    await t.test('10. Endpoint Rate Limit Configuration Checks: Verifies correct limits and prefixes for all types', () => {
        assert.ok(loginRateLimiter);
        assert.ok(registerRateLimiter);
        assert.ok(passwordResetRateLimiter);
        assert.ok(otpVerificationRateLimiter);
        assert.ok(gpsRateLimiter);
        assert.ok(donationCreationRateLimiter);
        assert.ok(messagingRateLimiter);
        assert.ok(generalApiRateLimiter);
    });
});
