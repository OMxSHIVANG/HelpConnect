import { useState, useEffect } from 'react';
import API from '../../services/api';

const CATEGORIES = ['Clothes', 'Books', 'Food', 'Medicine', 'School Supplies', 'Emergency Relief', 'General'];

export default function NGOCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'Clothes',
    targetQuantity: 100,
    unit: 'pieces',
    coverImage: '',
    endDate: '',
    location: '',
    urgency: 'High'
  });

  const [reportForm, setReportForm] = useState({
    summary: '',
    beneficiariesCount: 0,
    evidenceImages: ''
  });

  const handleRefresh = () => {
    setLoading(true);
    API.get('/campaigns/my-campaigns')
      .then(res => {
        if (res.data.success) {
          setCampaigns(res.data.campaigns || []);
        }
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load campaigns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/campaigns/my-campaigns')
      .then(res => {
        if (active && res.data.success) {
          setCampaigns(res.data.campaigns || []);
        }
      })
      .catch(err => {
        if (active) setError(err.response?.data?.message || 'Failed to load campaigns');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setSubmitting(true);
    API.post('/campaigns', createForm)
      .then(res => {
        if (res.data.success) {
          setShowCreateModal(false);
          setCreateForm({
            title: '',
            description: '',
            category: 'Clothes',
            targetQuantity: 100,
            unit: 'pieces',
            coverImage: '',
            endDate: '',
            location: '',
            urgency: 'High'
          });
          handleRefresh();
        }
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to launch campaign'))
      .finally(() => setSubmitting(false));
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setSubmitting(true);
    const imagesArr = reportForm.evidenceImages.split(',').map(s => s.trim()).filter(Boolean);

    API.post(`/campaigns/${selectedCampaign._id}/completion-report`, {
      summary: reportForm.summary,
      beneficiariesCount: reportForm.beneficiariesCount,
      evidenceImages: imagesArr
    })
      .then(res => {
        if (res.data.success) {
          setShowReportModal(false);
          handleRefresh();
        }
      })
      .catch(err => alert(err.response?.data?.message || 'Failed to submit report'))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Campaign Management</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Organize large-scale collective donation drives. Verified contributions update campaign meters automatically.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <span>+</span>
          <span>Launch New Campaign</span>
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading campaigns...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center font-medium">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-5xl">📢</p>
          <h4 className="text-base font-extrabold text-slate-800">No campaigns launched yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Launch collective campaigns (such as winter drives or back-to-school drives) where multiple donors can mobilize towards a large humanitarian goal.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Launch Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map(c => {
            const progress = c.progressPercentage || 0;
            const isCompleted = c.status === 'completed';

            return (
              <div key={c._id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {c.category}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isCompleted ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 leading-snug">{c.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>

                  {/* Progress Meter */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Verified Target Progress</span>
                      <span className="text-emerald-700">{progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, Math.max(3, progress))}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                      <span><strong>{c.receivedQuantity}</strong> {c.unit} verified</span>
                      <span>Target: {c.targetQuantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>📍 {c.city || 'India'}</span>
                    <span>Ends: {new Date(c.endDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={`/campaigns/${c._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl text-center no-underline transition"
                  >
                    Public Page ↗
                  </a>

                  {!isCompleted && (
                    <button
                      onClick={() => {
                        setSelectedCampaign(c);
                        setShowReportModal(true);
                      }}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer border border-emerald-200"
                    >
                      Publish Completion
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Launch Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Launch Social Impact Campaign</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title</label>
                <input
                  type="text"
                  placeholder="e.g. Winter Blanket Distribution 2026, Feed 1,000 Children"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={createForm.urgency}
                    onChange={(e) => setCreateForm({ ...createForm, urgency: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.targetQuantity}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setCreateForm(prev => ({ ...prev, targetQuantity: '' }));
                        return;
                      }
                      const cleaned = raw.replace(/^0+/, '');
                      if (cleaned === '') {
                        setCreateForm(prev => ({ ...prev, targetQuantity: '' }));
                        return;
                      }
                      const num = parseInt(cleaned, 10);
                      if (!isNaN(num)) {
                        setCreateForm(prev => ({ ...prev, targetQuantity: num }));
                      }
                    }}
                    onBlur={() => {
                      if (!createForm.targetQuantity || Number(createForm.targetQuantity) < 1) {
                        setCreateForm(prev => ({ ...prev, targetQuantity: 1 }));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign End Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Distribution Area / City</label>
                <input
                  type="text"
                  placeholder="e.g. Bareilly Municipal Shelters"
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={createForm.coverImage}
                  onChange={(e) => setCreateForm({ ...createForm, coverImage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description & Beneficiary Plan</label>
                <textarea
                  rows="3"
                  placeholder="Explain why this drive is happening, who will benefit, and how items will be audited."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  {submitting ? 'Publishing...' : 'Launch Public Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Report Modal */}
      {showReportModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Publish Campaign Completion Report</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Summary of Impact & Distribution</label>
                <textarea
                  rows="3"
                  placeholder="Summarize where and how the collected goods were handed over to families."
                  value={reportForm.summary}
                  onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Beneficiaries Reached (Count)</label>
                <input
                  type="number"
                  min="0"
                  value={reportForm.beneficiariesCount}
                  onChange={(e) => setReportForm({ ...reportForm, beneficiariesCount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Distribution Photo Evidence URLs (Comma separated)</label>
                <input
                  type="text"
                  placeholder="https://image1.jpg, https://image2.jpg"
                  value={reportForm.evidenceImages}
                  onChange={(e) => setReportForm({ ...reportForm, evidenceImages: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Conclude & Publish Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
