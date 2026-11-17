import { Link } from 'react-router-dom';

const CATEGORY_ICONS = {
    Clothes: '👕',
    Food: '🍱',
    Books: '📚',
    Toys: '🧸',
    Medicine: '💊',
    'School Supplies': '🎒',
    Electronics: '📱',
    Other: '📦'
};

const URGENCY_STYLES = {
    Low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    High: 'bg-orange-50 text-orange-700 border border-orange-200',
    Critical: 'bg-red-50 text-red-700 border border-red-200'
};

function RequirementCard({ requirement }) {
    const { _id, title, category, quantity, remainingQuantity, unit, city, urgency, ngo, image } = requirement;

    const donated = quantity - remainingQuantity;
    const progress = quantity > 0 ? Math.min(100, Math.round((donated / quantity) * 100)) : 0;
    const urgencyStyle = URGENCY_STYLES[urgency] || URGENCY_STYLES.Medium;
    const categoryIcon = CATEGORY_ICONS[category] || '📦';

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200">

            {/* Image or placeholder */}
            {image ? (
                <img
                    src={image}
                    alt={title}
                    className="w-full h-44 object-cover"
                />
            ) : (
                <div className="w-full h-44 bg-green-50 flex items-center justify-center text-5xl border-b border-slate-100">
                    {categoryIcon}
                </div>
            )}

            <div className="p-5 flex flex-col flex-1">

                {/* Badges */}
                <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                    <div className="flex flex-wrap gap-1">
                        {(category || 'Other').split(',').map((cat, idx) => {
                            const clean = cat.trim();
                            const icon = CATEGORY_ICONS[clean] || '📦';
                            return (
                                <span key={idx} className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                    {icon} {clean}
                                </span>
                            );
                        })}
                    </div>
                    <span className={`${urgencyStyle} px-2.5 py-0.5 rounded-full text-xs font-bold`}>
                        ⚡ {urgency}
                    </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2 leading-snug">
                    {title}
                </h3>

                {/* NGO info */}
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-700">{ngo?.ngoName || 'NGO'}</span>
                    {ngo?.isVerified && (
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">✓ Verified</span>
                    )}
                    <span className="text-slate-400">•</span>
                    <span>📍 {city}</span>
                </p>

                {/* Type-specific tags */}
                {(requirement.clothesType || requirement.targetAgeGroup || requirement.size) && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                        {requirement.clothesType && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">👕 {requirement.clothesType}</span>
                        )}
                        {requirement.targetAgeGroup && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">👤 {requirement.targetAgeGroup}</span>
                        )}
                        {requirement.size && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">📐 {requirement.size}</span>
                        )}
                    </div>
                )}

                {(requirement.bookClass || requirement.bookType) && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                        {requirement.bookClass && (
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">🎓 {requirement.bookClass}</span>
                        )}
                        {requirement.bookType && (
                            <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">📖 {requirement.bookType}</span>
                        )}
                    </div>
                )}

                {/* Progress bar */}
                <div className="mb-4 mt-auto">
                    <div className="flex justify-between text-xs mb-1.5 text-slate-500">
                        <span>{donated} of {quantity} {unit} donated</span>
                        <span className="font-bold text-green-600">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">{remainingQuantity} {unit} still needed</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Link
                        to={`/requirements/${_id}`}
                        className="flex-1 text-center border border-slate-200 hover:border-green-400 hover:text-green-700 text-slate-600 py-2 rounded-lg no-underline font-semibold text-sm transition"
                    >
                        Details
                    </Link>
                    {remainingQuantity > 0 ? (
                        <Link
                            to={`/donate/${_id}`}
                            className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg no-underline font-semibold text-sm transition"
                        >
                            Donate Now
                        </Link>
                    ) : (
                        <span className="flex-1 text-center bg-emerald-50 text-emerald-700 border border-emerald-200 py-2 rounded-lg font-bold text-sm">
                            Fulfilled ✓
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RequirementCard;
