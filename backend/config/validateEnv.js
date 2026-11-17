/**
 * Environment variable validation module
 * Validates required variables before server startup and database connection.
 * Strictly prevents secret leakage in logs and error responses.
 */

const KNOWN_PLACEHOLDER_JWT_SECRETS = [
    'helpconnect_super_secret_jwt_key_2026',
    'your_super_secret_jwt_key_min_32_characters_here',
    'super_secret_jwt_key_2310303287291403',
    'your_secret_key_at_least_32_chars',
    'secret',
    'password',
    'change_this_secret',
    'test_secret'
];

/**
 * Mask a sensitive connection string or URL for safe logging
 * Replaces credentials (e.g. redis://:pass@host or mongodb+srv://user:pass@host) with ***
 */
export const maskConnectionString = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return '';
    try {
        const parsed = new URL(urlStr);
        if (parsed.password) {
            parsed.password = '***';
        }
        if (parsed.username && parsed.username !== '') {
            parsed.username = '***';
        }
        return parsed.toString();
    } catch {
        // Fallback regex replacement for non-standard or malformed URLs
        return urlStr.replace(/:([^\/@]+)@/, ':***@');
    }
};

export const validateEnv = () => {
    const errors = [];
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Database Connection (Required)
    if (!process.env.MONGO_URI) {
        errors.push('MONGO_URI is required to connect to MongoDB.');
    } else {
        const uri = process.env.MONGO_URI.trim();
        if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
            errors.push('MONGO_URI must be a valid MongoDB connection string starting with mongodb:// or mongodb+srv://.');
        }
        if (isProduction && (uri.includes('localhost') || uri.includes('127.0.0.1'))) {
            console.warn('⚠️ Warning: MONGO_URI in production is pointing to a local host. Multi-instance scaling and high availability require a managed Replica Set.');
        }
    }

    // 2. JWT Authentication Secret (Required)
    if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required for authentication security. No default fallback allowed.');
    } else {
        const jwtSecret = process.env.JWT_SECRET.trim();
        if (jwtSecret.length < 16) {
            errors.push('JWT_SECRET must be at least 16 characters long for cryptographic security.');
        }
        if (isProduction) {
            if (jwtSecret.length < 32) {
                errors.push('In production, JWT_SECRET must be at least 32 characters long.');
            }
            if (KNOWN_PLACEHOLDER_JWT_SECRETS.includes(jwtSecret.toLowerCase())) {
                errors.push('Do not use default placeholder JWT_SECRET in production. Generate a strong secret with openssl rand -hex 32.');
            }
        }
    }

    // 3. Port validation
    if (process.env.PORT && process.env.PORT !== 'undefined') {
        const port = Number(process.env.PORT);
        if (isNaN(port) || port <= 0 || port > 65535) {
            errors.push(`Invalid PORT number: "${process.env.PORT}". Must be between 1 and 65535.`);
        }
    }

    // 4. Redis Distributed Cache Configuration
    if (process.env.REDIS_URL && process.env.REDIS_URL !== 'undefined') {
        const urlStr = process.env.REDIS_URL.trim();
        if (!urlStr.startsWith('redis://') && !urlStr.startsWith('rediss://')) {
            // Mask any embedded credentials to prevent leaking passwords in logs
            const maskedUrl = maskConnectionString(urlStr);
            errors.push(`Invalid REDIS_URL protocol: "${maskedUrl}". Must start with redis:// or rediss://.`);
        }
    } else if (process.env.REDIS_PORT && process.env.REDIS_PORT !== 'undefined') {
        const redisPort = Number(process.env.REDIS_PORT);
        if (isNaN(redisPort) || redisPort <= 0 || redisPort > 65535) {
            errors.push(`Invalid REDIS_PORT number: "${process.env.REDIS_PORT}". Must be between 1 and 65535.`);
        }
    }

    // 5. Cloudinary Configuration Consistency
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;
    const hasAnyCloudinary = Boolean(cloudName || apiKey || apiSecret);
    const hasAllCloudinary = Boolean(cloudName && apiKey && apiSecret);

    if (hasAnyCloudinary && !hasAllCloudinary) {
        errors.push('Incomplete Cloudinary configuration: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must all be set together.');
    }

    // 6. CORS origin resolution
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
    if (isProduction && !clientUrl && process.env.SERVE_FRONTEND !== 'true') {
        console.warn('⚠️ Warning: CLIENT_URL / FRONTEND_URL is not set in decoupled production deployment. Cross-origin requests will be restricted.');
    }

    // 8. Multi-instance Production Redis Advisory
    if (isProduction && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
        console.warn('⚠️ Advisory: REDIS_URL is not set. Distributed rate limiting across multiple server instances requires Redis.');
    }

    // Halt startup immediately if any fatal configuration errors are found
    if (errors.length > 0) {
        console.error('❌ Environment Variable Validation Errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        throw new Error(`Fatal Configuration Error: ${errors.join('; ')}`);
    }

    return true;
};

export default validateEnv;
