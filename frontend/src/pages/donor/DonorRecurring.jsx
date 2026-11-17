import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

const CATEGORIES = ['Clothes', 'Books', 'Food', 'Medicine', 'School Supplies', 'Electronics', 'Toys', 'Other'];

export default function DonorRecurring() {
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Clothes',
    itemName: '',
    quantity: 5,
    unit: 'pieces',
    frequency: 'monthly',
    notes: ''
  });

  const handleRefresh = () => {
    setLoading(true);
    API.get('/recurring/my-commitments')
      .then(res => {
        if (res.data.success) {
          const list = (res.data.commitments || []).map(c => ({
            ...c,
            daysToPledge: Math.ceil((new Date(c.nextPledgeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          }));
          setCommitments(list);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load recurring commitments');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/recurring/my-commitments')
      .then(res => {
        if (active && res.data.success) {
          const list = (res.data.commitments || []).map(c => ({
            ...c,
            daysToPledge: Math.ceil((new Date(c.nextPledgeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          }));
          setCommitments(list);
        }
      })
      .catch(err => {
        if (active) setError(err.response?.data?.message || 'Failed to load recurring commitments');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setSubmitting(true);
    API.post('/recurring', formData)
      .then(res => {
        if (res.data.success) {
          setShowCreateModal(false);
          setFormData({ category: 'Clothes', itemName: '', quantity: 5, unit: 'pieces', frequency: 'monthly', notes: '' });
          handleRefresh();
        }
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to create commitment'))
      .finally(() => setSubmitting(false));
  };

  const handleStatusChange = (id, newStatus) => {
    API.put(`/recurring/${id}/status`, { status: newStatus })
      .then(() => handleRefresh())
      .catch(err => alert(err.message));
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="bg-blue-500/30 text-blue-200 text-xs font-extrabold uppercase px-3 py-1 rounded-full border border-blue-400/30 inline-block">
            🔄 Dependable Social Impact
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Recurring Donation Commitments
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Pledge ongoing support for causes you care about (e.g. donating 5 books every month or winter essentials quarterly). This is a commitment reminder system to build reliable habits without automatic financial deductions.
          </p>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Your Active Pledge Commitments</h3>
          <p className="text-xs text-slate-500">
            {commitments.length} ongoing commitment schedules
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <span>+</span>
          <span>Create New Pledge Commitment</span>
        </button>
      </div>

      {/* Commitments List */}
      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading your commitments...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center font-medium">
          {error}
        </div>
      ) : commitments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-5xl">📅</p>
          <h4 className="text-base font-extrabold text-slate-800">No recurring commitments set yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Set up a recurring pledge to consistently support children, night shelters, or animal welfare on a schedule that works for you.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Create Your First Pledge
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {commitments.map(c => {
            const isPaused = c.status === 'paused';
            const isCancelled = c.status === 'cancelled';
            const nextDate = new Date(c.nextPledgeDate);
            const daysToPledge = c.daysToPledge ?? 0;

            return (
              <div
                key={c._id}
                className={`bg-white rounded-3xl border p-6 shadow-xs flex flex-col justify-between space-y-4 ${
                  isPaused ? 'border-amber-200 bg-amber-50/20' : isCancelled ? 'border-slate-200 opacity-60' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {c.frequency} pledge
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : isPaused ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-900">{c.itemName}</h4>
                  <p className="text-xs text-slate-600 font-semibold">
                    Category: <strong>{c.category}</strong> • Pledge: <strong>{c.quantity} {c.unit}</strong>
                  </p>

                  {c.ngo?.ngoName && (
                    <p className="text-xs text-slate-500">
                      Preferred NGO: <strong>{c.ngo.ngoName}</strong>
                    </p>
                  )}

                  {/* Next Reminder Box */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                    <span className="text-slate-500">Next Planned Delivery:</span>
                    <span className="font-bold text-slate-900">
                      {nextDate.toLocaleDateString()} {daysToPledge > 0 ? `(${daysToPledge}d)` : '(Due)'}
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800 font-bold">
                    ✓ {c.fulfilledDonationsCount || 0} cycles successfully fulfilled to date
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    to="/requirements"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl text-center no-underline shadow-xs"
                  >
                    🎁 Fulfill Current Cycle
                  </Link>

                  {c.status === 'active' ? (
                    <button
                      onClick={() => handleStatusChange(c._id, 'paused')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition cursor-pointer"
                    >
                      Pause
                    </button>
                  ) : isPaused ? (
                    <button
                      onClick={() => handleStatusChange(c._id, 'active')}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2.5 rounded-xl transition cursor-pointer"
                    >
                      Resume
                    </button>
                  ) : null}

                  {!isCancelled && (
                    <button
                      onClick={() => {
                        if (confirm('Cancel this recurring commitment?')) handleStatusChange(c._id, 'cancelled');
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-2.5 cursor-pointer"
                      title="Cancel commitment"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Commitment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Create Recurring Donation Commitment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Donation Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium text-slate-800"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name / Description</label>
                <input
                  type="text"
                  placeholder="e.g. 5 NCERT English & Science Books, Warm Sweaters"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pledge Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setFormData(prev => ({ ...prev, quantity: '' }));
                        return;
                      }
                      const cleaned = raw.replace(/^0+/, '');
                      if (cleaned === '') {
                        setFormData(prev => ({ ...prev, quantity: '' }));
                        return;
                      }
                      const num = parseInt(cleaned, 10);
                      if (!isNaN(num)) {
                        setFormData(prev => ({ ...prev, quantity: num }));
                      }
                    }}
                    onBlur={() => {
                      if (!formData.quantity || Number(formData.quantity) < 1) {
                        setFormData(prev => ({ ...prev, quantity: 1 }));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (Every 3 Months)</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl text-[11px] leading-relaxed">
                ℹ️ <strong>Reminder:</strong> This creates a pledge schedule. HelpConnect will notify you ahead of each cycle to arrange collection or delivery. No auto-debit of funds occurs.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {submitting ? 'Creating...' : 'Confirm Pledge Commitment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
