import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import Loading from '../components/Loading';

const CAUSE_TAGS = [
  'All',
  'Education',
  'Health',
  'Food',
  'Children',
  'Women',
  'Shelter',
  'Environment'
];

function NGOs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCity = searchParams.get('city') || 'All';

  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Controlled form inputs
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [cityInput, setCityInput] = useState(initialCity);

  // Active search query states that trigger API fetch
  const [activeSearch, setActiveSearch] = useState(initialSearch);
  const [activeCity, setActiveCity] = useState(initialCity);

  // Fetch NGOs whenever active search or city filters change
  useEffect(() => {
    let ignore = false;
    const params = {};
    if (activeSearch.trim()) params.search = activeSearch.trim();
    if (activeCity && activeCity !== 'All') params.city = activeCity.trim();

    API.get('/ngo', { params })
      .then((res) => {
        if (!ignore) {
          setNgos(Array.isArray(res.data) ? res.data : []);
          setError('');
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Failed to load NGOs. Please try again.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeSearch, activeCity]);

  // Extract distinct cities from loaded NGOs for quick selection
  const availableCities = useMemo(() => {
    const set = new Set();
    ngos.forEach((n) => {
      if (n.city) set.add(n.city.trim());
    });
    return ['All', ...Array.from(set).sort()];
  }, [ngos]);

  // Handle Search Submission (clicking "Find NGO" or pressing Enter)
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setLoading(true);
    setActiveSearch(searchInput.trim());
    setActiveCity(cityInput);

    const nextParams = {};
    if (searchInput.trim()) nextParams.search = searchInput.trim();
    if (cityInput && cityInput !== 'All') nextParams.city = cityInput;
    setSearchParams(nextParams);
  };

  // Reset / Clear filters
  const handleClearFilters = () => {
    setLoading(true);
    setSearchInput('');
    setCityInput('All');
    setActiveSearch('');
    setActiveCity('All');
    setSearchParams({});
  };

  // Quick cause tag click
  const handleTagClick = (tag) => {
    setLoading(true);
    if (tag === 'All') {
      handleClearFilters();
    } else {
      setSearchInput(tag);
      setActiveSearch(tag);
      const nextParams = { search: tag };
      if (activeCity && activeCity !== 'All') nextParams.city = activeCity;
      setSearchParams(nextParams);
    }
  };

  const isFiltered = activeSearch.trim() !== '' || (activeCity !== 'All' && activeCity !== '');

  return (
    <div className="max-w-6xl mx-auto my-10 px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Verified NGOs 🏢
        </h1>
        <p className="text-slate-500 text-base">
          Browse and search verified NGOs actively accepting donations and posting material requirements.
        </p>
      </div>

      {/* Search & Filter Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
          {/* Keyword Search Input */}
          <div className="flex-1">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Search NGO by Name or Keyword
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search NGO name, cause, registration number, address..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>
          </div>

          {/* City / Location Filter */}
          <div className="w-full md:w-56">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              City / Location
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                📍
              </span>
              <select
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition cursor-pointer appearance-none"
              >
                <option value="All">All Cities</option>
                {availableCities.filter(c => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Find NGO Search Button & Clear Button */}
          <div className="flex items-center gap-2 pt-1 md:pt-0">
            <button
              type="submit"
              className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer border-0"
              title="Click to search NGOs"
            >
              <span>🔍</span>
              <span>Find NGO</span>
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer border border-slate-200"
                title="Reset search and filters"
              >
                <span>✕</span>
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>

        {/* Quick Suggestion Cause Tags */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400">Popular Causes:</span>
          {CAUSE_TAGS.map((tag) => {
            const isSelected = (tag === 'All' && !activeSearch) || activeSearch.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={`text-xs px-3 py-1 rounded-full font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-green-600 text-white border-green-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header / Active Filter Summary */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2 text-sm text-slate-600">
          <p className="font-semibold">
            {isFiltered ? (
              <span>
                Found <strong>{ngos.length}</strong> verified {ngos.length === 1 ? 'NGO' : 'NGOs'}
                {activeSearch && <span> matching &ldquo;<strong>{activeSearch}</strong>&rdquo;</span>}
                {activeCity && activeCity !== 'All' && <span> in <strong>{activeCity}</strong></span>}
              </span>
            ) : (
              <span>Showing <strong>{ngos.length}</strong> verified {ngos.length === 1 ? 'NGO' : 'NGOs'}</span>
            )}
          </p>

          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-green-700 hover:text-green-800 font-bold underline cursor-pointer bg-transparent border-0 p-0"
            >
              Clear filters and view all NGOs
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 space-y-3">
          <div className="text-3xl">⚠️</div>
          <p className="font-bold">{error}</p>
          <button
            onClick={() => handleSearchSubmit()}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition border-0"
          >
            Retry Search
          </button>
        </div>
      ) : ngos.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center space-y-4">
          <div className="text-5xl">🏢</div>
          {isFiltered ? (
            <>
              <h3 className="text-lg font-bold text-slate-800">No NGOs matched your search</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                We couldn&apos;t find any verified NGOs matching &ldquo;<strong>{activeSearch || activeCity}</strong>&rdquo;. Try searching with a different name, keyword, or clear your location filter.
              </p>
              <button
                onClick={handleClearFilters}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer border-0 shadow-xs"
              >
                Clear Search &amp; View All NGOs
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No verified NGOs yet</h3>
              <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">
                NGOs are verified by our admin team before they appear here. Be the first to register and get verified.
              </p>
              <Link
                to="/register-ngo"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm no-underline transition"
              >
                Register Your NGO
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ngos.map((ngo) => (
            <div
              key={ngo._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-xs hover:shadow-md hover:-translate-y-0.5 transition duration-200"
            >
              {/* Avatar + badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-extrabold text-2xl shadow-2xs">
                  {ngo.ngoName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="bg-green-100 text-green-700 border border-green-200 text-xs font-bold px-2.5 py-1 rounded-full">
                  ✓ Verified
                </span>
              </div>

              {/* Name & location */}
              <h2 className="text-lg font-bold text-slate-900 mb-1 leading-snug">{ngo.ngoName}</h2>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <span>📍</span>
                <span>{ngo.city}{ngo.state ? `, ${ngo.state}` : ''}</span>
              </p>

              {/* Description */}
              {ngo.description ? (
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4 flex-1">
                  {ngo.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic mb-4 flex-1">
                  No description provided.
                </p>
              )}

              {/* Meta */}
              <div className="border-t border-slate-100 pt-4 mb-4 space-y-1.5">
                {ngo.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>🏠</span>
                    <span className="truncate">{ngo.address}</span>
                  </p>
                )}
                {ngo.phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>📞</span>
                    <span>{ngo.phone}</span>
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Reg No: <strong>{ngo.registrationNumber}</strong>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Link
                  to={`/ngos/${ngo._id}`}
                  className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl no-underline font-bold text-xs transition shadow-2xs"
                >
                  View Profile &amp; Donate
                </Link>
                <Link
                  to="/requirements"
                  className="px-4 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl no-underline font-bold text-xs transition border border-slate-200"
                >
                  Needs
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      {!loading && !error && ngos.length > 0 && (
        <div className="mt-12 bg-green-50 border border-green-100 rounded-2xl p-8 text-center space-y-2">
          <h3 className="text-lg font-bold text-slate-900">Is your NGO not listed here?</h3>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Register your NGO and submit it for verification. Once approved, you can start posting material requirements and receiving donations.
          </p>
          <div className="pt-2">
            <Link
              to="/register-ngo"
              className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm no-underline transition shadow-xs"
            >
              Register Your NGO
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NGOs;
