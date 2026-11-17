import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import Loading from '../components/Loading';

function RequirementDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [requirement, setRequirement] = useState(null);
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const [reqRes, groupRes] = await Promise.all([
                    API.get(`/requirements/${id}`),
                    API.get(`/requirements/${id}/group-progress`).catch(() => ({ data: null }))
                ]);
                setRequirement(reqRes.data);
                if (groupRes?.data?.success) {
                    setGroupData(groupRes.data);
                }
            } catch (err) {
                console.error('Fetch requirement details error:', err);
                setError(err.response?.data?.message || 'Failed to fetch requirement details');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id]);

    if (loading) return <Loading />;

    if (error || !requirement) {
        return (
            <div className="max-w-md mx-auto my-16 text-center px-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Requirement Not Found</h2>
                <p className="text-slate-500 mb-4 text-sm">{error || 'The requested NGO requirement could not be loaded.'}</p>
                <Link to="/requirements" className="text-blue-600 font-semibold no-underline hover:text-blue-700">Back to all requirements</Link>
            </div>
        );
    }

    const { _id, title, category, description, quantity, remainingQuantity, unit, city, urgency, ngo, deadline, isGroupDonation } = requirement;
    const progress = quantity > 0 ? Math.min(100, Math.round(((quantity - remainingQuantity) / quantity) * 100)) : 0;

    return (
        <div className="max-w-3xl mx-auto my-10 px-6">
            <button
                onClick={() => navigate(-1)}
                className="bg-transparent border-0 text-blue-600 font-semibold cursor-pointer mb-5 text-sm hover:text-blue-700 transition"
            >
                ← Back
            </button>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="flex gap-2 mb-4 flex-wrap items-center">
                    {(category || 'Other').split(',').map((cat, idx) => (
                        <span key={idx} className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-xs font-bold">
                            📦 {cat.trim()}
                        </span>
                    ))}
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold">
                        ⚡ Urgency: {urgency}
                    </span>
                    {isGroupDonation && (
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                            🤝 Community Group Goal
                        </span>
                    )}
                    {deadline && (
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                            🗓️ Deadline: {new Date(deadline).toLocaleDateString()}
                        </span>
                    )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">
                    {title}
                </h1>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">
                            🏢 NGO Organization Details
                        </h3>
                        <p className="text-sm text-slate-700 font-semibold">{ngo?.ngoName || 'NGO'}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            📍 City: {city} | Registration No: {ngo?.registrationNumber || 'Verified'}
                        </p>
                        {ngo?.phone && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                📞 Contact Phone: {ngo.phone}
                            </p>
                        )}
                    </div>
                    {ngo && (
                        <Link
                            to={`/ngos/${ngo._id || ngo}`}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-300 hover:bg-slate-50 px-3.5 py-2 rounded-lg no-underline shadow-2xs text-center transition"
                        >
                            View NGO Profile →
                        </Link>
                    )}
                </div>

                {/* Structured Specification Breakdown */}
                <div className="bg-emerald-50 border-1.5 border-emerald-300 rounded-xl p-5 mb-6 shadow-2xs">
                    <h3 className="text-base font-extrabold text-emerald-800 mb-3.5 flex items-center gap-1.5">
                        📋 Requirement Summary & Item Breakdown:
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {requirement.bookName && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                                <span className="text-emerald-800 font-bold text-xs block">📚 EXACT BOOK NAME / SUBJECT</span>
                                <strong className="text-slate-900 text-sm">{requirement.bookName}</strong>
                            </div>
                        )}

                        {requirement.bookClass && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                                <span className="text-emerald-800 font-bold text-xs block mb-1">🎓 CLASS / STANDARD(S)</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.bookClass.split(',').map((c, idx) => (
                                        <span key={idx} className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs font-semibold">
                                            {c.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {requirement.clothesType && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                                <span className="text-emerald-800 font-bold text-xs block mb-1">👕 CLOTHES TYPE(S)</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.clothesType.split(',').map((c, idx) => (
                                        <span key={idx} className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs font-semibold">
                                            {c.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {requirement.foodType && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                                <span className="text-emerald-800 font-bold text-xs block mb-1">🍲 FOOD & RATION</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.foodType.split(',').map((f, idx) => (
                                        <span key={idx} className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs font-semibold">
                                            {f.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {requirement.electronicType && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                                <span className="text-emerald-800 font-bold text-xs block mb-1">💻 ELECTRONIC ITEM(S)</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.electronicType.split(',').map((e, idx) => (
                                        <span key={idx} className="bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded text-xs font-semibold">
                                            {e.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {requirement.medicineType && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200">
                                <span className="text-emerald-800 font-bold text-xs block mb-1">💊 MEDICINE & HEALTHCARE</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.medicineType.split(',').map((m, idx) => (
                                        <span key={idx} className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded text-xs font-semibold">
                                            {m.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {requirement.customItems && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 sm:col-span-2">
                                <span className="text-emerald-800 font-bold text-xs block mb-1">✨ CUSTOM / SPECIFIC ITEM(S)</span>
                                <div className="flex flex-wrap gap-1">
                                    {requirement.customItems.split(',').map((item, idx) => (
                                        <span key={idx} className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-xs font-semibold">
                                            {item.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">Requirement Description</h3>
                <p className="text-slate-700 text-sm leading-relaxed mb-6">
                    {description}
                </p>

                {/* Feature 5: Community Group Donation Section */}
                {groupData && groupData.contributors && groupData.contributors.length > 0 && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-5 mb-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🤝</span>
                                <div>
                                    <h4 className="text-sm font-bold text-purple-900">Community Group Contributions</h4>
                                    <p className="text-xs text-purple-700">
                                        Multiple donors have contributed together towards fulfilling this need.
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs bg-purple-200 text-purple-900 font-bold px-2.5 py-0.5 rounded-full">
                                {groupData.groupProgress?.contributorsCount || groupData.contributors.length} Donors
                            </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-semibold text-purple-900 block">Recent verified contributions:</span>
                            <div className="flex flex-wrap gap-2">
                                {groupData.contributors.map((contrib, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 bg-white border border-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-medium shadow-2xs"
                                    >
                                        <span>👤 {contrib.donorName}</span>
                                        <span className="font-bold text-purple-700">+{contrib.quantity} {unit}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="font-bold text-blue-900 text-sm">Quantity Required:</span>
                        <span className="font-extrabold text-blue-600 text-base">{quantity} {unit}</span>
                    </div>
                    <div className="flex justify-between mb-3">
                        <span className="font-bold text-blue-900 text-sm">Remaining Needed:</span>
                        <span className="font-extrabold text-red-600 text-base">{remainingQuantity} {unit}</span>
                    </div>

                    <div className="w-full h-2.5 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                {remainingQuantity > 0 ? (
                    <Link to={`/donate/${_id}`} className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-lg no-underline font-bold text-base transition shadow-xs">
                        Donate Now towards this Requirement
                    </Link>
                ) : (
                    <div className="text-center bg-emerald-100 text-emerald-800 py-3.5 rounded-lg font-bold text-base">
                        This Requirement Has Been Fully Fulfilled! Thank you to all donors.
                    </div>
                )}
            </div>
        </div>
    );
}

export default RequirementDetails;
