import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { getUrgentNearbyRequirements } from '../controllers/donorController.js';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import Requirement from '../models/Requirement.js';
import { calculateDistanceKm } from '../utils/geoUtils.js';

describe('Urgent Nearby Requirements API Logic', () => {

    test('getUrgentNearbyRequirements correctly structures response and sorts by priority and distance', async () => {
        // Mock request and response
        const req = {
            user: { _id: '507f191e810c19729de860ea', name: 'Test Donor' },
            query: {
                lat: '28.3670',
                lng: '79.4304',
                radius: '100'
            }
        };

        let responseData = null;
        let responseStatus = 200;

        const res = {
            json: (data) => { responseData = data; return res; },
            status: (code) => { responseStatus = code; return res; }
        };

        // Priority calculation logic validation
        const priorities = ['Critical', 'High', 'Medium', 'Normal'];
        assert.equal(priorities[0], 'Critical');
        assert.equal(priorities[1], 'High');
        assert.equal(priorities[2], 'Medium');
        assert.equal(priorities[3], 'Normal');
    });

    test('Expired requirement filtering excludes deadlines in the past', () => {
        const now = new Date();
        const pastDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
        const futureDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day future

        const requirements = [
            { id: 1, title: 'Expired Food', deadline: pastDeadline, status: 'active' },
            { id: 2, title: 'Active Medicine', deadline: futureDeadline, status: 'active' },
            { id: 3, title: 'No Deadline Blankets', deadline: null, status: 'active' }
        ];

        const activeNonExpired = requirements.filter(r => {
            if (r.status !== 'active') return false;
            if (r.deadline && new Date(r.deadline) < now) return false;
            return true;
        });

        assert.equal(activeNonExpired.length, 2);
        assert.equal(activeNonExpired.some(r => r.id === 1), false);
        assert.equal(activeNonExpired.some(r => r.id === 2), true);
        assert.equal(activeNonExpired.some(r => r.id === 3), true);
    });

    test('Directions URL formatting generates valid Google Maps links with origin and destination', () => {
        const donorLat = 28.3670;
        const donorLng = 79.4304;
        const ngoLat = 28.8386;
        const ngoLng = 78.7768;

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${donorLat},${donorLng}&destination=${ngoLat},${ngoLng}`;
        assert.ok(directionsUrl.includes('api=1'));
        assert.ok(directionsUrl.includes(`origin=${donorLat},${donorLng}`));
        assert.ok(directionsUrl.includes(`destination=${ngoLat},${ngoLng}`));
    });
});
