// City coordinates lookup table (Longitude, Latitude) for fast and offline-reliable geocoding
export const CITY_COORDINATES = {
    bareilly: { lng: 79.4304, lat: 28.3670, city: 'Bareilly', state: 'Uttar Pradesh' },
    meerut: { lng: 77.7064, lat: 28.9845, city: 'Meerut', state: 'Uttar Pradesh' },
    delhi: { lng: 77.2090, lat: 28.6139, city: 'Delhi', state: 'Delhi NCR' },
    'new delhi': { lng: 77.2090, lat: 28.6139, city: 'New Delhi', state: 'Delhi NCR' },
    noida: { lng: 77.3910, lat: 28.5355, city: 'Noida', state: 'Uttar Pradesh' },
    'greater noida': { lng: 77.5030, lat: 28.4744, city: 'Greater Noida', state: 'Uttar Pradesh' },
    ghaziabad: { lng: 77.4538, lat: 28.6692, city: 'Ghaziabad', state: 'Uttar Pradesh' },
    gurgaon: { lng: 77.0266, lat: 28.4595, city: 'Gurgaon', state: 'Haryana' },
    gurugram: { lng: 77.0266, lat: 28.4595, city: 'Gurugram', state: 'Haryana' },
    faridabad: { lng: 77.3178, lat: 28.4089, city: 'Faridabad', state: 'Haryana' },
    moradabad: { lng: 78.7768, lat: 28.8386, city: 'Moradabad', state: 'Uttar Pradesh' },
    aligarh: { lng: 78.0880, lat: 27.8974, city: 'Aligarh', state: 'Uttar Pradesh' },
    agra: { lng: 78.0081, lat: 27.1767, city: 'Agra', state: 'Uttar Pradesh' },
    mathura: { lng: 77.6737, lat: 27.4924, city: 'Mathura', state: 'Uttar Pradesh' },
    lucknow: { lng: 80.9462, lat: 26.8467, city: 'Lucknow', state: 'Uttar Pradesh' },
    kanpur: { lng: 80.3319, lat: 26.4499, city: 'Kanpur', state: 'Uttar Pradesh' },
    varanasi: { lng: 82.9739, lat: 25.3176, city: 'Varanasi', state: 'Uttar Pradesh' },
    prayagraj: { lng: 81.8463, lat: 25.4358, city: 'Prayagraj', state: 'Uttar Pradesh' },
    allahabad: { lng: 81.8463, lat: 25.4358, city: 'Prayagraj', state: 'Uttar Pradesh' },
    gorakhpur: { lng: 83.3732, lat: 26.7606, city: 'Gorakhpur', state: 'Uttar Pradesh' },
    jhansi: { lng: 78.5788, lat: 25.4484, city: 'Jhansi', state: 'Uttar Pradesh' },
    saharanpur: { lng: 77.5460, lat: 29.9640, city: 'Saharanpur', state: 'Uttar Pradesh' },
    muzaffarnagar: { lng: 77.7060, lat: 29.4727, city: 'Muzaffarnagar', state: 'Uttar Pradesh' },
    dehradun: { lng: 78.0322, lat: 30.3165, city: 'Dehradun', state: 'Uttarakhand' },
    haridwar: { lng: 78.1642, lat: 29.9457, city: 'Haridwar', state: 'Uttarakhand' },
    rishikesh: { lng: 78.2676, lat: 30.0869, city: 'Rishikesh', state: 'Uttarakhand' },
    jaipur: { lng: 75.7873, lat: 26.9124, city: 'Jaipur', state: 'Rajasthan' },
    jodhpur: { lng: 73.0243, lat: 26.2389, city: 'Jodhpur', state: 'Rajasthan' },
    udaipur: { lng: 73.7125, lat: 24.5854, city: 'Udaipur', state: 'Rajasthan' },
    kota: { lng: 75.8648, lat: 25.2138, city: 'Kota', state: 'Rajasthan' },
    ajmer: { lng: 74.6399, lat: 26.4499, city: 'Ajmer', state: 'Rajasthan' },
    bikaner: { lng: 73.3119, lat: 28.0229, city: 'Bikaner', state: 'Rajasthan' },
    mumbai: { lng: 72.8777, lat: 19.0760, city: 'Mumbai', state: 'Maharashtra' },
    pune: { lng: 73.8567, lat: 18.5204, city: 'Pune', state: 'Maharashtra' },
    nagpur: { lng: 79.0882, lat: 21.1458, city: 'Nagpur', state: 'Maharashtra' },
    nashik: { lng: 73.7898, lat: 19.9975, city: 'Nashik', state: 'Maharashtra' },
    thane: { lng: 72.9781, lat: 19.2183, city: 'Thane', state: 'Maharashtra' },
    'navi mumbai': { lng: 73.0297, lat: 19.0330, city: 'Navi Mumbai', state: 'Maharashtra' },
    aurangabad: { lng: 75.3433, lat: 19.8762, city: 'Aurangabad', state: 'Maharashtra' },
    bengaluru: { lng: 77.5946, lat: 12.9716, city: 'Bengaluru', state: 'Karnataka' },
    bangalore: { lng: 77.5946, lat: 12.9716, city: 'Bengaluru', state: 'Karnataka' },
    mysore: { lng: 76.6394, lat: 12.2958, city: 'Mysore', state: 'Karnataka' },
    mysuru: { lng: 76.6394, lat: 12.2958, city: 'Mysore', state: 'Karnataka' },
    mangalore: { lng: 74.8560, lat: 12.9141, city: 'Mangalore', state: 'Karnataka' },
    hyderabad: { lng: 78.4867, lat: 17.3850, city: 'Hyderabad', state: 'Telangana' },
    secunderabad: { lng: 78.5011, lat: 17.4399, city: 'Secunderabad', state: 'Telangana' },
    warangal: { lng: 79.5941, lat: 17.9689, city: 'Warangal', state: 'Telangana' },
    chennai: { lng: 80.2707, lat: 13.0827, city: 'Chennai', state: 'Tamil Nadu' },
    coimbatore: { lng: 76.9558, lat: 11.0168, city: 'Coimbatore', state: 'Tamil Nadu' },
    madurai: { lng: 78.1198, lat: 9.9252, city: 'Madurai', state: 'Tamil Nadu' },
    kolkata: { lng: 88.3639, lat: 22.5726, city: 'Kolkata', state: 'West Bengal' },
    howrah: { lng: 88.3103, lat: 22.5958, city: 'Howrah', state: 'West Bengal' },
    ahmedabad: { lng: 72.5714, lat: 23.0225, city: 'Ahmedabad', state: 'Gujarat' },
    surat: { lng: 72.8311, lat: 21.1702, city: 'Surat', state: 'Gujarat' },
    vadodara: { lng: 73.1812, lat: 22.3072, city: 'Vadodara', state: 'Gujarat' },
    rajkot: { lng: 70.8022, lat: 22.3039, city: 'Rajkot', state: 'Gujarat' },
    gandhinagar: { lng: 72.6369, lat: 23.2156, city: 'Gandhinagar', state: 'Gujarat' },
    bhopal: { lng: 77.4126, lat: 23.2599, city: 'Bhopal', state: 'Madhya Pradesh' },
    indore: { lng: 75.8577, lat: 22.7196, city: 'Indore', state: 'Madhya Pradesh' },
    gwalior: { lng: 78.1828, lat: 26.2183, city: 'Gwalior', state: 'Madhya Pradesh' },
    jabalpur: { lng: 79.9864, lat: 23.1815, city: 'Jabalpur', state: 'Madhya Pradesh' },
    patna: { lng: 85.1376, lat: 25.5941, city: 'Patna', state: 'Bihar' },
    gaya: { lng: 85.0002, lat: 24.7914, city: 'Gaya', state: 'Bihar' },
    chandigarh: { lng: 76.7794, lat: 30.7333, city: 'Chandigarh', state: 'Chandigarh' },
    mohali: { lng: 76.7179, lat: 30.7046, city: 'Mohali', state: 'Punjab' },
    panchkula: { lng: 76.8606, lat: 30.6942, city: 'Panchkula', state: 'Haryana' },
    ludhiana: { lng: 75.8573, lat: 30.9010, city: 'Ludhiana', state: 'Punjab' },
    amritsar: { lng: 74.8723, lat: 31.6340, city: 'Amritsar', state: 'Punjab' },
    jalandhar: { lng: 75.5762, lat: 31.3260, city: 'Jalandhar', state: 'Punjab' },
    raipur: { lng: 81.6296, lat: 21.2514, city: 'Raipur', state: 'Chhattisgarh' },
    bhubaneswar: { lng: 85.8245, lat: 20.2961, city: 'Bhubaneswar', state: 'Odisha' },
    cuttack: { lng: 85.8830, lat: 20.4625, city: 'Cuttack', state: 'Odisha' },
    ranchi: { lng: 85.3096, lat: 23.3441, city: 'Ranchi', state: 'Jharkhand' },
    jamshedpur: { lng: 86.2029, lat: 22.8046, city: 'Jamshedpur', state: 'Jharkhand' },
    guwahati: { lng: 91.7362, lat: 26.1445, city: 'Guwahati', state: 'Assam' },
    shimla: { lng: 77.1734, lat: 31.1048, city: 'Shimla', state: 'Himachal Pradesh' },
    srinagar: { lng: 74.7973, lat: 34.0837, city: 'Srinagar', state: 'Jammu & Kashmir' },
    jammu: { lng: 74.8570, lat: 32.7266, city: 'Jammu', state: 'Jammu & Kashmir' },
    thiruvananthapuram: { lng: 76.9366, lat: 8.5241, city: 'Thiruvananthapuram', state: 'Kerala' },
    kochi: { lng: 76.2673, lat: 9.9312, city: 'Kochi', state: 'Kerala' },
    cochin: { lng: 76.2673, lat: 9.9312, city: 'Kochi', state: 'Kerala' },
    panaji: { lng: 73.8278, lat: 15.4909, city: 'Panaji', state: 'Goa' },
    goa: { lng: 73.8278, lat: 15.4909, city: 'Panaji', state: 'Goa' }
};

/**
 * Resolve coordinates for a given city and address
 * @param {string} city 
 * @param {string} address 
 * @returns {[number, number]} [longitude, latitude]
 */
export const getCoordinatesForCity = (city = '', address = '') => {
    // 1. Direct coordinate pattern in address/city (e.g. "28.6139, 77.2090")
    const combined = `${address} ${city}`;
    const coordMatch = combined.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (coordMatch) {
        const val1 = parseFloat(coordMatch[1]);
        const val2 = parseFloat(coordMatch[2]);
        if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
            return [val2, val1]; // [lng, lat]
        }
    }

    const normCity = String(city).trim().toLowerCase();
    // 2. Direct city match
    if (normCity && CITY_COORDINATES[normCity]) {
        return [CITY_COORDINATES[normCity].lng, CITY_COORDINATES[normCity].lat];
    }

    // 3. Clean city without commas or country (e.g. "Delhi, India" -> "delhi")
    const cleanCity = normCity.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)[0];
    if (cleanCity && CITY_COORDINATES[cleanCity]) {
        return [CITY_COORDINATES[cleanCity].lng, CITY_COORDINATES[cleanCity].lat];
    }

    // 4. Match city token in address
    const normAddr = String(address).trim().toLowerCase();
    for (const [key, val] of Object.entries(CITY_COORDINATES)) {
        const wordRegex = new RegExp(`\\b${key}\\b`, 'i');
        if (wordRegex.test(normAddr) || wordRegex.test(normCity)) {
            return [val.lng, val.lat];
        }
    }

    // Return null if completely unknown. Never assume an unknown location is Bareilly.
    return null;
};

/**
 * Validate latitude and longitude values
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {boolean}
 */
export const validateCoordinates = (lat, lng) => {
    if (lat == null || lng == null) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (isNaN(nLat) || isNaN(nLng)) return false;
    // Reject Null Island [0, 0] as valid donor or NGO coordinates
    if (nLat === 0 && nLng === 0) return false;
    return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
};

/**
 * Calculate Great-Circle Haversine straight-line distance in Kilometers
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number|null} straight-line distance in KM
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

    const R = 6371; // Radius of the Earth in km
    const dLat = (nLat2 - nLat1) * (Math.PI / 180);
    const dLon = (nLon2 - nLon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(nLat1 * (Math.PI / 180)) * Math.cos(nLat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
};

export const calculateStraightLineDistanceKm = calculateDistanceKm;

/**
 * Estimate road distance using standard urban/suburban road curvature detour index (~1.3x)
 * @param {number} straightLineKm
 * @returns {number|null}
 */
export const estimateRoadDistanceKm = (straightLineKm) => {
    if (straightLineKm == null || isNaN(straightLineKm) || straightLineKm <= 0) return straightLineKm;
    return Math.round(straightLineKm * 1.3 * 10) / 10;
};

/**
 * Get structured distance details clearly distinguishing straight-line and estimated road travel distance
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {object|null}
 */
export const getDistanceDetails = (lat1, lon1, lat2, lon2) => {
    const straightLineDistanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
    if (straightLineDistanceKm == null) return null;

    const estimatedRoadDistanceKm = estimateRoadDistanceKm(straightLineDistanceKm);

    return {
        straightLineDistanceKm,
        estimatedRoadDistanceKm,
        isEstimated: true,
        distanceLabel: `~${estimatedRoadDistanceKm} KM (Est. Travel Distance)`,
        straightLineLabel: `${straightLineDistanceKm} KM (Straight-line)`,
        formattedDisplay: `~${estimatedRoadDistanceKm} KM (Est. Road Transit)`
    };
};

/**
 * Sequential numeric rank of pickup lifecycle statuses.
 * Disallows backward status progression.
 */
export const PICKUP_STATUS_ORDER = {
    accepted: 1,
    agent_assigned: 2,
    agent_on_the_way: 3,
    agent_nearby: 4,
    agent_arrived: 5,
    donation_collected: 6,
    completed: 7,
    cancelled: -1
};

/**
 * Strict state transition matrix.
 * Terminal states (completed, cancelled) cannot transition to any other status.
 */
export const VALID_PICKUP_TRANSITIONS = {
    accepted: ['agent_assigned', 'cancelled'],
    agent_assigned: ['agent_on_the_way', 'agent_nearby', 'agent_arrived', 'cancelled'],
    agent_on_the_way: ['agent_nearby', 'agent_arrived', 'cancelled'],
    agent_nearby: ['agent_arrived', 'cancelled'],
    agent_arrived: ['donation_collected', 'cancelled'],
    donation_collected: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
};

/**
 * Validates whether a pickup status transition is permitted.
 * Blocks backward status movement, redundant self-transitions, and transitions from terminal states.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {boolean}
 */
export const isValidPickupTransition = (fromStatus, toStatus) => {
    if (!fromStatus || !toStatus) return false;
    if (fromStatus === toStatus) return false; // Prevent duplicate transition
    if (fromStatus === 'cancelled' || fromStatus === 'completed') return false; // Terminal states cannot change
    const allowed = VALID_PICKUP_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
};

/**
 * Standard user notification messages conforming strictly to required text.
 * Sensitive data such as donor verification OTP is NEVER revealed in tracking notifications.
 */
export const PICKUP_NOTIFICATION_MESSAGES = {
    agent_assigned: {
        title: 'Pickup Agent Assigned 🛵',
        donorMessage: 'Pickup agent has been assigned to your donation.',
        ngoMessage: 'Pickup agent has been assigned to your donation.'
    },
    agent_on_the_way: {
        title: 'Pickup Agent On The Way 🚚',
        donorMessage: 'Your pickup agent is on the way.',
        ngoMessage: 'Your pickup agent is on the way.'
    },
    agent_nearby: {
        title: 'Pickup Agent Nearby 🛵',
        donorMessage: 'Your pickup agent is within 5 km of your pickup location.',
        ngoMessage: 'Your pickup agent is within 5 km of your pickup location.'
    },
    agent_arrived: {
        title: 'Pickup Agent Arrived 📍',
        donorMessage: 'Your pickup agent has arrived at your pickup location.',
        ngoMessage: 'Your pickup agent has arrived at your pickup location.'
    },
    donation_collected: {
        title: 'Donation Collected 📦',
        donorMessage: 'Your donation has been collected successfully.',
        ngoMessage: 'Your donation has been collected successfully.'
    },
    completed: {
        title: 'Pickup Completed 🎉',
        donorMessage: 'Your donation parcel has been received by the NGO.',
        ngoMessage: 'Your donation parcel has been received by the NGO.'
    }
};

/**
 * Determine next automatic pickup status based on verified distance and current state.
 * Correct sequence:
 * 1. accepted
 * 2. agent_assigned
 * 3. agent_on_the_way (completed >= 50% of initial straight-line distance)
 * 4. agent_nearby (within 5 km of donor)
 * 5. agent_arrived (within 200 metres of donor)
 * 6. donation_collected (via OTP confirmation)
 * 7. completed (NGO parcel receipt)
 * 
 * Rules:
 * - When agent reaches within 200 metres (<= 0.2 km): set agent_arrived.
 * - When agent is within 5 km of donor: set agent_nearby (for ongoing trips, only transitions from agent_on_the_way so 5km does not override 50% progress).
 * - When agent has completed at least 50% of the initial straight-line distance: set agent_on_the_way.
 * - If agent's first GPS update is already inside a later threshold: apply appropriate latest valid status without fabricating previous movement.
 * - Cancelled or completed donations never progress.
 * 
 * @param {object} params
 * @param {string} params.currentStatus
 * @param {number} params.currentDistanceKm
 * @param {number} params.initialRouteDistanceKm
 * @param {boolean} [params.isFirstUpdate]
 * @returns {string|null} next status or null if no transition
 */
export const determineNextPickupStatus = ({
    currentStatus,
    currentDistanceKm,
    initialRouteDistanceKm,
    isFirstUpdate = false
}) => {
    if (!currentStatus) return null;
    if (['donation_collected', 'completed', 'cancelled', 'rejected'].includes(currentStatus)) {
        return null;
    }
    if (currentDistanceKm == null || isNaN(currentDistanceKm) || currentDistanceKm < 0) {
        return null;
    }

    // First GPS update inside a later threshold: apply appropriate latest valid status without fabricating previous movement
    if (isFirstUpdate) {
        if (currentDistanceKm <= 0.2) {
            return currentStatus !== 'agent_arrived' ? 'agent_arrived' : null;
        }
        if (currentDistanceKm <= 5.0) {
            return currentStatus !== 'agent_nearby' ? 'agent_nearby' : null;
        }
        if (initialRouteDistanceKm > 0 && currentDistanceKm <= 0.5 * initialRouteDistanceKm) {
            return currentStatus !== 'agent_on_the_way' ? 'agent_on_the_way' : null;
        }
        return null;
    }

    // Normal progression for ongoing trips:
    // 1. Arrival threshold: <= 200m (0.2 km)
    if (currentDistanceKm <= 0.2) {
        if (['agent_assigned', 'agent_on_the_way', 'agent_nearby'].includes(currentStatus)) {
            return 'agent_arrived';
        }
    }

    // 2. Nearby threshold: <= 5.0 km
    // For ongoing trips, agent must be at least agent_on_the_way so 5km does not override 50% progress
    if (currentDistanceKm <= 5.0) {
        if (currentStatus === 'agent_on_the_way') {
            return 'agent_nearby';
        }
    }

    // 3. On The Way threshold: completed at least 50% of initial straight-line distance
    if (initialRouteDistanceKm > 0 && currentDistanceKm <= 0.5 * initialRouteDistanceKm) {
        if (currentStatus === 'agent_assigned') {
            return 'agent_on_the_way';
        }
    }

    return null;
};
