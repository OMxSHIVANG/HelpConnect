import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

const CATEGORIES = [
  'Clothes',
  'Books',
  'Food',
  'Medicine',
  'School Supplies',
  'Electronics',
  'Toys',
  'Other'
];

export default function DonorSmartMatch() {
  const [donorItems, setDonorItems] = useState([]);
  const [newItem, setNewItem] = useState({ category: 'Clothes', item: '', quantity: 1 });
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [radiusKm, setRadiusKm] = useState(100);

  const handleAddItem = (e) => {
    e.preventDefault();
    setFormError('');

    const trimmed = newItem.item.trim();
    if (!trimmed) {
      setFormError('Please enter an item name or description');
      return;
    }
    if (trimmed.length < 2) {
      setFormError('Item name must be at least 2 characters long');
      return;
    }

    const qty = Math.floor(Number(newItem.quantity));
    if (!qty || qty < 1) {
      setFormError('Quantity must be at least 1');
      return;
    }

    if (!CATEGORIES.includes(newItem.category)) {
      setFormError('Please select a valid category');
      return;
    }

    // Check for duplicate in donor list
    const isDuplicate = donorItems.some(
      it => it.category.toLowerCase() === newItem.category.toLowerCase() &&
            it.item.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setFormError(`"${trimmed}" under ${newItem.category} is already in your items list.`);
      return;
    }

    setDonorItems([...donorItems, { category: newItem.category, item: trimmed, quantity: qty }]);
    setNewItem({ category: 'Clothes', item: '', quantity: 1 });
  };

  const handleRemoveItem = (index) => {
    setDonorItems(donorItems.filter((_, i) => i !== index));
  };

  const handleFetchRecommendations = () => {
    if (loading) return; // Prevent duplicate requests
    if (donorItems.length === 0) {
      setError('Please add at least one item before searching for matching NGOs.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    API.post('/donor/recommendations', {
      items: donorItems,
      maxDistance: radiusKm
    })
      .then(res => {
        if (res.data.success) {
          setRecommendations(res.data.recommendations || []);
        } else {
          setError(res.data.message || 'Smart matching failed');
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Smart matching failed. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Engine Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="bg-emerald-500/30 text-emerald-200 text-xs font-extrabold uppercase px-3 py-1 rounded-full border border-emerald-400/30 inline-block">
            ✨ Intelligent Recommendation Engine
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            AI-Powered Smart Donation Matching
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Tell us what spare or surplus goods you have available. Our matching algorithm scans verified NGO requirements based on category alignment, quantity compatibility, urgency, distance, and deadlines.
          </p>
        </div>
      </div>

      {/* Item Entry Section & Radius */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">1. What items do you have available?</h3>
            <p className="text-xs text-slate-500 mt-0.5">Add one or more items to find NGOs that genuinely need them.</p>
          </div>

          {/* Search Radius */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Search Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value={25}>25 KM</option>
              <option value={50}>50 KM</option>
              <option value={100}>100 KM (Standard)</option>
              <option value={200}>200 KM (Extended)</option>
            </select>
          </div>
        </div>

        {/* Existing Items Chips */}
        {donorItems.length === 0 ? (
          <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-500">Your available donation list is currently empty.</p>
            <p className="text-xs text-slate-400 mt-1">Use the form below to list the items you can provide.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600">Items ready to match ({donorItems.length}):</p>
            <div className="flex flex-wrap gap-2.5">
              {donorItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-2 shadow-2xs"
                >
                  <span className="bg-emerald-200/80 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                  <span>{item.quantity}x {item.item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-emerald-600 hover:text-emerald-900 ml-1 text-sm font-black cursor-pointer"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Item Form */}
        <form onSubmit={handleAddItem} className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Item Description / Subcategory</label>
              <input
                type="text"
                placeholder="e.g. Winter Blankets, NCERT Science Textbooks"
                value={newItem.item}
                onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setNewItem(prev => ({ ...prev, quantity: '' }));
                      return;
                    }
                    const cleaned = raw.replace(/^0+/, '');
                    if (cleaned === '') {
                      setNewItem(prev => ({ ...prev, quantity: '' }));
                      return;
                    }
                    const num = parseInt(cleaned, 10);
                    if (!isNaN(num)) {
                      setNewItem(prev => ({ ...prev, quantity: num }));
                    }
                  }}
                  onBlur={() => {
                    if (!newItem.quantity || Number(newItem.quantity) < 1) {
                      setNewItem(prev => ({ ...prev, quantity: 1 }));
                    }
                  }}
                  className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  required
                />
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
              ⚠️ {formError}
            </p>
          )}
        </form>

        {/* Action Button: Explicit User Fetch */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500">
            {donorItems.length === 0
              ? 'Add your available items above to run the matching engine.'
              : `${donorItems.length} item(s) listed. Click below to scan nearby NGO demands.`}
          </span>
          <button
            onClick={handleFetchRecommendations}
            disabled={loading || donorItems.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{loading ? 'Evaluating Requirements...' : '⚡ Find Matching NGO Requirements'}</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🎯 Tailored NGO Recommendations</span>
            {hasSearched && (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {recommendations.length} Matches Found
              </span>
            )}
          </h3>
          <span className="text-xs text-slate-400">Ranked by Compatibility Score</span>
        </div>

        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white rounded-3xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Matching your items against registered NGO demands...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded-3xl border border-red-200 text-center space-y-3">
            <p className="font-bold text-sm">{error}</p>
            <button
              onClick={handleFetchRecommendations}
              className="bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-red-800 transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-2">
            <p className="text-5xl">✨</p>
            <h4 className="text-base font-extrabold text-slate-800">Smart Match Ready</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add the goods you are ready to donate above, then click <strong>Find Matching NGO Requirements</strong> to discover which NGOs need them most.
            </p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-2">
            <p className="text-5xl">🔍</p>
            <h4 className="text-base font-extrabold text-slate-800">No close matches found within {radiusKm} KM</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your item descriptions or expanding the search radius above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map(rec => {
              const matchScore = rec.matchPercentage;
              const badgeColor = matchScore >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : matchScore >= 60 ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-800 border-slate-300';

              return (
                <div
                  key={rec._id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-emerald-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-black px-3 py-1 rounded-full border ${badgeColor}`}>
                        🎯 {matchScore}% MATCH
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                        {rec.category}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        🚗 {rec.distanceKm} KM away
                      </span>
                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        {rec.urgency} Urgency
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-slate-900">{rec.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 font-semibold">
                        Needed by: <strong>{rec.ngo.ngoName}</strong> • {rec.ngo.city}
                      </p>
                    </div>

                    {/* Recommendation Reason */}
                    <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3 text-xs text-emerald-900 font-medium">
                      💡 <strong>Why recommended:</strong> {rec.recommendationReason}
                    </div>

                    {/* Breakdown pill */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>Remaining needed: <strong className="text-slate-800">{rec.remainingQuantity} {rec.unit}</strong></span>
                      {rec.deadline && (
                        <span>Deadline: <strong>{new Date(rec.deadline).toLocaleDateString()}</strong></span>
                      )}
                    </div>

                    {/* Alternative Matches */}
                    {rec.alternativeMatches?.length > 0 && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                        <span>Also needed by:</span>
                        {rec.alternativeMatches.map(alt => (
                          <span key={alt._id} className="text-slate-600 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {alt.ngoName} ({alt.distanceKm} KM)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
                    <Link
                      to={`/donate/${rec._id}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition no-underline text-center shadow-xs"
                    >
                      🎁 Donate to This NGO
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
