import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../middleware/rateLimiter.js';

describe('Rate Limiter Middleware', () => {
    test('Allows requests within limit', () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 3 });

        let statusCode = null;
        const fakeReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } };
        const fakeRes = {
            setHeader: () => {},
            status: (code) => { statusCode = code; return { json: () => {} }; }
        };

        let nextCalls = 0;
        const next = () => { nextCalls++; };

        // 3 requests allowed
        limiter(fakeReq, fakeRes, next);
        limiter(fakeReq, fakeRes, next);
        limiter(fakeReq, fakeRes, next);

        assert.equal(nextCalls, 3);
        assert.equal(statusCode, null);
    });

    test('Blocks requests exceeding max limit with 429 status', () => {
        const limiter = createRateLimiter({ windowMs: 60000, max: 2 });

        let statusCode = null;
        let responseData = null;
        const fakeReq = { headers: {}, socket: { remoteAddress: '192.168.1.100' } };
        const fakeRes = {
            setHeader: () => {},
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { responseData = data; }
                };
            }
        };

        limiter(fakeReq, fakeRes, () => {});
        limiter(fakeReq, fakeRes, () => {});
        // 3rd request should exceed max limit of 2
        limiter(fakeReq, fakeRes, () => {});

        assert.equal(statusCode, 429);
        assert.equal(responseData.success, false);
        assert.ok(responseData.retryAfterSeconds > 0);
    });
});
