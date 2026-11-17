import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// City coordinates lookup table (Longitude, Latitude) for client-side offline-reliable geocoding
const CLIENT_CITY_COORDINATES = {
  bareilly: { lng: 79.4304, lat: 28.3670, city: 'Bareilly' },
  meerut: { lng: 77.7064, lat: 28.9845, city: 'Meerut' },
  delhi: { lng: 77.2090, lat: 28.6139, city: 'Delhi' },
  'new delhi': { lng: 77.2090, lat: 28.6139, city: 'New Delhi' },
  noida: { lng: 77.3910, lat: 28.5355, city: 'Noida' },
  'greater noida': { lng: 77.5030, lat: 28.4744, city: 'Greater Noida' },
  ghaziabad: { lng: 77.4538, lat: 28.6692, city: 'Ghaziabad' },
  gurgaon: { lng: 77.0266, lat: 28.4595, city: 'Gurgaon' },
  gurugram: { lng: 77.0266, lat: 28.4595, city: 'Gurugram' },
  faridabad: { lng: 77.3178, lat: 28.4089, city: 'Faridabad' },
  moradabad: { lng: 78.7768, lat: 28.8386, city: 'Moradabad' },
  aligarh: { lng: 78.0880, lat: 27.8974, city: 'Aligarh' },
  agra: { lng: 78.0081, lat: 27.1767, city: 'Agra' },
  mathura: { lng: 77.6737, lat: 27.4924, city: 'Mathura' },
  lucknow: { lng: 80.9462, lat: 26.8467, city: 'Lucknow' },
  kanpur: { lng: 80.3319, lat: 26.4499, city: 'Kanpur' },
  varanasi: { lng: 82.9739, lat: 25.3176, city: 'Varanasi' },
  prayagraj: { lng: 81.8463, lat: 25.4358, city: 'Prayagraj' },
  allahabad: { lng: 81.8463, lat: 25.4358, city: 'Prayagraj' },
  gorakhpur: { lng: 83.3732, lat: 26.7606, city: 'Gorakhpur' },
  jhansi: { lng: 78.5788, lat: 25.4484, city: 'Jhansi' },
  saharanpur: { lng: 77.5460, lat: 29.9640, city: 'Saharanpur' },
  muzaffarnagar: { lng: 77.7060, lat: 29.4727, city: 'Muzaffarnagar' },
  dehradun: { lng: 78.0322, lat: 30.3165, city: 'Dehradun' },
  haridwar: { lng: 78.1642, lat: 29.9457, city: 'Haridwar' },
  rishikesh: { lng: 78.2676, lat: 30.0869, city: 'Rishikesh' },
  jaipur: { lng: 75.7873, lat: 26.9124, city: 'Jaipur' },
  jodhpur: { lng: 73.0243, lat: 26.2389, city: 'Jodhpur' },
  udaipur: { lng: 73.7125, lat: 24.5854, city: 'Udaipur' },
  kota: { lng: 75.8648, lat: 25.2138, city: 'Kota' },
  ajmer: { lng: 74.6399, lat: 26.4499, city: 'Ajmer' },
  bikaner: { lng: 73.3119, lat: 28.0229, city: 'Bikaner' },
  mumbai: { lng: 72.8777, lat: 19.0760, city: 'Mumbai' },
  pune: { lng: 73.8567, lat: 18.5204, city: 'Pune' },
  nagpur: { lng: 79.0882, lat: 21.1458, city: 'Nagpur' },
  nashik: { lng: 73.7898, lat: 19.9975, city: 'Nashik' },
  thane: { lng: 72.9781, lat: 19.2183, city: 'Thane' },
  'navi mumbai': { lng: 73.0297, lat: 19.0330, city: 'Navi Mumbai' },
  aurangabad: { lng: 75.3433, lat: 19.8762, city: 'Aurangabad' },
  bengaluru: { lng: 77.5946, lat: 12.9716, city: 'Bengaluru' },
  bangalore: { lng: 77.5946, lat: 12.9716, city: 'Bengaluru' },
  mysore: { lng: 76.6394, lat: 12.2958, city: 'Mysore' },
  mysuru: { lng: 76.6394, lat: 12.2958, city: 'Mysore' },
  mangalore: { lng: 74.8560, lat: 12.9141, city: 'Mangalore' },
  hyderabad: { lng: 78.4867, lat: 17.3850, city: 'Hyderabad' },
  secunderabad: { lng: 78.5011, lat: 17.4399, city: 'Secunderabad' },
  warangal: { lng: 79.5941, lat: 17.9689, city: 'Warangal' },
  chennai: { lng: 80.2707, lat: 13.0827, city: 'Chennai' },
  coimbatore: { lng: 76.9558, lat: 11.0168, city: 'Coimbatore' },
  madurai: { lng: 78.1198, lat: 9.9252, city: 'Madurai' },
  kolkata: { lng: 88.3639, lat: 22.5726, city: 'Kolkata' },
  howrah: { lng: 88.3103, lat: 22.5958, city: 'Howrah' },
  ahmedabad: { lng: 72.5714, lat: 23.0225, city: 'Ahmedabad' },
  surat: { lng: 72.8311, lat: 21.1702, city: 'Surat' },
  vadodara: { lng: 73.1812, lat: 22.3072, city: 'Vadodara' },
  rajkot: { lng: 70.8022, lat: 22.3039, city: 'Rajkot' },
  gandhinagar: { lng: 72.6369, lat: 23.2156, city: 'Gandhinagar' },
  bhopal: { lng: 77.4126, lat: 23.2599, city: 'Bhopal' },
  indore: { lng: 75.8577, lat: 22.7196, city: 'Indore' },
  gwalior: { lng: 78.1828, lat: 26.2183, city: 'Gwalior' },
  jabalpur: { lng: 79.9864, lat: 23.1815, city: 'Jabalpur' },
  patna: { lng: 85.1376, lat: 25.5941, city: 'Patna' },
  gaya: { lng: 85.0002, lat: 24.7914, city: 'Gaya' },
  chandigarh: { lng: 76.7794, lat: 30.7333, city: 'Chandigarh' },
  mohali: { lng: 76.7179, lat: 30.7046, city: 'Mohali' },
  panchkula: { lng: 76.8606, lat: 30.6942, city: 'Panchkula' },
  ludhiana: { lng: 75.8573, lat: 30.9010, city: 'Ludhiana' },
  amritsar: { lng: 74.8723, lat: 31.6340, city: 'Amritsar' },
  jalandhar: { lng: 75.5762, lat: 31.3260, city: 'Jalandhar' },
  raipur: { lng: 81.6296, lat: 21.2514, city: 'Raipur' },
  bhubaneswar: { lng: 85.8245, lat: 20.2961, city: 'Bhubaneswar' },
  cuttack: { lng: 85.8830, lat: 20.4625, city: 'Cuttack' },
  ranchi: { lng: 85.3096, lat: 23.3441, city: 'Ranchi' },
  jamshedpur: { lng: 86.2029, lat: 22.8046, city: 'Jamshedpur' },
  guwahati: { lng: 91.7362, lat: 26.1445, city: 'Guwahati' },
  shimla: { lng: 77.1734, lat: 31.1048, city: 'Shimla' },
  srinagar: { lng: 74.7973, lat: 34.0837, city: 'Srinagar' },
  jammu: { lng: 74.8570, lat: 32.7266, city: 'Jammu' },
  thiruvananthapuram: { lng: 76.9366, lat: 8.5241, city: 'Thiruvananthapuram' },
  kochi: { lng: 76.2673, lat: 9.9312, city: 'Kochi' },
  cochin: { lng: 76.2673, lat: 9.9312, city: 'Kochi' },
  panaji: { lng: 73.8278, lat: 15.4909, city: 'Panaji' },
  goa: { lng: 73.8278, lat: 15.4909, city: 'Panaji' }
};

/**
 * Robust Client-Side Coordinate Resolver:
 * Resolves valid GPS coordinates from explicit values, GeoJSON points, or city/address text.
 */
const resolveCoordinates = (city = '', address = '', lat = null, lng = null, coords = null) => {
  // 1. Direct explicit numeric coordinates (reject Null Island [0,0])
  const nLat = lat != null ? Number(lat) : null;
  const nLng = lng != null ? Number(lng) : null;
  if (
    nLat != null && !isNaN(nLat) &&
    nLng != null && !isNaN(nLng) &&
    Math.abs(nLat) <= 90 && Math.abs(nLng) <= 180 &&
    !(nLat === 0 && nLng === 0)
  ) {
    return { lat: nLat, lng: nLng };
  }

  // 2. GeoJSON coordinates array [longitude, latitude]
  if (Array.isArray(coords) && coords.length === 2) {
    const cLng = Number(coords[0]);
    const cLat = Number(coords[1]);
    if (
      !isNaN(cLat) && !isNaN(cLng) &&
      Math.abs(cLat) <= 90 && Math.abs(cLng) <= 180 &&
      !(cLat === 0 && cLng === 0)
    ) {
      return { lat: cLat, lng: cLng };
    }
  }

  // 3. Coordinate pattern in address or city text (e.g. "28.6139, 77.2090")
  const combinedText = `${address || ''} ${city || ''}`;
  const coordMatch = combinedText.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (coordMatch) {
    const pLat = parseFloat(coordMatch[1]);
    const pLng = parseFloat(coordMatch[2]);
    if (Math.abs(pLat) <= 90 && Math.abs(pLng) <= 180 && !(pLat === 0 && pLng === 0)) {
      return { lat: pLat, lng: pLng };
    }
  }

  // 4. Exact city match in lookup table
  const normCity = String(city || '').trim().toLowerCase();
  if (normCity && CLIENT_CITY_COORDINATES[normCity]) {
    const c = CLIENT_CITY_COORDINATES[normCity];
    return { lat: c.lat, lng: c.lng };
  }

  // 5. Clean city string (strip punctuation / country tags)
  const cleanCity = normCity.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)[0];
  if (cleanCity && CLIENT_CITY_COORDINATES[cleanCity]) {
    const c = CLIENT_CITY_COORDINATES[cleanCity];
    return { lat: c.lat, lng: c.lng };
  }

  // 6. Match any recognized city keyword in address or city
  const normAddr = String(address || '').trim().toLowerCase();
  for (const [key, val] of Object.entries(CLIENT_CITY_COORDINATES)) {
    const wordRegex = new RegExp(`\\b${key}\\b`, 'i');
    if (wordRegex.test(normAddr) || wordRegex.test(normCity)) {
      return { lat: val.lat, lng: val.lng };
    }
  }

  // Return null if completely unknown. Never assume an unknown location is Bareilly.
  return null;
};

const STATUS_COLORS = {
  pending_confirmation: { bg: '#F59E0B', border: '#D97706', label: 'Pending Confirmation' },
  confirmed: { bg: '#10B981', border: '#059669', label: 'Confirmed' },
  accepted: { bg: '#10B981', border: '#059669', label: 'Accepted' },
  agent_assigned: { bg: '#059669', border: '#047857', label: 'Agent Assigned' },
  agent_on_the_way: { bg: '#0284C7', border: '#0369A1', label: 'Agent On The Way' },
  agent_nearby: { bg: '#D97706', border: '#B45309', label: 'Agent Nearby' },
  agent_arrived: { bg: '#E11D48', border: '#BE123C', label: 'Agent Arrived' },
  donation_collected: { bg: '#7C3AED', border: '#6D28D9', label: 'Donation Collected' },
  in_transit: { bg: '#3B82F6', border: '#1D4ED8', label: 'In Transit' },
  completed: { bg: '#047857', border: '#065F46', label: 'Completed' },
  rescheduled: { bg: '#8B5CF6', border: '#6D28D9', label: 'Rescheduled' },
  missed: { bg: '#EF4444', border: '#B91C1C', label: 'Missed' },
  cancelled: { bg: '#64748B', border: '#475569', label: 'Cancelled' }
};

// Custom SVG Icons for Leaflet
const createPickupPin = (colorConfig, labelText, type = 'pickup') => {
  if (type === 'ngo') {
    return L.divIcon({
      className: 'custom-ngo-facility-pin',
      html: `
        <div style="cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <div style="background: #1E293B; border: 2.5px solid #FFFFFF; border-radius: 12px; padding: 6px 10px; color: white; display: flex; align-items: center; gap: 5px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
            <span style="font-size: 14px;">🏢</span>
            <span>${labelText || 'NGO Center'}</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid #1E293B; margin: 0 auto;"></div>
        </div>
      `,
      iconSize: [120, 40],
      iconAnchor: [60, 40],
      popupAnchor: [0, -38]
    });
  }

  if (type === 'transit') {
    return L.divIcon({
      className: 'custom-transit-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px;">
            🚚
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });
  }

  if (type === 'agent') {
    const symbol = colorConfig?.vehicleIcon || '🛵';
    return L.divIcon({
      className: 'custom-live-agent-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 46px; height: 46px; cursor: pointer;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #059669; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 17px;">
            ${symbol}
          </div>
          <div style="position: absolute; bottom: -14px; background: #064E3B; color: #A7F3D0; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; white-space: nowrap; border: 1px solid #10B981; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${labelText || 'Live Agent'}
          </div>
        </div>
      `,
      iconSize: [46, 50],
      iconAnchor: [23, 23],
      popupAnchor: [0, -23]
    });
  }

  // Standard donor pickup point
  const { bg, border } = colorConfig || { bg: '#10B981', border: '#059669' };
  return L.divIcon({
    className: 'custom-donor-pickup-pin',
    html: `
      <div style="cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); transition: transform 0.2s;">
        <svg width="34" height="42" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="${bg}" stroke="${border}" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="#FFFFFF"/>
          <text x="16" y="20" font-size="10" font-weight="900" text-anchor="middle" fill="${bg}">📦</text>
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42]
  });
};

export default function PickupTrackingMap({
  mode = 'route', // 'route' (single donation route) | 'dispatch' (NGO multi-pickup calendar)
  pickup,         // For single route: { pickupAddress, city, contactPhone, status, latitude, longitude, coordinates, isVerified }
  pickups = [],   // For multi-pickup dispatch: [ { ... } ]
  ngoLocation,    // { ngoName, address, city, latitude, longitude, coordinates }
  agentLocation,  // { latitude, longitude, accuracy, heading, speed, updatedAt, fullName, vehicleType }
  distanceKm,     // Optional distance in KM
  distanceDetails,// Optional { straightLineDistanceKm, estimatedRoadDistanceKm, distanceLabel, straightLineLabel }
  height = '420px',
  onSelectPickup
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);

  // Lifecycle cleanup on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Resolve initial center reliably
    const resolvedDonorCoords = (mode === 'route' && pickup)
      ? resolveCoordinates(pickup.city, pickup.pickupAddress, pickup.latitude, pickup.longitude, pickup.coordinates)
      : null;

    const resolvedNgoCoords = ngoLocation
      ? resolveCoordinates(ngoLocation.city, ngoLocation.address, ngoLocation.latitude, ngoLocation.longitude, ngoLocation.coordinates)
      : null;

    const initialCenter = resolvedDonorCoords
      ? [resolvedDonorCoords.lat, resolvedDonorCoords.lng]
      : (resolvedNgoCoords ? [resolvedNgoCoords.lat, resolvedNgoCoords.lng] : [20.5937, 78.9629]);
    const initialZoom = (resolvedDonorCoords || resolvedNgoCoords) ? 12 : 5;

    // Handle container changes or remounts (e.g. React StrictMode)
    if (mapInstanceRef.current) {
      if (mapInstanceRef.current.getContainer() !== mapContainerRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    }

    if (!mapInstanceRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    const bounds = L.latLngBounds();
    let validPointsCount = 0;

    // 1. Plot NGO Facility Pin
    let resolvedNgo = null;
    if (ngoLocation) {
      const ngoCoords = resolveCoordinates(
        ngoLocation.city,
        ngoLocation.address,
        ngoLocation.latitude,
        ngoLocation.longitude,
        ngoLocation.coordinates
      );

      // Only plot if not at [0, 0]
      if (ngoCoords && (ngoCoords.lat !== 0 || ngoCoords.lng !== 0)) {
        resolvedNgo = ngoCoords;
        const ngoPin = createPickupPin(null, ngoLocation.ngoName || 'NGO Hub', 'ngo');
        const ngoMarker = L.marker([ngoCoords.lat, ngoCoords.lng], { icon: ngoPin })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; padding: 2px;">
              <p style="font-weight: 800; font-size: 13px; color: #0F172A; margin: 0;">🏢 ${ngoLocation.ngoName || 'NGO Operations Center'}</p>
              <p style="font-size: 11px; color: #64748B; margin: 2px 0 0;">📍 ${ngoLocation.address ? `${ngoLocation.address}, ` : ''}${ngoLocation.city || ''}</p>
              <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #1E293B; background: #F1F5F9; padding: 2px 6px; border-radius: 4px; margin-top: 4px;">
                Operations & Collection Hub
              </span>
            </div>
          `);
        markersRef.current.push(ngoMarker);
        bounds.extend([ngoCoords.lat, ngoCoords.lng]);
        validPointsCount++;
      }
    }

    // MODE A: Single Pickup Delivery Route Tracking
    let resolvedDonor = null;
    if (mode === 'route' && pickup) {
      const donorCoords = resolveCoordinates(
        pickup.city,
        pickup.pickupAddress,
        pickup.latitude,
        pickup.longitude,
        pickup.coordinates
      );

      if (donorCoords && (donorCoords.lat !== 0 || donorCoords.lng !== 0)) {
        resolvedDonor = donorCoords;
        const colorConfig = STATUS_COLORS[pickup.status] || STATUS_COLORS.confirmed;
        const donorPin = createPickupPin(colorConfig, 'Pickup Spot', 'pickup');

        const directionsUrl = resolvedNgo
          ? `https://www.google.com/maps/dir/?api=1&origin=${donorCoords.lat},${donorCoords.lng}&destination=${resolvedNgo.lat},${resolvedNgo.lng}`
          : `https://www.google.com/maps/search/?api=1&query=${donorCoords.lat},${donorCoords.lng}`;

        const donorMarker = L.marker([donorCoords.lat, donorCoords.lng], { icon: donorPin })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; padding: 2px; min-width: 190px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                <span style="font-weight: 800; font-size: 13px; color: #0F172A;">📦 Donor Pickup Location</span>
                <span style="font-size: 10px; font-weight: 700; background: #ECFDF5; color: #047857; padding: 1px 6px; border-radius: 4px;">
                  ${pickup.status ? pickup.status.replace(/_/g, ' ').toUpperCase() : 'SCHEDULED'}
                </span>
              </div>
              <p style="font-size: 11px; color: #475569; margin: 4px 0 2px;">📍 ${pickup.pickupAddress || 'Address on record'}, ${pickup.city || ''}</p>
              ${pickup.contactPhone ? `<p style="font-size: 11px; color: #059669; font-weight: 700; margin: 0 0 6px;">📞 ${pickup.contactPhone}</p>` : ''}
              ${pickup.scheduledDate ? `<p style="font-size: 10px; color: #64748B; margin: 0 0 6px;">📅 ${new Date(pickup.scheduledDate).toLocaleDateString()} (${pickup.timeSlot || ''})</p>` : ''}
              <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="display: block; text-align: center; background: #2563EB; color: white; font-size: 11px; font-weight: 700; padding: 5px 8px; border-radius: 6px; text-decoration: none; margin-top: 6px;">
                🗺️ Navigate Route in Google Maps
              </a>
            </div>
          `);
        markersRef.current.push(donorMarker);
        bounds.extend([donorCoords.lat, donorCoords.lng]);
        validPointsCount++;

        // Draw route polyline between Pickup Spot and NGO Facility
        if (resolvedNgo) {
          const polyline = L.polyline([[donorCoords.lat, donorCoords.lng], [resolvedNgo.lat, resolvedNgo.lng]], {
            color: '#2563EB',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 8',
            lineCap: 'round'
          }).addTo(map);
          polylinesRef.current.push(polyline);

          // If In Transit or Picked Up: add an animated transit van icon along route midpoint
          if (resolvedNgo && ['in_transit', 'picked_up', 'donation_collected'].includes(pickup.status)) {
            const midLat = (donorCoords.lat + resolvedNgo.lat) / 2;
            const midLng = (donorCoords.lng + resolvedNgo.lng) / 2;
            const transitPin = createPickupPin(null, 'En Route', 'transit');
            const transitMarker = L.marker([midLat, midLng], { icon: transitPin })
              .addTo(map)
              .bindPopup(`
                <div style="font-family: inherit; padding: 2px;">
                  <p style="font-weight: 800; font-size: 12px; color: #1E293B; margin: 0;">🚚 NGO Collection Van En Route</p>
                  <p style="font-size: 11px; color: #2563EB; font-weight: 700; margin: 2px 0 0;">Item picked up and heading to NGO center</p>
                </div>
              `);
            markersRef.current.push(transitMarker);
          }
        }

        // Plot Live Assigned Pickup Agent Pin if coordinates exist
        const agLat = Number(agentLocation?.latitude);
        const agLng = Number(agentLocation?.longitude);
        if (!isNaN(agLat) && !isNaN(agLng) && (agLat !== 0 || agLng !== 0)) {
          const vType = (agentLocation.vehicleType || '').toLowerCase();
          const vehicleIcon = vType.includes('bike') || vType.includes('scooter') ? '🛵' : (vType.includes('car') ? '🚗' : '🚚');
          const agentPin = createPickupPin({ vehicleIcon }, agentLocation.fullName || 'Pickup Agent', 'agent');

          const agentMarker = L.marker([agLat, agLng], { icon: agentPin })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: inherit; padding: 2px; min-width: 170px;">
                <p style="font-weight: 800; font-size: 13px; color: #065F46; margin: 0; display: flex; align-items: center; gap: 4px;">
                  <span>${vehicleIcon}</span>
                  <span>${agentLocation.fullName || 'Live Pickup Agent'}</span>
                </p>
                ${agentLocation.agentId ? `<p style="font-size: 10px; font-weight: 700; color: #047857; margin: 2px 0 0;">ID: ${agentLocation.agentId}</p>` : ''}
                ${agentLocation.speed != null ? `<p style="font-size: 11px; color: #475569; margin: 4px 0 0;">Speed: <strong>${Math.round(agentLocation.speed)} km/h</strong></p>` : ''}
                ${agentLocation.updatedAt ? `<p style="font-size: 10px; color: #64748B; margin: 2px 0 0;">Updated: ${new Date(agentLocation.updatedAt).toLocaleTimeString()}</p>` : ''}
              </div>
            `);
          markersRef.current.push(agentMarker);
          bounds.extend([agLat, agLng]);
          validPointsCount++;

          // Route polyline from Agent to Donor destination
          const agentToDonorLine = L.polyline([[agLat, agLng], [donorCoords.lat, donorCoords.lng]], {
            color: '#10B981',
            weight: 4,
            opacity: 0.9,
            dashArray: '6, 8',
            lineCap: 'round'
          }).addTo(map);
          polylinesRef.current.push(agentToDonorLine);
        }
      }
    }

    // MODE B: Multi-Pickup NGO Dispatch Map
    if (mode === 'dispatch' && pickups.length > 0) {
      pickups.forEach((p, idx) => {
        const loc = resolveCoordinates(p.city, p.pickupAddress, p.latitude, p.longitude, p.coordinates);
        if (!loc || (loc.lat === 0 && loc.lng === 0)) return;

        const colorConfig = STATUS_COLORS[p.status] || STATUS_COLORS.confirmed;
        const pin = createPickupPin(colorConfig, `Pickup #${idx + 1}`, 'pickup');

        const originParam = resolvedNgo ? `${resolvedNgo.lat},${resolvedNgo.lng}` : '';
        const directionsUrl = originParam
          ? `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${loc.lat},${loc.lng}`
          : `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

        const donorName = p.donor?.name || 'Donor';
        const donorPhone = p.contactPhone || p.donor?.phone || '';
        const itemInfo = p.donation?.quantity
          ? `${p.donation.quantity} items`
          : 'Donation items';

        const marker = L.marker([loc.lat, loc.lng], { icon: pin }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; padding: 2px; min-width: 200px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 13px; color: #0F172A;">📦 ${donorName}</span>
              <span style="font-size: 9px; font-weight: 800; background: ${colorConfig.bg}22; color: ${colorConfig.border}; padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">
                ${p.status ? p.status.replace(/_/g, ' ') : 'CONFIRMED'}
              </span>
            </div>

            <p style="font-size: 11px; color: #475569; margin: 0 0 2px;">📍 ${p.pickupAddress || ''}, ${p.city || ''}</p>
            <p style="font-size: 11px; color: #1E293B; font-weight: 700; margin: 0 0 4px;">📦 Collecting: ${itemInfo}</p>
            <p style="font-size: 10px; color: #64748B; margin: 0 0 6px;">📅 ${new Date(p.scheduledDate).toLocaleDateString()} • ${p.timeSlot || ''}</p>

            <div style="display: flex; gap: 4px; margin-top: 6px;">
              ${donorPhone ? `
                <a href="tel:${donorPhone}" style="flex: 1; text-align: center; background: #059669; color: white; font-size: 10px; font-weight: 700; padding: 5px 6px; border-radius: 6px; text-decoration: none;">
                  📞 Call
                </a>
              ` : ''}
              <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="flex: 2; text-align: center; background: #2563EB; color: white; font-size: 10px; font-weight: 700; padding: 5px 6px; border-radius: 6px; text-decoration: none;">
                🗺️ Navigate
              </a>
            </div>
          </div>
        `);

        marker.on('click', () => {
          if (onSelectPickup) onSelectPickup(p);
        });

        markersRef.current.push(marker);
        bounds.extend([loc.lat, loc.lng]);
        validPointsCount++;

        // Subtle connector line to NGO facility for route planning
        if (resolvedNgo && ['confirmed', 'in_transit'].includes(p.status)) {
          const polyline = L.polyline([[resolvedNgo.lat, resolvedNgo.lng], [loc.lat, loc.lng]], {
            color: p.status === 'in_transit' ? '#2563EB' : '#10B981',
            weight: 2,
            opacity: 0.5,
            dashArray: '4, 6'
          }).addTo(map);
          polylinesRef.current.push(polyline);
        }
      });
    }

    // Auto-fit bounds intelligently
    if (validPointsCount > 1 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (resolvedDonor) {
      map.setView([resolvedDonor.lat, resolvedDonor.lng], 14, { animate: true });
    } else if (resolvedNgo) {
      map.setView([resolvedNgo.lat, resolvedNgo.lng], 13, { animate: true });
    }

    // Leaflet size invalidation triggers for smooth rendering
    const triggerResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    triggerResize();
    const t1 = setTimeout(triggerResize, 80);
    const t2 = setTimeout(triggerResize, 250);

    // Watch for dynamic DOM container resizes
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        triggerResize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeObserver) resizeObserver.disconnect();
    };

  }, [mode, pickup, pickups, ngoLocation, agentLocation, onSelectPickup]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const agLat = Number(agentLocation?.latitude);
    const agLng = Number(agentLocation?.longitude);
    if (!isNaN(agLat) && !isNaN(agLng) && (agLat !== 0 || agLng !== 0)) {
      mapInstanceRef.current.setView([agLat, agLng], 14, { animate: true });
      return;
    }
    if (pickup) {
      const pCoords = resolveCoordinates(pickup.city, pickup.pickupAddress, pickup.latitude, pickup.longitude, pickup.coordinates);
      if (pCoords) {
        mapInstanceRef.current.setView([pCoords.lat, pCoords.lng], 14, { animate: true });
        return;
      }
    }
    if (ngoLocation) {
      const nCoords = resolveCoordinates(ngoLocation.city, ngoLocation.address, ngoLocation.latitude, ngoLocation.longitude, ngoLocation.coordinates);
      if (nCoords) {
        mapInstanceRef.current.setView([nCoords.lat, nCoords.lng], 13, { animate: true });
      }
    }
  };

  const isDonorCoordsResolved = Boolean(
    pickup && resolveCoordinates(pickup.city, pickup.pickupAddress, pickup.latitude, pickup.longitude, pickup.coordinates)
  );
  const isAgentCoordsAvailable = Boolean(agentLocation?.latitude && agentLocation?.longitude);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
      <style>{`
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Top Legend Overlay */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200 shadow-md flex items-center gap-2.5 text-xs flex-wrap">
        <span className="font-extrabold text-slate-800 flex items-center gap-1">
          <span>🚚</span>
          <span>{mode === 'route' ? 'Delivery Journey Tracker' : 'Pickup Dispatch Map'}</span>
        </span>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
          <span className="font-bold text-slate-700">NGO Hub</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-2.5 h-2.5 rounded-full ${isDonorCoordsResolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-semibold text-slate-700">
            {isDonorCoordsResolved ? 'Donor Pickup' : 'Location Not Verified'}
          </span>
        </div>
        {isAgentCoordsAvailable ? (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
            <span className="font-bold text-emerald-800">Live Agent 🛵</span>
          </div>
        ) : (
          mode === 'route' && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-medium text-amber-800 text-[11px]">Agent Location Unavailable</span>
            </div>
          )
        )}
        {mode === 'route' && (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-bold text-blue-700">
              {distanceDetails?.distanceLabel
                ? distanceDetails.distanceLabel
                : (distanceKm != null ? `${distanceKm} KM (Est. Route)` : 'Route')}
            </span>
          </div>
        )}
      </div>

      {/* Unverified Donor Location Warning Banner */}
      {mode === 'route' && !isDonorCoordsResolved && (
        <div className="absolute top-16 left-3 right-3 sm:right-auto z-10 bg-amber-500/95 backdrop-blur-xs text-white px-3.5 py-2.5 rounded-xl border border-amber-600 shadow-md flex items-center gap-2.5 text-xs">
          <span className="text-base">📍</span>
          <div>
            <p className="font-extrabold leading-tight">Location Not Verified</p>
            <p className="text-[11px] opacity-95 leading-tight">Donor pickup coordinates have not been confirmed on the map. Waiting for location pin.</p>
          </div>
        </div>
      )}

      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-10 bg-white hover:bg-slate-50 text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs flex items-center gap-1.5 transition cursor-pointer"
        title="Recenter Map"
      >
        <span>🎯</span>
        <span>Recenter</span>
      </button>

      {/* Map DOM */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height }}
        className="z-0"
      />
    </div>
  );
}
