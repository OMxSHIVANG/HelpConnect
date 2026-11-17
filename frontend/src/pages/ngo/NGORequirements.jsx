import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

export default function NGORequirements() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let ignore = false;
    API.get('/requirements/my-requirements')
      .then(res => {
        if (!ignore) {
          setRequirements(res.data || []);
        }
      })
      .catch(err => {
        if (!ignore) {
          setError(err.response?.data?.message || 'Failed to load requirements');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this requirement? Any associated donor requests will remain.')) {
      return;
    }

    setDeletingId(id);
    try {
      await API.delete(`/requirements/${id}`);
      setRequirements(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete requirement');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRequirements = requirements.filter(r => {
    const matchesSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.city?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || r.category?.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(requirements.flatMap(r => (r.category || '').split(',').map(c => c.trim())).filter(Boolean)));

  const getUrgencyBadge = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-red-100 text-red-800">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-orange-100 text-orange-800">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-800">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">{urgency || 'LOW'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Manage Requirements 📋</h1>
          <p className="text-slate-500 text-sm mt-1">Track active material requests, quantities fulfilled, and inventory needs.</p>
        </div>
        <Link
          to="/ngo/create-requirement"
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition no-underline inline-flex items-center gap-2 shadow-xs self-start sm:self-auto"
        >
          <span>➕</span> Post New Need
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1">
          <input
            type="text"
            placeholder="Search requirements by title or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500">Loading requirements...</div>
      ) : filteredRequirements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">📋</p>
          <h3 className="font-bold text-slate-800 text-base">No requirements found</h3>
          <p className="text-slate-500 text-sm mt-1">
            {search || categoryFilter ? 'No items match your filter criteria.' : "You haven't posted any requirements yet."}
          </p>
          {!search && !categoryFilter && (
            <Link
              to="/ngo/create-requirement"
              className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg text-xs no-underline"
            >
              Post First Requirement
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequirements.map((req) => {
            const fulfilled = (req.quantity || 0) - (req.remainingQuantity || 0);
            const progressPercent = req.quantity > 0 ? Math.min(100, Math.round((fulfilled / req.quantity) * 100)) : 0;

            return (
              <div key={req._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  {req.image && (
                    <img src={req.image} alt={req.title} className="w-full h-36 object-cover rounded-lg mb-3" />
                  )}

                  <div className="flex justify-between items-center gap-2 mb-2 flex-wrap">
                    <div className="flex flex-wrap gap-1">
                      {(req.category || 'Other').split(',').map((cat, idx) => (
                        <span key={idx} className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                          {cat.trim()}
                        </span>
                      ))}
                    </div>
                    {getUrgencyBadge(req.urgency)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{req.title}</h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{req.description || 'No description provided.'}</p>

                  {(req.clothesType || req.targetAgeGroup || req.size) && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {req.clothesType && <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md text-2xs font-semibold">👕 {req.clothesType}</span>}
                      {req.targetAgeGroup && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-2xs font-semibold">👤 {req.targetAgeGroup}</span>}
                      {req.size && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-2xs font-semibold">📐 {req.size}</span>}
                    </div>
                  )}

                  {(req.bookClass || req.bookType) && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {req.bookClass && <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-2xs font-semibold">🎓 {req.bookClass}</span>}
                      {req.bookType && <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-2xs font-semibold">📖 {req.bookType}</span>}
                    </div>
                  )}

                  {/* Quantity and Progress */}
                  <div className="mb-4 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Needed: <strong>{req.quantity} {req.unit}</strong></span>
                      <span>Remaining: <strong className="text-amber-700">{req.remainingQuantity} {req.unit}</strong></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="text-right text-2xs text-slate-400">
                      {progressPercent}% Fulfilled
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-2xs text-slate-400">
                    📍 {req.city || 'Local'}
                  </span>
                  <button
                    disabled={deletingId === req._id}
                    onClick={() => handleDelete(req._id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer border-0 transition disabled:opacity-50"
                  >
                    {deletingId === req._id ? 'Deleting...' : 'Delete 🗑️'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
