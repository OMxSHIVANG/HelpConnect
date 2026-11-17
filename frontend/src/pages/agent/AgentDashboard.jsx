import { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AgentAuthContext } from '../../context/AgentAuthContext';
import API from '../../services/api';
import PickupTrackingMap from '../../components/PickupTrackingMap';
import { disconnectSocket } from '../../services/socket';

const STATUS_CONFIG = {
    pending: { label: 'Pending Start', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    accepted: { label: 'Accepted (Pending Start)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    agent_assigned: { label: 'Assigned (Pending Start)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    agent_on_the_way: { label: 'On The Way (50%)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    agent_nearby: { label: 'Nearby (<5km)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    agent_arrived: { label: 'Arrived at Donor', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    donation_collected: { label: 'Parcel Collected', color: 'bg-teal-100 text-teal-800 border-teal-300' },
    completed: { label: 'Pickup Completed', color: 'bg-green-100 text-green-800 border-green-300' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700 border-slate-300' }
};

export default function AgentDashboard() {
    const { agent, agentLogout, agentToken } = useContext(AgentAuthContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Active Tab: 'dashboard' | 'assigned' | 'active' | 'history' | 'profile'
    const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Orders state
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState(() => searchParams.get('orderId') || null);

    // Search and filter for assigned tab
    const [assignedSearch, setAssignedSearch] = useState('');
    const [assignedFilter, setAssignedFilter] = useState('all');

    // Live GPS state
    const [isGpsActive, setIsGpsActive] = useState(false);
    const [gpsSyncMessage, setGpsSyncMessage] = useState('');
    const [gpsCoords, setGpsCoords] = useState(null);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const watchIdRef = useRef(null);

    // Collection Modal state
    const [confirmingOrder, setConfirmingOrder] = useState(null);
    const [otpInput, setOtpInput] = useState('');
    const [notesInput, setNotesInput] = useState('');
    const [confirmingSubmitting, setConfirmingSubmitting] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const [confirmSuccess, setConfirmSuccess] = useState('');

    // Fetch orders from secure agent API
    const fetchOrders = useCallback(async () => {
        try {
            setError('');
            const res = await API.get('/agents/my-orders', {
                headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${agentToken}` }
            });
            if (res.data?.success) {
                setOrders(res.data.orders || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load assigned donations');
        } finally {
            setLoading(false);
        }
    }, [agentToken]);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (!agentToken) {
                if (isMounted) setLoading(false);
                return;
            }
            try {
                const res = await API.get('/agents/donations', {
                    headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${agentToken}` }
                });
                if (isMounted && res.data?.success) {
                    setOrders(res.data.orders || []);
                }
            } catch (err) {
                if (isMounted) setError(err.response?.data?.message || 'Failed to load assigned donations');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [agentToken]);

    // Handle tab change and sync with search parameters
    const handleTabChange = (tab, orderId = null) => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
        const params = new URLSearchParams();
        params.set('tab', tab);
        if (orderId) {
            params.set('orderId', orderId);
            setSelectedOrderId(orderId);
        }
        setSearchParams(params);
    };

    // Filtered order categories
    const activeOrders = useMemo(() => {
        return orders.filter(o => ['accepted', 'agent_assigned', 'agent_on_the_way', 'agent_nearby', 'agent_arrived'].includes(o.pickupStatus));
    }, [orders]);

    const pendingOrders = useMemo(() => {
        return orders.filter(o => ['accepted', 'agent_assigned'].includes(o.pickupStatus));
    }, [orders]);

    const inTransitOrders = useMemo(() => {
        return orders.filter(o => ['agent_on_the_way', 'agent_nearby', 'agent_arrived'].includes(o.pickupStatus));
    }, [orders]);

    const collectedOrders = useMemo(() => {
        return orders.filter(o => o.pickupStatus === 'donation_collected' || o.status === 'picked_up');
    }, [orders]);

    const completedOrders = useMemo(() => {
        return orders.filter(o => o.pickupStatus === 'completed' || o.status === 'completed' || o.status === 'received');
    }, [orders]);

    // Resolved active order (defaults to currently selected or first active order)
    const currentActiveOrder = useMemo(() => {
        if (selectedOrderId) {
            const found = orders.find(o => o._id === selectedOrderId);
            if (found) return found;
        }
        return activeOrders[0] || collectedOrders[0] || orders[0] || null;
    }, [selectedOrderId, orders, activeOrders, collectedOrders]);

    // Cleanup GPS watch on unmount or order completion
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []);

    // Stop GPS tracking helper
    const stopGpsTracking = () => {
        if (watchIdRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsGpsActive(false);
        setGpsSyncMessage('GPS broadcasting paused');
        setTimeout(() => setGpsSyncMessage(''), 4000);
    };

    // Stop GPS sharing if current order completes or cancels
    useEffect(() => {
        if (currentActiveOrder && ['completed', 'cancelled', 'donation_collected'].includes(currentActiveOrder.pickupStatus)) {
            if (isGpsActive && currentActiveOrder.pickupStatus !== 'donation_collected') {
                const timer = setTimeout(() => {
                    stopGpsTracking();
                }, 0);
                return () => clearTimeout(timer);
            }
        }
    }, [currentActiveOrder, isGpsActive]);

    // Start / Toggle GPS tracking helper
    const toggleGpsTracking = (orderId) => {
        const targetId = orderId || currentActiveOrder?._id;
        if (!targetId) return;

        if (isGpsActive) {
            stopGpsTracking();
            return;
        }

        if (!navigator.geolocation) {
            alert('Browser geolocation is not supported on this device.');
            return;
        }

        setIsGpsActive(true);
        setGpsSyncMessage('Requesting GPS satellites...');

        const handlePosition = async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy;
            const speed = pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : null;
            const heading = pos.coords.heading;

            setGpsCoords({ lat, lng, accuracy, speed });
            setLastSyncTime(new Date());

            try {
                const res = await API.post(`/donations/${targetId}/live-location`, {
                    latitude: lat,
                    longitude: lng,
                    accuracy,
                    speed,
                    heading,
                    timestamp: new Date().toISOString()
                }, {
                    headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${agentToken}` }
                });

                if (res.data?.success) {
                    setGpsSyncMessage(`Broadcasting Live: ±${Math.round(accuracy)}m • ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                    if (res.data.statusChanged) {
                        fetchOrders();
                    }
                }
            } catch (err) {
                console.error('GPS broadcast sync error:', err.message);
                setGpsSyncMessage(`Broadcast warning: ${err.response?.data?.message || err.message}`);
            }
        };

        const handleError = (err) => {
            console.error('Geolocation error:', err);
            setGpsSyncMessage(`GPS permission or signal error: ${err.message}`);
            setIsGpsActive(false);
        };

        navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 3000
        });

        const watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            maximumAge: 4000,
            timeout: 15000
        });
        watchIdRef.current = watchId;
    };

    // Handle Start Journey
    const handleStartJourney = async (orderId) => {
        const targetId = orderId || currentActiveOrder?._id;
        if (!targetId) return;

        try {
            const res = await API.post(`/donations/${targetId}/start-journey`, {}, {
                headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${agentToken}` }
            });
            if (res.data?.success) {
                alert('Journey started! Status updated to Agent On The Way. Donor and NGO notified.');
                await fetchOrders();
                // Automatically activate GPS tracking
                toggleGpsTracking(targetId);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to start journey');
        }
    };

    // Handle Confirm Collection Submit
    const handleConfirmCollectionSubmit = async (e) => {
        e.preventDefault();
        setConfirmError('');
        setConfirmSuccess('');

        if (!otpInput.trim()) {
            setConfirmError('Please enter the 6-character donor verification OTP');
            return;
        }

        setConfirmingSubmitting(true);
        try {
            const res = await API.post(`/donations/${confirmingOrder._id}/confirm-collection`, {
                otp: otpInput.trim().toUpperCase(),
                notes: notesInput.trim()
            }, {
                headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${agentToken}` }
            });

            if (res.data?.success) {
                setConfirmSuccess('Parcel collection verified successfully with valid donor OTP! Order updated to Donation Collected.');
                setTimeout(async () => {
                    setConfirmingOrder(null);
                    setOtpInput('');
                    setNotesInput('');
                    setConfirmSuccess('');
                    await fetchOrders();
                }, 1500);
            }
        } catch (err) {
            setConfirmError(err.response?.data?.message || 'Verification failed. Please check the code with donor.');
        } finally {
            setConfirmingSubmitting(false);
        }
    };

    // Handle Logout
    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out of your pickup agent account?')) {
            stopGpsTracking();
            disconnectSocket();
            agentLogout();
            navigate('/agent/login');
        }
    };

    // Helper: Navigation URL to Google Maps
    const getGoogleMapsNavUrl = (destinationLat, destinationLng, address = '') => {
        if (destinationLat && destinationLng) {
            return `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`;
        }
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    };

    // Filtered assigned pickups
    const filteredAssignedPickups = useMemo(() => {
        return orders.filter(order => {
            const matchesFilter =
                assignedFilter === 'all'
                    ? true
                    : assignedFilter === 'pending'
                    ? ['accepted', 'agent_assigned'].includes(order.pickupStatus)
                    : assignedFilter === 'active'
                    ? ['agent_on_the_way', 'agent_nearby', 'agent_arrived'].includes(order.pickupStatus)
                    : assignedFilter === 'collected'
                    ? order.pickupStatus === 'donation_collected'
                    : order.pickupStatus === assignedFilter;

            const q = assignedSearch.toLowerCase().trim();
            const matchesSearch = !q ||
                (order.donor?.name || '').toLowerCase().includes(q) ||
                (order.pickupAddress || '').toLowerCase().includes(q) ||
                (order.city || '').toLowerCase().includes(q) ||
                (order.requirement?.title || '').toLowerCase().includes(q) ||
                (order.requirement?.category || '').toLowerCase().includes(q) ||
                order._id.toLowerCase().includes(q);

            return matchesFilter && matchesSearch;
        });
    }, [orders, assignedFilter, assignedSearch]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
            {/* Mobile Top Navigation Bar */}
            <div className="lg:hidden bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileMenuOpen(prev => !prev)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                        aria-label="Toggle Navigation Menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🛵</span>
                        <span className="font-black text-sm tracking-tight text-emerald-400">HelpConnect Agent</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isGpsActive && (
                        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            GPS Live
                        </span>
                    )}
                    <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-1 rounded text-slate-300">
                        {agent?.agentId || 'AGENT'}
                    </span>
                </div>
            </div>

            {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Brand / Agent Header */}
                <div className="p-6 border-b border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
                                🛵
                            </div>
                            <div>
                                <h2 className="font-black text-sm tracking-tight text-white">HelpConnect</h2>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Pickup Agent Portal</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Quick Agent Badge */}
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 mt-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-xs overflow-hidden shrink-0">
                                {agent?.profilePhoto ? (
                                    <img src={agent.profilePhoto} alt={agent.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{agent?.fullName?.charAt(0) || 'A'}</span>
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-black text-slate-100 truncate">{agent?.fullName || 'Pickup Agent'}</p>
                                <p className="text-[10px] font-mono font-bold text-emerald-400 truncate">{agent?.agentId}</p>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{agent?.vehicleType}</span>
                            <span className="font-mono text-slate-300">{agent?.vehicleNumber}</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
                    <button
                        onClick={() => handleTabChange('dashboard')}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                            activeTab === 'dashboard'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
                        }`}
                    >
                        <span className="text-base">📊</span>
                        <span>Dashboard</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('assigned')}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                            activeTab === 'assigned'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-base">📋</span>
                            <span>My Assigned Pickups</span>
                        </div>
                        {pendingOrders.length > 0 && (
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {pendingOrders.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('active')}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                            activeTab === 'active'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-base">🛵</span>
                            <span>Active Pickup</span>
                        </div>
                        {inTransitOrders.length > 0 && (
                            <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                Live
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('history')}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                            activeTab === 'history'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
                        }`}
                    >
                        <span className="text-base">📦</span>
                        <span>Pickup History</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('profile')}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                            activeTab === 'profile'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
                        }`}
                    >
                        <span className="text-base">👤</span>
                        <span>My Profile</span>
                    </button>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs transition border border-red-800/40 cursor-pointer"
                    >
                        <span>⎋</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Backdrop for mobile drawer */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24 lg:pb-8">
                {/* Global Status / Alert Header */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="text-red-600 font-black">✕</button>
                    </div>
                )}

                {/* TAB 1: DASHBOARD OVERVIEW */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* Welcome Hero Banner */}
                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
                            <div className="relative z-10 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">Field Agent Console</span>
                                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                                        {agent?.status || 'Active'}
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                                    Welcome back, {agent?.fullName || 'Pickup Agent'}! 🛵
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                                    Track live collection orders, broadcast your GPS position directly to donors and NGO coordinators, and verify parcel handovers securely using donor OTP codes.
                                </p>
                            </div>
                        </div>

                        {/* 5 Standard Dashboard Statistics (Requirement 2) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Assigned</span>
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{orders.length}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">All allocated orders</span>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider block">Pending Start</span>
                                <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 block">{pendingOrders.length}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Waiting for departure</span>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">Active Pickups</span>
                                <span className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1 block">{inTransitOrders.length}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">On the way & nearby</span>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider block">Collected</span>
                                <span className="text-2xl sm:text-3xl font-black text-teal-600 mt-1 block">{collectedOrders.length}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Verified with donor OTP</span>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Completed</span>
                                <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 block">{completedOrders.length}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Delivered at NGO facility</span>
                            </div>
                        </div>

                        {/* Active Pickup Spotlight Card */}
                        {currentActiveOrder && ['accepted', 'agent_assigned', 'agent_on_the_way', 'agent_nearby', 'agent_arrived'].includes(currentActiveOrder.pickupStatus) && (
                            <div className="bg-white rounded-3xl border-2 border-emerald-500/80 p-6 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-3 w-3 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                        <h2 className="text-base font-black text-slate-900">Current Active Pickup Order</h2>
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            #{currentActiveOrder._id.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${(STATUS_CONFIG[currentActiveOrder.pickupStatus] || STATUS_CONFIG.accepted).color}`}>
                                        {(STATUS_CONFIG[currentActiveOrder.pickupStatus] || STATUS_CONFIG.accepted).label}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Donor & Location</span>
                                        <p className="font-bold text-slate-900 mt-1">{currentActiveOrder.donor?.name || 'Donor'}</p>
                                        <p className="text-slate-600 mt-0.5">{currentActiveOrder.pickupAddress}, {currentActiveOrder.city}</p>
                                        {currentActiveOrder.donor?.phone && (
                                            <a href={`tel:${currentActiveOrder.donor.phone}`} className="text-emerald-700 font-extrabold mt-1 block">
                                                📞 {currentActiveOrder.donor.phone}
                                            </a>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Donation Package</span>
                                        <p className="font-bold text-slate-900 mt-1">{currentActiveOrder.requirement?.title || 'Material Donation'}</p>
                                        <p className="text-slate-600 mt-0.5">Category: {currentActiveOrder.requirement?.category || 'General'}</p>
                                        <p className="text-slate-600 mt-0.5">Quantity: {currentActiveOrder.quantity} units</p>
                                    </div>

                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Receiving NGO</span>
                                        <p className="font-bold text-slate-900 mt-1">{currentActiveOrder.ngo?.ngoName || 'NGO Partner'}</p>
                                        <p className="text-slate-600 mt-0.5">{currentActiveOrder.ngo?.address}, {currentActiveOrder.ngo?.city}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <button
                                        onClick={() => handleTabChange('active', currentActiveOrder._id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-0 cursor-pointer transition shadow-xs flex items-center gap-2"
                                    >
                                        <span>🗺️</span>
                                        <span>Open Active Live Map & Verification</span>
                                    </button>

                                    {currentActiveOrder.pickupStatus === 'agent_assigned' && (
                                        <button
                                            onClick={() => handleStartJourney(currentActiveOrder._id)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl border-0 cursor-pointer transition shadow-xs"
                                        >
                                            Start Journey 🚀
                                        </button>
                                    )}

                                    <a
                                        href={getGoogleMapsNavUrl(currentActiveOrder.pickupLocation?.latitude, currentActiveOrder.pickupLocation?.longitude, `${currentActiveOrder.pickupAddress}, ${currentActiveOrder.city}`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 no-underline inline-flex items-center gap-1.5"
                                    >
                                        <span>📍</span>
                                        <span>Google Maps Nav</span>
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Recent Pickups Overview */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <span>📋</span>
                                    <span>Recent Assigned Pickups</span>
                                </h3>
                                <button
                                    onClick={() => handleTabChange('assigned')}
                                    className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                                >
                                    View All ({orders.length}) →
                                </button>
                            </div>

                            {loading ? (
                                <p className="text-xs text-slate-400 py-6 text-center">Loading assigned pickups...</p>
                            ) : orders.length === 0 ? (
                                <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded-2xl">
                                    No pickup orders have been assigned to your agent account yet.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {orders.slice(0, 5).map(order => {
                                        const config = STATUS_CONFIG[order.pickupStatus] || STATUS_CONFIG.accepted;
                                        return (
                                            <div key={order._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-extrabold text-slate-900">
                                                            #{order._id.slice(-6).toUpperCase()}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-700">
                                                        {order.donor?.name || 'Donor'} • <span className="text-slate-500">{order.pickupAddress}, {order.city}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        Item: {order.requirement?.title || 'Material'} ({order.requirement?.category || 'General'}) • {order.quantity} units
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => handleTabChange('active', order._id)}
                                                    className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer self-start sm:self-center"
                                                >
                                                    View Details →
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: MY ASSIGNED PICKUPS (Requirement 3) */}
                {activeTab === 'assigned' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">My Assigned Pickups 📋</h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Showing all pickup requests allocated to Agent ID: <span className="font-mono font-bold text-slate-700">{agent?.agentId}</span>
                                </p>
                            </div>

                            <button
                                onClick={fetchOrders}
                                className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 cursor-pointer self-start sm:self-auto"
                            >
                                Refresh ↻
                            </button>
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="Search by donor name, city, reference ID or item..."
                                value={assignedSearch}
                                onChange={(e) => setAssignedSearch(e.target.value)}
                                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 bg-slate-50"
                            />
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                                {['all', 'pending', 'active', 'collected', 'completed'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setAssignedFilter(f)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer shrink-0 border ${
                                            assignedFilter === f
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pickups List View */}
                        {filteredAssignedPickups.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
                                <span className="text-4xl block">📦</span>
                                <h3 className="text-sm font-bold text-slate-800">No assigned pickups match your search criteria.</h3>
                                <p className="text-xs text-slate-400">Try adjusting your search query or switching filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredAssignedPickups.map(order => {
                                    const config = STATUS_CONFIG[order.pickupStatus] || STATUS_CONFIG.accepted;
                                    const isPendingStart = order.pickupStatus === 'accepted' || order.pickupStatus === 'agent_assigned';

                                    return (
                                        <div key={order._id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Reference ID</span>
                                                        <span className="font-mono text-sm font-black text-slate-900">
                                                            #{order._id.slice(-6).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 text-xs">
                                                    <div>
                                                        <span className="text-slate-400 font-semibold block text-[10px]">Donor Name:</span>
                                                        <span className="font-bold text-slate-800">{order.donor?.name || 'Anonymous Donor'}</span>
                                                    </div>

                                                    <div>
                                                        <span className="text-slate-400 font-semibold block text-[10px]">Pickup Address:</span>
                                                        <span className="text-slate-700">{order.pickupAddress}, {order.city}</span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <div>
                                                            <span className="text-slate-400 font-semibold block text-[10px]">Category:</span>
                                                            <span className="font-bold text-slate-800">{order.requirement?.category || 'General'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 font-semibold block text-[10px]">Quantity:</span>
                                                            <span className="font-bold text-slate-800">{order.quantity} units</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                                        <div>
                                                            <span className="text-slate-400 font-semibold block text-[10px]">Assigned Date:</span>
                                                            <span className="text-slate-600 text-[11px]">
                                                                {order.assignedAt ? new Date(order.assignedAt).toLocaleDateString() : (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A')}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 font-semibold block text-[10px]">Scheduled Time:</span>
                                                            <span className="text-slate-600 text-[11px]">
                                                                {order.scheduledPickupDate ? new Date(order.scheduledPickupDate).toLocaleString() : 'Standard Hours'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => handleTabChange('active', order._id)}
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition cursor-pointer text-center"
                                                >
                                                    Track Active Pickup 🗺️
                                                </button>

                                                {isPendingStart && (
                                                    <button
                                                        onClick={() => handleStartJourney(order._id)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition cursor-pointer"
                                                    >
                                                        Start Journey 🚀
                                                    </button>
                                                )}

                                                <a
                                                    href={getGoogleMapsNavUrl(order.pickupLocation?.latitude, order.pickupLocation?.longitude, `${order.pickupAddress}, ${order.city}`)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl border border-slate-200 no-underline text-center"
                                                >
                                                    Nav 📍
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: ACTIVE PICKUP PAGE (Requirements 4, 5, 6, 7) */}
                {activeTab === 'active' && (
                    <div className="space-y-6">
                        {/* Header & Order Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                    <span>🛵</span>
                                    <span>Active Pickup Console</span>
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Real-time navigation, live GPS broadcast engine and donor OTP handover confirmation.
                                </p>
                            </div>

                            {/* Dropdown if multiple active orders */}
                            {activeOrders.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-600">Switch Order:</label>
                                    <select
                                        value={currentActiveOrder?._id || ''}
                                        onChange={(e) => handleTabChange('active', e.target.value)}
                                        className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                                    >
                                        {activeOrders.map(o => (
                                            <option key={o._id} value={o._id}>
                                                #{o._id.slice(-6).toUpperCase()} - {o.donor?.name || 'Donor'} ({o.city})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {!currentActiveOrder ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                                <span className="text-4xl block">✨</span>
                                <h3 className="text-base font-bold text-slate-800">No active pickup in progress</h3>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    You do not currently have any active pickups assigned. Select an order from your assigned pickups list to start your journey.
                                </p>
                                <button
                                    onClick={() => handleTabChange('assigned')}
                                    className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                                >
                                    Browse Assigned Pickups →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Order Status Bar */}
                                <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-black text-sm text-emerald-400">
                                                Order #{currentActiveOrder._id.slice(-6).toUpperCase()}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${(STATUS_CONFIG[currentActiveOrder.pickupStatus] || STATUS_CONFIG.accepted).color}`}>
                                                {(STATUS_CONFIG[currentActiveOrder.pickupStatus] || STATUS_CONFIG.accepted).label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300">
                                            Destination: <span className="font-bold text-white">{currentActiveOrder.pickupAddress}, {currentActiveOrder.city}</span>
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                                        {currentActiveOrder.pickupStatus === 'agent_assigned' && (
                                            <button
                                                onClick={() => handleStartJourney(currentActiveOrder._id)}
                                                className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md"
                                            >
                                                Start Journey 🚀
                                            </button>
                                        )}

                                        <button
                                            onClick={() => toggleGpsTracking(currentActiveOrder._id)}
                                            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer border flex items-center justify-center gap-2 ${
                                                isGpsActive
                                                    ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                                                    : 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400'
                                            }`}
                                        >
                                            <span>📡</span>
                                            <span>{isGpsActive ? 'Stop Live GPS' : 'Share Live GPS'}</span>
                                        </button>

                                        {/* Confirm Collection Button */}
                                        {['agent_assigned', 'agent_on_the_way', 'agent_nearby', 'agent_arrived'].includes(currentActiveOrder.pickupStatus) && (
                                            <button
                                                onClick={() => {
                                                    setConfirmingOrder(currentActiveOrder);
                                                    setOtpInput('');
                                                    setConfirmError('');
                                                }}
                                                className="flex-1 md:flex-none bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md"
                                            >
                                                Confirm Collection ✓
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Live GPS Broadcast Bar */}
                                {isGpsActive && (
                                    <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                                            <div>
                                                <p className="text-xs font-black text-emerald-300">Live GPS Satellite Broadcast Active</p>
                                                <p className="text-[11px] font-mono text-emerald-400/80">{gpsSyncMessage || 'Broadcasting coordinates to HelpConnect server...'}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            Last Sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Just now'}
                                        </span>
                                    </div>
                                )}

                                {/* Interactive Leaflet Map (Requirement 4) */}
                                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🗺️</span>
                                            <span className="text-xs font-black text-slate-900">Interactive Transit Map</span>
                                        </div>
                                        <a
                                            href={getGoogleMapsNavUrl(currentActiveOrder.pickupLocation?.latitude, currentActiveOrder.pickupLocation?.longitude, `${currentActiveOrder.pickupAddress}, ${currentActiveOrder.city}`)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-extrabold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                        >
                                            <span>Open in Google Maps Navigation</span>
                                            <span>↗</span>
                                        </a>
                                    </div>

                                    <div className="h-[380px] sm:h-[440px] w-full">
                                        <PickupTrackingMap
                                            mode="route"
                                            height="100%"
                                            pickup={{
                                                pickupAddress: currentActiveOrder.pickupAddress,
                                                city: currentActiveOrder.city,
                                                latitude: currentActiveOrder.pickupLocation?.latitude || currentActiveOrder.pickupLocation?.coordinates?.[1],
                                                longitude: currentActiveOrder.pickupLocation?.longitude || currentActiveOrder.pickupLocation?.coordinates?.[0],
                                                status: currentActiveOrder.pickupStatus,
                                                contactPhone: currentActiveOrder.donor?.phone
                                            }}
                                            ngoLocation={currentActiveOrder.ngo}
                                            agentLocation={gpsCoords ? {
                                                latitude: gpsCoords.lat,
                                                longitude: gpsCoords.lng,
                                                accuracy: gpsCoords.accuracy,
                                                speed: gpsCoords.speed,
                                                fullName: agent?.fullName,
                                                vehicleType: agent?.vehicleType
                                            } : currentActiveOrder.agentLocation}
                                        />
                                    </div>
                                </div>

                                {/* Pickup Instructions & Location Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            <span>📍</span>
                                            <span>Donor Pickup Information</span>
                                        </h3>

                                        <div className="space-y-3 text-xs">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Donor Contact</span>
                                                <p className="font-bold text-slate-900 mt-0.5">{currentActiveOrder.donor?.name || 'Donor'}</p>
                                                {currentActiveOrder.donor?.phone ? (
                                                    <a
                                                        href={`tel:${currentActiveOrder.donor.phone}`}
                                                        className="text-emerald-700 font-extrabold mt-1 inline-flex items-center gap-1.5 text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                                                    >
                                                        <span>📞</span>
                                                        <span>Call {currentActiveOrder.donor.phone}</span>
                                                    </a>
                                                ) : (
                                                    <p className="text-slate-400 mt-0.5">Phone shared during active arrival</p>
                                                )}
                                            </div>

                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Pickup Address</span>
                                                <p className="text-slate-700 font-semibold mt-0.5">{currentActiveOrder.pickupAddress}, {currentActiveOrder.city}</p>
                                            </div>

                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Special Pickup Instructions</span>
                                                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1 leading-relaxed">
                                                    {currentActiveOrder.description || 'Handle parcel with care. Verify item count with donor and ask for their 6-character OTP before completing handover.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* NGO Delivery Destination (Requirement 7) */}
                                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                <span>🏢</span>
                                                <span>NGO Destination & Delivery</span>
                                            </h3>
                                            {currentActiveOrder.pickupStatus === 'donation_collected' && (
                                                <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-300">
                                                    Parcel in Transit to NGO
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Recipient NGO Center</span>
                                                <p className="font-bold text-slate-900 mt-0.5">{currentActiveOrder.ngo?.ngoName || 'NGO Partner Center'}</p>
                                                <p className="text-slate-700 mt-0.5">{currentActiveOrder.ngo?.address}, {currentActiveOrder.ngo?.city}</p>
                                                {currentActiveOrder.ngo?.phone && (
                                                    <a href={`tel:${currentActiveOrder.ngo.phone}`} className="text-blue-700 font-extrabold mt-1 block">
                                                        📞 {currentActiveOrder.ngo.phone}
                                                    </a>
                                                )}
                                            </div>

                                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                                                <span className="text-[10px] uppercase font-extrabold text-slate-700 tracking-wider block">
                                                    NGO Handover Instructions
                                                </span>
                                                <p className="text-slate-600 text-xs leading-relaxed">
                                                    After collecting the parcel from the donor, transport the package to the NGO facility. The NGO coordinator will independently inspect the contents and verify parcel delivery at the collection centre.
                                                </p>
                                            </div>

                                            <a
                                                href={getGoogleMapsNavUrl(null, null, `${currentActiveOrder.ngo?.address}, ${currentActiveOrder.ngo?.city}`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl no-underline inline-flex items-center justify-center gap-2 transition"
                                            >
                                                <span>📍</span>
                                                <span>Navigate to NGO Facility</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: PICKUP HISTORY */}
                {activeTab === 'history' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">Pickup History 📦</h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Records of all successfully collected donations and completed facility deliveries.
                                </p>
                            </div>
                            <span className="bg-slate-100 text-slate-800 font-mono font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200">
                                Total Completed: {completedOrders.length + collectedOrders.length}
                            </span>
                        </div>

                        {completedOrders.length === 0 && collectedOrders.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
                                <span className="text-4xl block">📜</span>
                                <h3 className="text-sm font-bold text-slate-800">No pickup history yet.</h3>
                                <p className="text-xs text-slate-400">Completed deliveries and collected parcels will be archived here.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
                                <div className="divide-y divide-slate-100">
                                    {[...collectedOrders, ...completedOrders].map(order => {
                                        const config = STATUS_CONFIG[order.pickupStatus] || STATUS_CONFIG.completed;
                                        return (
                                            <div key={order._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-900">
                                                            #{order._id.slice(-6).toUpperCase()}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <p className="font-bold text-slate-800">
                                                        Donor: {order.donor?.name || 'Donor'} • <span className="text-slate-500 font-normal">{order.pickupAddress}, {order.city}</span>
                                                    </p>
                                                    <p className="text-slate-600">
                                                        Item: {order.requirement?.title || 'Material Donation'} ({order.requirement?.category || 'General'}) • {order.quantity} units
                                                    </p>
                                                    <p className="text-slate-400 text-[11px]">
                                                        Delivered to NGO: <span className="text-slate-600 font-semibold">{order.ngo?.ngoName || 'NGO Partner'}</span>
                                                    </p>
                                                </div>

                                                <div className="text-left md:text-right text-xs space-y-1">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Collection Time</span>
                                                    <span className="font-mono text-slate-700">
                                                        {order.pickupTimeline?.donationCollectedAt ? new Date(order.pickupTimeline.donationCollectedAt).toLocaleString() : 'Verified'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: AGENT PROFILE (Requirement 8) */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 max-w-3xl">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Agent Profile 👤</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Verified field courier credentials and registered vehicle information.
                            </p>
                        </div>

                        {/* Profile Details Card */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100">
                                <div className="w-24 h-24 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-3xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0">
                                    {agent?.profilePhoto ? (
                                        <img src={agent.profilePhoto} alt={agent.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>🛵</span>
                                    )}
                                </div>
                                <div className="text-center sm:text-left space-y-1">
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <h2 className="text-xl font-black text-slate-900">{agent?.fullName || 'Pickup Agent'}</h2>
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-300">
                                            {agent?.status || 'Active'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-mono font-bold text-emerald-700">Agent ID: {agent?.agentId}</p>
                                    <p className="text-xs text-slate-500">Registered Phone: {agent?.phone}</p>
                                </div>
                            </div>

                            {/* Registered Attributes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Vehicle Type</span>
                                    <span className="font-extrabold text-slate-900 text-sm mt-1 block">{agent?.vehicleType || 'Bike'}</span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Vehicle Registration Number</span>
                                    <span className="font-mono font-extrabold text-blue-700 text-sm mt-1 block">{agent?.vehicleNumber || 'N/A'}</span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Assigned NGO Facility</span>
                                    <span className="font-bold text-slate-900 mt-1 block">{agent?.ngo?.ngoName || 'Partner NGO'}</span>
                                    <span className="text-[11px] text-slate-500 block">{agent?.ngo?.address}, {agent?.ngo?.city}</span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Account Status</span>
                                    <span className="font-bold text-emerald-700 mt-1 block capitalize">✓ {agent?.status || 'Active'}</span>
                                    <span className="text-[11px] text-slate-500 block">Authorized for field pickups</span>
                                </div>
                            </div>

                            {/* Non-Editable Security Notice (Requirement 8) */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                                <span className="text-lg">🔒</span>
                                <div className="text-xs space-y-0.5">
                                    <p className="font-bold text-amber-900">Protected Profile</p>
                                    <p className="text-amber-800 leading-relaxed">
                                        Agent identification, phone number, and vehicle registration are securely maintained by your NGO administrator. Only authorized NGO users can edit agent registration details.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* OTP Collection Confirmation Modal (Requirement 6) */}
            {confirmingOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📦</span>
                                <h3 className="text-base font-black text-slate-900">Confirm Donation Collection</h3>
                            </div>
                            <button
                                onClick={() => setConfirmingOrder(null)}
                                className="text-slate-400 hover:text-slate-600 font-black cursor-pointer text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                            <p className="font-bold text-slate-800">Order #{confirmingOrder._id.slice(-6).toUpperCase()}</p>
                            <p className="text-slate-600">Donor: {confirmingOrder.donor?.name || 'Donor'}</p>
                            <p className="text-slate-600">Items: {confirmingOrder.requirement?.title || 'Material Donation'} ({confirmingOrder.quantity} units)</p>
                        </div>

                        {confirmError && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200">
                                {confirmError}
                            </div>
                        )}

                        {confirmSuccess && (
                            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-bold border border-emerald-300">
                                {confirmSuccess}
                            </div>
                        )}

                        <form onSubmit={handleConfirmCollectionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                                    Donor Verification OTP <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter 6-char OTP (e.g. A1B2C3)"
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.toUpperCase())}
                                    maxLength={10}
                                    required
                                    className="w-full text-center tracking-widest font-mono font-black text-lg py-2.5 px-4 rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:outline-none uppercase"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Ask the donor to share the verification code shown in their HelpConnect tracking screen.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Handover Notes (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Any observations on parcel condition or item count..."
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-emerald-600"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmingOrder(null)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={confirmingSubmitting}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                    {confirmingSubmitting ? 'Verifying...' : 'Verify & Confirm ✓'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Quick Navigation Bar */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 flex items-center justify-around py-2 px-1 shadow-lg">
                <button
                    onClick={() => handleTabChange('dashboard')}
                    className={`flex flex-col items-center gap-0.5 p-1.5 cursor-pointer ${
                        activeTab === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
                    }`}
                >
                    <span className="text-base">📊</span>
                    <span className="text-[10px]">Dashboard</span>
                </button>

                <button
                    onClick={() => handleTabChange('assigned')}
                    className={`flex flex-col items-center gap-0.5 p-1.5 cursor-pointer relative ${
                        activeTab === 'assigned' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
                    }`}
                >
                    <span className="text-base">📋</span>
                    <span className="text-[10px]">Assigned</span>
                    {pendingOrders.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
                    )}
                </button>

                <button
                    onClick={() => handleTabChange('active')}
                    className={`flex flex-col items-center gap-0.5 p-1.5 cursor-pointer relative ${
                        activeTab === 'active' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
                    }`}
                >
                    <span className="text-base">🛵</span>
                    <span className="text-[10px]">Active</span>
                    {inTransitOrders.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    )}
                </button>

                <button
                    onClick={() => handleTabChange('history')}
                    className={`flex flex-col items-center gap-0.5 p-1.5 cursor-pointer ${
                        activeTab === 'history' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
                    }`}
                >
                    <span className="text-base">📦</span>
                    <span className="text-[10px]">History</span>
                </button>

                <button
                    onClick={() => handleTabChange('profile')}
                    className={`flex flex-col items-center gap-0.5 p-1.5 cursor-pointer ${
                        activeTab === 'profile' ? 'text-emerald-600 font-bold' : 'text-slate-500 font-medium'
                    }`}
                >
                    <span className="text-base">👤</span>
                    <span className="text-[10px]">Profile</span>
                </button>
            </div>
        </div>
    );
}
