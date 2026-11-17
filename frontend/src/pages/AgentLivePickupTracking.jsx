import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import PickupTrackingMap from '../components/PickupTrackingMap';
import { getSocket } from '../services/socket';

const PICKUP_STAGES = [
  { key: 'accepted', label: 'Order Accepted', icon: '🏢' },
  { key: 'agent_assigned', label: 'Agent Assigned', icon: '🛵' },
  { key: 'agent_on_the_way', label: 'On The Way (50%)', icon: '🚚' },
  { key: 'agent_nearby', label: 'Nearby (<5km)', icon: '⚡' },
  { key: 'agent_arrived', label: 'Arrived (<200m)', icon: '📍' },
  { key: 'donation_collected', label: 'Donation Collected', icon: '📦' },
  { key: 'completed', label: 'Pickup Completed', icon: '🎉' }
];

export default function AgentLivePickupTracking() {
  const { id } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState('');
  const [agentIdInput, setAgentIdInput] = useState('');
  const [isAgentInactive, setIsAgentInactive] = useState(false);

  const watchIdRef = useRef(null);
  const agentInactiveRef = useRef(false);
  const agentIdRef = useRef('');

  useEffect(() => {
    agentInactiveRef.current = isAgentInactive;
  }, [isAgentInactive]);

  useEffect(() => {
    agentIdRef.current = agentIdInput;
  }, [agentIdInput]);

  const fetchTrackingData = useCallback(async (isBackground = false) => {
    try {
      const res = await API.get(`/donations/${id}/live-tracking`);
      if (res.data.success) {
        setTrackingData(res.data);
        const inactive = res.data.assignedAgent?.status === 'inactive';
        setIsAgentInactive(inactive);
        agentInactiveRef.current = inactive;
        if (res.data.assignedAgent?.agentId && !agentIdRef.current) {
          setAgentIdInput(res.data.assignedAgent.agentId);
          agentIdRef.current = res.data.assignedAgent.agentId;
        }
        setNetworkError(false);
      }
    } catch (err) {
      if (!err.response) {
        setNetworkError(true);
      } else if (!isBackground) {
        setError(err.response?.data?.message || 'Failed to load tracking data');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [id]);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Initial fetch to load page state
    const loadInitialState = async () => {
      try {
        const res = await API.get(`/donations/${id}/live-tracking`);
        if (isMounted && res.data.success) {
          setTrackingData(res.data);
          const inactive = res.data.assignedAgent?.status === 'inactive';
          setIsAgentInactive(inactive);
          agentInactiveRef.current = inactive;
          if (res.data.assignedAgent?.agentId && !agentIdRef.current) {
            setAgentIdInput(res.data.assignedAgent.agentId);
            agentIdRef.current = res.data.assignedAgent.agentId;
          }
          setNetworkError(false);
        }
      } catch (err) {
        if (isMounted) {
          if (!err.response) {
            setNetworkError(true);
          } else {
            setError(err.response?.data?.message || 'Failed to load tracking data');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialState();

    // Helper to start fallback polling (ensures no duplicate intervals)
    const startFallbackPolling = () => {
      if (pollTimerRef.current) return;
      pollTimerRef.current = setInterval(() => {
        if (isMounted) fetchTrackingData(true);
      }, 5000);
    };

    // Helper to stop fallback polling when socket is actively receiving events
    const stopFallbackPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    // Initialize authenticated socket
    const socket = getSocket({ preferAgent: true });

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
          fetchTrackingData(true);
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
      setLastSyncTime(new Date());
      setTrackingData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          agentLocation: payload.agentLocation || prev.agentLocation,
          currentDistanceKm: payload.currentDistanceKm != null ? payload.currentDistanceKm : prev.currentDistanceKm,
          distanceDetails: payload.distanceDetails || prev.distanceDetails,
          pickupStatus: payload.pickupStatus || prev.pickupStatus
        };
      });
    };

    const handlePickupStatus = (payload) => {
      if (!isMounted || !payload) return;
      setTrackingData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pickupStatus: payload.pickupStatus || prev.pickupStatus,
          status: payload.status || prev.status,
          pickupTimeline: payload.timeline || prev.pickupTimeline,
          agentLocation: payload.agentLocation || prev.agentLocation,
          assignedAgent: payload.assignedAgent || prev.assignedAgent
        };
      });
    };

    const handleCollected = () => {
      if (!isMounted) return;
      setTrackingData(prev => prev ? { ...prev, pickupStatus: 'donation_collected', status: 'picked_up' } : prev);
    };

    const handleCompleted = () => {
      if (!isMounted) return;
      setTrackingData(prev => prev ? { ...prev, pickupStatus: 'completed', status: 'received' } : prev);
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('agent:location:update', handleLocationUpdate);
    socket.on('donation:pickup:status', handlePickupStatus);
    socket.on('donation:collected', handleCollected);
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
      socket.off('donation:completed', handleCompleted);
    };
  }, [id, fetchTrackingData]);

  // Sync GPS location to backend
  const syncLocationToBackend = async (lat, lng, acc, spd, head) => {
    if (agentInactiveRef.current) return;
    setSyncing(true);
    try {
      setNetworkError(false);
      const payload = {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        speed: spd,
        heading: head,
        agentId: agentIdRef.current,
        timestamp: new Date().toISOString()
      };

      const res = await API.post(`/donations/${id}/live-location`, payload, {
        headers: { 'X-Use-Agent-Token': 'true' }
      });
      if (res.data.success) {
        setLastSyncTime(new Date());
        setTrackingData(prev => prev ? {
          ...prev,
          pickupStatus: res.data.pickupStatus,
          currentDistanceKm: res.data.currentDistanceKm,
          agentLocation: res.data.agentLocation,
          pickupTimeline: res.data.pickupTimeline || prev.pickupTimeline
        } : prev);
      }
    } catch (err) {
      if (!err.response) {
        setNetworkError(true);
      } else if (err.response?.data?.message?.includes('deactivated')) {
        setIsAgentInactive(true);
        agentInactiveRef.current = true;
      }
    } finally {
      setSyncing(false);
    }
  };

  // Start live GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsPermissionDenied(false);
    setGpsError('');

    const options = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    };

    const handleSuccess = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const acc = position.coords.accuracy;
      const spd = position.coords.speed != null ? Math.max(0, position.coords.speed * 3.6) : 0; // km/h
      const head = position.coords.heading;

      setCurrentCoords({ latitude: lat, longitude: lng });
      setAccuracy(acc);
      setSpeed(spd);
      setGpsActive(true);
      setGpsError('');

      syncLocationToBackend(lat, lng, acc, spd, head);
    };

    const handleError = (error) => {
      if (error.code === 1) { // PERMISSION_DENIED
        setGpsPermissionDenied(true);
        setGpsActive(false);
        setGpsError('Location permission denied. Please allow location access in your browser or phone settings.');
      } else if (error.code === 2) {
        setGpsError('Location unavailable. Please check GPS signal.');
      } else {
        setGpsError('GPS request timed out. Retrying...');
      }
    };

    // First immediate position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
  };

  const stopTracking = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsActive(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Simulate movement closer to donor (for testing or when stationary)
  const handleSimulateStep = (fractionRemaining = 0.5) => {
    const donorLat = trackingData?.donorDestination?.latitude;
    const donorLng = trackingData?.donorDestination?.longitude;
    if (!donorLat || !donorLng) return;

    const startLat = currentCoords?.latitude || trackingData?.agentLocation?.latitude || (donorLat + 0.08);
    const startLng = currentCoords?.longitude || trackingData?.agentLocation?.longitude || (donorLng + 0.08);

    const newLat = donorLat + (startLat - donorLat) * fractionRemaining;
    const newLng = donorLng + (startLng - donorLng) * fractionRemaining;

    setCurrentCoords({ latitude: newLat, longitude: newLng });
    setGpsActive(true);
    syncLocationToBackend(newLat, newLng, 10, 30, 90);
  };

  // Confirm Collection (Requirement 7)
  const handleConfirmCollection = async () => {
    if (isAgentInactive) {
      alert('Your agent account is currently deactivated. Please contact the NGO.');
      return;
    }

    const otp = window.prompt('Enter the Donor Verification OTP to confirm handover (e.g. HC-7X9K2P or 7X9K2P):');
    if (!otp || !otp.trim()) {
      alert('Donor verification OTP is required to confirm collection.');
      return;
    }

    setCollectionSubmitting(true);
    try {
      const res = await API.post(`/donations/${id}/confirm-collection`, {
        otp: otp.trim(),
        agentId: agentIdInput || trackingData?.assignedAgent?.agentId,
        notes: collectionNotes
      }, {
        headers: { 'X-Use-Agent-Token': 'true' }
      });

      if (res.data.success) {
        alert('Parcel collection confirmed successfully with verified OTP!');
        fetchTrackingData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm collection');
    } finally {
      setCollectionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-bold text-sm">Initializing Live Logistics Portal...</p>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-red-50 text-red-700 rounded-3xl border border-red-200 text-center space-y-4">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-lg font-black text-red-900">Tracking Portal Error</h2>
        <p className="text-xs">{error || 'Donation tracking data could not be found'}</p>
        <Link to="/" className="inline-block text-xs font-bold text-emerald-800 underline">
          Return to HelpConnect Home
        </Link>
      </div>
    );
  }

  const currentPickupStatus = trackingData.pickupStatus || 'accepted';
  const currentStageIdx = Math.max(0, PICKUP_STAGES.findIndex(s => s.key === currentPickupStatus));
  const isCollected = ['donation_collected', 'completed'].includes(currentPickupStatus);
  const isCompleted = currentPickupStatus === 'completed';

  const mapAgentLocation = currentCoords ? {
    latitude: currentCoords.latitude,
    longitude: currentCoords.longitude,
    speed,
    accuracy,
    updatedAt: lastSyncTime,
    fullName: trackingData.assignedAgent?.fullName || 'Assigned Agent',
    vehicleType: trackingData.assignedAgent?.vehicleType || 'Bike',
    agentId: trackingData.assignedAgent?.agentId
  } : (trackingData.agentLocation ? {
    ...trackingData.agentLocation,
    fullName: trackingData.assignedAgent?.fullName || 'Assigned Agent',
    vehicleType: trackingData.assignedAgent?.vehicleType || 'Bike',
    agentId: trackingData.assignedAgent?.agentId
  } : null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="bg-emerald-500/30 text-emerald-200 text-[11px] font-black uppercase px-3 py-1 rounded-full border border-emerald-400/30 inline-block">
                🛵 Field Pickup Agent Portal
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                isSocketConnected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isSocketConnected ? 'Socket.IO Real-Time' : 'Polling Fallback'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Live Pickup & GPS Tracking
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1">
              Order Ref: <strong className="font-mono text-white">#{id.slice(-6).toUpperCase()}</strong> • Handover for {trackingData.ngoDestination?.ngoName}
            </p>
          </div>

          <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-2xl text-center shrink-0">
            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Current Status</p>
            <p className="text-sm font-black text-white uppercase mt-0.5">
              {currentPickupStatus.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Inactive Agent Warning (Requirement 14) */}
        {isAgentInactive && (
          <div className="p-4 bg-red-950/80 border border-red-500 rounded-2xl text-red-200 text-xs flex items-center gap-3">
            <span className="text-xl">🛑</span>
            <div>
              <p className="font-extrabold text-white text-sm">Agent Account Inactive</p>
              <p className="mt-0.5">This pickup agent account has been deactivated by the NGO administrator. Live location broadcasting and parcel collection confirmations are disabled.</p>
            </div>
          </div>
        )}

        {/* Network Error Alert (Requirement 14) */}
        {networkError && (
          <div className="p-3 bg-amber-950/80 border border-amber-500 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="animate-spin">🔄</span>
              <span>Network connectivity drop detected. Offline retry active; will sync once reconnected.</span>
            </div>
            <button
              onClick={fetchTrackingData}
              className="text-[10px] font-black bg-amber-600 text-white px-2 py-1 rounded-lg border-0 cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* GPS Permission Denied Alert (Requirement 14) */}
        {gpsPermissionDenied && (
          <div className="p-4 bg-red-950/80 border border-red-400 rounded-2xl text-red-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <span>⚠️</span>
              <span>GPS Permission Denied</span>
            </div>
            <p className="leading-relaxed">
              Your browser or mobile operating system blocked location permissions. To allow automatic live tracking, please tap the lock/site settings icon in your browser address bar and set <strong>Location</strong> to <strong>Allow</strong>, then tap Retry below.
            </p>
            <button
              onClick={startTracking}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl border-0 cursor-pointer transition shadow-xs"
            >
              Retry Granting GPS Access
            </button>
          </div>
        )}

        {/* Status Pipeline */}
        <div className="pt-2">
          <p className="text-[10px] uppercase font-extrabold text-emerald-300 tracking-wider mb-2">Automated Trip Pipeline</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {PICKUP_STAGES.map((st, idx) => {
              const isDone = idx <= currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              return (
                <div
                  key={st.key}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-between min-h-[75px] ${
                    isCurrent
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-lg border-white ring-2 ring-emerald-300/40'
                      : isDone
                      ? 'bg-emerald-800/80 text-white border-emerald-600'
                      : 'bg-emerald-950/40 text-emerald-400/50 border-emerald-900'
                  }`}
                >
                  <span className="text-lg">{st.icon}</span>
                  <p className="text-[10px] font-black leading-tight mt-1">{st.label}</p>
                  <span className="text-[8px] uppercase font-extrabold mt-1">
                    {isCurrent ? 'Active Now' : isDone ? '✓ Passed' : 'Upcoming'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* GPS Broadcasting Controls & Live Stats */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📡</span>
              <span>Live GPS Broadcast Engine</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Broadcasts your live vehicle coordinates to automatically update delivery milestones.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {!gpsActive ? (
              <button
                disabled={isAgentInactive || isCompleted}
                onClick={startTracking}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md transition cursor-pointer border-0 disabled:opacity-50 flex items-center gap-2"
              >
                <span>🛰️</span>
                <span>Start Live GPS Tracking</span>
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md transition cursor-pointer border-0 flex items-center gap-2"
              >
                <span>🛑</span>
                <span>Stop GPS Tracking</span>
              </button>
            )}

            {syncing && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-pulse">
                Syncing GPS...
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Telemetry Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Broadcast Status</p>
            <p className="text-sm font-black mt-1 flex items-center justify-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${gpsActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span className={gpsActive ? 'text-emerald-700' : 'text-slate-600'}>
                {gpsActive ? 'Active 🟢' : 'Standby ⚪'}
              </span>
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Distance To Donor</p>
            <p className="text-sm font-black text-blue-700 mt-1">
              {trackingData.distanceDetails?.distanceLabel
                ? trackingData.distanceDetails.distanceLabel
                : (trackingData.currentDistanceKm != null ? `~${trackingData.currentDistanceKm} KM` : (trackingData.donorDestination?.isVerified === false ? 'Location Unverified' : 'Calculating...'))}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Live Speed</p>
            <p className="text-sm font-black text-slate-800 mt-1">
              {Math.round(speed)} km/h
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Last Synced</p>
            <p className="text-xs font-bold text-slate-600 mt-1">
              {lastSyncTime ? lastSyncTime.toLocaleTimeString() : (trackingData.agentLocation?.updatedAt ? new Date(trackingData.agentLocation.updatedAt).toLocaleTimeString() : 'Awaiting signal')}
            </p>
          </div>
        </div>

        {gpsError && (
          <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            ⚠️ {gpsError}
          </p>
        )}

        {/* Development / Testing Simulator Controls */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">
              🛠️ Field Simulation Control (Test milestone threshold triggers)
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Use when stationary to test automated triggers</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleSimulateStep(0.5)}
              className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              Move 50% Closer (Triggers Agent On The Way)
            </button>
            <button
              onClick={() => handleSimulateStep(0.25)}
              className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              Move to &lt;5 KM (Triggers Agent Nearby)
            </button>
            <button
              onClick={() => handleSimulateStep(0.01)}
              className="text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              Enter &lt;200m Perimeter (Triggers Agent Arrived)
            </button>
          </div>
        </div>
      </div>

      {/* Live Map Display */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>🗺️</span>
              <span>Live Interactive Navigation Map</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking showing agent position, donor pickup address, and route path.
            </p>
          </div>
          {trackingData.distanceDetails ? (
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full">
                {trackingData.distanceDetails.distanceLabel}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {trackingData.distanceDetails.straightLineLabel}
              </span>
            </div>
          ) : trackingData.currentDistanceKm != null ? (
            <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full">
              Remaining: ~{trackingData.currentDistanceKm} KM
            </span>
          ) : trackingData.donorDestination?.isVerified === false ? (
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1 rounded-full">
              Location Not Verified
            </span>
          ) : null}
        </div>

        <PickupTrackingMap
          mode="route"
          pickup={{
            pickupAddress: trackingData.donorDestination?.address,
            city: trackingData.donorDestination?.city,
            contactPhone: trackingData.donorDestination?.phone,
            status: trackingData.status,
            latitude: trackingData.donorDestination?.latitude,
            longitude: trackingData.donorDestination?.longitude,
            isVerified: trackingData.donorDestination?.isVerified !== false
          }}
          ngoLocation={{
            ngoName: trackingData.ngoDestination?.ngoName,
            address: trackingData.ngoDestination?.address,
            city: trackingData.ngoDestination?.city,
            latitude: trackingData.ngoDestination?.latitude,
            longitude: trackingData.ngoDestination?.longitude
          }}
          agentLocation={mapAgentLocation}
          distanceKm={trackingData.currentDistanceKm}
          distanceDetails={trackingData.distanceDetails}
          height="380px"
        />

        {/* Destination Details & Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
              📍 Donor Pickup Destination
            </span>
            <p className="font-black text-slate-900 text-sm">{trackingData.donorDestination?.name || 'Donor'}</p>
            <p className="text-xs text-slate-600">{trackingData.donorDestination?.address}, {trackingData.donorDestination?.city}</p>
            {trackingData.donorDestination?.phone && (
              <p className="text-xs text-emerald-800 font-bold">
                📞 <a href={`tel:${trackingData.donorDestination.phone}`} className="underline">{trackingData.donorDestination.phone}</a>
              </p>
            )}

            <div className="pt-2 flex gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${trackingData.donorDestination?.latitude},${trackingData.donorDestination?.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition no-underline flex items-center gap-1.5"
              >
                <span>🗺️</span>
                <span>Navigate in Google Maps</span>
              </a>
              {trackingData.donorDestination?.phone && (
                <a
                  href={`tel:${trackingData.donorDestination.phone}`}
                  className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition no-underline flex items-center gap-1.5"
                >
                  <span>📞</span>
                  <span>Call Donor</span>
                </a>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300">
              🏢 Return NGO Center Hub
            </span>
            <p className="font-black text-slate-900 text-sm">{trackingData.ngoDestination?.ngoName || 'NGO Center'}</p>
            <p className="text-xs text-slate-600">{trackingData.ngoDestination?.address}, {trackingData.ngoDestination?.city}</p>
            <p className="text-xs text-slate-500">
              Deliver collected parcels here for final NGO administrator verification.
            </p>
          </div>
        </div>
      </div>

      {/* Parcel Collection Action Card (Requirement 7) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>📦</span>
              <span>Confirm Donation Collection (Agent Action)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Once you have physically met the donor and received the parcel, tap Confirm Collection to notify the donor and NGO.
            </p>
          </div>

          <span className={`text-xs font-black px-3 py-1.5 rounded-full uppercase self-start sm:self-auto ${
            isCollected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isCollected ? 'Parcel Collected ✓' : 'Awaiting Handover ⏳'}
          </span>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Handover Notes / Verification Remark (Optional)
            </label>
            <input
              type="text"
              value={collectionNotes}
              onChange={(e) => setCollectionNotes(e.target.value)}
              placeholder="e.g. Received 5 boxes of clothes in good condition"
              disabled={isCollected || isAgentInactive}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {!isCollected ? (
            <button
              onClick={handleConfirmCollection}
              disabled={collectionSubmitting || isAgentInactive}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-md transition cursor-pointer border-0 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>📦</span>
              <span>{collectionSubmitting ? 'Confirming...' : 'Confirm Parcel Collection (I Have Collected Parcel)'}</span>
            </button>
          ) : (
            <div className="p-4 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
              <span>✅</span>
              <span>
                Donation parcel collected on{' '}
                {trackingData.pickupTimeline?.donationCollectedAt
                  ? new Date(trackingData.pickupTimeline.donationCollectedAt).toLocaleString()
                  : 'file'}
                . Please proceed to the NGO collection hub for final verification.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
