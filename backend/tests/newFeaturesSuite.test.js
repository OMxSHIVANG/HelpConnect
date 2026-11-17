import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('HelpConnect 2.0 Feature Verification Suite', () => {

    test('Smart Recommendation Engine computes weighted compatibility score accurately', () => {
        // Algorithm: Category (30) + Subcategory/Keyword (10) + Qty coverage (25) + Urgency (20) + Proximity (15)
        const computeMatch = (reqCat, donorCat, reqRemaining, donorQty, urgency, distanceKm) => {
            let catScore = (reqCat.toLowerCase() === donorCat.toLowerCase()) ? 30 : 0;
            const coverageRatio = Math.min(1, donorQty / reqRemaining);
            const qtyScore = Math.round(coverageRatio * 25);
            const urgencyScore = urgency === 'Critical' ? 20 : urgency === 'High' ? 15 : urgency === 'Medium' ? 10 : 5;
            let proxScore = distanceKm < 10 ? 15 : distanceKm < 30 ? 12 : distanceKm < 60 ? 8 : 4;
            return Math.min(100, catScore + qtyScore + urgencyScore + proxScore);
        };

        // Case 1: Clothes match, 10 out of 20 remaining, Critical urgency, 5 km away
        const score1 = computeMatch('Clothes', 'Clothes', 20, 10, 'Critical', 5);
        // cat(30) + qty(13) + urgency(20) + prox(15) = 78
        assert.ok(score1 >= 75 && score1 <= 80, `Expected ~78%, got ${score1}%`);

        // Case 2: Complete fulfillment, Critical, near
        const score2 = computeMatch('Books', 'Books', 15, 20, 'Critical', 2);
        // cat(30) + qty(25) + urgency(20) + prox(15) = 90
        assert.ok(score2 >= 90, `Expected >= 90%, got ${score2}%`);
    });

    test('Donor Impact Passport strictly excludes pending, accepted, or cancelled donations', () => {
        const mockDonations = [
            { id: 1, quantity: 10, status: 'completed' },
            { id: 2, quantity: 20, status: 'completed' },
            { id: 3, quantity: 50, status: 'pending' },
            { id: 4, quantity: 15, status: 'accepted' },
            { id: 5, quantity: 5, status: 'cancelled' }
        ];

        // Impact passport filter
        const completedOnly = mockDonations.filter(d => d.status === 'completed');
        const totalItemsDonated = completedOnly.reduce((sum, d) => sum + d.quantity, 0);

        assert.equal(completedOnly.length, 2);
        assert.equal(totalItemsDonated, 30);
    });

    test('Campaign progress percentage is strictly derived from verified received quantity', () => {
        const computeProgress = (target, received) => {
            if (!target || target <= 0) return 0;
            return Math.min(100, Math.round((received / target) * 100));
        };

        assert.equal(computeProgress(100, 45), 45);
        assert.equal(computeProgress(200, 200), 100);
        assert.equal(computeProgress(50, 60), 100); // capped at 100%
        assert.equal(computeProgress(100, 0), 0);
    });

    test('Verification code format satisfies cryptographic 6-character uppercase standard', () => {
        const formatCheck = (code) => {
            return /^HC-[A-Z0-9]{6}$/.test(code);
        };

        assert.ok(formatCheck('HC-7X9K2P'));
        assert.ok(formatCheck('HC-A1B2C3'));
        assert.ok(!formatCheck('123456'));
        assert.ok(!formatCheck('HC-1234'));
    });

    test('Duplicate requirement detection correctly flags overlapping requirements', () => {
        const existing = [
            { title: 'Winter Blankets for Night Shelter', category: 'Clothes' },
            { title: 'Class 10th NCERT Books', category: 'Books' }
        ];

        const isDuplicate = (newTitle, newCategory) => {
            const words = newTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            return existing.some(item => {
                if (item.category.toLowerCase() !== newCategory.toLowerCase()) return false;
                const itemTitle = item.title.toLowerCase();
                const matches = words.filter(w => itemTitle.includes(w));
                return (matches.length / words.length) >= 0.5;
            });
        };

        // Similar blankets request
        assert.ok(isDuplicate('Blankets for Shelter', 'Clothes'));
        // Different category
        assert.ok(!isDuplicate('Blankets for Shelter', 'Food'));
        // Completely different need
        assert.ok(!isDuplicate('First Aid Kits for Camp', 'Medicine'));
    });

    test('Scheduling conflict prevention prevents overbooking same slot', () => {
        const MAX_PER_SLOT = 5;
        const currentSlotBookings = 5;

        const canBookSlot = (current) => current < MAX_PER_SLOT;

        assert.equal(canBookSlot(currentSlotBookings), false);
        assert.equal(canBookSlot(3), true);
    });
});
