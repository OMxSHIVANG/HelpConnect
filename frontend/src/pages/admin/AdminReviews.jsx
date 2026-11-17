import { useState, useEffect } from 'react';
import API from '../../services/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleRefresh = () => {
    setLoading(true);
    API.get('/admin/reviews')
      .then((res) => {
        if (res.data.success) {
          setReviews(res.data.reviews || []);
        }
      })
      .catch((err) => console.error('Fetch reviews error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/admin/reviews')
      .then((res) => {
        if (active && res.data.success) {
          setReviews(res.data.reviews || []);
        }
      })
      .catch((err) => console.error('Fetch reviews error:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this donor review? This cannot be undone.')) {
      return;
    }
    try {
      setDeletingId(reviewId);
      const res = await API.delete(`/admin/reviews/${reviewId}`);
      if (res.data.success) {
        setMsg({ type: 'success', text: 'Review deleted successfully.' });
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete review.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">⭐ Donor Reviews & Testimonials Moderation</h1>
          <p className="text-slate-500 text-sm">
            All reviews shown are strictly verified (only donors who completed handovers). Moderate feedback for policy compliance.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300"
        >
          ↻ Refresh
        </button>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${
          msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading donor reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-xs shadow-xs">
          No donor reviews recorded in the system yet.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Target NGO</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Testimonial Comment</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <tr key={rev._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{rev.donor?.name || 'Verified Donor'}</div>
                      <div className="text-[10px] text-slate-400">{rev.donor?.email || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {rev.ngo?.ngoName || 'NGO Partner'}
                    </td>
                    <td className="px-4 py-3 text-amber-500 font-bold whitespace-nowrap">
                      {'★'.repeat(rev.rating)}
                      {'☆'.repeat(5 - rev.rating)}
                      <span className="text-slate-600 text-[11px] ml-1">({rev.rating}/5)</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm italic">
                      "{rev.comment}"
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteReview(rev._id)}
                        disabled={deletingId === rev._id}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs font-semibold border border-red-200 cursor-pointer disabled:opacity-50 transition"
                      >
                        {deletingId === rev._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
