import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import ChatModal from '../../components/ChatModal';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

const filterTabs = [
  { id: '', label: 'All Requests' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'picked_up', label: 'Picked Up' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
];

const PICKUP_STATUS_OPTIONS = [
  { key: 'accepted', label: 'Accepted by NGO' },
  { key: 'agent_assigned', label: 'Pickup Agent Assigned' },
  { key: 'agent_on_the_way', label: 'Agent on the Way' },
  { key: 'agent_nearby', label: 'Agent Nearby (<5km)' },
  { key: 'agent_arrived', label: 'Agent Arrived' },
  { key: 'donation_collected', label: 'Donation Collected' },
  { key: 'completed', label: 'Pickup Completed' }
];

const VALID_PICKUP_TRANSITIONS = {
  accepted: ['agent_assigned', 'cancelled'],
  agent_assigned: ['agent_on_the_way', 'agent_nearby', 'agent_arrived', 'cancelled'],
  agent_on_the_way: ['agent_nearby', 'agent_arrived', 'cancelled'],
  agent_nearby: ['agent_arrived', 'cancelled'],
  agent_arrived: ['donation_collected', 'cancelled'],
  donation_collected: ['completed'],
  completed: [],
  cancelled: []
};

export default function NGODonationRequests() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [chatDonationId, setChatDonationId] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Agent Selection / Reassignment Modal State
  const [assignModalDonation, setAssignModalDonation] = useState(null);
  const [isChangingAgent, setIsChangingAgent] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [agentsList, setAgentsList] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // History Modal State
  const [historyModalDonation, setHistoryModalDonation] = useState(null);

  const fetchDonations = useCallback(() => {
    const params = new URLSearchParams();
    if (activeFilter) params.append('status', activeFilter);
    params.append('page', page);
    params.append('limit', '10');

    API.get(`/ngo/donation-requests?${params.toString()}`)
      .then(res => {
        setDonations(res.data.donations || []);
        setTotalPages(res.data.pages || 1);
        setTotalCount(res.data.total || 0);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load donation requests');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeFilter, page]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleFilterChange = (filterId) => {
    setLoading(true);
    setActiveFilter(filterId);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setLoading(true);
    setPage(newPage);
  };

  const handleRejectDonation = async (donationId) => {
    const confirmed = window.confirm('Are you sure you want to reject this donation offer?');
    if (!confirmed) return;

    setActionLoading(donationId);
    try {
      await API.put(`/donations/${donationId}/status`, { status: 'rejected' });
      setDonations(prev =>
        prev.map(d => (d._id === donationId ? { ...d, status: 'rejected' } : d))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject donation');
    } finally {
      setActionLoading(null);
    }
  };

  const openAssignModal = async (donation, isReassign = false) => {
    setAssignModalDonation(donation);
    setIsChangingAgent(isReassign);
    setChangeReason('');
    setSelectedAgentId(isReassign ? donation.assignedAgent?._id || '' : '');
    setAgentsLoading(true);

    try {
      const res = await API.get('/agents');
      if (res.data.success) {
        // Filter strictly active agents
        const activeOnly = (res.data.agents || []).filter(a => a.status === 'active');
        setAgentsList(activeOnly);
        if (activeOnly.length > 0 && !isReassign) {
          setSelectedAgentId(activeOnly[0]._id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load active pickup agents');
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedAgentId) {
      alert('Please select an active pickup agent');
      return;
    }

    if (isChangingAgent) {
      const confirmed = window.confirm('Are you sure you want to change the assigned pickup agent for this donation? The donor will be notified.');
      if (!confirmed) return;
    }

    setAssignSubmitting(true);
    try {
      const res = await API.post(`/donations/${assignModalDonation._id}/assign-agent`, {
        agentId: selectedAgentId,
        reason: changeReason
      });

      if (res.data.success) {
        const updated = res.data.donation;
        setDonations(prev =>
          prev.map(d => (d._id === assignModalDonation._id ? { ...d, ...updated } : d))
        );
        setAssignModalDonation(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign pickup agent');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handlePickupStatusChange = async (donationId, newPickupStatus) => {
    setActionLoading(donationId);
    try {
      const res = await API.patch(`/donations/${donationId}/pickup-status`, {
        pickupStatus: newPickupStatus
      });

      if (res.data.success) {
        setDonations(prev =>
          prev.map(d => {
            if (d._id === donationId) {
              return {
                ...d,
                pickupStatus: newPickupStatus,
                status: newPickupStatus === 'completed' ? 'completed' : d.status
              };
            }
            return d;
          })
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update pickup status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelivery = async (donationId) => {
    const confirmed = window.confirm('Verify that the donation parcel has been received at the NGO collection centre and all items are in order? This will mark the pickup order as Completed.');
    if (!confirmed) return;

    setActionLoading(donationId);
    try {
      const res = await API.post(`/donations/${donationId}/confirm-delivery`, {});
      if (res.data.success) {
        alert('Parcel delivery verified! Order marked as Pickup Completed.');
        setDonations(prev =>
          prev.map(d => {
            if (d._id === donationId) {
              return {
                ...d,
                pickupStatus: 'completed',
                status: 'completed'
              };
            }
            return d;
          })
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm parcel delivery');
    } finally {
      setActionLoading(null);
    }
  };

  const copyAgentLink = (donationId) => {
    const url = `${window.location.origin}/pickup/agent/${donationId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => alert(`Field Pickup Agent link copied!\n\n${url}\n\nSend this link to the pickup agent to track GPS live and confirm parcel collection.`))
        .catch(() => alert(`Share this link with your pickup agent: ${url}`));
    } else {
      alert(`Share this link with your pickup agent: ${url}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Pending</span>;
      case 'accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Accepted</span>;
      case 'pickup_scheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">Pickup Scheduled</span>;
      case 'picked_up':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Picked Up</span>;
      case 'received':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">Received at Center</span>;
      case 'distributed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">Distributed</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Completed</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">Rejected</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status ? status.replace(/_/g, ' ') : 'Pending'}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Donation Requests 📥</h1>
          <p className="text-slate-500 text-sm mt-1">Review donor contributions and manage verified pickup agent assignments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/ngo/agents"
            className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl hover:bg-emerald-100 transition no-underline flex items-center gap-1.5"
          >
            <span>🛵</span>
            <span>Manage Pickup Agents</span>
          </Link>
          <div className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs">
            Total: <span className="text-green-600 font-bold">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleFilterChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer border-0 whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-green-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500">Loading requests...</div>
      ) : donations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">📦</p>
          <h3 className="font-bold text-slate-800 text-base">No donation requests found</h3>
          <p className="text-slate-500 text-sm mt-1">
            {activeFilter ? `There are currently no donations with '${activeFilter}' status.` : 'You have not received any donation requests yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((don) => {
            const isExpanded = expandedId === don._id;
            const donorInitials = (don.donor?.name || 'D').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const agent = don.assignedAgent;

            return (
              <div key={don._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs transition hover:border-slate-300 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Left: Donor & Requirement Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {don.donor?.avatar ? (
                      <img
                        src={don.donor.avatar}
                        alt={don.donor.name}
                        onClick={() => setPreviewPhoto({ url: don.donor.avatar, name: don.donor.name, subtitle: 'Donor Profile Photo' })}
                        title="Click to view photo in medium size"
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-green-400 transition"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {donorInitials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {don.requirement?.title || 'Material Donation Request'}
                        </h3>
                        {getStatusBadge(don.status)}
                        {don.pickupStatus && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🛵 {don.pickupStatus.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mt-1">
                        👤 Donor: <span className="font-semibold text-slate-800">{don.donor?.name || 'Anonymous'}</span>
                        {don.donor?.email && <span className="text-slate-400"> • {don.donor.email}</span>}
                        {don.donor?.phone && <span className="text-slate-400"> • 📞 {don.donor.phone}</span>}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>📦 Quantity: <strong className="text-slate-700">{don.quantity} {don.requirement?.unit || 'items'}</strong></span>
                        <span>📍 {don.city || don.donor?.city || 'Location N/A'}</span>
                        <span>📅 {don.createdAt ? new Date(don.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : don._id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                    </button>

                    {don.donor && (
                      <button
                        onClick={() => {
                          setChatRecipient(don.donor);
                          setChatDonationId(don._id);
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg border-0 cursor-pointer transition shadow-xs"
                      >
                        💬 Chat
                      </button>
                    )}

                    {don.status === 'pending' && (
                      <>
                        <button
                          disabled={actionLoading === don._id}
                          onClick={() => openAssignModal(don, false)}
                          className="bg-green-600 hover:bg-green-700 text-white font-black text-xs px-4 py-2 rounded-xl border-0 cursor-pointer transition disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                        >
                          <span>Accept Order & Assign Agent ✓</span>
                        </button>
                        <button
                          disabled={actionLoading === don._id}
                          onClick={() => handleRejectDonation(don._id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-2 rounded-xl border-0 cursor-pointer transition disabled:opacity-50"
                        >
                          Reject ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Assigned Pickup Agent Card for Accepted/Active Donations */}
                {agent && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {agent.profilePhoto ? (
                        <img
                          src={agent.profilePhoto}
                          alt={agent.fullName}
                          onClick={() => setPreviewPhoto({ url: agent.profilePhoto, name: agent.fullName, subtitle: `Assigned Pickup Agent (${agent.agentId || 'Agent'})` })}
                          title="Click to view photo in medium size"
                          className="w-12 h-12 rounded-xl object-cover border border-emerald-300 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-200 text-emerald-900 font-black text-sm flex items-center justify-center border border-emerald-300">
                          {agent.fullName ? agent.fullName.slice(0, 2).toUpperCase() : 'AG'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-emerald-950">{agent.fullName}</p>
                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            {agent.agentId}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-900 mt-0.5">
                          🚗 {agent.vehicleType} ({agent.vehicleNumber}) • 📞 <a href={`tel:${agent.phone}`} className="font-bold underline">{agent.phone}</a>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Pickup status dropdown */}
                      <div className="flex items-center gap-1">
                        <label className="text-[11px] font-bold text-emerald-900">Status:</label>
                        {don.pickupStatus === 'completed' || don.status === 'completed' ? (
                          <span className="text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                            ✓ Completed
                          </span>
                        ) : (
                          <select
                            value={don.pickupStatus || 'accepted'}
                            disabled={actionLoading === don._id}
                            onChange={(e) => handlePickupStatusChange(don._id, e.target.value)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-900 focus:outline-emerald-600 cursor-pointer"
                          >
                            {PICKUP_STATUS_OPTIONS.map(opt => {
                              const curr = don.pickupStatus || 'accepted';
                              const allowed = VALID_PICKUP_TRANSITIONS[curr] || [];
                              const isSelectable = opt.key === curr || allowed.includes(opt.key);
                              return (
                                <option key={opt.key} value={opt.key} disabled={!isSelectable}>
                                  {opt.label} {!isSelectable && opt.key !== curr ? '(Locked)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>

                      {/* Confirm Delivery button when parcel has been collected (Requirements 8 & 9) */}
                      {don.pickupStatus === 'donation_collected' && (
                        <button
                          disabled={actionLoading === don._id}
                          onClick={() => handleConfirmDelivery(don._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-1.5 rounded-lg border-0 transition cursor-pointer shadow-xs flex items-center gap-1 animate-pulse"
                          title="Confirm that the parcel has safely arrived at the NGO center"
                        >
                          <span>🏢</span>
                          <span>Confirm Delivery ✓</span>
                        </button>
                      )}

                      {/* Link to live route map */}
                      <Link
                        to={`/donation/${don._id}/tracking`}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg no-underline transition flex items-center gap-1 shadow-2xs"
                        title="View Live GPS Route and Destination"
                      >
                        <span>🗺️</span>
                        <span>Live Map</span>
                      </Link>

                      {/* Copy Agent Link button */}
                      {don.status !== 'completed' && don.status !== 'cancelled' && (
                        <button
                          onClick={() => copyAgentLink(don._id)}
                          className="bg-white hover:bg-emerald-100 text-emerald-900 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 transition cursor-pointer flex items-center gap-1"
                          title="Copy GPS portal link to send to field agent"
                        >
                          <span>📋</span>
                          <span>Agent Link</span>
                        </button>
                      )}

                      {don.status !== 'completed' && don.status !== 'cancelled' && don.status !== 'rejected' && (
                        <button
                          onClick={() => openAssignModal(don, true)}
                          className="bg-white hover:bg-emerald-100 text-emerald-900 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-300 transition cursor-pointer"
                        >
                          Change Agent 🔄
                        </button>
                      )}

                      {don.assignmentHistory?.length > 0 && (
                        <button
                          onClick={() => setHistoryModalDonation(don)}
                          className="bg-white hover:bg-emerald-100 text-emerald-900 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-300 transition cursor-pointer"
                        >
                          History ({don.assignmentHistory.length}) 📜
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Expandable Details Row */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">📍 Full Pickup Address:</span>
                        <p className="text-slate-600">{don.pickupAddress || 'Address not provided'}, {don.city || ''}</p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">📋 Category & Need:</span>
                        <p className="text-slate-600">{don.requirement?.category || 'General'} ({don.requirement?.title})</p>
                      </div>

                      {don.assignedAt && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-0.5">🕒 Agent Assigned At:</span>
                          <p className="text-slate-600">{new Date(don.assignedAt).toLocaleString()}</p>
                        </div>
                      )}

                      {(don.clothesType || don.targetAgeGroup || don.size) && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-sky-800 block mb-0.5">👕 Clothes Details:</span>
                          <p className="text-slate-600">
                            Type: {don.clothesType || 'N/A'} • Age Group: {don.targetAgeGroup || 'N/A'} • Size: {don.size || 'N/A'}
                          </p>
                        </div>
                      )}

                      {(don.bookClass || don.bookType || don.bookName) && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-emerald-800 block mb-0.5">📚 Book Details:</span>
                          <p className="text-slate-600">
                            {don.bookName && <span>Name: <strong>{don.bookName}</strong> • </span>}
                            Class: {don.bookClass || 'N/A'} • Type: {don.bookType || 'N/A'}
                          </p>
                        </div>
                      )}

                      {don.foodType && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-amber-800 block mb-0.5">🍲 Food Items:</span>
                          <p className="text-slate-600">{don.foodType}</p>
                        </div>
                      )}

                      {don.electronicType && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-cyan-800 block mb-0.5">💻 Electronic Items:</span>
                          <p className="text-slate-600">{don.electronicType}</p>
                        </div>
                      )}

                      {don.medicineType && (
                        <div className="sm:col-span-2">
                          <span className="font-bold text-rose-800 block mb-0.5">💊 Medicine Items:</span>
                          <p className="text-slate-600">{don.medicineType}</p>
                        </div>
                      )}

                      {don.extraItems && (
                        <div className="sm:col-span-2 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                          <span className="font-bold text-purple-900 block mb-0.5">🎁 Extra Items Donated by Donor:</span>
                          <p className="text-purple-800 font-semibold">{don.extraItems}</p>
                        </div>
                      )}
                    </div>

                    {don.image && (
                      <div className="pt-2">
                        <span className="font-bold text-slate-700 text-xs block mb-1">Item Photo:</span>
                        <img src={don.image} alt="Donation Item" className="w-24 h-24 object-cover rounded-lg border border-slate-300" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Select / Change Pickup Agent Modal */}
      {assignModalDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isChangingAgent ? 'Change Assigned Pickup Agent' : 'Select Pickup Agent & Accept Order'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order Ref: <strong className="font-mono text-slate-800">{assignModalDonation._id.slice(-6).toUpperCase()}</strong> • Donor: <strong>{assignModalDonation.donor?.name || 'Anonymous'}</strong>
                </p>
              </div>
              <button
                onClick={() => setAssignModalDonation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            {agentsLoading ? (
              <div className="h-36 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">Loading active pickup agents...</p>
              </div>
            ) : agentsList.length === 0 ? (
              <div className="py-8 text-center space-y-3 bg-amber-50 p-6 rounded-2xl border border-amber-200">
                <p className="text-3xl">⚠️</p>
                <h4 className="text-sm font-black text-amber-900">No Active Pickup Agents Available</h4>
                <p className="text-xs text-amber-800 max-w-md mx-auto">
                  To accept this order, your NGO must have at least one active pickup agent registered in the system.
                </p>
                <div className="pt-2">
                  <Link
                    to="/ngo/agents"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition inline-block no-underline"
                  >
                    ➕ Register New Agent Now
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-600">
                  Select an authorized active agent for this collection:
                </p>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {agentsList.map(agent => {
                    const isSelected = selectedAgentId === agent._id;
                    const initials = agent.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <div
                        key={agent._id}
                        onClick={() => setSelectedAgentId(agent._id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {agent.profilePhoto ? (
                            <img
                              src={agent.profilePhoto}
                              alt={agent.fullName}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-200">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-black text-slate-900">{agent.fullName}</h5>
                              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                {agent.agentId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              🚗 {agent.vehicleType} ({agent.vehicleNumber}) • 📞 {agent.phone}
                            </p>
                          </div>
                        </div>

                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 border-emerald-600">
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isChangingAgent && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Reason for Changing Agent (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule conflict, assigned van for larger shipment"
                      value={changeReason}
                      onChange={e => setChangeReason(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-emerald-600"
                    />
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setAssignModalDonation(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!selectedAgentId || assignSubmitting}
                    onClick={handleConfirmAssignment}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
                  >
                    <span>{assignSubmitting ? 'Confirming...' : isChangingAgent ? 'Confirm Agent Change' : 'Confirm Agent & Accept Order'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment History Modal */}
      {historyModalDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Agent Assignment History</h3>
                <p className="text-xs text-slate-500">
                  Donation Ref: <strong className="font-mono text-slate-800">{historyModalDonation._id.slice(-6).toUpperCase()}</strong>
                </p>
              </div>
              <button
                onClick={() => setHistoryModalDonation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                <span className="text-[10px] font-black uppercase text-emerald-800">Current Assigned Agent</span>
                <p className="font-bold text-emerald-950 mt-0.5">
                  {historyModalDonation.assignedAgent?.fullName} ({historyModalDonation.assignedAgentId})
                </p>
                <p className="text-[11px] text-emerald-700">
                  Assigned on: {historyModalDonation.assignedAt ? new Date(historyModalDonation.assignedAt).toLocaleString() : 'N/A'}
                </p>
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous Assignments</p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {historyModalDonation.assignmentHistory?.map((h, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900">{h.agentName || 'Agent'}</strong>
                      <span className="font-mono text-[10px] text-slate-500">{h.agentId}</span>
                    </div>
                    {h.reason && <p className="text-[11px] text-slate-600 italic">"{h.reason}"</p>}
                    <p className="text-[10px] text-slate-400">
                      Replaced at: {new Date(h.changedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setHistoryModalDonation(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
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
