import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

export default function PublicImpactProfile() {
  const { donorId } = useParams();
  const [data, setData] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get(`/donor/impact-passport/public/${donorId}`)
      .then(res => {
        if (res.data.success) {
          setData(res.data);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Could not load public impact profile.');
      })
      .finally(() => setLoading(false));
  }, [donorId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto my-24 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Verifying public impact credentials...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-4">
        <span className="text-5xl">🔒</span>
        <h3 className="text-lg font-bold text-slate-800">Profile Not Available</h3>
        <p className="text-xs text-slate-500">{error || 'This donor has configured their impact profile to be private.'}</p>
        <Link to="/" className="inline-block text-xs font-bold text-emerald-700 bg-white px-4 py-2 rounded-xl border border-slate-200 no-underline">
          Return to HelpConnect
        </Link>
      </div>
    );
  }

  const { donor, metrics, badges = [], timeline = [] } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Donor Public Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-800 font-black text-4xl flex items-center justify-center mx-auto shadow-xs border-4 border-white overflow-hidden">
          {donor.avatar ? (
            <img
              src={donor.avatar}
              alt={donor.name}
              onClick={() => setPhotoModalOpen(true)}
              title="Click to view photo in medium size"
              className="w-full h-full rounded-full object-cover cursor-pointer hover:scale-105 transition"
            />
          ) : (
            donor.name?.slice(0, 1) || 'D'
          )}
        </div>
        <div>
          <span className="text-[11px] font-extrabold uppercase bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
            ✓ Verified HelpConnect Contributor
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2">{donor.name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Impact citizen since {new Date(donor.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} • {donor.city || 'India'}
          </p>
        </div>
      </div>

      {/* Metrics if shared */}
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center">
            <p className="text-3xl font-black text-slate-900">{metrics.totalCompletedDonations}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">Verified Deliveries</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center">
            <p className="text-3xl font-black text-slate-900">{metrics.totalItemsDonated}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">Items Donated</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center">
            <p className="text-3xl font-black text-slate-900">{metrics.totalNgosSupported}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">NGOs Supported</p>
          </div>
        </div>
      )}

      {/* Badges if shared */}
      {badges.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">🏅 Earned Badges</h3>
          <div className="flex flex-wrap gap-3">
            {badges.map((b, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800">
                <span className="text-lg">{b.icon}</span>
                <span>{b.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Timeline if shared */}
      {timeline.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">⏳ Verified Impact Timeline</h3>
          <div className="divide-y divide-slate-100">
            {timeline.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{item.ngoName}</p>
                  <p className="text-slate-500">{item.category} • {new Date(item.date).toLocaleDateString()}</p>
                </div>
                <span className="font-extrabold text-emerald-700">+{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Branding Footer */}
      <div className="text-center pt-4">
        <Link to="/" className="text-xs text-slate-400 hover:text-emerald-700 no-underline">
          Powered by HelpConnect Transparent NGO Ecosystem
        </Link>
      </div>

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photoUrl={donor.avatar}
        name={donor.name}
        subtitle="Verified Contributor"
      />
    </div>
  );
}
