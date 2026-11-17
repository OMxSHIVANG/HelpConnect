import { Link } from 'react-router-dom';

const PRIORITY_CONFIG = {
  Critical: {
    label: 'CRITICAL',
    bg: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-500/30',
    dot: 'bg-red-500 animate-pulse',
    accent: 'border-l-4 border-l-red-500'
  },
  High: {
    label: 'HIGH',
    bg: 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-500/30',
    dot: 'bg-orange-500',
    accent: 'border-l-4 border-l-orange-500'
  },
  Medium: {
    label: 'MEDIUM',
    bg: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/30',
    dot: 'bg-blue-500',
    accent: 'border-l-4 border-l-blue-500'
  },
  Normal: {
    label: 'NORMAL',
    bg: 'bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-400/30',
    dot: 'bg-slate-400',
    accent: 'border-l-4 border-l-slate-400'
  }
};

export default function UrgentDonationCard({ item, onSelectNGO }) {
  const {
    _id,
    title,
    category,
    description,
    unit,
    priorityBadge,
    distanceKm,
    quantity,
    receivedQuantity,
    remainingQuantity,
    shortagePercentage,
    deadline,
    ngo
  } = item;

  const priorityStyle = PRIORITY_CONFIG[priorityBadge] || PRIORITY_CONFIG.Normal;

  // Format deadline date and calculate days remaining
  let deadlineText = 'No set deadline';
  let isExpiringSoon = false;
  if (deadline) {
    const dDate = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = dDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (diffDays <= 0) {
      deadlineText = `Due today (${formatted})`;
      isExpiringSoon = true;
    } else if (diffDays === 1) {
      deadlineText = `Tomorrow (${formatted})`;
      isExpiringSoon = true;
    } else {
      deadlineText = `${formatted} (${diffDays} days left)`;
      if (diffDays <= 3) isExpiringSoon = true;
    }
  }

  // NGO profile image / avatar fallback
  const ngoInitials = (ngo?.ngoName || 'NGO')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden ${priorityStyle.accent}`}>
      <div className="p-5">
        {/* Top Header: NGO Info + Priority Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {ngo?.logo ? (
              <img
                src={ngo.logo}
                alt={ngo.ngoName}
                className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm border border-slate-200 shrink-0">
                {ngoInitials}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate" title={ngo?.ngoName}>
                {ngo?.ngoName || 'Registered NGO'}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <span>📍 {ngo?.city || 'India'}</span>
                {distanceKm !== null && distanceKm !== undefined && (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px]">
                    {distanceKm} KM away
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Priority Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shrink-0 border ${priorityStyle.bg}`}>
            <span className={`w-2 h-2 rounded-full ${priorityStyle.dot}`} />
            {priorityStyle.label}
          </div>
        </div>

        {/* Requirement Title & Category */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {category}
            </span>
            {isExpiringSoon && (
              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                ⏳ Urgently Needed
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-slate-900 leading-snug line-clamp-1" title={title}>
            {title}
          </h4>
          {description && (
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Quantities & Shortage Progress */}
        <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Shortage Level</span>
            <span className="font-extrabold text-slate-900">{shortagePercentage}% needed</span>
          </div>

          {/* Progress Meter */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                shortagePercentage >= 75
                  ? 'bg-red-500'
                  : shortagePercentage >= 40
                  ? 'bg-orange-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, shortagePercentage))}%` }}
            />
          </div>

          {/* Quantities breakdown */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-200/60 text-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Needed</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{quantity} <span className="text-[10px] font-normal text-slate-500">{unit}</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Received</p>
              <p className="text-xs font-bold text-emerald-700 mt-0.5">{receivedQuantity} <span className="text-[10px] font-normal text-slate-500">{unit}</span></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Remaining</p>
              <p className="text-xs font-extrabold text-red-600 mt-0.5">{remainingQuantity} <span className="text-[10px] font-normal text-slate-500">{unit}</span></p>
            </div>
          </div>
        </div>

        {/* Deadline Footer */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <span>📅 Deadline:</span>
            <span className={`font-semibold ${isExpiringSoon ? 'text-red-600' : 'text-slate-700'}`}>
              {deadlineText}
            </span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 pt-0 bg-white border-t border-slate-100 flex items-center gap-2 mt-auto">
        <Link
          to={`/donate/${_id}`}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg text-center transition no-underline flex items-center justify-center gap-1.5 shadow-xs"
        >
          <span>🎁</span>
          <span>Donate Now</span>
        </Link>
        <button
          onClick={() => onSelectNGO && onSelectNGO(ngo)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 px-3 rounded-lg transition border border-slate-200 flex items-center justify-center gap-1 cursor-pointer shrink-0"
        >
          <span>🏢</span>
          <span>View NGO</span>
        </button>
      </div>
    </div>
  );
}
