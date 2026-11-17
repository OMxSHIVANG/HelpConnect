/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';

export const AgentAuthContext = createContext();

export const AgentAuthProvider = ({ children }) => {
    const [agent, setAgent] = useState(() => {
        try {
            const saved = localStorage.getItem('agentUser');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [agentToken, setAgentToken] = useState(() => localStorage.getItem('agentToken') || '');
    const [loading, setLoading] = useState(true);

    const agentLogout = useCallback(async () => {
        try {
            if (localStorage.getItem('agentToken')) {
                await API.post('/agents/auth/logout', {}, {
                    headers: { 'X-Use-Agent-Token': 'true' }
                }).catch(() => {});
            }
        } finally {
            localStorage.removeItem('agentToken');
            localStorage.removeItem('agentUser');
            setAgentToken('');
            setAgent(null);
        }
    }, []);

    useEffect(() => {
        const handleUnauthorized = () => {
            agentLogout();
        };

        window.addEventListener('agent:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('agent:unauthorized', handleUnauthorized);
    }, [agentLogout]);

    const refreshAgentProfile = useCallback(async () => {
        const token = localStorage.getItem('agentToken');
        if (!token) {
            setAgent(null);
            setLoading(false);
            return;
        }
        try {
            const res = await API.get('/agents/auth/profile', {
                headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${token}` }
            });
            if (res.data?.success && res.data?.agent) {
                setAgent(res.data.agent);
                localStorage.setItem('agentUser', JSON.stringify(res.data.agent));
            }
        } catch (error) {
            console.error('Failed to load agent profile:', error);
            agentLogout();
        } finally {
            setLoading(false);
        }
    }, [agentLogout]);

    useEffect(() => {
        let isCancelled = false;
        const loadInitialProfile = async () => {
            const token = localStorage.getItem('agentToken');
            if (!token) {
                if (!isCancelled) {
                    setAgent(null);
                    setLoading(false);
                }
                return;
            }
            try {
                const res = await API.get('/agents/auth/profile', {
                    headers: { 'X-Use-Agent-Token': 'true', Authorization: `Bearer ${token}` }
                });
                if (!isCancelled && res.data?.success && res.data?.agent) {
                    setAgent(res.data.agent);
                    localStorage.setItem('agentUser', JSON.stringify(res.data.agent));
                }
            } catch (error) {
                console.error('Failed to load agent profile:', error);
                if (!isCancelled) agentLogout();
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        loadInitialProfile();
        return () => { isCancelled = true; };
    }, [agentLogout]);

    const agentLogin = async (identifier, password) => {
        const res = await API.post('/agents/auth/login', {
            login: identifier,
            password
        });
        if (res.data?.token) {
            localStorage.setItem('agentToken', res.data.token);
            if (res.data.agent) {
                localStorage.setItem('agentUser', JSON.stringify(res.data.agent));
                setAgent(res.data.agent);
            }
            setAgentToken(res.data.token);
        }
        return res.data;
    };

    const agentActivate = async (payload) => {
        const res = await API.post('/agents/auth/activate', payload);
        if (res.data?.token) {
            localStorage.setItem('agentToken', res.data.token);
            if (res.data.agent) {
                localStorage.setItem('agentUser', JSON.stringify(res.data.agent));
                setAgent(res.data.agent);
            }
            setAgentToken(res.data.token);
        }
        return res.data;
    };

    return (
        <AgentAuthContext.Provider
            value={{
                agent,
                setAgent,
                agentToken,
                loading,
                agentLogin,
                agentActivate,
                agentLogout,
                refreshAgentProfile
            }}
        >
            {children}
        </AgentAuthContext.Provider>
    );
};
