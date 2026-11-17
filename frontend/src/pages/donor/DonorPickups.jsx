import { useState, useEffect } from 'react';
import API from '../../services/api';

const TIME_SLOTS = [
  '09:00 - 12:00 (Morning)',
  '12:00 - 15:00 (Afternoon)',
  '15:00 - 18:00 (Evening)',
  '18:00 - 21:00 (Night)'
];

const getNextDayDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function DonorPickups() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    scheduledDate: '',
    timeSlot: '09:00 - 12:00 (Morning)',
    pickupAddress: '',
    city: '',
    contactPhone: '',
    instructions: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    API.get('/donations/my-donations')
      .then(res => {
        const relevant = (res.data || []).filter(d =>
          ['accepted', 'pickup_scheduled', 'picked_up'].includes(d.status)
        );
        setDonations(relevant);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load pickups'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/donations/my-donations')
      .then(res => {
        if (active) {
          const relevant = (res.data || []).filter(d =>
            ['accepted', 'pickup_scheduled', 'picked_up'].includes(d.status)
          );
          setDonations(relevant);
        }
      })
      .catch(err => {
        if (active) setError(err.response?.data?.message || 'Failed to load pickups');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const openScheduleModal = (donation) => {
    setSelectedDonation(donation);
    setScheduleData({
      scheduledDate: donation.scheduledPickupDate
        ? new Date(donation.scheduledPickupDate).toISOString().split('T')[0]
        : getNextDayDate(),
      timeSlot: '09:00 - 12:00 (Morning)',
      pickupAddress: donation.pickupAddress || '',
      city: donation.city || '',
      contactPhone: donation.donor?.phone || '',
      instructions: ''
    });
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDonation) return;
    setSubmitting(true);

    API.post('/pickups', {
      donationId: selectedDonation._id,
      ...scheduleData
    })
      .then(res => {
        if (res.data.success) {
          setShowScheduleModal(false);
          handleRefresh();
        }
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to schedule pickup'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg">
        <span className="bg-emerald-500/30 text-emerald-100 text-xs font-extrabold uppercase px-3 py-1 rounded-full border border-emerald-400/30 inline-block mb-2">
          📦 Smart Logistics
        </span>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
          Scheduled Pickups & Handover Slots
        </h1>
        <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl">
          Coordinate seamless home pickups with partner NGOs. Review appointment slots, update instructions, or reschedule without conflict.
        </p>
      </div>

      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading your scheduled pickups...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center font-medium">
          {error}
        </div>
      ) : donations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-2">
          <p className="text-5xl">🚗</p>
          <h4 className="text-base font-extrabold text-slate-800">No active pickups scheduled</h4>
          <p className="text-xs text-slate-500">
            When an NGO accepts your donation offer, you can select convenient pickup time slots here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {donations.map(d => (
            <div key={d._id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Ref: <strong className="font-mono text-slate-800">{d.verificationCode || d._id.slice(-6)}</strong>
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                  d.status === 'pickup_scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {d.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-900">{d.requirement?.title || 'Material Donation'}</h4>
                <p className="text-xs text-slate-600">
                  NGO: <strong>{d.ngo?.ngoName}</strong> • {d.quantity} items
                </p>
                <p className="text-xs text-slate-500 mt-1">📍 Address: {d.pickupAddress}, {d.city}</p>
              </div>

              {d.scheduledPickupDate ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                  <span className="text-slate-500">Scheduled Date:</span>
                  <span className="font-bold text-slate-900">{new Date(d.scheduledPickupDate).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                  ⚠️ Appointment slot pending. Please set a pickup time.
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                <button
                  onClick={() => openScheduleModal(d)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  {d.scheduledPickupDate ? '📅 Reschedule Slot' : '📅 Book Pickup Slot'}
                </button>
                <a
                  href={`/donation/${d._id}/tracking`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2.5 rounded-xl transition no-underline"
                >
                  Journey →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Book / Reschedule Pickup Slot</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pickup Date</label>
                <input
                  type="date"
                  value={scheduleData.scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Time Slot Window</label>
                <select
                  value={scheduleData.timeSlot}
                  onChange={(e) => setScheduleData({ ...scheduleData, timeSlot: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800"
                >
                  {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={scheduleData.contactPhone}
                  onChange={(e) => setScheduleData({ ...scheduleData, contactPhone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pickup Address</label>
                <input
                  type="text"
                  value={scheduleData.pickupAddress}
                  onChange={(e) => setScheduleData({ ...scheduleData, pickupAddress: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions for Collection Agent</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Ring bell 204 on 2nd floor, call before arriving"
                  value={scheduleData.instructions}
                  onChange={(e) => setScheduleData({ ...scheduleData, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {submitting ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
