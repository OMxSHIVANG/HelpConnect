import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AgentAuthContext } from '../context/AgentAuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Login() {
    const [loginRole, setLoginRole] = useState('user'); // 'user' | 'agent'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agentIdentifier, setAgentIdentifier] = useState('');
    const [agentPassword, setAgentPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
    const [notFoundRole, setNotFoundRole] = useState('user');

    const googleBtnRef = useRef(null);

    const { googleLogin, login } = useContext(AuthContext);
    const { agentLogin } = useContext(AgentAuthContext);
    const navigate = useNavigate();

    const redirectUserByRole = useCallback((role) => {
        if (role === 'ngo') {
            navigate('/ngo/dashboard');
        } else if (role === 'admin') {
            navigate('/admin/dashboard');
        } else {
            navigate('/requirements');
        }
    }, [navigate]);

    const handleGoogleResponse = useCallback(async (response) => {
        setError('');
        setSubmitting(true);

        try {
            const userData = await googleLogin(response.credential);
            redirectUserByRole(userData.role);
        } catch (err) {
            if (err.response?.status === 404 || err.response?.data?.notFound || err.response?.data?.notRegistered) {
                setNotFoundRole('user');
                setShowNotFoundModal(true);
                setError(err.response?.data?.message || 'User not found. Please register.');
            } else {
                const errorMsg =
                    err.response?.data?.message ||
                    (err.request ? 'Unable to connect to the backend server (port 5001). Please make sure backend is running.' : err.message) ||
                    'Google login failed. Please try again.';
                setError(errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    }, [googleLogin, redirectUserByRole]);

    // Handle Email & Password Login for Donor / NGO
    const handleEmailPasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password) {
            setError('Please provide both email and password');
            return;
        }

        setSubmitting(true);
        try {
            const userData = await login(email.trim(), password);
            redirectUserByRole(userData.role);
        } catch (err) {
            if (err.response?.status === 404 || err.response?.data?.notFound || err.response?.data?.notRegistered) {
                setNotFoundRole('user');
                setShowNotFoundModal(true);
                setError(err.response?.data?.message || 'User not found. Please register.');
            } else {
                setError(err.response?.data?.message || 'Invalid email or password');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Pickup Agent Login
    const handleAgentSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!agentIdentifier.trim() || !agentPassword) {
            setError('Please enter your Agent ID or phone number and password');
            return;
        }

        setSubmitting(true);
        try {
            const data = await agentLogin(agentIdentifier.trim(), agentPassword);
            if (data?.success) {
                navigate('/agent/dashboard', { replace: true });
            }
        } catch (err) {
            if (err.response?.status === 404 || err.response?.data?.notFound || err.response?.data?.notRegistered) {
                setNotFoundRole('agent');
                setShowNotFoundModal(true);
                setError(err.response?.data?.message || 'User not found. Please register.');
            } else if (err.response?.data?.notActivated) {
                setError('Account pending activation. Please use your activation invite link or click below to activate.');
            } else {
                setError(err.response?.data?.message || 'Invalid agent credentials');
            }
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || loginRole !== 'user') return;

        const initGoogle = () => {
            if (window.google?.accounts?.id && googleBtnRef.current) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse
                });
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'left'
                });
            }
        };

        if (window.google?.accounts?.id) {
            initGoogle();
        } else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    initGoogle();
                }
            }, 200);
            return () => clearInterval(interval);
        }
    }, [handleGoogleResponse, loginRole]);

    return (
        <div className="max-w-md mx-auto my-14 px-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="text-center mb-6">
                    <span className="text-3xl block mb-2">{loginRole === 'agent' ? '🛵' : '👋'}</span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {loginRole === 'agent' ? 'Pickup Agent Login' : 'Welcome Back'}
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">
                        {loginRole === 'agent'
                            ? 'Secure logistics portal for assigned delivery partners'
                            : 'Sign in to access donation tracking, campaigns and dashboard'}
                    </p>
                </div>

                {/* Role Switcher Tabs */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
                    <button
                        type="button"
                        onClick={() => { setLoginRole('user'); setError(''); }}
                        className={`py-2 rounded-xl text-xs font-bold transition border-0 cursor-pointer ${
                            loginRole === 'user'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 bg-transparent'
                        }`}
                    >
                        Donor / NGO
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginRole('agent'); setError(''); }}
                        className={`py-2 rounded-xl text-xs font-bold transition border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
                            loginRole === 'agent'
                                ? 'bg-white text-emerald-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 bg-transparent'
                        }`}
                    >
                        <span>🛵</span> Pickup Agent
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 border border-red-200 font-medium flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {submitting && (
                    <div className="text-center text-xs text-slate-500 mb-4 animate-pulse">
                        Verifying credentials...
                    </div>
                )}

                {/* Donor / NGO Login Flow */}
                {loginRole === 'user' ? (
                    <div>
                        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="donor@example.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-md shadow-green-600/20 cursor-pointer border-0"
                            >
                                {submitting ? 'Signing In...' : 'Sign In with Email'}
                            </button>
                        </form>

                        <div className="relative my-6 text-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <span className="relative bg-white px-3 text-xs text-slate-400 font-medium uppercase">
                                Or Continue With
                            </span>
                        </div>

                        <div className="flex justify-center my-3">
                            <div ref={googleBtnRef}></div>
                        </div>

                        {!GOOGLE_CLIENT_ID && (
                            <p className="text-center text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3">
                                Google Client ID is not configured.
                            </p>
                        )}

                        <p className="text-center mt-6 text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-green-600 hover:text-green-700 font-bold no-underline">
                                Register
                            </Link>
                        </p>
                    </div>
                ) : (
                    /* Pickup Agent Login Flow */
                    <form onSubmit={handleAgentSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Agent ID or Phone Number
                            </label>
                            <input
                                type="text"
                                required
                                value={agentIdentifier}
                                onChange={(e) => setAgentIdentifier(e.target.value)}
                                placeholder="e.g. AGT-XXXXXX or 9876543210"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Agent Password
                            </label>
                            <input
                                type="password"
                                required
                                value={agentPassword}
                                onChange={(e) => setAgentPassword(e.target.value)}
                                placeholder="Enter your agent password"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-600/20 cursor-pointer border-0"
                        >
                            {submitting ? 'Verifying Agent...' : 'Sign In as Pickup Agent'}
                        </button>

                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
                            <p className="text-slate-500">
                                Have an invite code?{' '}
                                <Link to="/agent/activate" className="font-bold text-emerald-600 hover:underline">
                                    Activate Account
                                </Link>
                            </p>
                            <p className="text-slate-400">
                                Need an agent account?{' '}
                                <Link to="/register" className="font-semibold text-slate-600 hover:underline">
                                    Register here
                                </Link>
                            </p>
                        </div>
                    </form>
                )}
            </div>

            {/* Popup Modal: User Not Found - Register Message */}
            {showNotFoundModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative animate-scale-up">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                            {notFoundRole === 'agent' ? '🛵' : '⚠️'}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">
                            User Not Found
                        </h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            {notFoundRole === 'agent'
                                ? 'User not found. Please register or contact your partner NGO to enroll as a pickup agent.'
                                : 'User not found. You have not registered yet. Please register first to access your HelpConnect account.'}
                        </p>
                        <div className="flex flex-col gap-2.5">
                            <Link
                                to="/register"
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-center transition shadow-md shadow-emerald-600/20 no-underline"
                            >
                                Register Now ✨
                            </Link>
                            {notFoundRole === 'agent' && (
                                <Link
                                    to="/agent/activate"
                                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-center transition no-underline"
                                >
                                    Activate Invite Code
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowNotFoundModal(false)}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer border-0 mt-1"
                            >
                                Close & Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;
