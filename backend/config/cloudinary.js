import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is explicitly loaded from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const configureCloudinary = () => {
    const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || '').trim();
    const api_key = (process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY || '').trim();
    const api_secret = (process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET || '').trim();

    if (cloud_name && api_key && api_secret) {
        cloudinary.config({
            cloud_name,
            api_key,
            api_secret
        });
        return { isConfigured: true, cloud_name };
    }
    return { isConfigured: false, cloud_name: '' };
};

// Configure at module evaluation
configureCloudinary();

export default cloudinary;
