import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

export default function NGOProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    ngoName: '',
    registrationNumber: '',
    ngoType: '',
    establishedYear: '',
    website: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    description: '',
    mission: '',
    vision: '',
    workingAreas: '',
    logo: '',
    email: '',
  });

  useEffect(() => {
    let ignore = false;
    API.get('/ngo/profile')
      .then(res => {
        if (ignore) return;
        const data = res.data;
        setProfile(data);
        setFormData({
          ngoName: data.ngoName || '',
          registrationNumber: data.registrationNumber || '',
          ngoType: data.ngoType || '',
          establishedYear: data.establishedYear || '',
          website: data.website || '',
          phone: data.phone || '',
          city: data.city || '',
          state: data.state || '',
          address: data.address || '',
          description: data.description || '',
          mission: data.mission || '',
          vision: data.vision || '',
          workingAreas: Array.isArray(data.workingAreas) ? data.workingAreas.join(', ') : (data.workingAreas || ''),
          logo: data.logo || '',
          email: data.user?.email || user?.email || '',
        });
      })
      .catch(err => {
        if (!ignore) {
          setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load NGO profile' });
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [user]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('image', file);

    setUploadingLogo(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await API.post('/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const logoUrl = res.data.url;
      setFormData(prev => ({ ...prev, logo: logoUrl }));

      // Automatically update profile with new logo
      await API.put('/ngo/profile/full', { logo: logoUrl });
      setProfile(prev => ({ ...prev, logo: logoUrl }));
      setMsg({ type: 'success', text: 'Logo uploaded and updated successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to upload logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const areasArray = formData.workingAreas
        ? formData.workingAreas.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        ngoName: formData.ngoName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        description: formData.description,
        logo: formData.logo,
        ngoType: formData.ngoType,
        establishedYear: formData.establishedYear ? Number(formData.establishedYear) : null,
        website: formData.website,
        mission: formData.mission,
        vision: formData.vision,
        workingAreas: areasArray,
      };

      const res = await API.put('/ngo/profile/full', payload);
      setProfile(res.data.ngo || res.data);
      setIsEditing(false);
      setMsg({ type: 'success', text: 'Organization profile updated successfully!' });
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-500">Loading profile...</div>;

  const isVerified = profile?.isVerified === true;
  const initials = (profile?.ngoName || 'NGO').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Organization Profile 🏢</h1>
          <p className="text-slate-500 text-sm mt-1">Manage public profile, missions, and contact information.</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition cursor-pointer border-0 shadow-xs"
          >
            ✏️ Edit Profile
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-sm transition cursor-pointer border-0"
          >
            Cancel
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
          msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ type: '', text: '' })} className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          {formData.logo ? (
            <div
              className="cursor-pointer"
              onClick={() => setPhotoModalOpen(true)}
              title="Click to view logo in medium size"
            >
              <img
                src={formData.logo}
                alt="NGO Logo"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-green-500 shadow-sm hover:ring-4 hover:ring-green-100 transition"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-bold text-2xl border-2 border-green-300">
              {initials}
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full shadow cursor-pointer text-xs" title="Upload new logo">
            📷
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
          </label>
        </div>

        {/* Medium size photo modal */}
        <ProfilePhotoModal
          isOpen={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          photoUrl={formData.logo}
          name={formData.ngoName || profile?.ngoName}
          subtitle="Organization Logo"
        />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">{profile?.ngoName || 'NGO Name'}</h2>
            {isVerified ? (
              <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold">✓ Verified</span>
            ) : (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-0.5 rounded-full font-bold">⏳ Verification Pending</span>
            )}
          </div>
          <p className="text-sm text-slate-500">Reg No: <span className="font-semibold text-slate-700">{profile?.registrationNumber || 'N/A'}</span></p>
          {profile?.city && (
            <p className="text-xs text-slate-500 mt-1">📍 {profile.city}{profile.state ? `, ${profile.state}` : ''}</p>
          )}
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Organization Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            🏢 Organization Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NGO Name *</label>
              <input
                type="text"
                required
                disabled={!isEditing}
                value={formData.ngoName}
                onChange={(e) => setFormData({ ...formData, ngoName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Number (Read-only)</label>
              <input
                type="text"
                readOnly
                disabled
                value={formData.registrationNumber}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NGO Type / Sector</label>
              <input
                type="text"
                disabled={!isEditing}
                placeholder="e.g. Education, Child Welfare, Healthcare"
                value={formData.ngoType}
                onChange={(e) => setFormData({ ...formData, ngoType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Established Year</label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                disabled={!isEditing}
                placeholder="e.g. 2012"
                value={formData.establishedYear}
                onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="url"
                disabled={!isEditing}
                placeholder="https://example.org"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Account Email (Read-only)</label>
              <input
                type="email"
                readOnly
                disabled
                value={formData.email}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            📍 Contact & Location
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                disabled={!isEditing}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
              <input
                type="text"
                required
                disabled={!isEditing}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Office Address *</label>
            <input
              type="text"
              required
              disabled={!isEditing}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Mission, Vision & Description */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            🎯 Mission, Vision & Working Areas
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Overview</label>
            <textarea
              rows={3}
              disabled={!isEditing}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell donors about your organization's history, scope, and community impact..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mission Statement</label>
              <textarea
                rows={2}
                disabled={!isEditing}
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                placeholder="Our mission is to..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vision Statement</label>
              <textarea
                rows={2}
                disabled={!isEditing}
                value={formData.vision}
                onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                placeholder="A world where..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Working Areas (Comma-separated)</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.workingAreas}
              onChange={(e) => setFormData({ ...formData, workingAreas: e.target.value })}
              placeholder="e.g. Slum Education, Women Empowerment, Child Nutrition, Disaster Relief"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow cursor-pointer border-0 disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Organization Profile'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
