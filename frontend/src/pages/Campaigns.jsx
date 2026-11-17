import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

const URGENCY_STYLES = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  Normal: 'bg-slate-50 text-slate-700 border-slate-200'
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Clothes', 'Food', 'Books', 'Medicine', 'School Supplies', 'Emergency Relief'];

  useEffect(() => {
    let active = true;
    API.get('/campaigns', {
      params: {
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
        status: 'active'
      }
    })
      .then(res => {
        if (active && res.data.success) {
          const list = (res.data.campaigns || []).map(c => ({
            ...c,
            daysLeft: Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          }));
          setCampaigns(list);
        }
      })
      .catch(err => {
        if (active) setError(err.response?.data?.message || 'Failed to load campaigns');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-3xl p-8 sm:p-12 shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-3">
          <span className="bg-emerald-500/30 text-emerald-100 text-xs font-extrabold uppercase px-3 py-1 rounded-full tracking-wider border border-emerald-400/30 inline-block">
            📢 Verified Collective Drives
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Live NGO Campaigns
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Support organized humanitarian drives and community initiatives. Track real verified progress calculated strictly from delivered contributions.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 text-9xl opacity-10 select-none">
          🤝
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading live NGO campaigns...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center font-medium">
          {error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <p className="text-5xl mb-3">📦</p>
          <h3 className="text-base font-extrabold text-slate-800">No campaigns found</h3>
          <p className="text-xs text-slate-500 mt-1">There are currently no active campaigns matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(camp => {
            const urgencyBadge = camp.urgency || 'High';
            const urgencyClass = URGENCY_STYLES[urgencyBadge] || URGENCY_STYLES.Normal;
            const progress = camp.progressPercentage || 0;
            const daysLeft = camp.daysLeft ?? 0;

            return (
              <div
                key={camp._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* Cover Image or Fallback */}
                <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                  {camp.coverImage ? (
                    <img
                      src={camp.coverImage}
                      alt={camp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center text-5xl">
                      📢
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${urgencyClass} bg-white/95 backdrop-blur-xs shadow-xs`}>
                      {urgencyBadge} Urgency
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                      {camp.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* NGO Name */}
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 truncate mb-1">
                      <span>🏢 {camp.ngo?.ngoName}</span>
                      {camp.ngo?.isVerified && (
                        <span className="text-emerald-700 font-bold">✓</span>
                      )}
                    </p>

                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition leading-snug line-clamp-1" title={camp.title}>
                      {camp.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {camp.description}
                    </p>
                  </div>

                  {/* Verified Progress Meter */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Verified Progress</span>
                      <span className="text-emerald-700">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span><strong>{camp.receivedQuantity}</strong> {camp.unit} received</span>
                      <span>Target: <strong>{camp.targetQuantity}</strong></span>
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>📍 {camp.city || 'India'}</span>
                    <span>⏳ {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'}</span>
                  </div>

                  {/* View / Contribute Button */}
                  <Link
                    to={`/campaigns/${camp._id}`}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl text-center transition no-underline shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>View Campaign & Support</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
