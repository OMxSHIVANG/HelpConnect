import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import RequirementCard from '../components/RequirementCard';

// ─── Skeleton loaders ──────────────────────────────────────────────────────
function StatSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
            <div className="w-10 h-10 bg-slate-100 rounded-lg mb-3" />
            <div className="h-8 bg-slate-100 rounded w-16 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-24" />
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="w-full h-44 bg-slate-100" />
            <div className="p-5 space-y-3">
                <div className="flex justify-between gap-2">
                    <div className="h-5 bg-slate-100 rounded-full w-20" />
                    <div className="h-5 bg-slate-100 rounded-full w-16" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-1.5 bg-slate-100 rounded-full w-full mt-4" />
                <div className="flex gap-2 pt-2">
                    <div className="h-9 bg-slate-100 rounded-lg flex-1" />
                    <div className="h-9 bg-green-100 rounded-lg flex-1" />
                </div>
            </div>
        </div>
    );
}

// ─── Category quick-links ──────────────────────────────────────────────────
const CATEGORIES = [
    { name: 'Clothes', icon: '👕', color: 'bg-blue-50 hover:bg-blue-100 border-blue-100' },
    { name: 'Food', icon: '🍱', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
    { name: 'Books', icon: '📚', color: 'bg-amber-50 hover:bg-amber-100 border-amber-100' },
    { name: 'Toys', icon: '🧸', color: 'bg-purple-50 hover:bg-purple-100 border-purple-100' },
    { name: 'Medicine', icon: '💊', color: 'bg-rose-50 hover:bg-rose-100 border-rose-100' },
    { name: 'School Supplies', icon: '🎒', color: 'bg-sky-50 hover:bg-sky-100 border-sky-100' },
];

// ─── How It Works steps ────────────────────────────────────────────────────
const HOW_IT_WORKS = [
    {
        step: '01',
        icon: '🔍',
        title: 'Discover a Need',
        desc: 'Browse verified NGO requirements filtered by category, city, or urgency. Find exactly where your help is needed most.'
    },
    {
        step: '02',
        icon: '🎁',
        title: 'Choose What to Donate',
        desc: 'Select the items you can contribute — clothes, books, food, medicines, toys, or school supplies — and submit your offer.'
    },
    {
        step: '03',
        icon: '🤝',
        title: 'Coordinate with the NGO',
        desc: 'The NGO confirms your donation and arranges pickup or delivery. You will be kept informed at every step.'
    },
    {
        step: '04',
        icon: '✅',
        title: 'Track Until Completion',
        desc: 'Follow your donation status from accepted to picked up, received, and completed. See the real difference you made.'
    },
];

function Home() {
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const [requirements, setRequirements] = useState([]);
    const [reqLoading, setReqLoading] = useState(true);

    const [ngos, setNgos] = useState([]);
    const [ngosLoading, setNgosLoading] = useState(true);

    const [stories, setStories] = useState([]);
    const [storiesLoading, setStoriesLoading] = useState(true);

    useEffect(() => {
        // Fetch stats
        API.get('/stats')
            .then(res => setStats(res.data))
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));

        // Fetch active requirements (top 6)
        API.get('/requirements')
            .then(res => setRequirements(res.data.slice(0, 6)))
            .catch(() => setRequirements([]))
            .finally(() => setReqLoading(false));

        // Fetch verified NGOs
        API.get('/ngo')
            .then(res => setNgos(res.data.slice(0, 4)))
            .catch(() => setNgos([]))
            .finally(() => setNgosLoading(false));

        // Fetch fulfilled requirements as success stories
        API.get('/requirements', { params: { status: 'fulfilled' } })
            .then(res => setStories(res.data.slice(0, 3)))
            .catch(() => setStories([]))
            .finally(() => setStoriesLoading(false));
    }, []);

    const statCards = [
        {
            icon: '✅',
            value: stats?.completedDonations ?? '—',
            label: 'Donations Completed',
            color: 'text-green-600',
            bg: 'bg-green-50'
        },
        {
            icon: '🏢',
            value: stats?.verifiedNGOs ?? '—',
            label: 'Verified NGOs',
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            icon: '🎯',
            value: stats?.fulfilledRequirements ?? '—',
            label: 'Requirements Fulfilled',
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        },
        {
            icon: '📦',
            value: stats?.activeRequirements ?? '—',
            label: 'Active Needs Right Now',
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        },
    ];

    return (
        <div>
            {/* ─── A. Hero ─────────────────────────────────────────────── */}
            <section className="bg-slate-900 text-white py-20 px-6 relative overflow-hidden">
                {/* Subtle decorative circles */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-green-600 opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-green-500 opacity-5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative">
                    {/* Trust badge */}
                    <div className="inline-flex items-center gap-2 bg-green-900 border border-green-700 text-green-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                        Trusted NGO Donation Platform
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5 tracking-tight">
                        Small Acts of Kindness.{' '}
                        <span className="text-green-400">Big Changes in Lives.</span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
                        Connect with trusted NGOs, donate essential items, and make a meaningful difference in communities that need your support.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                        <Link
                            to="/requirements"
                            className="bg-green-600 hover:bg-green-700 text-white px-7 py-3.5 rounded-lg text-base font-bold no-underline transition shadow-sm"
                        >
                            Browse Donation Needs →
                        </Link>
                        <Link
                            to="/register-ngo"
                            className="bg-white hover:bg-slate-100 text-slate-900 px-7 py-3.5 rounded-lg text-base font-bold no-underline transition shadow-sm"
                        >
                            Register Your NGO
                        </Link>
                    </div>

                    {/* Inline trust indicators */}
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                        <span>🔒 Verified NGOs only</span>
                        <span>📍 Multiple cities</span>
                        <span>📦 Real-time requirements</span>
                    </div>
                </div>
            </section>

            {/* ─── B. Impact Stats ──────────────────────────────────────── */}
            <section className="bg-white border-b border-slate-100 py-10 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {statsLoading
                            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
                            : statCards.map((s) => (
                                <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
                                    <div className={`${s.bg} w-11 h-11 rounded-xl flex items-center justify-center text-xl mx-auto mb-3`}>
                                        {s.icon}
                                    </div>
                                    <div className={`text-3xl font-extrabold ${s.color} mb-1`}>
                                        {s.value}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium leading-snug">{s.label}</div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </section>

            {/* ─── C. Category quick-browse ─────────────────────────────── */}
            <section className="py-12 px-6 bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-5 text-center">What Would You Like to Donate?</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {CATEGORIES.map((cat) => (
                            <Link
                                key={cat.name}
                                to={`/requirements?category=${cat.name}`}
                                className="no-underline"
                            >
                                <div className={`${cat.color} border rounded-xl p-4 text-center cursor-pointer transition hover:-translate-y-0.5`}>
                                    <div className="text-3xl mb-1.5">{cat.icon}</div>
                                    <div className="font-semibold text-slate-700 text-xs leading-snug">{cat.name}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── D. Urgent Requirements ───────────────────────────────── */}
            <section className="py-14 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-end mb-8 flex-wrap gap-3">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900">Urgent Donation Needs</h2>
                            <p className="text-slate-500 text-sm mt-1">Real-time requirements posted by verified NGOs</p>
                        </div>
                        <Link
                            to="/requirements"
                            className="text-green-600 hover:text-green-700 font-semibold no-underline text-sm transition"
                        >
                            View All Needs →
                        </Link>
                    </div>

                    {reqLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                        </div>
                    ) : requirements.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-14 text-center">
                            <div className="text-4xl mb-3">📭</div>
                            <h3 className="text-slate-700 font-bold mb-1">No active requirements right now</h3>
                            <p className="text-slate-500 text-sm">Check back soon — NGOs post new needs regularly.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {requirements.map((req) => (
                                <RequirementCard key={req._id} requirement={req} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── E. How It Works ──────────────────────────────────────── */}
            <section id="how-it-works" className="py-16 px-6 bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">How HelpConnect Works</h2>
                        <p className="text-slate-500 text-sm max-w-xl mx-auto">From discovery to delivery — a simple, transparent process that connects you directly with communities in need.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {HOW_IT_WORKS.map((s) => (
                            <div key={s.step} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative">
                                <div className="text-xs font-extrabold text-green-600 mb-3 uppercase tracking-widest">{s.step}</div>
                                <div className="text-3xl mb-3">{s.icon}</div>
                                <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── F. Verified NGOs ─────────────────────────────────────── */}
            <section className="py-14 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-end mb-8 flex-wrap gap-3">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900">Verified NGOs</h2>
                            <p className="text-slate-500 text-sm mt-1">Organisations verified and active on our platform</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/ngos"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-xs no-underline transition flex items-center gap-1.5 shadow-xs"
                            >
                                <span>🔍</span>
                                <span>Find NGO</span>
                            </Link>
                            <Link
                                to="/ngos"
                                className="text-green-600 hover:text-green-700 font-semibold no-underline text-sm transition hidden sm:inline"
                            >
                                View All →
                            </Link>
                        </div>
                    </div>

                    {ngosLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl mx-auto" />
                                    <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto" />
                                    <div className="h-8 bg-slate-100 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : ngos.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center">
                            <div className="text-4xl mb-3">🏢</div>
                            <h3 className="text-slate-700 font-bold mb-1">No verified NGOs yet</h3>
                            <p className="text-slate-500 text-sm mb-4">Be the first to register and get verified.</p>
                            <Link to="/register-ngo" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold no-underline transition">
                                Register NGO
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {ngos.map((ngo) => (
                                <div key={ngo._id} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200">
                                    {/* Avatar with initial */}
                                    <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-extrabold text-xl mb-3 border border-green-200">
                                        {ngo.ngoName?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2 leading-snug">{ngo.ngoName}</h3>
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">✓ Verified</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-1">📍 {ngo.city}{ngo.state ? `, ${ngo.state}` : ''}</p>
                                    {ngo.description && (
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{ngo.description}</p>
                                    )}
                                    <Link
                                        to="/requirements"
                                        className="w-full text-center border border-green-200 hover:border-green-400 text-green-700 hover:text-green-800 py-1.5 rounded-lg no-underline font-semibold text-xs transition mt-auto"
                                    >
                                        Browse Requirements
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── G. Success Stories ───────────────────────────────────── */}
            <section className="py-14 px-6 bg-green-50 border-y border-green-100">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Donation Impact Stories</h2>
                        <p className="text-slate-500 text-sm max-w-lg mx-auto">Requirements that were fully met thanks to generous donors like you.</p>
                    </div>

                    {storiesLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-xl border border-green-100 p-6 animate-pulse space-y-3">
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded w-full" />
                                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                                    <div className="h-5 bg-green-100 rounded-full w-20 mt-2" />
                                </div>
                            ))}
                        </div>
                    ) : stories.length === 0 ? (
                        <div className="bg-white border border-dashed border-green-200 rounded-xl p-12 text-center">
                            <div className="text-4xl mb-3">🌱</div>
                            <h3 className="text-slate-700 font-bold mb-1">Stories are growing…</h3>
                            <p className="text-slate-500 text-sm mb-4">Every donation you make today becomes a story of hope. Be part of the first wave.</p>
                            <Link
                                to="/requirements"
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold no-underline transition inline-block"
                            >
                                Start Donating
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {stories.map((story) => (
                                <div key={story._id} className="bg-white rounded-xl border border-green-100 p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">🎉</span>
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Fully Fulfilled</span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-2">{story.title}</h3>
                                    <p className="text-xs text-slate-500 mb-2">
                                        <strong>{story.ngo?.ngoName || 'NGO'}</strong> • 📍 {story.city}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {story.quantity} {story.unit} of <strong>{story.category}</strong> received
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── H. About ─────────────────────────────────────────────── */}
            <section id="about" className="py-16 px-6 bg-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-4">About HelpConnect</h2>
                    <p className="text-slate-600 text-base leading-relaxed max-w-2xl mx-auto mb-6">
                        HelpConnect is a community-driven platform that bridges the gap between generous donors and verified NGOs. We believe that every unused item in your home could be a life-changing gift for someone in need.
                    </p>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-2xl mx-auto">
                        NGOs post their material requirements — exact items, quantities, and specifications — so donors can give precisely what is needed. No guesswork, no waste, just direct impact.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 mt-8">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-base">🔍</span>
                            Precision matching
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-base">✅</span>
                            Admin-verified NGOs
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-base">📊</span>
                            Real-time tracking
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-base">🆓</span>
                            100% free platform
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── I. CTA ───────────────────────────────────────────────── */}
            <section className="py-16 px-6 bg-slate-900 text-white">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Ready to Make a Difference?</h2>
                    <p className="text-slate-300 text-base mb-8 leading-relaxed">
                        Whether you have items to donate or an NGO that needs support — HelpConnect is your platform.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/requirements"
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3.5 rounded-lg text-base font-bold no-underline transition shadow-sm"
                        >
                            Browse Donation Needs
                        </Link>
                        <Link
                            to="/register-ngo"
                            className="border border-white hover:bg-white hover:text-slate-900 text-white px-8 py-3.5 rounded-lg text-base font-bold no-underline transition"
                        >
                            Register Your NGO
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;