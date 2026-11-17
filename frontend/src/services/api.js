import axios from 'axios';

// Resolve API base URL: use VITE_API_URL if configured, otherwise default to relative '/api'
const baseURL = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
    baseURL
});

// Request interceptor: attach JWT bearer token to headers
API.interceptors.request.use(
    (config) => {
        if (!config.headers.Authorization) {
            const isAgentEndpoint = config.url?.includes('/agents/auth/') ||
                config.url?.includes('/agents/my-orders') ||
                Boolean(config.headers['X-Use-Agent-Token']);

            const agentToken = localStorage.getItem('agentToken');
            const userToken = localStorage.getItem('token');

            if (isAgentEndpoint && agentToken) {
                config.headers.Authorization = `Bearer ${agentToken}`;
            } else if (userToken) {
                config.headers.Authorization = `Bearer ${userToken}`;
            } else if (agentToken) {
                config.headers.Authorization = `Bearer ${agentToken}`;
            }
        }
        delete config.headers['X-Use-Agent-Token'];
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle expired tokens and unauthorized responses
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const isAgentRoute = error.config?.url?.includes('/agents/');
            if (isAgentRoute) {
                const isAuthRoute = error.config.url?.includes('/agents/auth/login') || error.config.url?.includes('/agents/auth/activate');
                if (!isAuthRoute) {
                    localStorage.removeItem('agentToken');
                    localStorage.removeItem('agentUser');
                    window.dispatchEvent(new Event('agent:unauthorized'));
                }
            } else {
                const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
                if (!isAuthRoute) {
                    localStorage.removeItem('token');
                    window.dispatchEvent(new Event('auth:unauthorized'));
                }
            }
        }
        return Promise.reject(error);
    }
);

export default API;
