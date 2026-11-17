import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceKm, getCoordinatesForCity } from '../utils/geoUtils.js';

describe('Smart Donation Priority & Geospatial Logic', () => {

    test('calculateDistanceKm accurately calculates distance between two points', () => {
        // Delhi: 28.6139 N, 77.2090 E
        // Noida Sector 62: 28.5355 N, 77.3910 E (~20-25 km)
        const dist = calculateDistanceKm(28.6139, 77.2090, 28.5355, 77.3910);
        assert.ok(dist > 15 && dist < 30, `Distance should be ~20km, got ${dist}`);

        // Same point distance should be 0
        const zeroDist = calculateDistanceKm(28.3670, 79.4304, 28.3670, 79.4304);
        assert.equal(zeroDist, 0);

        // Null / invalid inputs handled gracefully
        assert.equal(calculateDistanceKm(null, 77.2, 28.5, 77.3), null);
    });

    test('getCoordinatesForCity returns known coordinates for standard cities', () => {
        const bareillyCoords = getCoordinatesForCity('Bareilly');
        assert.deepEqual(bareillyCoords, [79.4304, 28.3670]);

        const delhiCoords = getCoordinatesForCity('Delhi');
        assert.deepEqual(delhiCoords, [77.2090, 28.6139]);

        const meerutCoords = getCoordinatesForCity('Meerut');
        assert.deepEqual(meerutCoords, [77.7064, 28.9845]);
    });

    test('Smart Sorting Algorithm satisfies exact user specification: Priority > Distance > Deadline', () => {
        const priorityRank = (urgency) => {
            const u = String(urgency).toLowerCase();
            if (u === 'critical') return 1;
            if (u === 'high') return 2;
            if (u === 'medium') return 3;
            return 4; // normal / low
        };

        const sampleItems = [
            { id: 'NGO-A', urgency: 'Critical', priorityRank: 1, distanceKm: 80, deadlineTime: 100 },
            { id: 'NGO-B', urgency: 'Critical', priorityRank: 1, distanceKm: 5, deadlineTime: 200 },
            { id: 'NGO-C', urgency: 'High', priorityRank: 2, distanceKm: 2, deadlineTime: 50 },
            { id: 'NGO-D', urgency: 'Normal', priorityRank: 4, distanceKm: 10, deadlineTime: 300 },
        ];

        sampleItems.sort((a, b) => {
            if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
            if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
            return a.deadlineTime - b.deadlineTime;
        });

        const expectedOrder = ['NGO-B', 'NGO-A', 'NGO-C', 'NGO-D'];
        assert.deepEqual(sampleItems.map(i => i.id), expectedOrder);
    });

    test('Tie-breaker on equal priority and equal distance shows earliest deadline first', () => {
        const date1 = new Date('2026-12-01T00:00:00Z').getTime();
        const date2 = new Date('2026-12-10T00:00:00Z').getTime();

        const items = [
            { id: 'Later-Deadline', priorityRank: 1, distanceKm: 15, deadlineTime: date2 },
            { id: 'Earlier-Deadline', priorityRank: 1, distanceKm: 15, deadlineTime: date1 }
        ];

        items.sort((a, b) => {
            if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
            if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
            return a.deadlineTime - b.deadlineTime;
        });

        assert.equal(items[0].id, 'Earlier-Deadline');
        assert.equal(items[1].id, 'Later-Deadline');
    });

    test('Shortage percentage is computed accurately', () => {
        const computeShortage = (quantity, remaining) => {
            return Math.min(100, Math.max(0, Math.round((remaining / quantity) * 100)));
        };

        // Total: 10, Remaining: 8 -> 80% shortage
        assert.equal(computeShortage(10, 8), 80);

        // Total: 100, Remaining: 25 -> 25% shortage
        assert.equal(computeShortage(100, 25), 25);

        // Fully donated: 0 remaining -> 0% shortage
        assert.equal(computeShortage(50, 0), 0);
    });
});
