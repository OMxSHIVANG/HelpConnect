import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import Loading from '../../components/Loading';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = () => {
    API.get('/admin/stats')
      .then((res) => {
        setStats(res.data);
        setError('');
      })
      .catch((err) => {
        console.error('Failed to fetch admin stats:', err);
        setError(err.response?.data?.message || 'Failed to load platform statistics');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadStats();
  };

  if (loading) return <Loading />;

  // Quick calculations for progress bars
  const totalNGOs = stats?.totalNGOs || 0;
  const verifiedNGOs = stats?.verifiedNGOs || 0;
  const pendingNGOs = stats?.pendingNGOs || 0;
  const ngoVerifiedPercent = totalNGOs > 0 ? Math.round((verifiedNGOs / totalNGOs) * 100) : 0;

  const totalReqs = stats?.totalRequirements || 0;
  const activeReqs = stats?.activeRequirements || 0;
  const fulfilledReqs = stats?.fulfilledRequirements || 0;
  const reqFulfilledPercent = totalReqs > 0 ? Math.round((fulfilledReqs / totalReqs) * 100) : 0;

  const totalDons = stats?.totalDonations || 0;
  const completedDons = stats?.completedDonations || 0;
  const donCompletedPercent = totalDons > 0 ? Math.round((completedDons / totalDons) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Overview</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time platform metrics, verification queue, and activity summary.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer border-0"
          >
            <span>🔄</span> Refresh
          </button>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition no-underline shadow-xs"
          >
            <span>👥</span> Manage Users
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Donors / Users</span>
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
              👤
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{stats?.totalUsers ?? 0}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Registered citizen and donor accounts
          </div>
        </div>

        {/* Total NGOs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total NGOs</span>
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
              🏢
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalNGOs}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {verifiedNGOs} verified
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-medium">
            {pendingNGOs} awaiting verification review
          </div>
        </div>

        {/* Total Requirements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requirements</span>
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
              📋
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalReqs}</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {activeReqs} active
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {fulfilledReqs} fulfilled by donors
          </div>
        </div>

        {/* Total Donations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Donations</span>
            <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              📦
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalDons}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {completedDons} completed
            </span>
          </div>
          <div className="mt-2 text-xs text-amber-600 font-medium">
            {stats?.pendingDonations ?? 0} pending processing
          </div>
        </div>
      </div>

      {/* Progress & Distribution Cards (CSS Bar charts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* NGO Verification Ratio */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>🛡</span> NGO Verification Status
          </h3>
          <p className="text-xs text-slate-500 mb-4">Ratio of verified organizations to pending</p>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Verified ({verifiedNGOs})</span>
                <span>{ngoVerifiedPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${ngoVerifiedPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
              <span>Pending Reviews:</span>
              <span className="font-bold text-amber-600">{pendingNGOs}</span>
            </div>
            <Link
              to="/admin/ngos"
              className="mt-3 block text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg transition no-underline"
            >
              Review NGO Applications →
            </Link>
          </div>
        </div>

        {/* Requirements Fulfillment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>🎯</span> Requirement Fulfillment
          </h3>
          <p className="text-xs text-slate-500 mb-4">Fulfilled vs active requirements</p>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Fulfilled ({fulfilledReqs})</span>
                <span>{reqFulfilledPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${reqFulfilledPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
              <span>Active Needs:</span>
              <span className="font-bold text-indigo-600">{activeReqs}</span>
            </div>
            <Link
              to="/admin/donations"
              className="mt-3 block text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg transition no-underline"
            >
              Monitor Donations Flow →
            </Link>
          </div>
        </div>

        {/* Donation Completion */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <span>📦</span> Donation Completion Rate
          </h3>
          <p className="text-xs text-slate-500 mb-4">Successfully delivered items</p>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span>Completed ({completedDons})</span>
                <span>{donCompletedPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${donCompletedPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
              <span>Accepted & In Transit:</span>
              <span className="font-bold text-purple-600">{stats?.acceptedDonations ?? 0}</span>
            </div>
            <Link
              to="/admin/donations"
              className="mt-3 block text-center py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg transition no-underline"
            >
              View All Donations →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4">Quick Management Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/users"
            className="p-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/30 transition group no-underline"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-bold text-sm text-slate-800 group-hover:text-red-600">User Management</div>
            <p className="text-xs text-slate-500 mt-1">Search, suspend, or manage platform accounts</p>
          </Link>

          <Link
            to="/admin/ngos"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition group no-underline"
          >
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-600">Verify NGOs</div>
            <p className="text-xs text-slate-500 mt-1">Review registrations, documents, and credentials</p>
          </Link>

          <Link
            to="/admin/donations"
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition group no-underline"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="font-bold text-sm text-slate-800 group-hover:text-purple-600">Donation Logs</div>
            <p className="text-xs text-slate-500 mt-1">Track status across all donors and partner NGOs</p>
          </Link>

          <Link
            to="/admin/settings"
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition group no-underline"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-bold text-sm text-slate-800 group-hover:text-slate-900">Admin Settings</div>
            <p className="text-xs text-slate-500 mt-1">Account credentials, system preferences & diagnostics</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
