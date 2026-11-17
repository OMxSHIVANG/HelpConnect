import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import NGO from './models/NGO.js';
import Requirement from './models/Requirement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/helpconnect';

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected for Seeding...');

        // Sample Admin Account (Created securely through seed script)
        let adminUser = await User.findOne({ email: 'admin@helpconnect.org' });
        if (!adminUser) {
            adminUser = await User.create({
                name: 'HelpConnect Administrator',
                email: 'admin@helpconnect.org',
                password: 'adminPassword123!',
                phone: '+91 9999999999',
                location: 'Delhi',
                role: 'admin'
            });
            console.log('✅ Created Admin user: admin@helpconnect.org');
        }

        const additionalAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
        if (additionalAdminEmail) {
            let mainAdmin = await User.findOne({ email: additionalAdminEmail.toLowerCase().trim() });
            const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'AdminSeedPass123!';
            if (!mainAdmin) {
                mainAdmin = await User.create({
                    name: 'Super Administrator',
                    email: additionalAdminEmail.toLowerCase().trim(),
                    password: adminPass,
                    phone: '+91 9999999998',
                    location: 'India',
                    role: 'admin'
                });
                console.log(`✅ Created Admin user: ${additionalAdminEmail}`);
            } else {
                mainAdmin.role = 'admin';
                mainAdmin.password = adminPass;
                await mainAdmin.save();
                console.log(`✅ Updated Admin user: ${additionalAdminEmail}`);
            }
        }

        // Sample NGO 1: Helping Hands Foundation (Meerut)
        let ngoUser1 = await User.findOne({ email: 'helpinghands@ngo.org' });
        if (!ngoUser1) {
            ngoUser1 = await User.create({
                name: 'Helping Hands Foundation Rep',
                email: 'helpinghands@ngo.org',
                password: 'password123',
                phone: '+91 9876543210',
                location: 'Meerut',
                role: 'ngo'
            });
        }

        let ngoProfile1 = await NGO.findOne({ registrationNumber: 'REG/MEERUT/2024/001' });
        if (!ngoProfile1) {
            ngoProfile1 = await NGO.create({
                user: ngoUser1._id,
                ngoName: 'Helping Hands Foundation',
                registrationNumber: 'REG/MEERUT/2024/001',
                phone: '+91 9876543210',
                address: '12 Shastri Nagar, Near Central Park',
                city: 'Meerut',
                state: 'Uttar Pradesh',
                description: 'Dedicated to providing warm clothes, food distribution, and emergency aid to homeless families.',
                isVerified: true
            });
        }

        // Sample NGO 2: Gyan Jyoti Education Trust (Delhi)
        let ngoUser2 = await User.findOne({ email: 'gyanjyoti@ngo.org' });
        if (!ngoUser2) {
            ngoUser2 = await User.create({
                name: 'Gyan Jyoti Trust Rep',
                email: 'gyanjyoti@ngo.org',
                password: 'password123',
                phone: '+91 9812345678',
                location: 'Delhi',
                role: 'ngo'
            });
        }

        let ngoProfile2 = await NGO.findOne({ registrationNumber: 'REG/DELHI/2024/045' });
        if (!ngoProfile2) {
            ngoProfile2 = await NGO.create({
                user: ngoUser2._id,
                ngoName: 'Gyan Jyoti Education Trust',
                registrationNumber: 'REG/DELHI/2024/045',
                phone: '+91 9812345678',
                address: 'B-45 Laxmi Nagar, Opp Metro Pillar 32',
                city: 'Delhi',
                state: 'Delhi NCR',
                description: 'Empowering underprivileged children through quality education, free books, and school supplies.',
                isVerified: true
            });
        }

        // Sample NGO 3: Care & Health Relief Society (Noida)
        let ngoUser3 = await User.findOne({ email: 'carehealth@ngo.org' });
        if (!ngoUser3) {
            ngoUser3 = await User.create({
                name: 'Care Health Society Rep',
                email: 'carehealth@ngo.org',
                password: 'password123',
                phone: '+91 9988776655',
                location: 'Noida',
                role: 'ngo'
            });
        }

        let ngoProfile3 = await NGO.findOne({ registrationNumber: 'REG/NOIDA/2024/108' });
        if (!ngoProfile3) {
            ngoProfile3 = await NGO.create({
                user: ngoUser3._id,
                ngoName: 'Care & Health Relief Society',
                registrationNumber: 'REG/NOIDA/2024/108',
                phone: '+91 9988776655',
                address: 'Sector 62, Near Fortis Hospital',
                city: 'Noida',
                state: 'Uttar Pradesh',
                description: 'Providing medical kits, healthcare support, and nutrition kits for senior citizens and low-income patients.',
                isVerified: true
            });
        }

        // Sample Requirements
        const sampleRequirements = [
            {
                ngo: ngoProfile1._id,
                user: ngoUser1._id,
                title: 'Winter Warm Clothes & Jackets for Night Shelter',
                category: 'Clothes',
                description: 'We urgently need warm sweaters, blankets, and winter jackets for 150 homeless people staying in night shelters during peak winter.',
                quantity: 150,
                unit: 'jackets/blankets',
                remainingQuantity: 110,
                city: 'Meerut',
                urgency: 'Critical',
                clothesType: 'Winter Jackets / Coats',
                targetAgeGroup: 'Adults (19-50 yrs)',
                size: 'Large (L)',
                status: 'active'
            },
            {
                ngo: ngoProfile1._id,
                user: ngoUser1._id,
                title: 'Ration Kits & Packaged Food Items',
                category: 'Food',
                description: 'Dry ration kits containing rice, wheat flour, pulses, and cooking oil for 80 migrant worker families.',
                quantity: 80,
                unit: 'kits',
                remainingQuantity: 45,
                city: 'Meerut',
                urgency: 'High',
                status: 'active'
            },
            {
                ngo: ngoProfile2._id,
                user: ngoUser2._id,
                title: 'Class 10th & Class 12th NCERT Textbooks',
                category: 'Books',
                description: 'Class 9th - 12th English, Science, and Mathematics NCERT textbooks and reference guides for slum children preparing for board exams.',
                quantity: 200,
                unit: 'sets',
                remainingQuantity: 160,
                city: 'Delhi',
                urgency: 'High',
                bookName: 'NCERT Science & Mathematics (Class 10th)',
                bookClass: 'Class 9th - 10th (High School)',
                bookType: 'NCERT Textbooks',
                status: 'active'
            },
            {
                ngo: ngoProfile2._id,
                user: ngoUser2._id,
                title: 'School Bags, Geometry Sets & Stationary Kits',
                category: 'School Supplies',
                description: 'School bags, water bottles, and stationery sets for children starting the new academic session.',
                quantity: 120,
                unit: 'kits',
                remainingQuantity: 90,
                city: 'Delhi',
                urgency: 'Medium',
                bookName: 'Primary Student Notebooks & Pencil Boxes',
                bookClass: 'Class 1st - 5th (Primary)',
                bookType: 'Notebooks & Registers & Stationery',
                status: 'active'
            },
            {
                ngo: ngoProfile3._id,
                user: ngoUser3._id,
                title: 'First-Aid Medical Supplies & Bandages',
                category: 'Medicine',
                description: 'Basic first-aid medical kits, antiseptic liquids, bandages, and digital thermometers for mobile health camp.',
                quantity: 50,
                unit: 'boxes',
                remainingQuantity: 30,
                city: 'Noida',
                urgency: 'Critical',
                status: 'active'
            },
            {
                ngo: ngoProfile3._id,
                user: ngoUser3._id,
                title: 'Toys & Indoor Games for Children Ward',
                category: 'Toys',
                description: 'Soft toys, puzzle games, drawing books, and building blocks for children in the pediatric hospital care ward.',
                quantity: 60,
                unit: 'toys/games',
                remainingQuantity: 50,
                city: 'Noida',
                urgency: 'Low',
                status: 'active'
            }
        ];

        for (const reqData of sampleRequirements) {
            const exists = await Requirement.findOne({ title: reqData.title });
            if (!exists) {
                await Requirement.create(reqData);
                console.log(`Created Requirement: ${reqData.title}`);
            }
        }

        console.log('✅ NGO Requirements seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
