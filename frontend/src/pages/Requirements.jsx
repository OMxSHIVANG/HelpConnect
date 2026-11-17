import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import RequirementCard from '../components/RequirementCard';
import Loading from '../components/Loading';

function Requirements() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCategory = searchParams.get('category') || 'All';

    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState(initialCategory);
    const [city, setCity] = useState('');
    const [urgency, setUrgency] = useState('All');
    const [search, setSearch] = useState('');

    useEffect(() => {
        let ignore = false;
        const fetchFilteredRequirements = async () => {
            setLoading(true);
            setError('');
            try {
                const params = {};
                if (category !== 'All') params.category = category;
                if (city.trim()) params.city = city.trim();
                if (urgency !== 'All') params.urgency = urgency;
                if (search.trim()) params.search = search.trim();

                const res = await API.get('/requirements', { params });
                if (!ignore) {
                    setRequirements(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch requirements:', err);
                if (!ignore) {
                    setError('Failed to load requirements. Please try again.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        };

        fetchFilteredRequirements();
        return () => { ignore = true; };
    }, [category, city, urgency, search]);

    const categories = ['All', 'Clothes', 'Food', 'Books', 'Toys', 'Medicine', 'School Supplies', 'Electronics', 'Other'];
    const urgencies = ['All', 'Low', 'Medium', 'High', 'Critical'];

    return (
        <div className="max-w-6xl mx-auto my-10 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                    Explore NGO Requirements 📦
                </h1>
                <p className="text-slate-500 text-base">
                    Browse active material requirements posted by verified NGOs across cities. Select a requirement to donate items directly.
                </p>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-stretch md:items-center shadow-2xs">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Search Keywords</label>
                    <input
                        type="text"
                        placeholder="Search title, item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>

                <div className="w-full md:w-48">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setSearchParams(e.target.value === 'All' ? {} : { category: e.target.value });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-44">
                    <label className="block text-xs font-bold text-slate-600 mb-1">City / Location</label>
                    <input
                        type="text"
                        placeholder="Filter by city..."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                </div>

                <div className="w-full md:w-40">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Urgency Level</label>
                    <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                        {urgencies.map((urg) => (
                            <option key={urg} value={urg}>{urg}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <Loading />
            ) : requirements.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
                    <h3 className="text-lg font-bold text-slate-700">No matching requirements found</h3>
                    <p className="text-sm mt-1">Try resetting filters or searching with different keywords.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requirements.map((req) => (
                        <RequirementCard key={req._id} requirement={req} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Requirements;
