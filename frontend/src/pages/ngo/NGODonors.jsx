import { useState, useEffect } from 'react';
import API from '../../services/api';
import ChatModal from '../../components/ChatModal';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

export default function NGODonors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    API.get('/ngo/donors')
      .then(res => setDonors(res.data?.donors || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load donors'))
      .finally(() => setLoading(false));
  }, []);

  const filteredDonors = donors.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = d.user?.name?.toLowerCase() || '';
    const email = d.user?.email?.toLowerCase() || '';
    const city = d.user?.city?.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || city.includes(q);
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'accepted':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-100 text-blue-800">Accepted</span>;
      case 'picked_up':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-purple-100 text-purple-800">Picked Up</span>;
      case 'received':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-teal-100 text-teal-800">Received</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800">Pending</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">{status || '—'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Donor Community 👥</h1>
          <p className="text-slate-500 text-sm mt-1">
            People and community members who have contributed items to your NGO. Click any donor to view their items and pickup address.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs">
          Total Donors: <span className="text-green-600 font-bold">{donors.length}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search donors by name, email, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500">Loading donor list...</div>
      ) : filteredDonors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🤝</p>
          <h3 className="font-bold text-slate-800 text-base">No donors found</h3>
          <p className="text-slate-500 text-sm mt-1">
            {search ? 'No donors match your search term.' : 'Donors will appear here once they contribute to your requirements.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Donor Profile</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">City Location</th>
                  <th className="px-5 py-3.5 text-center">Contributions</th>
                  <th className="px-5 py-3.5">Last Contribution</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDonors.map((item, idx) => {
                  const u = item.user;
                  const initials = (u?.name || 'D').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                  return (
                    <tr
                      key={u?._id || idx}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => setSelectedDonor(item)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {u?.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 hover:text-green-600 transition">
                              {u?.name || 'Anonymous Donor'}
                            </div>
                            <div className="text-xs text-slate-400">
                              Member since {u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-slate-800 font-medium">{u?.email || '—'}</div>
                        {u?.phone && <div className="text-xs text-slate-500 mt-0.5">📞 {u.phone}</div>}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {u?.city || '—'}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-green-50 text-green-700 font-bold rounded-full text-xs">
                          {item.donationCount} {item.donationCount === 1 ? 'donation' : 'donations'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {item.lastDonation ? (
                          <div>
                            <div className="text-xs text-slate-600 mb-1">
                              {new Date(item.lastDonation.createdAt).toLocaleDateString()}
                            </div>
                            {getStatusBadge(item.lastDonation.status)}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedDonor(item)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border-0 cursor-pointer transition whitespace-nowrap"
                          >
                            View Items & Address
                          </button>
                          <button
                            onClick={() => setChatRecipient(u)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer transition whitespace-nowrap shadow-xs"
                          >
                            💬 Chat
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Donor Detailed Profile & Donations Modal */}
      {selectedDonor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                {selectedDonor.user?.avatar ? (
                  <img
                    src={selectedDonor.user.avatar}
                    alt={selectedDonor.user.name}
                    onClick={() => setPreviewPhoto({ url: selectedDonor.user.avatar, name: selectedDonor.user.name })}
                    title="Click to view photo in medium size"
                    className="w-14 h-14 rounded-full object-cover border-2 border-green-500 shadow-sm cursor-pointer hover:ring-2 hover:ring-white transition"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">
                    {(selectedDonor.user?.name || 'D').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-extrabold text-white">
                    {selectedDonor.user?.name || 'Anonymous Donor'}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {selectedDonor.user?.email} {selectedDonor.user?.phone ? `• 📞 ${selectedDonor.user.phone}` : ''}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    📍 {selectedDonor.user?.city || 'Location not specified'} {selectedDonor.user?.state ? `, ${selectedDonor.user.state}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const recipient = selectedDonor.user;
                    setSelectedDonor(null);
                    setChatRecipient(recipient);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl border-0 cursor-pointer transition shadow-xs"
                >
                  💬 Chat with Donor
                </button>
                <button
                  onClick={() => setSelectedDonor(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer border-0 bg-transparent text-xl leading-none"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Donated Items & Pickup Details */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Donated Items & Pickup Details ({selectedDonor.donations?.length || 0})
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedDonor.donationCount} Total Donations
                </span>
              </div>

              {(!selectedDonor.donations || selectedDonor.donations.length === 0) ? (
                <div className="text-center py-8 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                  No individual donation records found.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDonor.donations.map((don) => (
                    <div
                      key={don._id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-xs text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                            {don.requirement?.category || 'General'}
                          </span>
                          <h5 className="font-extrabold text-slate-900 text-sm mt-1">
                            {don.requirement?.title || 'Direct Contribution'}
                          </h5>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(don.status)}
                          <span className="text-xs text-slate-400">
                            {new Date(don.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Pickup Address */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-500 block font-medium">Quantity Donated:</span>
                          <span className="font-extrabold text-blue-600 text-sm">
                            {don.quantity} {don.requirement?.unit || 'items'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">📍 Pickup Address:</span>
                          <span className="font-bold text-slate-800">
                            {don.pickupAddress || 'No pickup address specified'}, {don.city || ''}
                          </span>
                        </div>
                      </div>

                      {/* Specification Details */}
                      <div className="space-y-1.5 text-xs">
                        {(don.clothesType || don.targetAgeGroup || don.size) && (
                          <div className="p-2 bg-sky-50 rounded-lg text-sky-900">
                            <strong>👕 Clothes: </strong> {don.clothesType || 'N/A'}
                            {don.targetAgeGroup && <span> • Age: {don.targetAgeGroup}</span>}
                            {don.size && <span> • Size: {don.size}</span>}
                          </div>
                        )}

                        {(don.bookClass || don.bookType || don.bookName) && (
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-900">
                            <strong>📚 Books: </strong> {don.bookName ? `${don.bookName} • ` : ''}
                            Class: {don.bookClass || 'N/A'} • Type: {don.bookType || 'N/A'}
                          </div>
                        )}

                        {don.foodType && (
                          <div className="p-2 bg-amber-50 rounded-lg text-amber-900">
                            <strong>🍲 Food Items: </strong> {don.foodType}
                          </div>
                        )}

                        {don.electronicType && (
                          <div className="p-2 bg-cyan-50 rounded-lg text-cyan-900">
                            <strong>💻 Electronics: </strong> {don.electronicType}
                          </div>
                        )}

                        {don.medicineType && (
                          <div className="p-2 bg-rose-50 rounded-lg text-rose-900">
                            <strong>💊 Medicine: </strong> {don.medicineType}
                          </div>
                        )}

                        {don.customItems && (
                          <div className="p-2 bg-purple-50 rounded-lg text-purple-900">
                            <strong>✨ Specific Items: </strong> {don.customItems}
                          </div>
                        )}

                        {don.extraItems && (
                          <div className="p-2 bg-purple-100 rounded-lg text-purple-950 font-semibold border border-purple-200">
                            <strong>🎁 Extra Items Donated: </strong> {don.extraItems}
                          </div>
                        )}

                        {don.description && (
                          <div className="text-slate-600 italic pt-1">
                            Note from donor: "{don.description}"
                          </div>
                        )}

                        {don.image && (
                          <div className="pt-2">
                            <span className="text-[11px] text-slate-500 block mb-1">Item Photo:</span>
                            <img
                              src={don.image}
                              alt="Donated Item"
                              className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Donor ID: #{selectedDonor.user?._id?.slice(-6)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const recipient = selectedDonor.user;
                    setSelectedDonor(null);
                    setChatRecipient(recipient);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-lg border-0 cursor-pointer transition shadow-xs"
                >
                  💬 Open Chat
                </button>
                <button
                  onClick={() => setSelectedDonor(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg border-0 cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Modal */}
      {chatRecipient && (
        <ChatModal
          isOpen={Boolean(chatRecipient)}
          onClose={() => setChatRecipient(null)}
          recipient={chatRecipient}
        />
      )}

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto?.url}
        name={previewPhoto?.name}
        subtitle="Donor Profile Photo"
      />
    </div>
  );
}
