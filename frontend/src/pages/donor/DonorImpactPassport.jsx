import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

export default function DonorImpactPassport() {
  const [data, setData] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  const handleRefresh = () => {
    setLoading(true);
    API.get('/donor/impact-passport')
      .then(res => {
        if (res.data.success) {
          setData(res.data.passport);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load Impact Passport');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/donor/impact-passport')
      .then(res => {
        if (active && res.data.success) {
          setData(res.data.passport);
        }
      })
      .catch(err => {
        if (active) setError(err.response?.data?.message || 'Failed to load Impact Passport');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const handlePrivacyToggle = (field) => {
    if (!data?.donor?.privacy) return;
    const current = data.donor.privacy[field];
    const updatedPrivacy = { ...data.donor.privacy, [field]: !current };

    setPrivacySaving(true);
    API.put('/donor/impact-passport/privacy', updatedPrivacy)
      .then(res => {
        if (res.data.success) {
          setData(prev => ({
            ...prev,
            donor: { ...prev.donor, privacy: res.data.privacy }
          }));
        }
      })
      .catch(err => alert(err.message))
      .finally(() => setPrivacySaving(false));
  };

  const copyPublicLink = () => {
    if (!data?.donor?.id) return;
    const publicUrl = `${window.location.origin}/impact/${data.donor.id}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Generating your verified Impact Passport...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <p className="font-bold">{error || 'Could not load passport data.'}</p>
        <button onClick={handleRefresh} className="mt-3 text-xs underline font-semibold">Try Again</button>
      </div>
    );
  }

  const { donor, metrics, badges = [], timeline = [], certificates = [] } = data;
  const categories = metrics.categoriesBreakdown || {};

  return (
    <div className="space-y-8 pb-10">
      {/* Passport Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md border-2 border-white/20 shrink-0 overflow-hidden">
              {donor.avatar ? (
                <img
                  src={donor.avatar}
                  alt={donor.name}
                  onClick={() => setPhotoModalOpen(true)}
                  title="Click to view photo in medium size"
                  className="w-full h-full rounded-2xl object-cover cursor-pointer hover:scale-105 transition"
                />
              ) : (
                '🛡️'
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                Official Verified Citizen
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{donor.name}&apos;s Impact Passport</h1>
              <p className="text-xs text-slate-300">
                Member since {new Date(donor.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} • {donor.city || 'India'}
              </p>
            </div>
          </div>

          {/* Share & Public Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={copyPublicLink}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <span>{copied ? '✓ Copied!' : '🔗 Share Impact'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verified Core Stats Grid (Strictly Completed Donations) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-3xl">📦</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{metrics.totalCompletedDonations}</p>
          <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">Verified Handovers</p>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">100% physically delivered</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-3xl">🎁</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{metrics.totalItemsDonated}</p>
          <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">Items Distributed</p>
          <p className="text-[10px] text-slate-400 mt-1">Direct aid impact</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-3xl">🏢</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{metrics.totalNgosSupported}</p>
          <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">NGOs Supported</p>
          <p className="text-[10px] text-slate-400 mt-1">Authentic charities</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs text-center">
          <span className="text-3xl">📢</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{metrics.totalCampaignsSupported || 0}</p>
          <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5">Drives Supported</p>
          <p className="text-[10px] text-slate-400 mt-1">Collective initiatives</p>
        </div>
      </div>

      {/* Category Breakdown & Privacy Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>📊 Impact By Category</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Distribution of your verified material donations across different humanitarian sectors.
          </p>

          <div className="space-y-3 pt-2">
            {Object.keys(categories).length > 0 ? (
              Object.entries(categories).map(([cat, qty]) => {
                const total = metrics.totalItemsDonated || 1;
                const pct = Math.round((qty / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800">{cat}</span>
                      <span className="text-slate-500">{qty} items ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic py-4">No completed donations yet.</p>
            )}
          </div>
        </div>

        {/* Privacy Controls Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🔒 Privacy Controls</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Control which sections of your impact are visible to the public. Personal addresses and phone numbers are permanently kept confidential.
          </p>

          <div className="space-y-3 pt-2">
            {[
              { key: 'isPublic', label: 'Public Profile Enabled', desc: 'Allows anyone with your link to view your verified impact' },
              { key: 'showStats', label: 'Show Overall Metrics', desc: 'Displays item counts and completed donation numbers' },
              { key: 'showBadges', label: 'Show Badges & Achievements', desc: 'Displays your unlocked social impact badges' },
              { key: 'showTimeline', label: 'Show Timeline', desc: 'Shows non-sensitive timeline of completed causes' }
            ].map(setting => (
              <div key={setting.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="pr-2">
                  <p className="text-xs font-bold text-slate-800">{setting.label}</p>
                  <p className="text-[10px] text-slate-400">{setting.desc}</p>
                </div>
                <button
                  onClick={() => handlePrivacyToggle(setting.key)}
                  disabled={privacySaving}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    donor.privacy?.[setting.key] ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges & Achievements Showcase */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🏅 Donor Achievements & Badges</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Milestones earned through real, completed and verified donations.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map(b => (
            <div
              key={b.id}
              className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-between ${
                b.earned
                  ? 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 opacity-50 grayscale'
              }`}
            >
              <div className="text-4xl mb-2">{b.icon}</div>
              <div>
                <h4 className="text-xs font-black text-slate-900">{b.title}</h4>
                <p className="text-[10px] text-slate-500 leading-tight mt-1">{b.description}</p>
              </div>
              <div className="mt-3">
                {b.earned ? (
                  <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Unlocked ✓
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold text-slate-400">
                    Locked 🔒
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verifiable Impact Certificates */}
      {certificates.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>📜 Verifiable Donation Certificates</span>
          </h3>
          <p className="text-xs text-slate-500">
            Official digitally verifiable certificates recognizing your ongoing contributions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {certificates.map(cert => (
              <div
                key={cert.certificateId}
                className="p-5 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">
                    {cert.certificateId}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900">{cert.title}</h4>
                  <p className="text-xs text-slate-600">{cert.impactSummary}</p>
                  <p className="text-[10px] text-slate-400">Issued: {new Date(cert.issueDate).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer shrink-0"
                >
                  View Certificate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Donation Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <span>⏳ Verified Impact Timeline</span>
        </h3>
        <p className="text-xs text-slate-500">
          Audited log of completed handovers and verified distributions.
        </p>

        {timeline.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {timeline.map(item => (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">{item.requirementTitle}</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                      ✓ Completed
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Received by: <strong>{item.ngoName}</strong> • {item.quantity} {item.unit}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Handover code: <span className="font-mono">{item.verificationCode}</span> • Completed on {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>

                <Link
                  to={`/donation/${item.id}/tracking`}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition self-start sm:self-auto no-underline"
                >
                  View Audit & Receipt →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center italic">No completed donations on record yet.</p>
        )}
      </div>

      {/* Certificate Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 border-4 border-amber-300 shadow-2xl space-y-6 text-center relative">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
            >
              ✕
            </button>
            <div className="text-5xl">🏛️</div>
            <div className="space-y-1">
              <p className="text-xs uppercase font-extrabold text-amber-800 tracking-widest">Certificate of Social Impact</p>
              <h2 className="text-2xl font-black text-slate-900">Proudly Presented To</h2>
              <p className="text-xl font-bold text-emerald-700 underline mt-2">{selectedCert.issuedTo}</p>
            </div>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              In recognition of exemplary humanitarian support through verified material item contributions on HelpConnect platform.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono">
              Certificate ID: {selectedCert.certificateId}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-200">
              <span>Date: {new Date(selectedCert.issueDate).toLocaleDateString()}</span>
              <span className="font-bold text-slate-800">{selectedCert.signatory}</span>
            </div>
            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              🖨️ Print Certificate
            </button>
          </div>
        </div>
      )}

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photoUrl={donor.avatar}
        name={donor.name}
        subtitle="Impact Passport Profile Photo"
      />
    </div>
  );
}
