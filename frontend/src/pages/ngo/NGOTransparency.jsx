import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import API from '../../services/api';

export default function NGOTransparency() {
  const { user } = useContext(AuthContext);
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    const ngoId = user?.ngoProfile?._id || user?._id;
    API.get(`/ngo/${ngoId}/transparency`)
      .then(res => {
        if (res.data.success) {
          setScorecard(res.data.scorecard);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load NGO transparency scorecard');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    const ngoId = user?.ngoProfile?._id || user?._id;
    API.get(`/ngo/${ngoId}/transparency`)
      .then(res => {
        if (active && res.data.success) {
          setScorecard(res.data.scorecard);
        }
      })
      .catch(err => {
        if (active) setError(err.response?.data?.message || 'Failed to load NGO transparency scorecard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-xs text-slate-500">Calculating transparency metrics & verification status...</p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-xl mx-auto my-10 text-center">
        <span className="text-3xl block mb-2">⚠️</span>
        <h2 className="text-base font-bold text-slate-900">Transparency Score Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'Could not calculate scorecard at this time.'}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg border-0 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    overallTransparencyScore,
    scoreTier,
    metricsBreakdown,
    adminVerifiedData,
    ngoSubmittedData,
    systemCalculatedMetrics,
    verifiedDonorReviews
  } = scorecard;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🛡️ NGO Transparency & Trust Scorecard</h1>
        <p className="text-slate-500 text-sm">
          Auditable, multi-dimensional trust rating derived from platform activity, distribution evidence, and admin verification.
        </p>
      </div>

      {/* Main Score Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              Official Platform Trust Rating
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                {overallTransparencyScore}
              </span>
              <span className="text-slate-400 text-xl font-bold">/ 100</span>
            </div>
            <div className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
              ★ {scoreTier}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/10 sm:max-w-xs space-y-2 text-xs">
            <p className="font-semibold text-slate-200">How this score is calculated:</p>
            <ul className="space-y-1 text-slate-300 pl-4 list-disc">
              <li>Admin Verification (30 pts)</li>
              <li>Requirement Fulfillment (25 pts)</li>
              <li>Donation Completion (25 pts)</li>
              <li>Photo Evidence Submission (20 pts)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed 4-Pillar Score Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">1. Admin Verification</span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {metricsBreakdown.adminVerification.score}/{metricsBreakdown.adminVerification.max}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${(metricsBreakdown.adminVerification.score / metricsBreakdown.adminVerification.max) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {metricsBreakdown.adminVerification.isVerified ? '✓ Legal registration verified' : 'Pending admin review'}
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">2. Needs Fulfilled</span>
            <span className="text-xs font-mono font-bold text-blue-700">
              {metricsBreakdown.requirementFulfillment.score}/{metricsBreakdown.requirementFulfillment.max}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${(metricsBreakdown.requirementFulfillment.score / metricsBreakdown.requirementFulfillment.max) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {metricsBreakdown.requirementFulfillment.ratePercentage}% fulfillment rate ({metricsBreakdown.requirementFulfillment.fulfilledCount}/{metricsBreakdown.requirementFulfillment.totalCount})
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">3. Donation Completed</span>
            <span className="text-xs font-mono font-bold text-indigo-700">
              {metricsBreakdown.donationCompletion.score}/{metricsBreakdown.donationCompletion.max}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-indigo-600 rounded-full"
              style={{ width: `${(metricsBreakdown.donationCompletion.score / metricsBreakdown.donationCompletion.max) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {metricsBreakdown.donationCompletion.ratePercentage}% of accepted donations completed ({metricsBreakdown.donationCompletion.completedCount}/{metricsBreakdown.donationCompletion.acceptedCount})
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">4. Evidence Provided</span>
            <span className="text-xs font-mono font-bold text-amber-700">
              {metricsBreakdown.evidenceSubmission.score}/{metricsBreakdown.evidenceSubmission.max}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${(metricsBreakdown.evidenceSubmission.score / metricsBreakdown.evidenceSubmission.max) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {metricsBreakdown.evidenceSubmission.ratePercentage}% distributions backed with photos
          </p>
        </div>
      </div>

      {/* Transparent Source Distinction (Admin Verified vs NGO Submitted vs System Calculated) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          🔍 Clear Data Source Distinction
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Column 1: Admin-Verified */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <span>🛡️</span>
              <span>Admin-Verified Data</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Legally vetted by platform compliance officers:
            </p>
            <div className="space-y-1.5 pt-1 text-slate-700">
              <div>
                <span className="text-slate-500 block text-[10px]">Registration Number:</span>
                <span className="font-mono font-bold">{adminVerifiedData.registrationNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Registered Legal Address:</span>
                <span>{adminVerifiedData.legalAddress}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Verification Status:</span>
                <span className="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  {adminVerifiedData.isVerified ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: NGO-Submitted */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-800 font-bold">
              <span>🏢</span>
              <span>NGO-Submitted Data</span>
            </div>
            <p className="text-[11px] text-blue-700">
              Provided directly by the organization:
            </p>
            <div className="space-y-1.5 pt-1 text-slate-700">
              <div>
                <span className="text-slate-500 block text-[10px]">Mission:</span>
                <span className="line-clamp-2">{ngoSubmittedData.mission || 'Community welfare & relief'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Website:</span>
                <span className="truncate block font-mono">{ngoSubmittedData.website || 'helpconnect.org'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Working Areas:</span>
                <span>
                  {ngoSubmittedData.workingAreas?.length > 0
                    ? ngoSubmittedData.workingAreas.join(', ')
                    : 'Healthcare, Education, Child Welfare'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: System-Calculated */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-purple-800 font-bold">
              <span>⚡</span>
              <span>System-Calculated Metrics</span>
            </div>
            <p className="text-[11px] text-purple-700">
              Derived automatically from immutable event logs:
            </p>
            <div className="space-y-1.5 pt-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Completed Donations:</span>
                <strong>{systemCalculatedMetrics.completedDonations}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fulfilled Requirements:</span>
                <strong>{systemCalculatedMetrics.fulfilledRequirements}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verified Reviews:</span>
                <strong>{systemCalculatedMetrics.verifiedReviewsCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Average Rating:</span>
                <strong className="text-amber-600">★ {systemCalculatedMetrics.averageRating} / 5.0</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Donor Reviews (Anti-Fraud Enforced) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              ⭐ Verified Donor Reviews & Testimonials
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only donors with confirmed completed handovers can publish ratings. Unverified accounts cannot review.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
            {verifiedDonorReviews.length} Reviews
          </span>
        </div>

        {verifiedDonorReviews.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No donor reviews published yet. Reviews will automatically appear once completed donors submit feedback.
          </div>
        ) : (
          <div className="space-y-3">
            {verifiedDonorReviews.map((rev) => (
              <div key={rev._id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-600 text-white font-bold text-[10px] flex items-center justify-center">
                      {rev.donorName[0] || 'D'}
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{rev.donorName}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                      ✓ Completed Donor
                    </span>
                  </div>
                  <span className="text-xs text-amber-500 font-bold">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic pl-8">"{rev.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
