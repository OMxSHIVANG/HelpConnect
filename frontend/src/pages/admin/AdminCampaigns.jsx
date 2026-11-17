import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleRefresh = () => {
    setLoading(true);
    API.get('/admin/campaigns')
      .then((res) => {
        if (res.data.success) {
          setCampaigns(res.data.campaigns || []);
        }
      })
      .catch((err) => console.error('Fetch campaigns error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/admin/campaigns')
      .then((res) => {
        if (active && res.data.success) {
          setCampaigns(res.data.campaigns || []);
        }
      })
      .catch((err) => console.error('Fetch campaigns error:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const filteredCampaigns = campaigns.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.title?.toLowerCase().includes(term) ||
      c.ngo?.ngoName?.toLowerCase().includes(term) ||
      c.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🎯 Campaign Moderation & Oversight</h1>
          <p className="text-slate-500 text-sm">
            Monitor public NGO impact campaigns, verify real-time fulfillment, and oversee community drives.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter campaigns by name, NGO, or category..."
          className="w-full max-w-md px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading platform campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-xs shadow-xs">
          No campaigns found matching your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((c) => {
            const progress = c.targetQuantity > 0 ? Math.min(100, Math.round((c.receivedQuantity / c.targetQuantity) * 100)) : 0;
            return (
              <div key={c._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 uppercase">{c.category}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-slate-600 font-medium">🏢 {c.ngo?.ngoName || 'NGO Partner'}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Verified Progress:</span>
                    <span className="font-bold text-slate-900">{c.receivedQuantity} / {c.targetQuantity} {c.unit}</span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400">Target: {new Date(c.endDate).toLocaleDateString()}</span>
                    <Link
                      to={`/campaigns/${c._id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 no-underline"
                    >
                      View Live Drive →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
