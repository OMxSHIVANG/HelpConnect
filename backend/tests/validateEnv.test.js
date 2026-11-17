import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv, maskConnectionString } from '../config/validateEnv.js';

describe('Environment Variable & Security Validation (TASK 11)', () => {
    test('Throws error when MONGO_URI is missing', () => {
        const origUri = process.env.MONGO_URI;
        delete process.env.MONGO_URI;

        assert.throws(() => validateEnv(), /MONGO_URI is required/);

        if (origUri) process.env.MONGO_URI = origUri; else delete process.env.MONGO_URI;
    });

    test('Throws error when MONGO_URI has invalid protocol', () => {
        const origUri = process.env.MONGO_URI;
        process.env.MONGO_URI = 'postgres://user:pass@localhost:5432/db';

        assert.throws(() => validateEnv(), /starting with mongodb:\/\/ or mongodb\+srv:\/\//);

        if (origUri) process.env.MONGO_URI = origUri; else delete process.env.MONGO_URI;
    });

    test('Throws error when JWT_SECRET is missing', () => {
        const origSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        assert.throws(() => validateEnv(), /JWT_SECRET is required/);

        if (origSecret) process.env.JWT_SECRET = origSecret; else delete process.env.JWT_SECRET;
    });

    test('Throws error when JWT_SECRET is too short (<16 chars in dev)', () => {
        const origSecret = process.env.JWT_SECRET;
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        process.env.JWT_SECRET = 'short_secret';

        assert.throws(() => validateEnv(), /at least 16 characters/);

        if (origSecret) process.env.JWT_SECRET = origSecret; else delete process.env.JWT_SECRET;
        if (origEnv) process.env.NODE_ENV = origEnv; else delete process.env.NODE_ENV;
    });

    test('Throws error in production when JWT_SECRET is less than 32 chars', () => {
        const origSecret = process.env.JWT_SECRET;
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'sixteen_chars_ok';

        assert.throws(() => validateEnv(), /at least 32 characters long/);

        if (origSecret) process.env.JWT_SECRET = origSecret; else delete process.env.JWT_SECRET;
        if (origEnv) process.env.NODE_ENV = origEnv; else delete process.env.NODE_ENV;
    });

    test('Throws error in production when JWT_SECRET is a known placeholder', () => {
        const origSecret = process.env.JWT_SECRET;
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'helpconnect_super_secret_jwt_key_2026';

        assert.throws(() => validateEnv(), /Do not use default placeholder JWT_SECRET in production/);

        if (origSecret) process.env.JWT_SECRET = origSecret; else delete process.env.JWT_SECRET;
        if (origEnv) process.env.NODE_ENV = origEnv; else delete process.env.NODE_ENV;
    });

    test('Throws error for invalid PORT value', () => {
        const origPort = process.env.PORT;
        process.env.PORT = '999999';

        assert.throws(() => validateEnv(), /Invalid PORT/);

        if (origPort) process.env.PORT = origPort; else delete process.env.PORT;
    });

    test('Throws error for invalid REDIS_URL protocol and masks password', () => {
        const origRedis = process.env.REDIS_URL;
        process.env.REDIS_URL = 'http://:super_secret_redis_pass@localhost:6379';

        try {
            validateEnv();
            assert.fail('Should have thrown an error for invalid REDIS_URL protocol');
        } catch (err) {
            assert.match(err.message, /Must start with redis:\/\/ or rediss:\/\//);
            // Verify password was sanitized and NEVER printed into the error string
            assert.doesNotMatch(err.message, /super_secret_redis_pass/);
            assert.match(err.message, /\*\*\*/);
        } finally {
            if (origRedis) process.env.REDIS_URL = origRedis; else delete process.env.REDIS_URL;
        }
    });

    test('maskConnectionString properly masks embedded passwords', () => {
        const sensitiveMongo = 'mongodb+srv://admin_user:mySecretDbPassword123@cluster0.example.mongodb.net/helpconnect';
        const maskedMongo = maskConnectionString(sensitiveMongo);
        assert.doesNotMatch(maskedMongo, /mySecretDbPassword123/);
        assert.match(maskedMongo, /\*\*\*/);

        const sensitiveRedis = 'redis://:superSecretPassword@redis.example.com:6379';
        const maskedRedis = maskConnectionString(sensitiveRedis);
        assert.doesNotMatch(maskedRedis, /superSecretPassword/);
        assert.match(maskedRedis, /\*\*\*/);
    });

    test('Throws error on partial Cloudinary configuration', () => {
        const origKey = process.env.CLOUDINARY_API_KEY;
        const origSecret = process.env.CLOUDINARY_API_SECRET;
        const origName = process.env.CLOUDINARY_CLOUD_NAME;

        process.env.CLOUDINARY_API_KEY = '123456789';
        delete process.env.CLOUDINARY_API_SECRET;
        delete process.env.CLOUDINARY_CLOUD_NAME;

        assert.throws(() => validateEnv(), /Incomplete Cloudinary configuration/);

        if (origKey) process.env.CLOUDINARY_API_KEY = origKey; else delete process.env.CLOUDINARY_API_KEY;
        if (origSecret) process.env.CLOUDINARY_API_SECRET = origSecret; else delete process.env.CLOUDINARY_API_SECRET;
        if (origName) process.env.CLOUDINARY_CLOUD_NAME = origName; else delete process.env.CLOUDINARY_CLOUD_NAME;
    });

    test('Passes when all required variables are valid', () => {
        const origEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/testdb';
        process.env.JWT_SECRET = 'secure_random_production_secret_32_chars_long';
        process.env.PORT = '5000';
        delete process.env.REDIS_URL;

        assert.doesNotThrow(() => validateEnv());
        if (origEnv) process.env.NODE_ENV = origEnv; else delete process.env.NODE_ENV;
    });
});
