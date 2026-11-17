import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from './models/User.js';
import NGO from './models/NGO.js';
import Requirement from './models/Requirement.js';
import Donation from './models/Donation.js';
import DonationAudit from './models/DonationAudit.js';
import Campaign from './models/Campaign.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';
import PickupAgent from './models/PickupAgent.js';
import PickupSchedule from './models/PickupSchedule.js';
import RecurringCommitment from './models/RecurringCommitment.js';
import Review from './models/Review.js';
import FavouriteNGO from './models/FavouriteNGO.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/helpconnect';

export const resetAndSeedDatabase = async () => {
    console.log('🔄 Connecting to MongoDB at:', MONGO_URI.replace(/:([^@]+)@/, ':****@'));
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    console.log('\n🗑️ Dropping all existing database collections to clean data and stale indexes...');
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
        try {
            await collection.drop();
            console.log(`   ✓ Dropped collection: ${collection.collectionName}`);
        } catch (dropErr) {
            console.log(`   ⚠ Notice on ${collection.collectionName}: ${dropErr.message}`);
        }
    }
    console.log('✅ All collections and stale indexes cleared.');

    console.log('\n🌱 Seeding fresh starter data...');

    // 1. Admin Users
    console.log('👤 Creating Admin accounts...');
    const adminUser = await User.create({
        name: 'HelpConnect Administrator',
        email: 'admin@helpconnect.org',
        password: process.env.INITIAL_ADMIN_PASSWORD || 'adminPassword123!',
        phone: '+91 9999999999',
        location: 'Delhi',
        role: 'admin'
    });
    console.log('   ✓ admin@helpconnect.org (admin)');

    // 2. Donor Users (in HelpConnect schema, donors have role 'user')
    console.log('\n👤 Creating Donor accounts...');
    const donorUser1 = await User.create({
        name: 'Rahul Sharma',
        email: 'donor@helpconnect.org',
        password: 'password123',
        phone: '+91 9876500001',
        location: 'Delhi',
        role: 'user'
    });

    const donorUser2 = await User.create({
        name: 'Priya Patel',
        email: 'priya@helpconnect.org',
        password: 'password123',
        phone: '+91 9876500002',
        location: 'Meerut',
        role: 'user'
    });
    console.log('   ✓ donor@helpconnect.org (donor)');
    console.log('   ✓ priya@helpconnect.org (donor)');

    // 3. NGOs with representative users
    console.log('\n🏢 Creating Verified NGOs...');
    
    // NGO 1: Helping Hands Foundation (Meerut)
    const ngoUser1 = await User.create({
        name: 'Helping Hands Foundation Rep',
        email: 'helpinghands@ngo.org',
        password: 'password123',
        phone: '+91 9876543210',
        location: 'Meerut',
        role: 'ngo'
    });

    const ngo1 = await NGO.create({
        user: ngoUser1._id,
        ngoName: 'Helping Hands Foundation',
        registrationNumber: 'REG/MEERUT/2024/001',
        phone: '+91 9876543210',
        address: '12 Shastri Nagar, Near Central Park',
        city: 'Meerut',
        state: 'Uttar Pradesh',
        description: 'Dedicated to providing warm clothes, food distribution, and emergency winter relief to homeless and migrant worker families across western Uttar Pradesh.',
        isVerified: true,
        verificationStatus: 'verified',
        location: {
            type: 'Point',
            coordinates: [77.7064, 28.9845] // [lng, lat]
        },
        impactSummary: {
            totalDonationsReceived: 28,
            familiesHelped: 420
        }
    });

    // NGO 2: Gyan Jyoti Education Trust (Delhi)
    const ngoUser2 = await User.create({
        name: 'Gyan Jyoti Education Trust Rep',
        email: 'gyanjyoti@ngo.org',
        password: 'password123',
        phone: '+91 9812345678',
        location: 'Delhi',
        role: 'ngo'
    });

    const ngo2 = await NGO.create({
        user: ngoUser2._id,
        ngoName: 'Gyan Jyoti Education Trust',
        registrationNumber: 'REG/DELHI/2024/045',
        phone: '+91 9812345678',
        address: 'B-45 Laxmi Nagar, Opp Metro Pillar 32',
        city: 'Delhi',
        state: 'Delhi NCR',
        description: 'Empowering underprivileged students and slum children through free quality textbooks, school kits, scholarships, and after-school remedial coaching.',
        isVerified: true,
        verificationStatus: 'verified',
        location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139] // [lng, lat]
        },
        impactSummary: {
            totalDonationsReceived: 35,
            familiesHelped: 560
        }
    });

    // NGO 3: Care & Health Relief Society (Noida)
    const ngoUser3 = await User.create({
        name: 'Care Health Society Rep',
        email: 'carehealth@ngo.org',
        password: 'password123',
        phone: '+91 9988776655',
        location: 'Noida',
        role: 'ngo'
    });

    const ngo3 = await NGO.create({
        user: ngoUser3._id,
        ngoName: 'Care & Health Relief Society',
        registrationNumber: 'REG/NOIDA/2024/108',
        phone: '+91 9988776655',
        address: 'Sector 62, Near Fortis Hospital',
        city: 'Noida',
        state: 'Uttar Pradesh',
        description: 'Providing essential first-aid kits, life-saving medicines, medical screening camps, and nutrition packs for vulnerable elders and pediatric wards.',
        isVerified: true,
        verificationStatus: 'verified',
        location: {
            type: 'Point',
            coordinates: [77.3910, 28.5355] // [lng, lat]
        },
        impactSummary: {
            totalDonationsReceived: 19,
            familiesHelped: 290
        }
    });

    // NGO 4: Hope Children Care Initiative (Jaipur - Pending Bank Review for testing Admin)
    const ngoUser4 = await User.create({
        name: 'Hope Children Initiative Rep',
        email: 'hopechild@ngo.org',
        password: 'password123',
        phone: '+91 9123456780',
        location: 'Jaipur',
        role: 'ngo'
    });

    const ngo4 = await NGO.create({
        user: ngoUser4._id,
        ngoName: 'Hope Children Care Initiative',
        registrationNumber: 'REG/JAIPUR/2024/210',
        phone: '+91 9123456780',
        address: 'Plot 15, Malviya Nagar Sector 4',
        city: 'Jaipur',
        state: 'Rajasthan',
        description: 'Supporting orphaned children and foster homes with sports goods, creative learning material, storybooks, and healthy recreation programs.',
        isVerified: true,
        verificationStatus: 'verified',
        location: {
            type: 'Point',
            coordinates: [75.7873, 26.9124] // [lng, lat]
        },
        impactSummary: {
            totalDonationsReceived: 12,
            familiesHelped: 150
        }
    });

    console.log('   ✓ Helping Hands Foundation (Meerut)');
    console.log('   ✓ Gyan Jyoti Education Trust (Delhi)');
    console.log('   ✓ Care & Health Relief Society (Noida)');
    console.log('   ✓ Hope Children Care Initiative (Jaipur)');

    // 4. Pickup Agents (for live tracking and assignment)
    console.log('\n🛵 Registering Pickup Agents...');
    const agent1 = await PickupAgent.create({
        ngoId: ngo1._id,
        agentId: 'AGT-MEERUT-01',
        fullName: 'Ramesh Kumar',
        phone: '+91 9876543201',
        vehicleType: 'Bike',
        vehicleNumber: 'UP 15 AB 1234',
        password: 'agent123',
        isActivated: true,
        activatedAt: new Date(),
        status: 'active',
        currentLocation: {
            latitude: 28.9810,
            longitude: 77.7010,
            updatedAt: new Date()
        }
    });

    const agent2 = await PickupAgent.create({
        ngoId: ngo2._id,
        agentId: 'AGT-DELHI-02',
        fullName: 'Vikas Sharma',
        phone: '+91 9811223344',
        vehicleType: 'Van',
        vehicleNumber: 'DL 01 CD 5678',
        password: 'agent123',
        isActivated: true,
        activatedAt: new Date(),
        status: 'active',
        currentLocation: {
            latitude: 28.6200,
            longitude: 77.2150,
            updatedAt: new Date()
        }
    });

    const agent3 = await PickupAgent.create({
        ngoId: ngo3._id,
        agentId: 'AGT-NOIDA-03',
        fullName: 'Amit Singh',
        phone: '+91 9988112233',
        vehicleType: 'Scooter',
        vehicleNumber: 'UP 16 XY 9988',
        password: 'agent123',
        isActivated: true,
        activatedAt: new Date(),
        status: 'active',
        currentLocation: {
            latitude: 28.5300,
            longitude: 77.3850,
            updatedAt: new Date()
        }
    });
    console.log('   ✓ Ramesh Kumar (AGT-MEERUT-01 - Bike)');
    console.log('   ✓ Vikas Sharma (AGT-DELHI-02 - Van)');
    console.log('   ✓ Amit Singh (AGT-NOIDA-03 - Scooter)');

    // 6. Active Requirements
    console.log('\n📦 Seeding Active NGO Requirements...');
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const requirements = [
        {
            ngo: ngo1._id,
            user: ngoUser1._id,
            title: 'Winter Warm Clothes & Jackets for Night Shelter',
            category: 'Clothes',
            description: 'Urgently requesting warm winter jackets, coats, and woolen blankets for 150 homeless people and low-income night shelter residents during freezing conditions.',
            quantity: 150,
            unit: 'jackets/blankets',
            remainingQuantity: 110,
            city: 'Meerut',
            urgency: 'Critical',
            clothesType: 'Winter Jackets / Coats',
            targetAgeGroup: 'Adults (19-50 yrs)',
            size: 'Large (L)',
            requiredByDate: futureDate,
            status: 'active'
        },
        {
            ngo: ngo1._id,
            user: ngoUser1._id,
            title: 'Dry Ration Kits & Cooking Oil for Migrant Families',
            category: 'Food',
            description: 'Packaged dry ration kits (rice, wheat flour, lentils, cooking oil, and salt) to feed 80 daily-wage families.',
            quantity: 80,
            unit: 'kits',
            remainingQuantity: 50,
            city: 'Meerut',
            urgency: 'High',
            requiredByDate: futureDate,
            status: 'active'
        },
        {
            ngo: ngo2._id,
            user: ngoUser2._id,
            title: 'Class 10th & Class 12th NCERT Textbooks',
            category: 'Books',
            description: 'NCERT Science, Mathematics, and English books for underprivileged students preparing for state board and national exams.',
            quantity: 200,
            unit: 'books',
            remainingQuantity: 160,
            city: 'Delhi',
            urgency: 'High',
            bookName: 'NCERT Science & Mathematics (Class 10th)',
            bookClass: 'Class 9th - 10th (High School)',
            bookType: 'NCERT Textbooks',
            requiredByDate: futureDate,
            status: 'active'
        },
        {
            ngo: ngo2._id,
            user: ngoUser2._id,
            title: 'School Bags, Geometry Sets & Notebooks',
            category: 'School Supplies',
            description: 'Durable school backpacks, pencil boxes, and notebook sets for slum kids entering grade 1 through 5.',
            quantity: 120,
            unit: 'kits',
            remainingQuantity: 85,
            city: 'Delhi',
            urgency: 'Medium',
            bookName: 'Primary Student Notebooks & Pencil Boxes',
            bookClass: 'Class 1st - 5th (Primary)',
            bookType: 'Notebooks & Registers & Stationery',
            requiredByDate: futureDate,
            status: 'active'
        },
        {
            ngo: ngo3._id,
            user: ngoUser3._id,
            title: 'First-Aid Medical Supplies, Ointments & Bandages',
            category: 'Medicine',
            description: 'Sterile bandages, antiseptic liquid (Dettol/Betadine), pain relief sprays, and basic medical supplies for mobile community checkup clinics.',
            quantity: 50,
            unit: 'boxes',
            remainingQuantity: 32,
            city: 'Noida',
            urgency: 'Critical',
            requiredByDate: futureDate,
            status: 'active'
        },
        {
            ngo: ngo3._id,
            user: ngoUser3._id,
            title: 'Educational Toys & Board Games for Pediatric Ward',
            category: 'Toys',
            description: 'Safe indoor building blocks, puzzles, and soft toys to bring joy to young children in hospital recovery wards.',
            quantity: 60,
            unit: 'toys/games',
            remainingQuantity: 44,
            city: 'Noida',
            urgency: 'Low',
            requiredByDate: futureDate,
            status: 'active'
        },
        {
            ngo: ngo4._id,
            user: ngoUser4._id,
            title: 'Story Books, Color Pencils & Drawing Pads',
            category: 'Books',
            description: 'Illustrated storybooks in Hindi and English, sketchbooks, and crayons for foster home children.',
            quantity: 90,
            unit: 'sets',
            remainingQuantity: 70,
            city: 'Jaipur',
            urgency: 'Medium',
            bookType: 'Story & Picture Books',
            requiredByDate: futureDate,
            status: 'active'
        }
    ];

    for (const req of requirements) {
        await Requirement.create(req);
    }
    console.log(`   ✓ Seeded ${requirements.length} active requirements across Meerut, Delhi, Noida, Jaipur`);

    // 7. Active Campaign
    console.log('\n🎯 Creating Public Humanitarian Campaigns...');
    await Campaign.create({
        ngo: ngo1._id,
        user: ngoUser1._id,
        title: 'Project Warmth 2026: Blanket & Coat Relief Drive',
        description: 'Every winter, hundreds of homeless individuals face harsh nights on urban pavements without basic warmth. Help us distribute 300 heavy blankets and winter coats across NCR shelter homes.',
        category: 'Clothes',
        targetQuantity: 300,
        unit: 'blankets/jackets',
        receivedQuantity: 65,
        status: 'active',
        startDate: now,
        endDate: futureDate,
        city: 'Meerut'
    });
    console.log('   ✓ Project Warmth 2026 (Helping Hands Foundation)');

    // 8. Sample Reviews
    console.log('\n⭐ Creating Sample Reviews & Community Ratings...');
    await Review.create({
        donor: donorUser1._id,
        ngo: ngo1._id,
        rating: 5,
        comment: 'Amazing transparency and prompt doorstep pickup by agent Ramesh! Delivered within hours.'
    });
    await Review.create({
        donor: donorUser2._id,
        ngo: ngo2._id,
        rating: 5,
        comment: 'Gyan Jyoti provided clear proof of book distribution to students. Very inspiring work!'
    });
    console.log('   ✓ 5-star community reviews added');

    console.log('\n🎉 ==============================================');
    console.log('🎉 DATABASE RESET & SEED COMPLETED SUCCESSFULLY!');
    console.log('🎉 ==============================================');
    console.log('\nDefault Test Logins:');
    console.log('----------------------------------------------------');
    console.log('👑 Admin       : admin@helpconnect.org / adminPassword123!');
    console.log('🏢 NGO Meerut  : helpinghands@ngo.org / password123');
    console.log('🏢 NGO Delhi   : gyanjyoti@ngo.org / password123');
    console.log('🏢 NGO Noida   : carehealth@ngo.org / password123');
    console.log('🏢 NGO Jaipur  : hopechild@ngo.org / password123 (Bank Review Pending)');
    console.log('❤️ Donor Delhi : donor@helpconnect.org / password123');
    console.log('❤️ Donor Meerut: priya@helpconnect.org / password123');
    console.log('----------------------------------------------------');
};

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('reset-and-seed.js')) {
    resetAndSeedDatabase()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('❌ Reset & Seed Error:', err);
            process.exit(1);
        });
}
