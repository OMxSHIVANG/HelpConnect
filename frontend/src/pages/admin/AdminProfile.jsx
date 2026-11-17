import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';

export default function AdminProfile() {
  const { user, setUser } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [pwForm, setPwForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    setSavingName(true);
    try {
      await API.put('/auth/profile', { name: name.trim() });
      if (setUser) {
        setUser((prev) => ({ ...prev, name: name.trim() }));
      }
      setProfileSuccess('Admin display name updated successfully.');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update admin profile.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters long.');
      return;
    }

    setPwSaving(true);
    try {
      await API.put('/auth/profile', {
        password: pwForm.newPassword,
      });
      setPwSuccess('Admin credentials updated successfully.');
      setPwForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'System Root';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {user?.name || 'System Administrator'}
              </h1>
              <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                SUPERADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official HelpConnect Platform Authority & System Credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/settings"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition no-underline flex items-center gap-1.5"
          >
            <span>⚙️</span> System Settings
          </Link>
          <Link
            to="/admin/audit-logs"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition no-underline flex items-center gap-1.5"
          >
            <span>📜</span> Audit Logs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Admin Identity & Display Settings */}
        <div className="space-y-6">
          {/* Admin Identity Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>👤</span> Administrator Information
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Active Authority
              </span>
            </div>

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

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Official Email Address (Primary Identity)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">
                    🔒 System Locked
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Root administrator credentials defined in server deployment configuration.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Role Permission Level
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Role Authority</span>
                  <span className="bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded-md text-[11px]">
                    PLATFORM ADMIN
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Administrator Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  placeholder="e.g. Platform Administrator"
                  required
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={savingName}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-xs disabled:opacity-50"
                >
                  {savingName ? 'Saving Changes...' : 'Update Admin Name'}
                </button>
              </div>
            </form>
          </div>

          {/* Admin Account Meta */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>🛡️</span> Security & Authority Scope
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Access Scope</span>
                <span className="font-bold text-slate-800">Global System Management</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Authentication Protocol</span>
                <span className="font-mono text-slate-700">JWT + Bearer + RBAC</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Provisioned Since</span>
                <span className="font-semibold text-slate-700">{memberSince}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Session Status</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Authorized
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Admin Password & Administrative Responsibilities */}
        <div className="space-y-6">
          {/* Change Admin Password */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>🔑</span> Change Admin Password
            </h2>

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
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-xs disabled:opacity-50"
                >
                  {pwSaving ? 'Updating Credentials...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Admin Responsibilities / Privileges */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>📋</span> Administrative Capabilities
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Platform administration controls assigned to this administrator account:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <span className="text-base">🏢</span>
                <div>
                  <p className="font-bold text-slate-800">NGO Verification & Governance</p>
                  <p className="text-[11px] text-slate-500">Approve or reject NGO registration requests, verify credentials and documents.</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <span className="text-base">👥</span>
                <div>
                  <p className="font-bold text-slate-800">User Moderation</p>
                  <p className="text-[11px] text-slate-500">Manage donor and NGO user statuses, active states, and role permissions.</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <span className="text-base">📦</span>
                <div>
                  <p className="font-bold text-slate-800">Relief Requirements & Donation Auditing</p>
                  <p className="text-[11px] text-slate-500">Monitor platform-wide donations, item distribution, and completed pickups.</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <span className="text-base">🚨</span>
                <div>
                  <p className="font-bold text-slate-800">Anomaly Detection & Security Logs</p>
                  <p className="text-[11px] text-slate-500">Track suspicious patterns, rate-limit thresholds, and tamper-resistant audit logs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
