/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
    }, []);

    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [logout]);

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    const res = await API.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error('Failed to load user profile:', error);
                    logout();
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        loadUser();
    }, [token, logout]);

    const setAuthSession = useCallback((tokenValue, userValue) => {
        if (tokenValue) {
            localStorage.setItem('token', tokenValue);
            setToken(tokenValue);
        }
        if (userValue) {
            setUser(userValue);
        }
    }, []);

    const login = async (email, password) => {
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data);
        return res.data;
    };

    const register = async (userData) => {
        const res = await API.post('/auth/register', userData);
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data);
        return res.data;
    };

    const googleLogin = async (credential, role) => {
        const res = await API.post('/auth/google', { credential, role });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data);
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, setUser, token, setToken, setAuthSession, loading, login, register, googleLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
