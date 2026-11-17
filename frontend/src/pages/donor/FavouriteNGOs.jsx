import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

export default function FavouriteNGOs() {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const fetchFavourites = () => {
    API.get('/donor/favourites')
      .then(r => setFavourites(r.data.favourites || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load favourite NGOs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const handleRemove = async (ngoId) => {
    setRemovingId(ngoId);
    try {
      await API.post(`/donor/favourites/${ngoId}`);
      setFavourites(prev => prev.filter(f => f.ngo?._id !== ngoId && f.ngo !== ngoId));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to remove favourite');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-sm">Loading favourite NGOs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Favourite NGOs</h1>
          <p className="text-slate-500 text-sm mt-1">Saved non-profit organizations you support and follow.</p>
        </div>
        <Link
          to="/ngos"
          className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg no-underline transition self-start sm:self-auto"
        >
          <span>🔍</span> Explore More NGOs
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {favourites.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <p className="text-5xl mb-3">❤️</p>
          <h3 className="text-lg font-bold text-slate-800">No favourite NGOs yet</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Explore verified organizations on HelpConnect and bookmark your favorites to stay connected!
          </p>
          <Link
            to="/ngos"
            className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg no-underline transition"
          >
            Explore NGOs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {favourites.map(fav => {
            const ngo = fav.ngo;
            if (!ngo) return null;
            const initials = ngo.ngoName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NGO';
            const isVerified = ngo.isVerified || ngo.verificationStatus === 'verified';

            return (
              <div key={fav._id || ngo._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-green-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {ngo.logo ? (
                        <img src={ngo.logo} alt={ngo.ngoName} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{ngo.ngoName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📍 {ngo.city ? `${ngo.city}${ngo.state ? `, ${ngo.state}` : ''}` : 'Location N/A'}
                        </p>
                      </div>
                    </div>
                    {isVerified && (
                      <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {ngo.description || ngo.mission || 'Dedicated to creating positive social impact and serving communities in need.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                  <Link
                    to="/requirements"
                    className="text-xs text-green-600 hover:text-green-700 font-semibold no-underline"
                  >
                    View Needs →
                  </Link>
                  <button
                    onClick={() => handleRemove(ngo._id)}
                    disabled={removingId === ngo._id}
                    className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border-0 cursor-pointer transition disabled:opacity-50"
                  >
                    {removingId === ngo._id ? 'Removing...' : '❤️ Remove'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
