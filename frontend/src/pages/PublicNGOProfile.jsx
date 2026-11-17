import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import Loading from '../components/Loading';
import ProfilePhotoModal from '../components/ProfilePhotoModal';

export default function PublicNGOProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ngo, setNgo] = useState(null);
    const [requirements, setRequirements] = useState([]);
    const [transparency, setTransparency] = useState(null);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;
        const fetchNgoData = async () => {
            try {
                const [ngoRes, reqRes, transRes] = await Promise.all([
                    API.get(`/ngo/${id}`),
                    API.get('/requirements').catch(() => ({ data: [] })),
                    API.get(`/ngo/${id}/transparency`).catch(() => ({ data: null }))
                ]);

                if (ignore) return;
                setNgo(ngoRes.data);
                // Filter requirements for this NGO
                const allReqs = Array.isArray(reqRes.data) ? reqRes.data : reqRes.data?.requirements || [];
                setRequirements(allReqs.filter(r => String(r.ngo?._id || r.ngo) === String(id) && r.remainingQuantity > 0));
                if (transRes?.data?.scorecard) {
                    setTransparency(transRes.data.scorecard);
                }
            } catch (err) {
                if (ignore) return;
                console.error('Fetch NGO error:', err);
                setError(err.response?.data?.message || 'Failed to load NGO profile');
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchNgoData();
        return () => { ignore = true; };
    }, [id]);

    if (loading) return <Loading />;

    if (error || !ngo) {
        return (
            <div className="max-w-md mx-auto my-16 text-center px-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">NGO Not Found</h2>
                <p className="text-slate-500 mb-4 text-sm">{error || 'This NGO profile is unavailable or inactive.'}</p>
                <Link to="/ngos" className="text-blue-600 font-semibold no-underline hover:text-blue-700">Back to all verified NGOs</Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto my-10 px-6 space-y-8">
            <button
                onClick={() => navigate(-1)}
                className="bg-transparent border-0 text-blue-600 font-semibold cursor-pointer text-sm hover:text-blue-700 transition"
            >
                ← Back
            </button>

            {/* NGO Hero Header */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-green-100 text-green-700 border border-green-200 font-extrabold text-3xl flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden">
                        {ngo.logo ? (
                            <img
                                src={ngo.logo}
                                alt={ngo.ngoName}
                                onClick={() => setPhotoModalOpen(true)}
                                title="Click to view logo in medium size"
                                className="w-full h-full object-cover rounded-2xl cursor-pointer hover:scale-105 transition"
                            />
                        ) : (
                            ngo.ngoName?.charAt(0) || '🏢'
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{ngo.ngoName}</h1>
                            {ngo.isVerified && (
                                <span className="bg-green-100 text-green-800 border border-green-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    ✓ Verified NGO
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            📍 {ngo.address ? `${ngo.address}, ` : ''}{ngo.city}{ngo.state ? `, ${ngo.state}` : ''} | Reg No: <strong>{ngo.registrationNumber}</strong>
                        </p>
                        {ngo.phone && (
                            <p className="text-xs text-slate-400 mt-0.5">📞 Contact: {ngo.phone}</p>
                        )}
                    </div>
                </div>

                {transparency && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center min-w-[140px]">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Trust Score</span>
                        <div className="text-3xl font-extrabold text-emerald-700 mt-0.5">{transparency.totalScore || 85}</div>
                        <span className="text-[10px] text-emerald-600 font-medium">Out of 100</span>
                    </div>
                )}
            </div>

            {/* Description, Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                        About {ngo.ngoName}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {ngo.description || 'This organization is committed to transparent community service and empowering beneficiaries through verified material and financial donations.'}
                    </p>

                    {ngo.mission && (
                        <div>
                            <strong className="text-xs text-slate-800 block mb-0.5">🎯 Mission:</strong>
                            <p className="text-xs text-slate-600">{ngo.mission}</p>
                        </div>
                    )}
                    {ngo.vision && (
                        <div>
                            <strong className="text-xs text-slate-800 block mb-0.5">👁️ Vision:</strong>
                            <p className="text-xs text-slate-600">{ngo.vision}</p>
                        </div>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
                    <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Quick Info
                    </h3>
                    <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">City</span>
                        <span className="font-semibold text-slate-800">{ngo.city}</span>
                    </div>
                    {ngo.establishedYear && (
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Established</span>
                            <span className="font-semibold text-slate-800">{ngo.establishedYear}</span>
                        </div>
                    )}
                    {ngo.website && (
                        <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Website</span>
                            <a href={ngo.website.startsWith('http') ? ngo.website : `https://${ngo.website}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                {ngo.website}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Donation Needs */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                        Active Material Requirements ({requirements.length})
                    </h3>
                    <Link to="/requirements" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                        View All Platform Requirements →
                    </Link>
                </div>

                {requirements.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-400">
                        No active material requirements at this time. You can still support them via the UPI donation section above!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {requirements.map((req) => (
                            <div key={req._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {req.category || 'General'}
                                        </span>
                                        <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {req.urgency}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-1">{req.title}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2">{req.description}</p>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-red-600">
                                        Need: {req.remainingQuantity} {req.unit}
                                    </span>
                                    <Link
                                        to={`/requirements/${req._id}`}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 no-underline"
                                    >
                                        View Details →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Medium size profile photo modal */}
            <ProfilePhotoModal
                isOpen={photoModalOpen}
                onClose={() => setPhotoModalOpen(false)}
                photoUrl={ngo.logo}
                name={ngo.ngoName}
                subtitle="Verified NGO Organization Logo"
            />
        </div>
    );
}
