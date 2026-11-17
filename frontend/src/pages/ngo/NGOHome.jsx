import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';

export default function NGOHome() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [recentDonations, setRecentDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.allSettled([
      API.get('/ngo/dashboard'),
      API.get('/ngo/donation-requests?limit=5')
    ])
      .then(([dashRes, donRes]) => {
        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value.data);
        } else {
          setError(dashRes.reason?.response?.data?.message || 'Failed to load dashboard');
        }
        if (donRes.status === 'fulfilled') {
          setRecentDonations(donRes.value.data?.donations || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>;

  const { stats, ngoProfile } = data || {};
  const isVerified = ngoProfile?.isVerified;

  const statCards = [
    { label: 'Total Donations', value: stats?.totalDonations, icon: '📦', color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending', value: stats?.pending, icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Accepted', value: stats?.accepted, icon: '✅', color: 'bg-green-50 text-green-600' },
    { label: 'Completed', value: stats?.completed, icon: '🏆', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rejected', value: stats?.rejected, icon: '❌', color: 'bg-red-50 text-red-600' },
    { label: 'Active Requirements', value: stats?.activeRequirements, icon: '📋', color: 'bg-purple-50 text-purple-600' },
    { label: 'Total Donors', value: stats?.totalDonors, icon: '👥', color: 'bg-indigo-50 text-indigo-600' },
  ];

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === 'pending') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Pending</span>;
    if (s === 'accepted') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Accepted</span>;
    if (s === 'picked_up') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Picked Up</span>;
    if (s === 'completed') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Completed</span>;
    if (s === 'rejected') return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Rejected</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">NGO Dashboard 📊</h1>
        <p className="text-slate-500 text-sm mt-1">{ngoProfile?.ngoName || user?.name || 'Your Organization'}</p>
      </div>

      {/* Verification banner */}
      {!isVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-800">Verification Pending</p>
            <p className="text-sm text-yellow-700 mt-0.5">Your NGO is awaiting admin verification. You cannot post requirements until verified.</p>
          </div>
        </div>
      )}
      {isVerified && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <p className="font-semibold text-green-800">Your NGO is verified and listed publicly.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 ${c.color}`}>{c.icon}</div>
            <p className="text-2xl font-extrabold text-slate-900">{c.value ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/ngo/donations', icon: '📥', label: 'View Donation Requests' },
          { to: '/ngo/create-requirement', icon: '➕', label: 'Create New Requirement' },
          { to: '/ngo/requirements', icon: '📋', label: 'Manage Requirements' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="no-underline bg-white border border-slate-200 rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition">
            <span className="text-3xl">{item.icon}</span>
            <p className="font-bold text-slate-900 mt-2 text-sm">{item.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Donation Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Donation Requests</h2>
          <Link to="/ngo/donations" className="text-xs font-semibold text-green-600 hover:text-green-700 no-underline">
            View All →
          </Link>
        </div>

        {recentDonations.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No donation requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Requirement</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDonations.map((don) => (
                  <tr key={don._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{don.donor?.name || 'Anonymous'}</div>
                      <div className="text-xs text-slate-500">{don.donor?.email || don.donor?.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{don.requirement?.title || 'Material Donation'}</div>
                      <div className="text-xs text-slate-500">{don.requirement?.category}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {don.quantity} {don.requirement?.unit || 'items'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {don.createdAt ? new Date(don.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(don.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
