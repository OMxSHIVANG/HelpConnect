import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// City coordinates lookup table for default map positioning
const CITY_COORDINATES = {
  bareilly: [79.4304, 28.3670],
  meerut: [77.7064, 28.9845],
  delhi: [77.2090, 28.6139],
  'new delhi': [77.2090, 28.6139],
  noida: [77.3910, 28.5355],
  ghaziabad: [77.4538, 28.6692],
  gurgaon: [77.0266, 28.4595],
  gurugram: [77.0266, 28.4595],
  faridabad: [77.3178, 28.4089],
  agra: [78.0081, 27.1767],
  lucknow: [80.9462, 26.8467],
  kanpur: [80.3319, 26.4499],
  varanasi: [82.9739, 25.3176],
  prayagraj: [81.8463, 25.4358],
  dehradun: [78.0322, 30.3165],
  jaipur: [75.7873, 26.9124],
  mumbai: [72.8777, 19.0760],
  pune: [73.8567, 18.5204],
  bengaluru: [77.5946, 12.9716],
  bangalore: [77.5946, 12.9716],
  hyderabad: [78.4867, 17.3850],
  chennai: [80.2707, 13.0827],
  kolkata: [88.3639, 22.5726]
};

const getCityCenter = (city = '') => {
  const norm = String(city).trim().toLowerCase();
  if (norm && CITY_COORDINATES[norm]) {
    const [lng, lat] = CITY_COORDINATES[norm];
    return { lat, lng };
  }
  const clean = norm.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)[0];
  if (clean && CITY_COORDINATES[clean]) {
    const [lng, lat] = CITY_COORDINATES[clean];
    return { lat, lng };
  }
  return null;
};

// Custom draggable donor pin
const createDraggablePin = (isVerified) => {
  const bg = isVerified ? '#10B981' : '#F59E0B';
  const border = isVerified ? '#047857' : '#D97706';
  return L.divIcon({
    className: 'custom-donor-pin',
    html: `
      <div style="cursor: grab; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); transition: transform 0.15s ease;">
        <svg width="36" height="46" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="${bg}" stroke="${border}" stroke-width="2.5"/>
          <circle cx="16" cy="16" r="8" fill="#FFFFFF"/>
          <text x="16" y="20" font-size="11" font-weight="900" text-anchor="middle" fill="${bg}">📍</text>
        </svg>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });
};

export default function DonorLocationPicker({
  latitude,
  longitude,
  accuracy,
  city = '',
  locationVerificationStatus = 'unverified',
  onLocationChange
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [detecting, setDetecting] = useState(false);
  const [geoNotice, setGeoNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info'); // 'info' | 'warning' | 'success'

  const hasCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude) && !(latitude === 0 && longitude === 0);

  // Initialize and update interactive Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const cityDefault = getCityCenter(city);
    const initialLat = hasCoords ? Number(latitude) : (cityDefault ? cityDefault.lat : 28.6139);
    const initialLng = hasCoords ? Number(longitude) : (cityDefault ? cityDefault.lng : 77.2090);
    const initialZoom = hasCoords ? 15 : (cityDefault ? 12 : 5);

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
        center: [initialLat, initialLng],
        zoom: initialZoom,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Click to place/move marker
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const roundedLat = Math.round(lat * 1000000) / 1000000;
        const roundedLng = Math.round(lng * 1000000) / 1000000;

        if (onLocationChange) {
          onLocationChange({
            latitude: roundedLat,
            longitude: roundedLng,
            accuracy: null,
            verificationStatus: 'manual_map_selected'
          });
        }
        setGeoNotice('Pin placed manually on map. Drag marker to fine-tune exact pickup spot.');
        setNoticeType('info');
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update or create draggable marker
    if (hasCoords) {
      const pinIcon = createDraggablePin(locationVerificationStatus === 'gps_verified' || locationVerificationStatus === 'manual_map_selected');
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        markerRef.current.setIcon(pinIcon);
      } else {
        const marker = L.marker([latitude, longitude], {
          icon: pinIcon,
          draggable: true,
          autoPan: true
        }).addTo(map);

        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          const roundedLat = Math.round(pos.lat * 1000000) / 1000000;
          const roundedLng = Math.round(pos.lng * 1000000) / 1000000;

          if (onLocationChange) {
            onLocationChange({
              latitude: roundedLat,
              longitude: roundedLng,
              accuracy: null,
              verificationStatus: 'manual_map_selected'
            });
          }
          setGeoNotice('Marker moved manually to exact pickup spot.');
          setNoticeType('info');
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px;">
            <strong>📍 Pickup Location Pin</strong>
            <p style="margin: 2px 0 0; color: #475569;">Drag this pin to fine-tune your doorstep or handover point.</p>
          </div>
        `);

        markerRef.current = marker;
      }

      map.setView([latitude, longitude], Math.max(map.getZoom(), 14), { animate: true });
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (cityDefault) {
        map.setView([cityDefault.lat, cityDefault.lng], 12, { animate: true });
      }
    }

    // Handle container resize
    const t = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 100);

    return () => clearTimeout(t);
  }, [latitude, longitude, hasCoords, locationVerificationStatus, city, onLocationChange]);

  // Browser Geolocation detection (enableHighAccuracy: true, reasonable timeout)
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser. Please click the map below to select your pickup location.');
      setNoticeType('warning');
      return;
    }

    setDetecting(true);
    setGeoNotice('Detecting your GPS location with high accuracy...');
    setNoticeType('info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        const acc = Math.round(pos.coords.accuracy);

        if (acc > 500) {
          setGeoNotice(`GPS accuracy is low (±${acc}m). You can adjust the pin on the map for better precision.`);
          setNoticeType('warning');
        } else {
          setGeoNotice(`GPS location detected successfully (accuracy ±${acc}m).`);
          setNoticeType('success');
        }

        if (onLocationChange) {
          onLocationChange({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            verificationStatus: 'gps_verified'
          });
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === 1) { // PERMISSION_DENIED
          setGeoNotice('Location permission was denied. You can still set your pickup location by clicking on the map below (permission is optional).');
          setNoticeType('warning');
        } else if (err.code === 2) {
          setGeoNotice('GPS position unavailable. Please click on the map below to select your pickup location.');
          setNoticeType('warning');
        } else {
          setGeoNotice('GPS request timed out. You can click on the map to pinpoint your location.');
          setNoticeType('warning');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  const handleClearPin = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (onLocationChange) {
      onLocationChange({
        latitude: null,
        longitude: null,
        accuracy: null,
        verificationStatus: 'unverified'
      });
    }
    setGeoNotice('Location pin cleared. Click on the map or use GPS to set a new location.');
    setNoticeType('info');
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-0.5">
            📍 Pickup Location on Map
          </label>
          <p className="text-xs text-slate-500">
            Pinpoint your exact doorstep or parcel handover spot. You can use device GPS or click & drag the pin on the map.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={detecting}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg border-0 cursor-pointer transition shadow-xs disabled:opacity-60"
            title="Use device GPS to pinpoint your location"
          >
            <span>{detecting ? '⏳' : '🛰️'}</span>
            <span>{detecting ? 'Detecting GPS...' : 'Detect My Location'}</span>
          </button>

          {hasCoords && (
            <button
              type="button"
              onClick={handleClearPin}
              className="text-xs text-slate-600 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold cursor-pointer transition"
            >
              Clear Pin
            </button>
          )}
        </div>
      </div>

      {/* Geolocation feedback notice */}
      {geoNotice && (
        <div
          className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
            noticeType === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : noticeType === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{noticeType === 'success' ? '✓' : noticeType === 'warning' ? 'ℹ️' : '📍'}</span>
            <span>{geoNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeoNotice('')}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm bg-transparent border-0 cursor-pointer p-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Status & Coordinates Pill */}
      <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Verification Status:</span>
          {locationVerificationStatus === 'gps_verified' ? (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[11px]">
              <span>✓</span> GPS Verified
            </span>
          ) : locationVerificationStatus === 'manual_map_selected' ? (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[11px]">
              <span>📍</span> Map Pin Selected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[11px]">
              <span>⚠️</span> Location Not Verified
            </span>
          )}
        </div>

        {hasCoords ? (
          <div className="font-mono text-[11px] text-slate-600">
            Lat: <strong>{Number(latitude).toFixed(5)}</strong>, Lng: <strong>{Number(longitude).toFixed(5)}</strong>
            {accuracy != null && <span className="text-slate-400 ml-1.5">(±{accuracy}m)</span>}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            Click anywhere on the map below or use &quot;Detect My Location&quot;
          </span>
        )}
      </div>

      {/* Interactive Leaflet Map */}
      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-2xs">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '240px' }}
          className="z-0"
        />
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-700 shadow-xs border border-slate-200 pointer-events-none">
          💡 Click map or drag marker to set exact pickup coordinates
        </div>
      </div>
    </div>
  );
}
