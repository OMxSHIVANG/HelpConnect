import { useState, useEffect } from 'react';
import API from '../../services/api';
import PickupTrackingMap from '../../components/PickupTrackingMap';

const TIME_SLOTS = [
  '09:00 - 12:00 (Morning)',
  '12:00 - 15:00 (Afternoon)',
  '15:00 - 18:00 (Evening)',
  '18:00 - 21:00 (Night)'
];

export default function NGOPickupCalendar() {
  const [pickups, setPickups] = useState([]);
  const [areaGroups, setAreaGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [ngoLocation, setNgoLocation] = useState(null);
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'map' | 'list'

  // Reschedule Modal state
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState(TIME_SLOTS[0]);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Status update loading map
  const [updatingId, setUpdatingId] = useState(null);

  const handleRefresh = () => {
    setLoading(true);
    const params = {};
    if (selectedDate) params.date = selectedDate;
    if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

    API.get('/pickups/ngo-calendar', { params })
      .then(res => {
        if (res.data.success) {
          setPickups(res.data.pickups || []);
          setAreaGroups(res.data.areaGroups || {});
          if (res.data.ngoLocation) setNgoLocation(res.data.ngoLocation);
        }
      })
      .catch(err => {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load pickup appointments' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    const params = {};
    if (selectedDate) params.date = selectedDate;
    if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

    API.get('/pickups/ngo-calendar', { params })
      .then(res => {
        if (active && res.data.success) {
          setPickups(res.data.pickups || []);
          setAreaGroups(res.data.areaGroups || {});
          if (res.data.ngoLocation) setNgoLocation(res.data.ngoLocation);
        }
      })
      .catch(err => {
        if (active) setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load pickup appointments' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [selectedDate, selectedStatus]);

  const handleStatusChange = async (pickupId, status) => {
    try {
      setUpdatingId(pickupId);
      const res = await API.put(`/pickups/${pickupId}/status`, { status });
      if (res.data.success) {
        setMessage({ type: 'success', text: `Pickup marked as ${status.replace('_', ' ')}` });
        handleRefresh();
      }
    } catch (err) {
      console.error('Update status error:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update pickup status' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenReschedule = (pickup) => {
    setRescheduleModal(pickup);
    const existing = new Date(pickup.scheduledDate);
    const dateStr = !isNaN(existing) ? existing.toISOString().split('T')[0] : '';
    setNewDate(dateStr);
    setNewSlot(pickup.timeSlot || TIME_SLOTS[0]);
    setRescheduleReason('');
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModal) return;
    try {
      setSavingReschedule(true);
      const res = await API.put(`/pickups/${rescheduleModal._id}/reschedule`, {
        newDate,
        newTimeSlot: newSlot,
        reason: rescheduleReason
      });
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Pickup appointment rescheduled successfully' });
        setRescheduleModal(null);
        handleRefresh();
      }
    } catch (err) {
      console.error('Reschedule error:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reschedule appointment' });
    } finally {
      setSavingReschedule(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">Confirmed</span>;
      case 'in_transit':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">In Transit</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'missed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Missed</span>;
      case 'rescheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Rescheduled</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🚚 Smart Pickup & Delivery Calendar</h1>
          <p className="text-slate-500 text-sm">
            Coordinate collection routes, view area clusters, and manage donation handover appointments.
          </p>
        </div>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-transparent border-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters & Route Clusters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filter by Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_transit">In Transit</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-transparent border-0 cursor-pointer"
            >
              Clear Date
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                viewMode === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ✨ Map & List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              🗺️ Map Only
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              📋 List Only
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{pickups.length} Total Appointments</span>
            <span>•</span>
            <span>{Object.keys(areaGroups).length} Geographic Zones</span>
          </div>
        </div>
      </div>

      {/* Interactive Pickup Dispatch & Route Tracking Map */}
      {(viewMode === 'both' || viewMode === 'map') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>🗺️</span>
                <span>Live Pickup Dispatch & Location Tracking Map</span>
              </h2>
              <p className="text-xs text-slate-500">
                Visualize scheduled donor collection points on the map with direct turn-by-turn navigation for drivers.
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
              {pickups.length} Mapped Collection {pickups.length === 1 ? 'Stop' : 'Stops'}
            </span>
          </div>

          <PickupTrackingMap
            mode="dispatch"
            pickups={pickups}
            ngoLocation={ngoLocation}
            height="420px"
          />
        </div>
      )}

      {/* Logistics Area Clusters Overview */}
      {(viewMode === 'both' || viewMode === 'list') && Object.keys(areaGroups).length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
          <h2 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
            📍 Route Optimization: Pickups Grouped by Area
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(areaGroups).map(([area, list]) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs"
              >
                <strong>{area}:</strong> {list.length} {list.length === 1 ? 'stop' : 'stops'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Pickups List */}
      {(viewMode === 'both' || viewMode === 'list') && (
        loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading scheduled pickup appointments...</p>
          </div>
        ) : pickups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <span className="text-4xl block mb-2">🗓️</span>
            <h2 className="text-base font-bold text-slate-800">No Scheduled Pickups Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {selectedDate
                ? 'No pickup appointments are scheduled on the selected date.'
                : 'When donors schedule material collection, their appointments and route details will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pickups.map((pickup) => {
              const dateStr = new Date(pickup.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={pickup._id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Donor & Location */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {pickup.donor?.name || 'Anonymous Donor'}
                      </span>
                      {getStatusBadge(pickup.status)}
                      {pickup.verificationCode && (
                        <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          Code: {pickup.verificationCode}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      📍 <strong>Pickup Address:</strong> {pickup.pickupAddress}, {pickup.city}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span>📞 {pickup.contactPhone || pickup.donor?.phone || 'No phone'}</span>
                      <span>•</span>
                      <span>📧 {pickup.donor?.email || 'N/A'}</span>
                      {pickup.donation && (
                        <>
                          <span>•</span>
                          <span>📦 Quantity: <strong>{pickup.donation.quantity} units</strong></span>
                        </>
                      )}
                    </div>

                    {(pickup.instructions || pickup.specialInstructions) && (
                      <p className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200 mt-1">
                        💬 <strong>Instructions:</strong> {pickup.instructions || pickup.specialInstructions}
                      </p>
                    )}
                  </div>

                  {/* Middle: Timing Slot */}
                  <div className="lg:text-right bg-slate-50 lg:bg-transparent p-3 lg:p-0 rounded-lg">
                    <div className="text-xs font-semibold text-slate-700">🗓️ {dateStr}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">⏰ {pickup.timeSlot}</div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {pickup.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusChange(pickup._id, 'in_transit')}
                        disabled={updatingId === pickup._id}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold border-0 cursor-pointer transition disabled:opacity-50"
                      >
                        🚚 Mark In Transit
                      </button>
                    )}

                    {(pickup.status === 'confirmed' || pickup.status === 'in_transit') && (
                      <button
                        onClick={() => handleStatusChange(pickup._id, 'completed')}
                        disabled={updatingId === pickup._id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold border-0 cursor-pointer transition disabled:opacity-50"
                      >
                        ✓ Mark Collected
                      </button>
                    )}

                    {pickup.status !== 'completed' && pickup.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => handleOpenReschedule(pickup)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 cursor-pointer transition"
                        >
                          ↻ Reschedule
                        </button>
                        <button
                          onClick={() => handleStatusChange(pickup._id, 'missed')}
                          disabled={updatingId === pickup._id}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 cursor-pointer transition"
                        >
                          Missed
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Reschedule Pickup Appointment</h2>
              <button
                onClick={() => setRescheduleModal(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitReschedule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Time Slot *</label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
                <textarea
                  rows="3"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Traffic delays, driver route reallocation..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReschedule}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold border-0 cursor-pointer disabled:opacity-50"
                >
                  {savingReschedule ? 'Rescheduling...' : 'Confirm New Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
