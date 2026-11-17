import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';
import UrgentDonationCard from '../../components/UrgentDonationCard';
import UrgentDonationsMap from '../../components/UrgentDonationsMap';
import NGODetailsModal from '../../components/NGODetailsModal';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  picked_up: 'bg-purple-100 text-purple-800',
  received: 'bg-indigo-100 text-indigo-800',
  cancelled: 'bg-slate-100 text-slate-600',
};

const POPULAR_CITIES = [
  { name: 'Bareilly', lat: 28.3670, lng: 79.4304 },
  { name: 'Moradabad', lat: 28.8386, lng: 78.7768 },
  { name: 'Meerut', lat: 28.9845, lng: 77.7064 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090 },
  { name: 'Noida', lat: 28.5355, lng: 77.3910 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Aligarh', lat: 27.8974, lng: 78.0880 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 }
];

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-xs">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900">{value ?? '—'}</p>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function DonorHome() {
  const { user } = useContext(AuthContext);

  // Original Dashboard Stats & Recent Donations
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Smart Donation Priority & Nearby States
  const [donorLocation, setDonorLocation] = useState({
    latitude: 28.3670,
    longitude: 79.4304,
    cityName: 'Bareilly',
    isGps: false
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [radiusKm, setRadiusKm] = useState(100);

  // Urgent nearby requirements list
  const [urgentData, setUrgentData] = useState({
    requirements: [],
    nearbyNGOs: [],
    totalRequirements: 0
  });
  const [urgentLoading, setUrgentLoading] = useState(true);
  const [urgentError, setUrgentError] = useState('');

  // UI state for filter and view mode
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'cards' | 'map'
  const [selectedNGO, setSelectedNGO] = useState(null);
  const [customCityInput, setCustomCityInput] = useState('');

  // Fetch traditional dashboard stats
  useEffect(() => {
    API.get('/donor/dashboard')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // Request browser GPS position on user action
  const requestGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDonorLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          cityName: 'Current GPS Location',
          isGps: true
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation permission denied or failed:', err.message);
        setGpsError('GPS permission was denied. You can select your city manually below.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // Request GPS automatically once on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDonorLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          cityName: 'Current GPS Location',
          isGps: true
        });
      },
      (err) => {
        console.warn('Initial GPS query skipped or denied:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // Fetch Urgent Nearby Requirements when coordinates or radius change
  useEffect(() => {
    let isMounted = true;
    API.get('/donor/urgent-nearby', {
      params: {
        lat: donorLocation.latitude,
        lng: donorLocation.longitude,
        radius: radiusKm
      }
    })
      .then(res => {
        if (!isMounted) return;
        if (res.data.success) {
          setUrgentData({
            requirements: res.data.requirements || [],
            nearbyNGOs: res.data.nearbyNGOs || [],
            totalRequirements: res.data.totalRequirements || 0
          });
          setUrgentError('');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error fetching urgent requirements:', err);
        setUrgentError(err.response?.data?.message || 'Failed to fetch urgent nearby donations');
      })
      .finally(() => {
        if (isMounted) setUrgentLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [donorLocation.latitude, donorLocation.longitude, radiusKm]);

  // Manual refresh handler for the refresh button
  const handleManualRefresh = () => {
    setUrgentLoading(true);
    API.get('/donor/urgent-nearby', {
      params: {
        lat: donorLocation.latitude,
        lng: donorLocation.longitude,
        radius: radiusKm
      }
    })
      .then(res => {
        if (res.data.success) {
          setUrgentData({
            requirements: res.data.requirements || [],
            nearbyNGOs: res.data.nearbyNGOs || [],
            totalRequirements: res.data.totalRequirements || 0
          });
          setUrgentError('');
        }
      })
      .catch(err => {
        setUrgentError(err.response?.data?.message || 'Failed to fetch urgent nearby donations');
      })
      .finally(() => setUrgentLoading(false));
  };

  // Handle manual city selection
  const handleSelectCity = (cityObj) => {
    setDonorLocation({
      latitude: cityObj.lat,
      longitude: cityObj.lng,
      cityName: cityObj.name,
      isGps: false
    });
    setGpsError('');
  };

  // Handle custom city text input
  const handleCustomCitySearch = (e) => {
    e.preventDefault();
    if (!customCityInput.trim()) return;
    const matched = POPULAR_CITIES.find(c => c.name.toLowerCase() === customCityInput.trim().toLowerCase());
    if (matched) {
      handleSelectCity(matched);
      setCustomCityInput('');
    } else {
      // Pass city query
      setUrgentLoading(true);
      API.get('/donor/urgent-nearby', {
        params: {
          city: customCityInput.trim(),
          radius: radiusKm
        }
      })
        .then(res => {
          if (res.data.donorLocation) {
            setDonorLocation({
              latitude: res.data.donorLocation.latitude,
              longitude: res.data.donorLocation.longitude,
              cityName: customCityInput.trim(),
              isGps: false
            });
            setUrgentData({
              requirements: res.data.requirements || [],
              nearbyNGOs: res.data.nearbyNGOs || [],
              totalRequirements: res.data.totalRequirements || 0
            });
            setCustomCityInput('');
          }
        })
        .catch(err => setUrgentError(err.message))
        .finally(() => setUrgentLoading(false));
    }
  };

  // Filter requirements by priority badge if selected
  const filteredRequirements = urgentData.requirements.filter(item => {
    if (priorityFilter === 'All') return true;
    return item.priorityBadge === priorityFilter;
  });

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-500">Loading dashboard...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  const { stats, recentDonations } = data || {};

  return (
    <div className="space-y-8 pb-10">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Browse priority-sorted donation requests from registered NGOs within your area.
          </p>
        </div>

        {/* Location Status Pill */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
            {donorLocation.isGps ? '📡' : '📍'}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              {donorLocation.isGps ? 'GPS Detected Location' : 'Manual Location'}
            </p>
            <p className="text-xs font-bold text-slate-800">
              {donorLocation.cityName} ({donorLocation.latitude.toFixed(2)}, {donorLocation.longitude.toFixed(2)})
            </p>
          </div>
          <button
            onClick={requestGpsLocation}
            disabled={gpsLoading}
            className="ml-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0"
            title="Refresh GPS"
          >
            {gpsLoading ? 'Detecting...' : 'Use GPS'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE SECTION: SMART DONATION PRIORITY & NEARBY NGO FINDER               */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-slate-50 to-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                Priority Matching Engine
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Urgent Donations Near You</span>
              <span className="text-sm font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-full">
                {urgentData.totalRequirements} Active
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Automatically sorted by: <strong className="text-red-700">Priority (Critical &gt; High &gt; Medium &gt; Normal)</strong>, then <strong className="text-emerald-700">Distance</strong>, then <strong className="text-blue-700">Earliest Deadline</strong>.
            </p>
          </div>

          {/* Controls: Radius & View Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Radius Selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 px-2.5">Radius:</span>
              {[25, 50, 100, 150].map(r => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    radiusKm === r
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {r} KM
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              {[
                { id: 'split', label: 'Split View', icon: '◫' },
                { id: 'cards', label: 'Cards Only', icon: '☰' },
                { id: 'map', label: 'Map Only', icon: '🗺️' }
              ].map(vm => (
                <button
                  key={vm.id}
                  onClick={() => setViewMode(vm.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === vm.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{vm.icon}</span>
                  <span className="hidden sm:inline">{vm.label}</span>
                </button>
              ))}
            </div>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              disabled={urgentLoading}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold p-2.5 rounded-xl transition shadow-2xs cursor-pointer"
              title="Refresh nearby requirements"
            >
              🔄
            </button>
          </div>
        </div>

        {/* GPS Permission Warning / Manual Location Selector Bar */}
        {gpsError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>{gpsError}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">Select Area:</span>
              {POPULAR_CITIES.slice(0, 4).map(city => (
                <button
                  key={city.name}
                  onClick={() => handleSelectCity(city)}
                  className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold px-2 py-1 rounded transition cursor-pointer"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick City Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-slate-400 font-bold shrink-0">📍 Quick Locations:</span>
            {POPULAR_CITIES.map(c => (
              <button
                key={c.name}
                onClick={() => handleSelectCity(c)}
                className={`px-2.5 py-1 rounded-full font-bold transition shrink-0 cursor-pointer ${
                  donorLocation.cityName === c.name
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search other city */}
          <form onSubmit={handleCustomCitySearch} className="flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              placeholder="Search other city..."
              value={customCityInput}
              onChange={(e) => setCustomCityInput(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36 sm:w-44"
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
            >
              Set
            </button>
          </form>
        </div>

        {/* Urgency Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
          {[
            { id: 'All', label: 'All Urgencies', color: 'bg-slate-900 text-white' },
            { id: 'Critical', label: '🔥 Critical', color: 'bg-red-600 text-white' },
            { id: 'High', label: '⚡ High', color: 'bg-orange-500 text-white' },
            { id: 'Medium', label: '💧 Medium', color: 'bg-blue-600 text-white' },
            { id: 'Normal', label: '🌱 Normal', color: 'bg-emerald-600 text-white' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPriorityFilter(tab.id)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition shrink-0 cursor-pointer ${
                priorityFilter === tab.id
                  ? tab.color
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area Based on viewMode */}
        {urgentLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Calculating distances and finding nearest NGOs within {radiusKm} KM...</p>
          </div>
        ) : urgentError ? (
          <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-center">
            <p className="font-bold">{urgentError}</p>
            <button onClick={handleManualRefresh} className="mt-2 text-xs underline font-semibold">Try Again</button>
          </div>
        ) : filteredRequirements.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <p className="text-5xl mb-3">📍</p>
            <h3 className="text-base font-extrabold text-slate-800">No urgent donation requirements within {radiusKm} KM</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are currently no active requirements matching your filter in this area. You can expand your search radius or select another city above.
            </p>
            <button
              onClick={() => setRadiusKm(150)}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Expand Radius to 150 KM
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Map View (Show in split mode or map mode) */}
            {(viewMode === 'split' || viewMode === 'map') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <span>Interactive Nearby NGO Map</span>
                    <span className="text-[10px] font-normal text-slate-400">({urgentData.nearbyNGOs.length} NGOs mapped)</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Click markers for NGO details & directions
                  </span>
                </div>
                <UrgentDonationsMap
                  donorLocation={donorLocation}
                  ngos={urgentData.nearbyNGOs}
                  onSelectNGO={setSelectedNGO}
                />
              </div>
            )}

            {/* 2. Sorted Cards Grid (Show in split mode or cards mode) */}
            {(viewMode === 'split' || viewMode === 'cards') && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Showing {filteredRequirements.length} Priority Sorted Needs
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Sorted by: Urgency &gt; Proximity &gt; Deadline
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredRequirements.map(item => (
                    <UrgentDonationCard
                      key={item._id}
                      item={item}
                      onSelectNGO={setSelectedNGO}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* ORIGINAL DASHBOARD ELEMENTS: STATS, RECENT DONATIONS & QUICK LINKS       */}
      {/* ========================================================================= */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">Your Overall Activity</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Donations" value={stats?.total} icon="📦" color="bg-blue-50" />
          <StatCard label="Pending" value={stats?.pending} icon="⏳" color="bg-yellow-50" />
          <StatCard label="Completed" value={stats?.completed} icon="✅" color="bg-green-50" />
          <StatCard label="Rejected" value={stats?.rejected} icon="❌" color="bg-red-50" />
        </div>
      </div>

      {/* Recent Donations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Your Recent Donations</h2>
          <Link to="/donor/donations" className="text-emerald-600 text-sm font-semibold no-underline hover:text-emerald-700">
            View all →
          </Link>
        </div>
        {recentDonations?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Title', 'NGO', 'Category', 'Qty', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDonations.map(d => (
                  <tr key={d._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{d.requirement?.title || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{d.ngo?.ngoName || 'N/A'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{d.requirement?.category || '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{d.quantity}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[d.status] || 'bg-slate-100 text-slate-600'}`}>
                        {d.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-medium">No donations yet</p>
            <Link to="/requirements" className="text-emerald-600 text-sm mt-2 inline-block no-underline hover:text-emerald-700 font-semibold">
              Browse donation needs →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/requirements', icon: '🔍', label: 'Browse All Requirements', desc: 'Find NGOs that need specific item donations' },
          { to: '/ngos', icon: '🏢', label: 'Explore Verified NGOs', desc: 'Discover authenticated organizations across India' },
          { to: '/donor/favourites', icon: '❤️', label: 'Favourite NGOs', desc: 'Quickly access your saved and bookmarked NGOs' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="no-underline bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-xs transition group"
          >
            <span className="text-3xl">{item.icon}</span>
            <p className="font-bold text-slate-900 mt-2 text-sm group-hover:text-emerald-700 transition">{item.label}</p>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* NGO Details Modal */}
      {selectedNGO && (
        <NGODetailsModal
          ngo={selectedNGO}
          donorLocation={donorLocation}
          onClose={() => setSelectedNGO(null)}
        />
      )}
    </div>
  );
}
