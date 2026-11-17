import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';

export default function NGOSettings() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  // Preference toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [donationNotifications, setDonationNotifications] = useState(true);

  useEffect(() => {
    API.get('/ngo/profile')
      .then(r => setProfile(r.data))
      .catch(e => console.error('Failed to load NGO profile for settings:', e))
      .finally(() => setLoading(false));
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters');
      return;
    }

    setPwSaving(true);
    try {
      await API.put('/auth/profile', {
        password: pwForm.newPassword,
      });
      setPwSuccess('Password successfully updated!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (e) {
      setPwError(e.response?.data?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ Are you sure you want to permanently delete your NGO account and organization profile? All your posted requirements and incoming requests will be permanently removed. This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await API.delete('/auth/profile');
      alert('Your organization account has been deleted successfully.');
      if (logout) logout();
      navigate('/login');
    } catch (err) {
      console.error('Delete NGO account error:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-sm">Loading settings...</div>;
  }

  const currentUser = user;
  const ngoData = profile || {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Organization Settings ⚙️</h1>
        <p className="text-slate-500 text-sm mt-1">Manage security credentials, communications, and account details.</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 text-base mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Registered Email</span>
            <span className="font-semibold text-slate-800">{currentUser?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Role</span>
            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              NGO PORTAL
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Verification Status</span>
            {ngoData.isVerified ? (
              <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                ✓ VERIFIED
              </span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-bold">
                PENDING REVIEW
              </span>
            )}
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Organization Name</span>
            <span className="font-medium text-slate-800">{ngoData.ngoName || currentUser?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Registration Number</span>
            <span className="font-mono text-xs font-bold text-slate-700">{ngoData.registrationNumber || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      {!currentUser?.googleId ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-base mb-1">Security & Password</h2>
          <p className="text-slate-500 text-xs mb-4">Update your password to keep your NGO administrator account safe.</p>

          {pwSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg p-3">
              {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              {pwError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={pwSaving}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg border-0 cursor-pointer transition disabled:opacity-50"
              >
                {pwSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-base mb-1">Security & Login</h2>
          <p className="text-slate-500 text-sm">
            You signed in using Google OAuth. Password management is handled by your Google account.
          </p>
        </div>
      )}

      {/* Communication Preferences */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 text-base mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">New Donation Alerts</p>
              <p className="text-xs text-slate-500">Receive alerts when donors submit offers for your requirements.</p>
            </div>
            <input
              type="checkbox"
              checked={donationNotifications}
              onChange={(e) => setDonationNotifications(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email Updates</p>
              <p className="text-xs text-slate-500">Get periodic summaries of contributions and fulfilled needs.</p>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <h2 className="font-bold text-red-600 text-base mb-1">Danger Zone</h2>
        <p className="text-xs text-slate-500 mb-4">
          Actions here are irreversible. Deleting this account will permanently remove your organization profile, active requirements, and donation records.
        </p>

        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-4">
            {deleteError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-red-900">Delete NGO Profile & Account</p>
            <p className="text-[11px] text-red-700">Permanently close and remove this organization account.</p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-md cursor-pointer border-0 transition disabled:opacity-50 whitespace-nowrap"
          >
            {deleting ? 'Deleting...' : 'Delete Organization Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
