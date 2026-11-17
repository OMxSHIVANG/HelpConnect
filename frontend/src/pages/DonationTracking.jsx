import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import PickupTrackingMap from '../components/PickupTrackingMap';
import { getSocket } from '../services/socket';

const STAGES = [
  { key: 'pending', label: 'Offer Submitted', icon: '📝' },
  { key: 'accepted', label: 'Accepted by NGO', icon: '✓' },
  { key: 'pickup_scheduled', label: 'Pickup Scheduled', icon: '📅' },
  { key: 'picked_up', label: 'Picked Up', icon: '🚗' },
  { key: 'received', label: 'Received at Facility', icon: '🏢' },
  { key: 'distributed', label: 'Distributed to People', icon: '🎁' },
  { key: 'completed', label: 'Verified Complete', icon: '🎖️' }
];

const PICKUP_TIMELINE_STAGES = [
  { key: 'accepted', label: 'Accepted by NGO', icon: '🏢' },
  { key: 'agent_assigned', label: 'Agent Assigned', icon: '🛵' },
  { key: 'agent_on_the_way', label: 'Agent on the Way', icon: '🚚' },
  { key: 'agent_nearby', label: 'Agent Nearby (<5km)', icon: '⚡' },
  { key: 'agent_arrived', label: 'Agent Arrived', icon: '📍' },
  { key: 'donation_collected', label: 'Donation Collected', icon: '📦' },
  { key: 'completed', label: 'Pickup Completed', icon: '🎉' }
];

export default function DonationTracking() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTimeline = (isBackground = false) => {
      API.get(`/donations/${id}/timeline`)
        .then(res => {
          if (isMounted && res.data.success) {
            setData(res.data);
          }
        })
        .catch(err => {
          if (isMounted && !isBackground) {
            setError(err.response?.data?.message || 'Failed to load donation timeline');
          }
        })
        .finally(() => {
          if (isMounted && !isBackground) setLoading(false);
        });
    };

    // Initial load
    fetchTimeline(false);

    // Fallback polling helpers (single interval guarantee)
    const startFallbackPolling = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (isMounted) fetchTimeline(true);
      }, 5000);
    };

    const stopFallbackPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    // Authenticated socket integration
    const socket = getSocket();
    if (!socket) {
      startFallbackPolling();
      return () => {
        isMounted = false;
        stopFallbackPolling();
      };
    }

    const handleConnect = () => {
      if (!isMounted) return;
      setIsSocketConnected(true);
      stopFallbackPolling();
      socket.emit('join:donation', { donationId: id }, (ack) => {
        if (ack?.success) {
          fetchTimeline(true);
        }
      });
    };

    const handleDisconnect = () => {
      if (!isMounted) return;
      setIsSocketConnected(false);
      startFallbackPolling();
    };

    const handleLocationUpdate = (payload) => {
      if (!isMounted || !payload) return;
      setData(prev => {
        if (!prev) return prev;
        const updatedDonation = {
          ...prev.donation,
          agentLocation: payload.agentLocation,
          pickupStatus: payload.pickupStatus || prev.donation?.pickupStatus
        };
        return {
          ...prev,
          donation: updatedDonation,
          distanceKm: payload.currentDistanceKm ?? prev.distanceKm,
          distanceDetails: payload.distanceDetails || prev.distanceDetails
        };
      });
    };

    const handlePickupStatus = (payload) => {
      if (!isMounted || !payload) return;
      setData(prev => {
        if (!prev) return prev;
        const updatedDonation = {
          ...prev.donation,
          pickupStatus: payload.pickupStatus || prev.donation?.pickupStatus,
          status: payload.status || prev.donation?.status,
          pickupTimeline: payload.timeline || prev.donation?.pickupTimeline,
          agentLocation: payload.agentLocation || prev.donation?.agentLocation,
          assignedAgent: payload.assignedAgent || prev.donation?.assignedAgent
        };
        return {
          ...prev,
          donation: updatedDonation
        };
      });
    };

    const handleCollected = () => {
      if (!isMounted) return;
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          donation: {
            ...prev.donation,
            pickupStatus: 'donation_collected',
            status: 'picked_up'
          }
        };
      });
    };

    const handleReceived = () => {
      if (!isMounted) return;
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          donation: {
            ...prev.donation,
            status: 'received'
          }
        };
      });
    };

    const handleCompleted = () => {
      if (!isMounted) return;
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          donation: {
            ...prev.donation,
            pickupStatus: 'completed',
            status: 'completed'
          }
        };
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('agent:location:update', handleLocationUpdate);
    socket.on('donation:pickup:status', handlePickupStatus);
    socket.on('donation:collected', handleCollected);
    socket.on('donation:received', handleReceived);
    socket.on('donation:completed', handleCompleted);

    if (socket.connected) {
      handleConnect();
    } else {
      startFallbackPolling();
    }

    return () => {
      isMounted = false;
      stopFallbackPolling();
      socket.emit('leave:donation', { donationId: id });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('agent:location:update', handleLocationUpdate);
      socket.off('donation:pickup:status', handlePickupStatus);
      socket.off('donation:collected', handleCollected);
      socket.off('donation:received', handleReceived);
      socket.off('donation:completed', handleCompleted);
    };
  }, [id]);

  const loadReceipt = () => {
    if (receipt) {
      setShowReceiptModal(true);
      return;
    }
    API.get(`/donations/${id}/receipt`)
      .then(res => {
        if (res.data.success) {
          setReceipt(res.data.receipt);
          setShowReceiptModal(true);
        }
      })
      .catch(err => alert(err.response?.data?.message || 'Could not load receipt'));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto my-24 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading verified donation journey...</p>
      </div>
    );
  }

  if (error || !data) {
    const isAuthError = typeof error === 'string' && (error.toLowerCase().includes('not authorized') || error.toLowerCase().includes('token') || error.toLowerCase().includes('session'));
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-red-50 text-red-700 rounded-3xl border border-red-200 text-center space-y-3">
        <p className="font-extrabold text-sm">{error || 'Donation journey not found'}</p>
        <p className="text-xs text-red-600">
          {isAuthError
            ? 'Please ensure you are logged into the account associated with this donation.'
            : 'The requested donation record could not be found or has been archived.'}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          {isAuthError ? (
            <Link to="/login" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition no-underline">
              Log In to Continue
            </Link>
          ) : (
            <Link to="/donor/pickups" className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl transition no-underline">
              ← Return to Pickups
            </Link>
          )}
          <Link to="/donor/donations" className="text-xs font-semibold text-emerald-700 underline">
            My Donations
          </Link>
        </div>
      </div>
    );
  }

  const { donation, ngo, requirement, timeline = [] } = data;
  const currentStatus = donation.status;

  // Determine current stage index in pipeline
  const currentStageIdx = STAGES.findIndex(s => s.key === currentStatus);
  const currentPickupStageIdx = Math.max(0, PICKUP_TIMELINE_STAGES.findIndex(s => s.key === (donation.pickupStatus || 'accepted')));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/donor/donations" className="hover:text-emerald-700 no-underline">My Donations</Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">Verification & Audit #{donation.verificationCode || donation._id.slice(-6)}</span>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-extrabold uppercase bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                Verified Delivery Pipeline
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                isSocketConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isSocketConnected ? 'Socket.IO Real-Time' : 'Polling Fallback'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">{requirement?.title || 'Material Donation'}</h1>
            <p className="text-xs text-slate-500">
              Targeted to: <strong>{ngo?.ngoName}</strong> • Quantity: <strong>{donation.quantity} {requirement?.unit || 'items'}</strong>
            </p>
          </div>

          {/* Verification Code Box & QR representation */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 text-center shrink-0 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Verification Handover Code</p>
            <p className="text-xl font-black font-mono tracking-widest text-emerald-400">
              {donation.verificationCode || 'HC-VERIFIED'}
            </p>
            <p className="text-[9px] text-slate-400">Present to NGO agent upon pickup</p>
          </div>
        </div>

        {/* Multi-Stage Visual Pipeline */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit Status Pipeline</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
            {STAGES.map((st, idx) => {
              const isPast = idx <= currentStageIdx;
              const isCurrent = idx === currentStageIdx;

              return (
                <div
                  key={st.key}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[90px] ${
                    isCurrent
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                      : isPast
                      ? 'bg-white border-emerald-300 text-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="text-xl mb-1">{st.icon}</span>
                  <p className="text-[11px] leading-tight font-bold">{st.label}</p>
                  <span className="text-[9px] uppercase font-bold mt-1">
                    {isCurrent ? 'Active Now' : isPast ? '✓ Done' : 'Upcoming'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions bar: Receipt button */}
        <div className="flex justify-end pt-2 border-t border-slate-100 gap-2 flex-wrap">
          <button
            onClick={loadReceipt}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <span>📜</span>
            <span>View Official Donation Receipt</span>
          </button>
        </div>
      </div>

      {/* Your Assigned Pickup Agent Section */}
      {donation.assignedAgent && (
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-emerald-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/80 pb-4">
            <div>
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-400/30 inline-block mb-1">
                🛵 Authorized Logistics Handover
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">Your Assigned Pickup Agent</h2>
              <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-xl">
                Your donation request has been accepted by the NGO. The following pickup agent has been assigned to collect your donation.
              </p>
            </div>
            <div className="bg-emerald-800/60 border border-emerald-700 p-3 rounded-2xl text-center shrink-0">
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Pickup Status</p>
              <p className="text-sm font-black text-emerald-200 uppercase mt-0.5">
                {(donation.pickupStatus || 'agent_assigned').replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Agent Card Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-4 md:col-span-2">
              {donation.assignedAgent.profilePhoto ? (
                <img
                  src={donation.assignedAgent.profilePhoto}
                  alt={donation.assignedAgent.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-700 text-emerald-100 font-black text-2xl flex items-center justify-center border-2 border-emerald-400 shrink-0">
                  {donation.assignedAgent.fullName ? donation.assignedAgent.fullName.slice(0, 2).toUpperCase() : 'AG'}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-white">{donation.assignedAgent.fullName}</h3>
                  <span className="font-mono text-xs font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-md shadow-2xs">
                    {donation.assignedAgent.agentId || donation.assignedAgentId}
                  </span>
                </div>
                <p className="text-xs text-emerald-200">
                  Authorized by: <strong>{ngo?.ngoName || 'Partner NGO'}</strong>
                </p>
                <p className="text-xs text-emerald-100 flex items-center gap-2">
                  <span>🚗 Vehicle: <strong>{donation.assignedAgent.vehicleType} ({donation.assignedAgent.vehicleNumber})</strong></span>
                </p>
                {donation.assignedAgent.phone && (
                  <p className="text-xs text-emerald-200">
                    📞 Contact: <a href={`tel:${donation.assignedAgent.phone}`} className="font-black text-emerald-300 underline">{donation.assignedAgent.phone}</a>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800 text-xs space-y-1.5">
              <p className="flex justify-between text-emerald-300">
                <span>Order ID:</span>
                <strong className="font-mono text-white">{donation._id.slice(-8).toUpperCase()}</strong>
              </p>
              <p className="flex justify-between text-emerald-300">
                <span>Assigned At:</span>
                <strong className="text-white">
                  {donation.assignedAt ? new Date(donation.assignedAt).toLocaleDateString() : 'Confirmed'}
                </strong>
              </p>
              <p className="flex justify-between text-emerald-300">
                <span>Verification Code:</span>
                <strong className="font-mono text-emerald-400 font-black">{donation.verificationCode || 'HC-VERIFIED'}</strong>
              </p>
            </div>
          </div>

          {/* Pickup Status Timeline */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Pickup Progress Timeline</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {PICKUP_TIMELINE_STAGES.map((st, idx) => {
                const isDone = idx <= currentPickupStageIdx;
                const isCurrent = idx === currentPickupStageIdx;
                return (
                  <div
                    key={st.key}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[75px] ${
                      isCurrent
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md border-white'
                        : isDone
                        ? 'bg-emerald-800/80 text-white border-emerald-600'
                        : 'bg-emerald-950/40 text-emerald-400/60 border-emerald-900'
                    }`}
                  >
                    <span className="text-lg">{st.icon}</span>
                    <p className="text-[10px] leading-tight font-extrabold">{st.label}</p>
                    <span className="text-[8px] uppercase font-black">
                      {isCurrent ? 'Active Now' : isDone ? '✓ Completed' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Reassignment Notice */}
          {donation.assignmentHistory?.length > 0 && (
            <div className="p-3 bg-emerald-800/40 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                Notice: The pickup agent assignment was updated by {ngo?.ngoName || 'the NGO'} on{' '}
                {new Date(donation.assignmentHistory[donation.assignmentHistory.length - 1].changedAt).toLocaleString()}.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Live Pickup & Delivery Tracking Map */}
      {(data.pickup || data.ngoLocation || donation.pickupAddress) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>🗺️</span>
                <span>Live Pickup & Delivery Route Tracking</span>
              </h2>
              <p className="text-xs text-slate-500">
                Track pickup collection point, NGO destination center, and real-time transit status.
              </p>
            </div>
            {data.distanceDetails ? (
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
                  {data.distanceDetails.distanceLabel}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {data.distanceDetails.straightLineLabel}
                </span>
              </div>
            ) : data.distanceKm != null ? (
              <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full self-start sm:self-auto">
                Estimated Distance: ~{data.distanceKm} KM
              </span>
            ) : null}
          </div>

          <PickupTrackingMap
            mode="route"
            pickup={data.pickup ? {
              ...data.pickup,
              pickupAddress: data.pickup.pickupAddress || donation.pickupAddress,
              city: data.pickup.city || donation.city || data.donor?.city || '',
              latitude: data.pickup.latitude || donation.pickupLocation?.latitude,
              longitude: data.pickup.longitude || donation.pickupLocation?.longitude,
              coordinates: data.pickup.coordinates || donation.pickupLocation?.coordinates,
              isVerified: donation.pickupLocation?.verificationStatus !== 'unverified'
            } : {
              pickupAddress: donation.pickupAddress,
              city: donation.city || data.donor?.city || '',
              latitude: donation.pickupLocation?.latitude,
              longitude: donation.pickupLocation?.longitude,
              coordinates: donation.pickupLocation?.coordinates,
              status: donation.status,
              isVerified: donation.pickupLocation?.verificationStatus !== 'unverified'
            }}
            ngoLocation={data.ngoLocation || {
              ngoName: ngo?.ngoName,
              address: ngo?.address,
              city: ngo?.city,
              latitude: ngo?.location?.latitude,
              longitude: ngo?.location?.longitude,
              coordinates: ngo?.location?.coordinates
            }}
            agentLocation={donation.agentLocation ? {
              ...donation.agentLocation,
              fullName: donation.assignedAgent?.fullName || 'Assigned Pickup Agent',
              vehicleType: donation.assignedAgent?.vehicleType || 'Bike',
              agentId: donation.assignedAgent?.agentId
            } : null}
            distanceKm={donation.trackingSession?.distanceToDonorKm != null ? donation.trackingSession.distanceToDonorKm : data.distanceKm}
            distanceDetails={data.distanceDetails}
            height="380px"
          />

          {donation.agentLocation?.latitude && donation.pickupStatus !== 'completed' && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-900 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                <span>
                  <strong>Live GPS Tracking Active:</strong> {donation.assignedAgent?.fullName || 'Agent'} is{' '}
                  <strong>{donation.trackingSession?.distanceToDonorKm != null ? `${donation.trackingSession.distanceToDonorKm} km` : 'en route'}</strong> from your pickup address.
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                Updated {new Date(donation.agentLocation.updatedAt).toLocaleTimeString()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-400">Pickup Origin (Donor Location)</p>
              <p className="font-bold text-slate-800 mt-0.5">{data.pickup?.pickupAddress || donation.pickupAddress || 'Address on file'}</p>
              <p className="text-slate-500">{data.pickup?.city || donation.city || data.donor?.city || ''}</p>
              {data.pickup?.contactPhone && (
                <p className="text-emerald-700 font-semibold mt-1">Contact: {data.pickup.contactPhone}</p>
              )}
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-400">Delivery Hub (NGO Center)</p>
              <p className="font-bold text-slate-800 mt-0.5">{ngo?.ngoName}</p>
              <p className="text-slate-500">{ngo?.address ? `${ngo.address}, ` : ''}{ngo?.city || ''}</p>
              {ngo?.phone && (
                <p className="text-blue-700 font-semibold mt-1">Center Phone: {ngo.phone}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Distribution Evidence Photos if present */}
      {donation.evidenceImages?.length > 0 && (
        <div className="bg-emerald-50/50 rounded-3xl border border-emerald-200 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📸</span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Verified Distribution Evidence</h3>
              <p className="text-xs text-slate-600">Photographic proof uploaded by the NGO verifying physical handover to beneficiaries.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {donation.evidenceImages.map((img, idx) => (
              <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block group">
                <img src={img} alt="Evidence" className="h-32 w-full object-cover rounded-xl border border-emerald-200 shadow-2xs group-hover:scale-102 transition" />
              </a>
            ))}
          </div>

          {donation.distributionNotes && (
            <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-emerald-100 italic">
              &quot;{donation.distributionNotes}&quot;
            </p>
          )}
        </div>
      )}

      {/* Immutable Audit Log History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <span>🔒 Immutable Audit Log & Journey</span>
        </h3>
        <p className="text-xs text-slate-500">
          Cryptographically recorded timeline entries ensuring complete transparency.
        </p>

        <div className="divide-y divide-slate-100 pt-2">
          {timeline.map((entry, idx) => (
            <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    {entry.action.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    by {entry.performerRole?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{entry.notes || 'Status confirmed'}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 border border-slate-200 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
            >
              ✕
            </button>
            <div className="border-b border-slate-200 pb-4 text-center">
              <span className="text-2xl">🤝</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">Official Donation Receipt</h2>
              <p className="text-[11px] font-mono text-slate-400">{receipt.receiptNumber}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Donor</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{receipt.donor?.name}</p>
                  <p className="text-slate-500">{receipt.donor?.city || 'India'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Recipient NGO</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{receipt.ngo?.name}</p>
                  <p className="text-slate-500">Reg: {receipt.ngo?.registrationNumber}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 uppercase text-[10px] mb-1">Itemized Contributions</p>
                {receipt.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-[11px] text-slate-500">{item.category}</p>
                    </div>
                    <span className="font-extrabold text-emerald-700">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-emerald-950 font-mono text-[10px] break-all">
                Verification Hash: {receipt.verificationHash}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer"
            >
              🖨️ Print / Save Official Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
