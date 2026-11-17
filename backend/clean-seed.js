import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import NGO from './models/NGO.js';
import Requirement from './models/Requirement.js';
import Donation from './models/Donation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/helpconnect';

const cleanSeedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected for Cleanup...');

        const seededEmails = ['helpinghands@ngo.org', 'gyanjyoti@ngo.org', 'carehealth@ngo.org'];
        const seededUsers = await User.find({ email: { $in: seededEmails } });
        const userIds = seededUsers.map(u => u._id);

        const seededNGOs = await NGO.find({ user: { $in: userIds } });
        const ngoIds = seededNGOs.map(n => n._id);

        // Delete sample requirements & donations associated with these NGOs
        await Requirement.deleteMany({ ngo: { $in: ngoIds } });
        await Donation.deleteMany({ ngo: { $in: ngoIds } });
        await NGO.deleteMany({ _id: { $in: ngoIds } });
        await User.deleteMany({ _id: { $in: userIds } });

        console.log('✅ All sample NGO requirements & sample profiles deleted successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning seed data:', error);
        process.exit(1);
    }
};

cleanSeedData();
