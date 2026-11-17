import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/helpconnect';

async function addAdmin() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('Database connected.');

        const email = (process.env.INITIAL_ADMIN_EMAIL || process.argv[2] || 'admin@helpconnect.org').toLowerCase().trim();
        const rawPassword = process.env.INITIAL_ADMIN_PASSWORD || process.argv[3] || 'Admin@HelpConnect2026!';
        const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';
        const adminPhone = process.env.INITIAL_ADMIN_PHONE || '+91 9876543210';

        let user = await User.findOne({ email });

        if (user) {
            console.log(`User ${email} already exists. Updating to admin role and setting new password...`);
            user.role = 'admin';
            user.isActive = true;
            user.password = rawPassword; // pre-save hook will hash this with bcrypt
            await user.save();
            console.log(`✅ Admin account updated successfully: ${email}`);
        } else {
            console.log(`Creating new admin account for ${email}...`);
            user = new User({
                name: adminName,
                email,
                password: rawPassword, // pre-save hook will hash this
                phone: adminPhone,
                location: 'India',
                role: 'admin',
                isActive: true
            });
            await user.save();
            console.log(`✅ New Admin account created successfully: ${email}`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin account:', err.message);
        process.exit(1);
    }
}

addAdmin();
