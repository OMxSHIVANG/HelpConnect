import { Link } from 'react-router-dom';

export default function NGODetailsModal({ ngo, donorLocation, onClose }) {
  if (!ngo) return null;

  const {
    ngoName,
    registrationNumber,
    phone,
    address,
    city,
    state,
    logo,
    website,
    description,
    distanceKm,
    latitude,
    longitude,
    activeRequirements = []
  } = ngo;

  // Directions URL: Google Maps with origin & destination
  let directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ngoName}, ${address}, ${city}`)}`;
  if (latitude && longitude) {
    if (donorLocation?.latitude && donorLocation?.longitude) {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${donorLocation.latitude},${donorLocation.longitude}&destination=${latitude},${longitude}`;
    } else {
      directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
  }

  const initials = (ngoName || 'NGO')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt={ngoName} className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900">{ngoName}</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  ✓ Verified NGO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Reg No: <span className="font-mono text-slate-700">{registrationNumber || 'N/A'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer text-xl"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Location</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                📍 {address ? `${address}, ` : ''}{city}{state ? `, ${state}` : ''}
              </p>
              {distanceKm !== undefined && distanceKm !== null && (
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  🚗 ~{distanceKm} KM from your current location
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Contact Details</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                📞 {phone || 'Not publicly listed'}
              </p>
              {website && (
                <p className="text-xs text-blue-600 mt-1 truncate">
                  🌐 <a href={website} target="_blank" rel="noreferrer" className="underline">{website}</a>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">About Organization</h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                {description}
              </p>
            </div>
          )}

          {/* Directions Button */}
          <div className="flex items-center gap-3">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-center transition no-underline flex items-center justify-center gap-2 text-sm shadow-xs"
            >
              <span>🗺️</span>
              <span>Get Directions in Google Maps</span>
              <span>↗</span>
            </a>
          </div>

          {/* Active Requirements List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>📦 Active Donation Needs</span>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {activeRequirements.length}
                </span>
              </h4>
            </div>

            {activeRequirements.length > 0 ? (
              <div className="space-y-2.5">
                {activeRequirements.map((r) => (
                  <div
                    key={r._id}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-emerald-300 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          r.priorityBadge === 'Critical'
                            ? 'bg-red-100 text-red-800'
                            : r.priorityBadge === 'High'
                            ? 'bg-orange-100 text-orange-800'
                            : r.priorityBadge === 'Medium'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.priorityBadge}
                        </span>
                        <span className="text-xs text-slate-500">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate" title={r.title}>
                        {r.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Needs: <span className="font-extrabold text-red-600">{r.remainingQuantity} {r.unit}</span>
                      </p>
                    </div>

                    <Link
                      to={`/donate/${r._id}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition no-underline shrink-0"
                    >
                      Donate Now
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center">
                No active donation requests posted at this moment.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
