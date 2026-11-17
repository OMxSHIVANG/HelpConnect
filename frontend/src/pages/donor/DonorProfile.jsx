import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';
import OtpVerificationModal from '../../components/OtpVerificationModal';

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Other'];

export default function DonorProfile() {
  const { setUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [verifyModal, setVerifyModal] = useState({ open: false, type: 'email', targetValue: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', username: '', phone: '', gender: '',
    dateOfBirth: '', address: '', city: '', state: '', pincode: '', bio: '',
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    API.get('/donor/profile')
      .then(r => {
        const p = r.data.user || r.data;
        setProfile(p);
        setForm({
          name: p.name || '',
          username: p.username || '',
          phone: p.phone || '',
          gender: p.gender || '',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          pincode: p.pincode || '',
          bio: p.bio || '',
        });
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true); setSuccess(''); setError('');
    try {
      const r = await API.put('/donor/profile', form);
      const updated = r.data.user || r.data;
      setProfile(updated);
      if (setUser) setUser(u => ({ ...u, ...updated }));
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEmailVerification = () => {
    setVerifyModal({ open: true, type: 'email', targetValue: profile?.email || '' });
  };

  const handleVerificationSuccess = (data) => {
    if (data?.isEmailVerified) {
      setProfile(p => ({ ...p, isEmailVerified: true }));
      if (setUser) setUser(u => ({ ...u, isEmailVerified: true, emailVerified: true }));
      setSuccess('Email verified successfully! 🎉');
    }
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleAvatarUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('file', file);
      const upload = await API.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const avatarUrl = upload.data?.url || upload.data?.imageUrl || upload.data?.fileUrl || upload.data?.path;
      await API.put('/donor/profile', { avatar: avatarUrl });
      setProfile(p => ({ ...p, avatar: avatarUrl }));
      if (setUser) setUser(u => ({ ...u, avatar: avatarUrl }));
      setSuccess('Avatar updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async e => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match'); return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters'); return;
    }
    setPwSaving(true);
    try {
      await API.put('/donor/profile', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (e) {
      setPwError(e.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ Are you sure you want to permanently delete your account and profile? This action will permanently remove all your data, donations, and records and cannot be undone.')) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await API.delete('/auth/profile');
      alert('Your account has been deleted successfully.');
      if (logout) logout();
      navigate('/login');
    } catch (err) {
      console.error('Delete account error:', err);
      setError(err.response?.data?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D';

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-500">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal information and preferences.</p>
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          {profile?.avatar ? (
            <div
              className="relative group cursor-pointer"
              onClick={() => setPhotoModalOpen(true)}
              title="Click to view photo in medium size"
            >
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-green-300 group-hover:ring-4 group-hover:ring-green-100 group-hover:opacity-90 transition shadow-2xs"
              />
              <span className="absolute inset-0 rounded-full bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                🔍
              </span>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-2xl">{initials}</div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 cursor-pointer border-0"
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              {profile?.avatar && (
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border-0"
                >
                  View Photo
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF up to 5MB (Click photo to preview)</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </div>
      </div>

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photoUrl={profile?.avatar}
        name={profile?.name}
        subtitle="Donor Profile Photo"
      />

      {/* Profile Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-4">Personal Information</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
              <input name="username" value={form.username} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">Email Address (read-only)</label>
                {profile?.isEmailVerified || profile?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartEmailVerification}
                    className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full cursor-pointer transition flex items-center gap-1"
                  >
                    <span>⚠️</span> Verify Email
                  </button>
                )}
              </div>
              <input value={profile?.email || ''} readOnly
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200 bg-white">
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g || 'Select gender'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
              <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
            <input name="address" value={form.address} onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
              <input name="city" value={form.city} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
              <input name="state" value={form.state} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pincode</label>
              <input name="pincode" value={form.pincode} onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Bio <span className="text-slate-400 font-normal">(max 500 chars)</span></label>
            <textarea name="bio" value={form.bio} onChange={handleChange} maxLength={500} rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200 resize-none" />
            <p className="text-xs text-slate-400 text-right mt-0.5">{form.bio.length}/500</p>
          </div>

          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 cursor-pointer border-0">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      {!profile?.googleId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 mb-4">Change Password</h2>
          {pwSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-4">{pwSuccess}</div>}
          {pwError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{pwError}</div>}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
              <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
              <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200" />
            </div>
            <button type="submit" disabled={pwSaving}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 cursor-pointer border-0">
              {pwSaving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 mb-3">Account Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Member since</span>
            <span className="text-slate-800 font-medium">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role</span>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">DONOR</span>
          </div>
          {profile?.googleId && (
            <div className="flex justify-between">
              <span className="text-slate-500">Auth Provider</span>
              <span className="text-slate-800 font-medium">Google</span>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <h2 className="font-bold text-red-600 text-base mb-1">Danger Zone</h2>
        <p className="text-slate-500 text-xs mb-4">
          Permanently delete your profile, donations history, and account.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-red-900">Delete Profile & Account</p>
            <p className="text-[11px] text-red-700">This action cannot be undone.</p>
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
        onSuccess={handleVerificationSuccess}
      />
    </div>
  );
}
