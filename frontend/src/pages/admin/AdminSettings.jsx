import { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';

export default function AdminSettings() {
  const { user, setUser } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Password change state
  const [pwForm, setPwForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  // Admin profile state
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    API.get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Failed to load admin stats in settings:', err))
      .finally(() => setLoadingStats(false));
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Display name cannot be empty');
      return;
    }

    setProfileSaving(true);
    try {
      await API.put('/auth/profile', { name: name.trim() });
      if (setUser) {
        setUser((prev) => ({ ...prev, name: name.trim() }));
      }
      setProfileSuccess('Admin profile updated successfully.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters long');
      return;
    }

    setPwSaving(true);
    try {
      await API.put('/auth/profile', {
        password: pwForm.newPassword,
      });
      setPwSuccess('Password changed successfully.');
      setPwForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Admin account credentials, security preferences, and environment status.
          </p>
        </div>
        <Link
          to="/admin/profile"
          className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition no-underline flex items-center gap-1.5"
        >
          <span>👤</span> View Admin Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Account Information & Name */}
        <div className="space-y-6">
          {/* Account Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Admin Account Profile</h2>
            
            {profileSuccess && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200">
                {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Registered Email (Read-Only)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Role Permission
                </label>
                <div className="flex items-center gap-2">
                  <span className="bg-red-50 text-red-700 border border-red-200 font-bold px-2.5 py-1 rounded-lg text-xs">
                    SUPERADMIN (Full Access)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  placeholder="Administrator Name"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 disabled:opacity-50"
              >
                {profileSaving ? 'Saving...' : 'Update Display Name'}
              </button>
            </form>
          </div>

          {/* Security & Password Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Change Admin Password</h2>
            
            {pwSuccess && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                {pwSuccess}
              </div>
            )}
            {pwError && (
              <div className="p-3 mb-4 rounded-xl text-xs bg-red-50 text-red-700 border border-red-200">
                {pwError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={pwSaving}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-xs disabled:opacity-50"
              >
                {pwSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Platform Overview & System Diagnostics */}
        <div className="space-y-6">
          {/* Platform Read-only Stats Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Platform System Summary</h2>
            {loadingStats ? (
              <div className="text-xs text-slate-400 py-4 text-center">Loading system telemetry...</div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Registered Users</span>
                  <span className="font-bold text-slate-800">{stats?.totalUsers ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Registered NGOs</span>
                  <span className="font-bold text-slate-800">{stats?.totalNGOs ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Verified NGOs</span>
                  <span className="font-bold text-emerald-600">{stats?.verifiedNGOs ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Pending NGO Approvals</span>
                  <span className="font-bold text-amber-600">{stats?.pendingNGOs ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Active Relief Requirements</span>
                  <span className="font-bold text-indigo-600">{stats?.activeRequirements ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Fulfilled Requirements</span>
                  <span className="font-bold text-slate-800">{stats?.fulfilledRequirements ?? 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Donations Logged</span>
                  <span className="font-bold text-slate-800">{stats?.totalDonations ?? 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Completed Donations</span>
                  <span className="font-bold text-emerald-600">{stats?.completedDonations ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Environment & Security Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Environment Diagnostics</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Application</span>
                <span className="font-semibold text-slate-800">HelpConnect MERN v2.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Authentication</span>
                <span className="font-semibold text-slate-800">JWT + HttpOnly / Bearer</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Database Connection</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Active (MongoDB)
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Role Authority</span>
                <span className="font-semibold text-slate-800">Role-Based Access Control (RBAC)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
