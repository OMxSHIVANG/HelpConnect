import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';

export default function CampaignDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get(`/campaigns/${id}`)
      .then(res => {
        if (res.data.success) {
          const days = Math.ceil((new Date(res.data.campaign.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          setData({ ...res.data, daysLeft: days });
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load campaign details');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-20 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm font-medium">Loading campaign details...</p>
      </div>
    );
  }

  if (error || !data?.campaign) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-center">
        <p className="font-bold">{error || 'Campaign not found'}</p>
        <Link to="/campaigns" className="mt-4 inline-block text-xs font-semibold text-emerald-700 underline">
          ← Return to all campaigns
        </Link>
      </div>
    );
  }

  const { campaign, contributions = [] } = data;
  const progress = campaign.progressPercentage || 0;
  const remaining = campaign.remainingQuantity || 0;
  const daysLeft = data.daysLeft ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/" className="hover:text-emerald-700 no-underline">Home</Link>
        <span>/</span>
        <Link to="/campaigns" className="hover:text-emerald-700 no-underline">Campaigns</Link>
        <span>/</span>
        <span className="text-slate-900 truncate max-w-xs">{campaign.title}</span>
      </div>

      {/* Main Campaign Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Cover Image Banner */}
        <div className="h-64 sm:h-80 w-full bg-slate-100 relative">
          {campaign.coverImage ? (
            <img src={campaign.coverImage} alt={campaign.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-emerald-700 to-teal-800 flex items-center justify-center text-7xl text-white">
              📢
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-slate-900/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs">
              {campaign.category}
            </span>
            <span className="bg-red-600/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs">
              {campaign.urgency} Urgency
            </span>
          </div>
        </div>

        {/* Campaign Info Header */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {campaign.title}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {campaign.description}
              </p>
            </div>

            {/* Organizer NGO Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0 w-full md:w-64 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organizing NGO</p>
              <div className="flex items-center gap-3">
                {campaign.ngo?.logo ? (
                  <img src={campaign.ngo.logo} alt={campaign.ngo.ngoName} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-base">
                    🏢
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate" title={campaign.ngo?.ngoName}>
                    {campaign.ngo?.ngoName}
                  </h4>
                  <p className="text-xs text-slate-500">📍 {campaign.ngo?.city || 'India'}</p>
                </div>
              </div>

              {campaign.ngo?.transparencyScore && (
                <div className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center justify-between">
                  <span>Transparency Score:</span>
                  <span className="font-extrabold">{campaign.ngo.transparencyScore}/100</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Progress Bar Section */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Fulfillment</p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {campaign.receivedQuantity} / {campaign.targetQuantity} <span className="text-sm font-medium text-slate-500">{campaign.unit}</span>
                </h3>
              </div>
              <span className="text-3xl font-black text-emerald-700">{progress}%</span>
            </div>

            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-slate-500">Remaining to Target</span>
                <p className="font-extrabold text-red-600 text-sm mt-0.5">{remaining} {campaign.unit}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-slate-500">Campaign Timeline</span>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{daysLeft > 0 ? `${daysLeft} days remaining` : 'Concluded'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-center">
                <span className="text-slate-500">Distribution Location</span>
                <p className="font-extrabold text-slate-800 text-sm mt-0.5">{campaign.location || campaign.city}</p>
              </div>
            </div>
          </div>

          {/* Action CTA: Support this campaign */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Link
              to="/requirements"
              className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-center transition no-underline shadow-xs flex items-center justify-center gap-2 text-sm"
            >
              <span>🎁</span>
              <span>Donate Items for this Campaign</span>
            </Link>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Campaign link copied to clipboard!');
              }}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3.5 px-6 rounded-xl transition cursor-pointer text-sm border border-slate-200"
            >
              🔗 Share Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Completion Report if completed */}
      {campaign.completionReport?.summary && (
        <div className="bg-emerald-50 rounded-3xl p-6 sm:p-8 border border-emerald-200 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <span className="text-2xl">📜</span>
            <h3 className="text-lg font-black tracking-tight">Official Campaign Completion Report</h3>
          </div>
          <p className="text-sm text-emerald-900 leading-relaxed bg-white p-4 rounded-xl border border-emerald-100">
            {campaign.completionReport.summary}
          </p>
          {campaign.completionReport.beneficiariesCount > 0 && (
            <p className="text-xs font-bold text-emerald-800">
              👥 Beneficiaries Impacted: {campaign.completionReport.beneficiariesCount} individuals
            </p>
          )}
          {campaign.completionReport.evidenceImages?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase mb-2">Verified Distribution Evidence:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {campaign.completionReport.evidenceImages.map((img, idx) => (
                  <img key={idx} src={img} alt="Evidence" className="h-28 w-full object-cover rounded-xl border border-emerald-200 shadow-xs" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verified Contribution History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>🤝 Verified Community Contributions</span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {contributions.length} verified handovers
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Real delivery tracked</span>
        </div>

        {contributions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {contributions.map(item => (
              <div key={item._id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {item.donorAvatar ? (
                      <img src={item.donorAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.donorName}</p>
                    <p className="text-[11px] text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-700">
                    +{item.quantity} {campaign.unit}
                  </span>
                  <p className="text-[10px] text-slate-400 capitalize">{item.status.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-6 text-center italic">
            No contributions verified for this campaign yet. Be the first to donate!
          </p>
        )}
      </div>
    </div>
  );
}
