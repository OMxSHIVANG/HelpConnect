import { io } from 'socket.io-client';

let socketInstance = null;
let currentToken = null;

/**
 * Determine Socket.IO server URL based on frontend environment
 */
const getSocketServerUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
    }
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl.startsWith('http')) {
        return apiUrl.replace(/\/api\/?$/, '');
    }
    // In local Vite dev server (port 5173), backend runs on port 5000
    if (typeof window !== 'undefined' && window.location.port === '5173') {
        return 'http://localhost:5000';
    }
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
};

/**
 * Get or create authenticated Socket.IO instance
 * @param {Object} options
 * @param {boolean} options.preferAgent - Prioritize agentToken over user token
 * @returns {Socket|null}
 */
export const getSocket = ({ preferAgent = false } = {}) => {
    if (typeof window === 'undefined') return null;

    const agentToken = localStorage.getItem('agentToken');
    const userToken = localStorage.getItem('token');
    const token = preferAgent ? (agentToken || userToken) : (userToken || agentToken);

    if (!token) {
        disconnectSocket();
        return null;
    }

    // Reuse existing socket if token hasn't changed and connection is alive or reconnecting
    if (socketInstance && currentToken === token) {
        if (!socketInstance.connected && !socketInstance.active) {
            socketInstance.connect();
        }
        return socketInstance;
    }

    // Token changed or first-time initialization: clean up old instance
    if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketInstance = null;
    }

    currentToken = token;
    const serverUrl = getSocketServerUrl();

    socketInstance = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true
    });

    socketInstance.on('connect', () => {
        // Connected successfully
    });

    socketInstance.on('connect_error', (err) => {
        console.warn('Socket.IO connection notice:', err.message);
    });

    return socketInstance;
};

/**
 * Explicitly disconnect socket (e.g. on logout)
 */
export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
        socketInstance = null;
    }
    currentToken = null;
};

/**
 * Join secure donation tracking room
 */
export const joinDonationTracking = (donationId, callback) => {
    const socket = getSocket();
    if (!socket || !donationId) return;

    if (socket.connected) {
        socket.emit('join:donation', { donationId }, callback);
    } else {
        socket.once('connect', () => {
            socket.emit('join:donation', { donationId }, callback);
        });
    }
};

/**
 * Leave donation tracking room
 */
export const leaveDonationTracking = (donationId) => {
    if (socketInstance && donationId) {
        socketInstance.emit('leave:donation', { donationId });
    }
};

/**
 * Send agent live location via Socket.IO
 */
export const sendAgentLocation = (payload, callback) => {
    const socket = getSocket({ preferAgent: true });
    if (!socket || !socket.connected) return false;

    socket.emit('agent:location:send', payload, callback);
    return true;
};
