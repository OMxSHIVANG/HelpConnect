import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './models/User.js';
import NGO from './models/NGO.js';
import PickupAgent from './models/PickupAgent.js';
import Requirement from './models/Requirement.js';
import Donation from './models/Donation.js';
import DonationAudit from './models/DonationAudit.js';
import Campaign from './models/Campaign.js';
import PickupSchedule from './models/PickupSchedule.js';
import RecurringCommitment from './models/RecurringCommitment.js';
import FavouriteNGO from './models/FavouriteNGO.js';
import Notification from './models/Notification.js';
import Review from './models/Review.js';
import Message from './models/Message.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/helpconnect';

export const clearAllData = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000
        });
        console.log('✅ Connected to MongoDB.');

        console.log('🗑️  Deleting all transactional and operational data...');

        // 1. Delete all donations, audits, tracking, pickups
        const donationsRes = await Donation.deleteMany({});
        const auditsRes = await DonationAudit.deleteMany({});
        const schedulesRes = await PickupSchedule.deleteMany({});
        console.log(`   - Deleted ${donationsRes.deletedCount} donations`);
        console.log(`   - Deleted ${auditsRes.deletedCount} donation audit logs`);
        console.log(`   - Deleted ${schedulesRes.deletedCount} pickup schedules`);

        // 2. Delete all pickup agents
        const agentsRes = await PickupAgent.deleteMany({});
        console.log(`   - Deleted ${agentsRes.deletedCount} pickup agents`);

        // 3. Delete requirements & campaigns
        const reqsRes = await Requirement.deleteMany({});
        const campaignsRes = await Campaign.deleteMany({});
        console.log(`   - Deleted ${reqsRes.deletedCount} requirements`);
        console.log(`   - Deleted ${campaignsRes.deletedCount} campaigns`);

        // 4. Delete recurring commitments, favourites, reviews, notifications, messages
        const recurringRes = await RecurringCommitment.deleteMany({});
        const favsRes = await FavouriteNGO.deleteMany({});
        const reviewsRes = await Review.deleteMany({});
        const notificationsRes = await Notification.deleteMany({});
        const messagesRes = await Message.deleteMany({});
        console.log(`   - Deleted ${recurringRes.deletedCount} recurring commitments`);
        console.log(`   - Deleted ${favsRes.deletedCount} favourites`);
        console.log(`   - Deleted ${reviewsRes.deletedCount} reviews`);
        console.log(`   - Deleted ${notificationsRes.deletedCount} notifications`);
        console.log(`   - Deleted ${messagesRes.deletedCount} chat messages`);

        // 6. Delete all NGO profiles
        const ngosRes = await NGO.deleteMany({});
        console.log(`   - Deleted ${ngosRes.deletedCount} NGO profiles`);

        // 7. Delete ONLY non-admin users (NEVER delete Admin login accounts!)
        const preservedAdminEmails = ['admin@helpconnect.org', 'shakyaaman8791@gmail.com'];
        if (process.env.INITIAL_ADMIN_EMAIL) {
            preservedAdminEmails.push(process.env.INITIAL_ADMIN_EMAIL.toLowerCase().trim());
        }

        const usersRes = await User.deleteMany({
            role: { $ne: 'admin' },
            email: { $nin: preservedAdminEmails }
        });
        console.log(`   - Deleted ${usersRes.deletedCount} non-admin users (Admin login emails PRESERVED)`);

        // 8. Verify and list preserved Admin accounts
        const adminUsers = await User.find({
            $or: [{ role: 'admin' }, { email: { $in: preservedAdminEmails } }]
        });
        console.log(`\n👑 Preserved Active Admin Accounts (${adminUsers.length}):`);
        for (const admin of adminUsers) {
            if (admin.role !== 'admin' || !admin.isActive) {
                admin.role = 'admin';
                admin.isActive = true;
                await admin.save();
            }
            console.log(`   ✓ ${admin.name} (${admin.email}) - Role: ${admin.role}`);
        }

        console.log('\n✨ Database is now completely clean and ready for your fresh new data!');
        await mongoose.disconnect();
        return true;
    } catch (err) {
        console.error('❌ Error clearing database:', err.message);
        throw err;
    }
};

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('clear-all-data.js')) {
    clearAllData()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
