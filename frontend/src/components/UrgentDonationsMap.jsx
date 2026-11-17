import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLOR_MAP = {
  Critical: { bg: '#EF4444', border: '#B91C1C', text: '#FFFFFF', label: 'CRITICAL' },
  High: { bg: '#F97316', border: '#C2410C', text: '#FFFFFF', label: 'HIGH' },
  Medium: { bg: '#3B82F6', border: '#1D4ED8', text: '#FFFFFF', label: 'MEDIUM' },
  Normal: { bg: '#10B981', border: '#047857', text: '#FFFFFF', label: 'NORMAL' }
};

// Custom SVG Pin Generator for Leaflet
const createCustomPin = (colorConfig, labelText, isDonor = false) => {
  if (isDonor) {
    return L.divIcon({
      className: 'custom-donor-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
            📍
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  }

  const { bg, border, text } = colorConfig;
  return L.divIcon({
    className: 'custom-ngo-pin',
    html: `
      <div style="cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25)); transition: transform 0.2s;">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="${bg}" stroke="${border}" stroke-width="1.5"/>
          <circle cx="17" cy="17" r="9" fill="${text}"/>
          <text x="17" y="21" font-size="11" font-weight="900" text-anchor="middle" fill="${bg}">🏢</text>
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42]
  });
};

export default function UrgentDonationsMap({
  donorLocation,
  ngos = [],
  onSelectNGO
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const defaultLat = donorLocation?.latitude || 28.3670;
    const defaultLng = donorLocation?.longitude || 79.4304;

    // Initialize Leaflet Map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 10,
        scrollWheelZoom: false
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds();

    // 1. Add Donor Marker
    if (donorLocation?.latitude && donorLocation?.longitude) {
      const donorPin = createCustomPin(null, 'You', true);
      const donorMarker = L.marker([donorLocation.latitude, donorLocation.longitude], { icon: donorPin })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; padding: 2px;">
            <p style="font-weight: 800; font-size: 13px; color: #1E293B; margin: 0;">📍 Your Current Location</p>
            <p style="font-size: 11px; color: #64748B; margin: 2px 0 0;">Searching NGOs within 100 KM</p>
          </div>
        `);
      markersRef.current.push(donorMarker);
      bounds.extend([donorLocation.latitude, donorLocation.longitude]);
    }

    // 2. Add NGO Markers with Urgency Color Coding
    ngos.forEach(ngo => {
      const lat = ngo.latitude || ngo.coordinates?.[1];
      const lng = ngo.longitude || ngo.coordinates?.[0];

      if (!lat || !lng) return;

      const priorityKey = ngo.highestPriority || 'Normal';
      const colorConfig = COLOR_MAP[priorityKey] || COLOR_MAP.Normal;
      const ngoPin = createCustomPin(colorConfig, priorityKey, false);

      const marker = L.marker([lat, lng], { icon: ngoPin }).addTo(map);

      // Directions URL: Google Maps navigation
      const originParam = donorLocation?.latitude && donorLocation?.longitude
        ? `${donorLocation.latitude},${donorLocation.longitude}`
        : '';
      const directionsUrl = originParam
        ? `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      // Build requirement summary items
      const reqListHtml = (ngo.activeRequirements || [])
        .slice(0, 3)
        .map(r => `
          <div style="font-size: 11px; margin-top: 4px; padding: 4px 6px; background: #F8FAFC; border-radius: 4px; border: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #0F172A; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 130px;">${r.title}</span>
            <span style="color: #DC2626; font-weight: 700; margin-left: 6px;">${r.remainingQuantity} ${r.unit || 'pcs'}</span>
          </div>
        `).join('');

      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; max-width: 260px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 9px; font-weight: 800; background: ${colorConfig.bg}; color: white; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">
              ${priorityKey} Priority
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #047857; background: #ECFDF5; padding: 1px 5px; border-radius: 4px;">
              ${ngo.distanceKm != null ? `${ngo.distanceKm} KM away` : ''}
            </span>
          </div>

          <h4 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 4px 0 2px;">${ngo.ngoName}</h4>
          <p style="font-size: 11px; color: #64748B; margin: 0 0 6px;">📍 ${ngo.address ? `${ngo.address}, ` : ''}${ngo.city}</p>

          <div style="margin: 6px 0;">
            <p style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 0 0 2px;">
              Urgent Requirements (${ngo.activeRequirements?.length || 0}):
            </p>
            ${reqListHtml}
          </div>

          <div style="display: flex; gap: 6px; margin-top: 8px;">
            <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="flex: 1; text-align: center; background: #2563EB; color: white; font-size: 11px; font-weight: 700; padding: 6px 8px; border-radius: 6px; text-decoration: none;">
              🗺️ Directions
            </a>
            <button id="view-ngo-btn-${ngo._id}" style="flex: 1; text-align: center; background: #059669; color: white; font-size: 11px; font-weight: 700; padding: 6px 8px; border-radius: 6px; border: none; cursor: pointer;">
              Details →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Handle popup open to attach detail button listener
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`view-ngo-btn-${ngo._id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectNGO) onSelectNGO(ngo);
            };
          }
        }, 50);
      });

      marker.on('click', () => {
        if (onSelectNGO) onSelectNGO(ngo);
      });

      markersRef.current.push(marker);
      bounds.extend([lat, lng]);
    });

    // Fit bounds if multiple points exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [donorLocation, ngos, onSelectNGO]);

  // Center on donor function
  const handleRecenter = () => {
    if (mapInstanceRef.current && donorLocation?.latitude && donorLocation?.longitude) {
      mapInstanceRef.current.setView([donorLocation.latitude, donorLocation.longitude], 12, { animate: true });
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      {/* Map Header / Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-3 text-xs flex-wrap">
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <span>🗺️</span>
          <span>Map Legend:</span>
        </span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200" />
          <span className="font-semibold text-slate-700">Critical</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-200" />
          <span className="font-semibold text-slate-700">High</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200" />
          <span className="font-semibold text-slate-700">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          <span className="font-semibold text-slate-700">Normal</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="font-semibold text-blue-700">You (Donor)</span>
        </div>
      </div>

      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-10 bg-white hover:bg-slate-50 text-slate-800 font-bold px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs flex items-center gap-1.5 transition cursor-pointer"
        title="Recenter on your location"
      >
        <span>📍</span>
        <span>My Location</span>
      </button>

      {/* Leaflet Map DOM Container */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '420px' }}
        className="z-0"
      />
    </div>
  );
}
