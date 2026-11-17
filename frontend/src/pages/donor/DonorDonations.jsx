import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import ChatModal from '../../components/ChatModal';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

const statusBadge = (status) => {
  const colors = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    accepted: 'bg-blue-100 text-blue-800 border-blue-300',
    pickup_scheduled: 'bg-sky-100 text-sky-800 border-sky-300',
    picked_up: 'bg-purple-100 text-purple-800 border-purple-300',
    received: 'bg-teal-100 text-teal-800 border-teal-300',
    distributed: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
  };
  const cls = colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

export default function DonorDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [chatDonationId, setChatDonationId] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const pageSize = 10;

  const fetchDonations = () => {
    API.get('/donations/my-donations')
      .then(r => setDonations(r.data || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load donations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this donation offer?')) return;
    setCancellingId(id);
    try {
      await API.put(`/donations/${id}/cancel`);
      setLoading(true);
      fetchDonations();
      if (selectedDonation?._id === id) {
        setSelectedDonation(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel donation');
    } finally {
      setCancellingId(null);
    }
  };

  // Stats calculation
  const stats = {
    total: donations.length,
    pending: donations.filter(d => d.status === 'pending').length,
    accepted: donations.filter(d => d.status === 'accepted').length,
    completed: donations.filter(d => d.status === 'completed').length,
    rejected: donations.filter(d => d.status === 'rejected').length,
  };

  // Filtering
  const filteredDonations = donations.filter(d => {
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const reqTitle = d.requirement?.title || '';
    const ngoName = d.ngo?.ngoName || '';
    const category = d.requirement?.category || '';
    const q = search.toLowerCase();
    const matchesSearch =
      reqTitle.toLowerCase().includes(q) ||
      ngoName.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredDonations.length / pageSize) || 1;
  const paginatedDonations = filteredDonations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Donations</h1>
        <p className="text-slate-500 text-sm mt-1">Track and manage all your item donation offers.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-slate-900">{stats.total}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-yellow-600">{stats.pending}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Pending</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-blue-600">{stats.accepted}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Accepted</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-green-600">{stats.completed}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Completed</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
          <p className="text-2xl font-extrabold text-red-600">{stats.rejected}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => { setFilterStatus(st); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${
                filterStatus === st
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by title, NGO, category..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading donations...</div>
        ) : filteredDonations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-4xl mb-3">📦</p>
            <h3 className="font-bold text-slate-800 text-base">No donations found</h3>
            <p className="text-slate-500 text-xs mt-1">
              {search || filterStatus !== 'all' ? 'Try adjusting your filters or search query.' : "You haven't made any donations yet."}
            </p>
            <Link
              to="/requirements"
              className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg no-underline transition"
            >
              Browse Needs & Donate
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Requirement / NGO</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pickup Address</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDonations.map(don => (
                    <tr key={don._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {don.image ? (
                          <img src={don.image} alt="Donation" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xl text-slate-400">📦</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 leading-tight">{don.requirement?.title || 'Donation Item'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">🏢 {don.ngo?.ngoName || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {don.requirement?.category || 'General'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                        {don.quantity} {don.requirement?.unit || 'items'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                        {don.pickupAddress ? `${don.pickupAddress}, ${don.city || ''}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(don.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {statusBadge(don.status)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedDonation(don)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-md cursor-pointer border-0 transition"
                          >
                            Details
                          </button>
                          {don.status === 'pending' && (
                            <button
                              onClick={() => handleCancel(don._id)}
                              disabled={cancellingId === don._id}
                              className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-md cursor-pointer border-0 transition disabled:opacity-50"
                            >
                              {cancellingId === don._id ? '...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs text-slate-600">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredDonations.length)} of {filteredDonations.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedDonation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-transparent border-0 text-xl font-bold cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {selectedDonation.requirement?.title || 'Donation Offer Details'}
            </h3>
            <div className="mb-4">
              {statusBadge(selectedDonation.status)}
            </div>

            {selectedDonation.image && (
              <div className="mb-4">
                <img
                  src={selectedDonation.image}
                  alt="Item"
                  className="w-full max-h-60 object-contain rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-700 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">NGO Organization</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedDonation.ngo?.ngoName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Quantity</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedDonation.quantity} {selectedDonation.requirement?.unit || 'items'}
                  </span>
                </div>
              </div>

              {selectedDonation.assignedAgent && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800">
                      🛵 Authorized Pickup Agent
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 uppercase">
                      {(selectedDonation.pickupStatus || 'agent_assigned').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedDonation.assignedAgent.profilePhoto ? (
                      <img
                        src={selectedDonation.assignedAgent.profilePhoto}
                        alt={selectedDonation.assignedAgent.fullName}
                        onClick={() => setPreviewPhoto({ url: selectedDonation.assignedAgent.profilePhoto, name: selectedDonation.assignedAgent.fullName, subtitle: `Pickup Agent (${selectedDonation.assignedAgent.agentId || 'Agent'})` })}
                        title="Click to view photo in medium size"
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-300 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-200 text-emerald-900 font-black text-sm flex items-center justify-center border border-emerald-300">
                        {selectedDonation.assignedAgent.fullName ? selectedDonation.assignedAgent.fullName.slice(0, 2).toUpperCase() : 'AG'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-xs">{selectedDonation.assignedAgent.fullName}</strong>
                        <span className="font-mono text-[10px] font-bold bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                          {selectedDonation.assignedAgent.agentId || selectedDonation.assignedAgentId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        🚗 {selectedDonation.assignedAgent.vehicleType} ({selectedDonation.assignedAgent.vehicleNumber})
                      </p>
                      {selectedDonation.assignedAgent.phone && (
                        <p className="text-[11px] text-slate-600">
                          📞 <a href={`tel:${selectedDonation.assignedAgent.phone}`} className="font-bold text-emerald-700 underline">{selectedDonation.assignedAgent.phone}</a>
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/donation/${selectedDonation._id}/tracking`}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 no-underline shadow-xs mt-2"
                  >
                    <span>🗺️</span>
                    <span>Track Live Agent GPS Location & Route</span>
                  </Link>
                </div>
              )}

              {(selectedDonation.clothesType || selectedDonation.targetAgeGroup || selectedDonation.size) && (
                <div className="p-3 bg-sky-50 rounded-lg">
                  <span className="font-bold text-sky-900 block mb-1">Clothes Specifications:</span>
                  <p className="text-sky-800">
                    Type: {selectedDonation.clothesType || 'N/A'} | Target Age: {selectedDonation.targetAgeGroup || 'N/A'} | Size: {selectedDonation.size || 'N/A'}
                  </p>
                </div>
              )}

              {(selectedDonation.bookClass || selectedDonation.bookType || selectedDonation.bookName) && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <span className="font-bold text-emerald-900 block mb-1">Book Specifications:</span>
                  <p className="text-emerald-800">
                    {selectedDonation.bookName && <span>Name: <strong>{selectedDonation.bookName}</strong> | </span>}
                    Class / Grade: {selectedDonation.bookClass || 'N/A'} | Type: {selectedDonation.bookType || 'N/A'}
                  </p>
                </div>
              )}

              {selectedDonation.foodType && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <span className="font-bold text-amber-900 block mb-1">Food Items:</span>
                  <p className="text-amber-800">{selectedDonation.foodType}</p>
                </div>
              )}

              {selectedDonation.electronicType && (
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <span className="font-bold text-cyan-900 block mb-1">Electronic Items:</span>
                  <p className="text-cyan-800">{selectedDonation.electronicType}</p>
                </div>
              )}

              {selectedDonation.medicineType && (
                <div className="p-3 bg-rose-50 rounded-lg">
                  <span className="font-bold text-rose-900 block mb-1">Medicine & Supplies:</span>
                  <p className="text-rose-800">{selectedDonation.medicineType}</p>
                </div>
              )}

              {selectedDonation.extraItems && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="font-bold text-purple-900 block mb-1">🎁 Extra Items Donated:</span>
                  <p className="text-purple-800 font-semibold">{selectedDonation.extraItems}</p>
                </div>
              )}

              <div>
                <span className="text-slate-400 block">Pickup Address</span>
                <span className="font-medium text-slate-800">{selectedDonation.pickupAddress}, {selectedDonation.city}</span>
              </div>

              {selectedDonation.donorPhone && (
                <div>
                  <span className="text-slate-400 block">Contact Phone</span>
                  <span className="font-medium text-slate-800">{selectedDonation.donorPhone}</span>
                </div>
              )}

              {selectedDonation.description && (
                <div>
                  <span className="text-slate-400 block">Your Note</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1 italic">
                    "{selectedDonation.description}"
                  </p>
                </div>
              )}

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-100">
                <span>Submitted: {new Date(selectedDonation.createdAt).toLocaleString()}</span>
                <span>ID: {selectedDonation._id.slice(-6)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 flex-wrap">
              {selectedDonation.ngo && (
                <button
                  onClick={() => {
                    setChatRecipient({
                      _id: selectedDonation.ngo?.user || selectedDonation.ngo?._id,
                      name: selectedDonation.ngo?.ngoName || 'NGO',
                      avatar: selectedDonation.ngo?.logo,
                      role: 'ngo'
                    });
                    setChatDonationId(selectedDonation._id);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer border-0 transition shadow-xs"
                >
                  💬 Chat with NGO
                </button>
              )}
              {selectedDonation.status === 'pending' && (
                <button
                  onClick={() => handleCancel(selectedDonation._id)}
                  disabled={cancellingId === selectedDonation._id}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer border-0 transition disabled:opacity-50"
                >
                  {cancellingId === selectedDonation._id ? 'Cancelling...' : 'Cancel Donation'}
                </button>
              )}
              <button
                onClick={() => setSelectedDonation(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer border-0 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {chatRecipient && (
        <ChatModal
          isOpen={Boolean(chatRecipient)}
          onClose={() => {
            setChatRecipient(null);
            setChatDonationId(null);
          }}
          recipient={chatRecipient}
          donationId={chatDonationId}
        />
      )}

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto?.url}
        name={previewPhoto?.name}
        subtitle={previewPhoto?.subtitle || 'Profile Photo'}
      />
    </div>
  );
}
