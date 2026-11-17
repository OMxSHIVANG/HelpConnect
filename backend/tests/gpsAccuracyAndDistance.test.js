import { describe, test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import {
    getCoordinatesForCity,
    validateCoordinates,
    calculateDistanceKm,
    calculateStraightLineDistanceKm,
    estimateRoadDistanceKm,
    getDistanceDetails
} from '../utils/geoUtils.js';
import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import PickupAgent from '../models/PickupAgent.js';
import { updateLiveLocation, getLiveTrackingData } from '../controllers/pickupAgentController.js';

describe('GPS Location Accuracy & Distance Calculation Suite (TASK 2)', () => {

    test('1. Agra donor coordinates resolve correctly in GeoJSON order [lng, lat]', () => {
        const agraCoords = getCoordinatesForCity('Agra');
        assert.ok(agraCoords, 'Agra coordinates should not be null');
        assert.strictEqual(Array.isArray(agraCoords), true);
        assert.strictEqual(agraCoords.length, 2);
        // GeoJSON coordinate order must strictly be [longitude, latitude]
        assert.strictEqual(agraCoords[0], 78.0081, 'Longitude for Agra should be 78.0081');
        assert.strictEqual(agraCoords[1], 27.1767, 'Latitude for Agra should be 27.1767');
    });

    test('2. Delhi donor coordinates resolve correctly in GeoJSON order [lng, lat]', () => {
        const delhiCoords = getCoordinatesForCity('Delhi');
        assert.ok(delhiCoords, 'Delhi coordinates should not be null');
        assert.strictEqual(Array.isArray(delhiCoords), true);
        assert.strictEqual(delhiCoords.length, 2);
        // GeoJSON coordinate order must strictly be [longitude, latitude]
        assert.strictEqual(delhiCoords[0], 77.2090, 'Longitude for Delhi should be 77.2090');
        assert.strictEqual(delhiCoords[1], 28.6139, 'Latitude for Delhi should be 28.6139');
    });

    test('3. Unknown city returns null and NEVER defaults to Bareilly', () => {
        const unknownCity = 'FictionalCity987XYZ';
        const coords = getCoordinatesForCity(unknownCity, 'Random Street Nowhere');
        assert.strictEqual(coords, null, 'Unknown city must return null instead of a silent fallback');

        const unknownCity2 = getCoordinatesForCity('Atlantis');
        assert.strictEqual(unknownCity2, null, 'Unknown city must return null');

        // Confirm Bareilly is only returned when Bareilly is explicitly requested
        const bareillyCoords = getCoordinatesForCity('Bareilly');
        assert.notDeepStrictEqual(coords, bareillyCoords, 'Unknown city must never resolve to Bareilly coordinates');
    });

    test('4. Coordinate validation rejects out-of-range, null island, or invalid inputs', () => {
        // Valid coordinates
        assert.strictEqual(validateCoordinates(27.1767, 78.0081), true, 'Agra coordinates are valid');
        assert.strictEqual(validateCoordinates(28.6139, 77.2090), true, 'Delhi coordinates are valid');

        // Out of range latitude (> 90 or < -90)
        assert.strictEqual(validateCoordinates(90.1, 77.2090), false, 'Latitude > 90 rejected');
        assert.strictEqual(validateCoordinates(-90.5, 77.2090), false, 'Latitude < -90 rejected');

        // Out of range longitude (> 180 or < -180)
        assert.strictEqual(validateCoordinates(28.6139, 180.5), false, 'Longitude > 180 rejected');
        assert.strictEqual(validateCoordinates(28.6139, -180.5), false, 'Longitude < -180 rejected');

        // Null Island [0, 0] must be rejected as invalid donor/NGO coordinates
        assert.strictEqual(validateCoordinates(0, 0), false, 'Null Island [0,0] rejected');

        // Malformed / NaN inputs
        assert.strictEqual(validateCoordinates('abc', 'def'), false, 'Non-numeric strings rejected');
        assert.strictEqual(validateCoordinates(null, null), false, 'Null values rejected');
        assert.strictEqual(validateCoordinates(undefined, 77.209), false, 'Undefined lat rejected');
    });

    test('5. Distance calculation clearly distinguishes straight-line distance and estimated road distance', () => {
        // Delhi (28.6139, 77.2090) to Agra (27.1767, 78.0081)
        const straightLineKm = calculateDistanceKm(28.6139, 77.2090, 27.1767, 78.0081);
        assert.ok(straightLineKm > 175 && straightLineKm < 185, `Straight-line distance should be ~180 km, got ${straightLineKm}`);

        const estimatedRoadKm = estimateRoadDistanceKm(straightLineKm);
        assert.ok(estimatedRoadKm > straightLineKm, 'Estimated road distance must be greater than straight-line distance due to road curvature');
        assert.strictEqual(estimatedRoadKm, Math.round(straightLineKm * 1.3 * 10) / 10);

        const details = getDistanceDetails(28.6139, 77.2090, 27.1767, 78.0081);
        assert.ok(details, 'Distance details should be returned');
        assert.strictEqual(details.straightLineDistanceKm, straightLineKm);
        assert.strictEqual(details.estimatedRoadDistanceKm, estimatedRoadKm);
        assert.strictEqual(details.isEstimated, true);
        assert.ok(details.distanceLabel.includes('Est. Travel Distance'));
        assert.ok(details.straightLineLabel.includes('Straight-line'));
    });

    test('6. Storing actual coordinates in Donation and NGO models conforms to GeoJSON Point schema', async () => {
        const donation = new Donation({
            donor: new mongoose.Types.ObjectId(),
            ngo: new mongoose.Types.ObjectId(),
            requirement: new mongoose.Types.ObjectId(),
            quantity: 5,
            pickupAddress: 'Taj East Gate Road, Agra',
            city: 'Agra',
            pickupLocation: {
                latitude: 27.1767,
                longitude: 78.0081,
                accuracy: 12,
                formattedAddress: 'Taj East Gate Road, Agra, Uttar Pradesh',
                verificationStatus: 'gps_verified',
                lastUpdatedAt: new Date()
            }
        });

        // Async validate triggers pre('validate') GeoJSON coordinate synchronization
        await donation.validate();
        assert.strictEqual(donation.pickupLocation.coordinates[0], 78.0081, 'GeoJSON first coordinate must be longitude');
        assert.strictEqual(donation.pickupLocation.coordinates[1], 27.1767, 'GeoJSON second coordinate must be latitude');
        assert.strictEqual(donation.pickupLocation.verificationStatus, 'gps_verified');

        const ngo = new NGO({
            user: new mongoose.Types.ObjectId(),
            ngoName: 'Agra Relief Foundation',
            registrationNumber: 'NGO-AGRA-001',
            phone: '+919876543210',
            address: 'Fatehabad Road, Agra',
            city: 'Agra',
            location: {
                latitude: 27.1600,
                longitude: 78.0400,
                verificationStatus: 'manual_map_selected'
            }
        });

        await ngo.validate();
        assert.strictEqual(ngo.location.coordinates[0], 78.0400, 'NGO GeoJSON first coordinate must be longitude');
        assert.strictEqual(ngo.location.coordinates[1], 27.1600, 'NGO GeoJSON second coordinate must be latitude');
    });

    test('7. Poor GPS accuracy (> 500m) is rejected by updateLiveLocation', async () => {
        const mockAgent = {
            _id: new mongoose.Types.ObjectId(),
            status: 'active'
        };

        const req = {
            agent: mockAgent,
            params: { id: new mongoose.Types.ObjectId().toString() },
            body: {
                latitude: 28.6139,
                longitude: 77.2090,
                accuracy: 750 // > 500m threshold
            }
        };

        let responseStatus = null;
        let responseJson = null;
        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };

        await updateLiveLocation(req, res);
        assert.strictEqual(responseStatus, 400, 'Should reject accuracy > 500m with 400');
        assert.ok(responseJson.message.includes('GPS accuracy is outside acceptable threshold'));
    });

    test('8. Stale GPS timestamp (> 10 minutes past) is rejected by updateLiveLocation', async () => {
        const mockAgent = {
            _id: new mongoose.Types.ObjectId(),
            status: 'active'
        };

        const staleTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago

        const req = {
            agent: mockAgent,
            params: { id: new mongoose.Types.ObjectId().toString() },
            body: {
                latitude: 28.6139,
                longitude: 77.2090,
                accuracy: 10,
                timestamp: staleTime
            }
        };

        let responseStatus = null;
        let responseJson = null;
        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };

        await updateLiveLocation(req, res);
        assert.strictEqual(responseStatus, 400, 'Should reject stale timestamp with 400');
        assert.ok(responseJson.message.includes('Location timestamp is stale or invalid'));
    });

    test('9. Suspicious location jump / teleportation (> 160 km/h) is rejected', async () => {
        const agentId = new mongoose.Types.ObjectId();
        const mockAgent = {
            _id: agentId,
            status: 'active'
        };

        // Mock donation that was in Delhi 30 seconds ago
        const donationId = new mongoose.Types.ObjectId();
        const mockDonation = {
            _id: donationId,
            status: 'accepted',
            pickupStatus: 'agent_assigned',
            assignedAgent: agentId,
            agentLocation: {
                latitude: 28.6139, // Delhi
                longitude: 77.2090,
                updatedAt: new Date(Date.now() - 30 * 1000) // 30 seconds ago
            }
        };

        // Mock Donation.findById
        const originalFindById = Donation.findById;
        Donation.findById = () => ({
            populate: () => ({
                populate: () => ({
                    populate: async () => mockDonation
                })
            })
        });

        // Agent claims to be in Agra (180 km away) just 30 seconds later (speed = ~21,600 km/h!)
        const req = {
            agent: mockAgent,
            params: { id: donationId.toString() },
            body: {
                latitude: 27.1767, // Agra
                longitude: 78.0081,
                accuracy: 15
            }
        };

        let responseStatus = null;
        let responseJson = null;
        const res = {
            status: (code) => {
                responseStatus = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };

        try {
            await updateLiveLocation(req, res);
            assert.strictEqual(responseStatus, 400, 'Should reject suspicious jump with 400');
            assert.ok(responseJson.message.includes('Suspicious location jump detected'));
        } finally {
            Donation.findById = originalFindById;
        }
    });

    test('10. Missing donor location pauses automatic distance-based status updates', async () => {
        const agentId = new mongoose.Types.ObjectId();
        let agentSaved = false;
        const mockAgent = {
            _id: agentId,
            status: 'active',
            currentLocation: {},
            save: async () => { agentSaved = true; }
        };

        const donationId = new mongoose.Types.ObjectId();
        let donationSaved = false;
        const mockDonation = {
            _id: donationId,
            status: 'accepted',
            pickupStatus: 'agent_assigned',
            assignedAgent: agentId,
            city: 'NonExistentCity', // Unresolvable city
            pickupAddress: 'Unknown Lane Nowhere',
            pickupLocation: {
                latitude: null,
                longitude: null,
                verificationStatus: 'unverified'
            },
            trackingSession: {},
            save: async () => { donationSaved = true; }
        };

        const originalFindById = Donation.findById;
        Donation.findById = () => ({
            populate: () => ({
                populate: () => ({
                    populate: async () => mockDonation
                })
            })
        });

        const req = {
            agent: mockAgent,
            params: { id: donationId.toString() },
            body: {
                latitude: 28.6139,
                longitude: 77.2090,
                accuracy: 15
            }
        };

        let responseJson = null;
        let responseCode = 200;
        const res = {
            status: (code) => {
                responseCode = code;
                return res;
            },
            json: (data) => { responseJson = data; }
        };

        try {
            await updateLiveLocation(req, res);
            assert.strictEqual(responseJson.success, true);
            assert.strictEqual(responseJson.donorLocationVerified, false, 'Should flag donor location as unverified');
            assert.strictEqual(responseJson.statusChanged, false, 'Status must not change automatically when donor location is missing');
            assert.strictEqual(responseJson.pickupStatus, 'agent_assigned', 'Pickup status must remain agent_assigned');
            assert.ok(donationSaved, 'Agent location should still be saved');
            assert.ok(agentSaved, 'Agent currentLocation should still be updated');
        } finally {
            Donation.findById = originalFindById;
        }
    });

    test('11. getLiveTrackingData marks unverified donor destination and returns distanceDetails when present', async () => {
        const donationId = new mongoose.Types.ObjectId();
        const mockDonation = {
            _id: donationId,
            status: 'accepted',
            pickupStatus: 'agent_assigned',
            assignedAgent: {
                _id: new mongoose.Types.ObjectId(),
                agentId: 'HC-AG-9999',
                fullName: 'Test Agent',
                phone: '9876543210',
                vehicleType: 'Bike',
                vehicleNumber: 'UP-25-AB-1234',
                status: 'active'
            },
            agentLocation: {
                latitude: 28.6139,
                longitude: 77.2090
            },
            pickupLocation: {
                latitude: 27.1767,
                longitude: 78.0081,
                verificationStatus: 'gps_verified'
            },
            ngo: {
                ngoName: 'Agra Seva NGO',
                phone: '1234567890',
                address: 'Agra Center',
                city: 'Agra',
                location: {
                    latitude: 27.1600,
                    longitude: 78.0400
                }
            },
            donor: {
                _id: new mongoose.Types.ObjectId(),
                name: 'Donor User',
                phone: '9999999999'
            }
        };

        const originalFindById = Donation.findById;
        Donation.findById = () => ({
            populate: () => ({
                populate: () => ({
                    populate: async () => mockDonation
                })
            })
        });

        const req = {
            user: { _id: mockDonation.donor._id, role: 'donor' },
            params: { id: donationId.toString() }
        };

        let responseJson = null;
        let responseCode = 200;
        const res = {
            status: (code) => {
                responseCode = code;
                return res;
            },
            json: (data) => { responseJson = data; }
        };

        try {
            await getLiveTrackingData(req, res);
            assert.strictEqual(responseJson.success, true);
            assert.strictEqual(responseJson.donorDestination.isVerified, true);
            assert.strictEqual(responseJson.donorDestination.statusMessage, 'Verified Pickup Location');
            assert.ok(responseJson.distanceDetails, 'Distance details should be included');
            assert.ok(responseJson.distanceDetails.straightLineDistanceKm > 0);
            assert.ok(responseJson.distanceDetails.estimatedRoadDistanceKm > 0);
            assert.ok(responseJson.distanceDetails.distanceLabel.includes('Est. Travel Distance'));
        } finally {
            Donation.findById = originalFindById;
        }
    });
});
