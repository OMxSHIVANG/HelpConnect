import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';
import OtpVerificationModal from '../../components/OtpVerificationModal';

export default function DonorSettings() {
  const { user, setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [verifyModal, setVerifyModal] = useState({ open: false, type: 'email', targetValue: '' });
  const [verifySuccessMsg, setVerifySuccessMsg] = useState('');

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  // Notification toggles (UI preferences)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [donationUpdates, setDonationUpdates] = useState(true);
  const [ngoAnnouncements, setNgoAnnouncements] = useState(false);

  useEffect(() => {
    API.get('/donor/profile')
      .then(r => setProfile(r.data.user || r.data))
      .catch(e => console.error('Failed to load profile for settings:', e))
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
      await API.put('/donor/profile', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
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
    if (!window.confirm('⚠️ Are you sure you want to permanently delete your account? All your profile information, donation history, and saved favourite NGOs will be permanently removed. This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await API.delete('/auth/profile');
      alert('Your account has been deleted successfully.');
      if (logout) logout();
      navigate('/login');
    } catch (err) {
      console.error('Delete account error:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-sm">Loading settings...</div>;
  }

  const currentUser = profile || user;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage security, notifications, and account preferences.</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 text-base mb-4">Account Overview & Verification</h2>

        {verifySuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl mb-4">
            {verifySuccessMsg}
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Registered Email</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{currentUser?.email}</span>
              {currentUser?.isEmailVerified || currentUser?.emailVerified ? (
                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ✓ Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setVerifyModal({ open: true, type: 'email', targetValue: currentUser?.email || '' })}
                  className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full cursor-pointer transition"
                >
                  ⚠️ Verify Now
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Phone</span>
            <span className="font-medium text-slate-800">{currentUser?.phone || 'Not provided'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Account Type</span>
            <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
              DONOR
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Member Since</span>
            <span className="text-slate-700 font-medium">
              {currentUser?.createdAt
                ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          {currentUser?.googleId && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Connected Login</span>
              <span className="text-slate-800 font-medium">Google OAuth</span>
            </div>
          )}
        </div>
      </div>

      {/* Security / Password */}
      {!currentUser?.googleId ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-base mb-1">Change Password</h2>
          <p className="text-slate-500 text-xs mb-4">Ensure your account is using a long and random password.</p>

          {pwSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-xs mb-4">
              {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-xs mb-4">
              {pwError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                required
                value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={pwSaving}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg cursor-pointer border-0 transition disabled:opacity-50"
            >
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-base mb-1">Security</h2>
          <p className="text-slate-500 text-xs">
            You signed in using Google OAuth. Password changes are managed through your Google Account.
          </p>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 text-base mb-1">Notification Preferences</h2>
        <p className="text-slate-500 text-xs mb-4">Choose what updates you want to receive.</p>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-800">Donation Status Alerts</p>
              <p className="text-xs text-slate-500">Get notified when an NGO accepts, picks up, or completes your donation.</p>
            </div>
            <input
              type="checkbox"
              checked={donationUpdates}
              onChange={e => setDonationUpdates(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email Digest</p>
              <p className="text-xs text-slate-500">Receive periodic emails about donation opportunities near you.</p>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={e => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-800">NGO Announcements</p>
              <p className="text-xs text-slate-500">Updates and thank-you notes from your favorited non-profits.</p>
            </div>
            <input
              type="checkbox"
              checked={ngoAnnouncements}
              onChange={e => setNgoAnnouncements(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <h2 className="font-bold text-red-600 text-base mb-1">Danger Zone</h2>
        <p className="text-slate-500 text-xs mb-4">
          Permanently delete your account and all associated donation history.
        </p>

        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-4">
            {deleteError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-red-900">Delete Profile & Account</p>
            <p className="text-[11px] text-red-700">All profile data, donation history, and saved favourites will be erased.</p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-md cursor-pointer border-0 transition disabled:opacity-50 whitespace-nowrap"
          >
            {deleting ? 'Deleting...' : 'Delete Profile'}
          </button>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={verifyModal.open}
        onClose={() => setVerifyModal(prev => ({ ...prev, open: false }))}
        targetValue={verifyModal.targetValue}
        onSuccess={(data) => {
          if (data?.isEmailVerified) {
            setProfile(p => ({ ...p, isEmailVerified: true }));
            if (setUser) setUser(u => ({ ...u, isEmailVerified: true, emailVerified: true }));
            setVerifySuccessMsg('Email address verified successfully! 🎉');
          }
          setTimeout(() => setVerifySuccessMsg(''), 4000);
        }}
      />
    </div>
  );
}
