import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AgentAuthContext } from '../../context/AgentAuthContext';

export default function AgentLogin() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);

    const { agentLogin } = useContext(AgentAuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/agent/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!identifier.trim()) {
            setError('Please enter your Agent ID (e.g. AGT-XXXXXX) or mobile number');
            return;
        }

        if (!password) {
            setError('Please enter your password');
            return;
        }

        setSubmitting(true);
        try {
            const data = await agentLogin(identifier.trim(), password);
            if (data?.success) {
                navigate(from, { replace: true });
            }
        } catch (err) {
            if (err.response?.status === 404 || err.response?.data?.notFound || err.response?.data?.notRegistered) {
                setShowNotFoundModal(true);
                setError(err.response?.data?.message || 'User not found. Please register.');
            } else if (err.response?.data?.notActivated) {
                setError('Account pending activation. Please use your activation invite link or click below to activate.');
            } else {
                setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-center">
                    <span className="text-4xl block mb-2">🛵</span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Agent Portal</h2>
                    <p className="mt-2 text-xs text-slate-500 font-medium">
                        Secure logistics authentication for HelpConnect delivery partners
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Agent ID or Registered Phone
                        </label>
                        <input
                            type="text"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="e.g. AGT-MEERUT-01 or 9876543210"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
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
                            placeholder="Enter your secure password"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-600/20 cursor-pointer border-0"
                    >
                        {submitting ? 'Verifying Credentials...' : 'Sign In to Agent Dashboard'}
                    </button>
                </form>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs">
                    <p className="text-slate-500">
                        Received an invite code from your NGO?{' '}
                        <Link to="/agent/activate" className="font-bold text-emerald-600 hover:underline">
                            Activate Account
                        </Link>
                    </p>
                    <Link to="/" className="text-slate-400 hover:text-slate-600 font-medium">
                        ← Back to HelpConnect Main Site
                    </Link>
                </div>
            </div>

            {/* Popup Modal: User Not Found */}
            {showNotFoundModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                            🛵
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">
                            User Not Found
                        </h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            No active pickup agent account was found matching <strong className="text-slate-900">{identifier}</strong>. You have not registered or activated your agent profile yet.
                        </p>
                        <div className="flex flex-col gap-2.5">
                            <Link
                                to="/register"
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-center transition shadow-md shadow-emerald-600/20 no-underline"
                            >
                                Register New Account
                            </Link>
                            <Link
                                to="/agent/activate"
                                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-center transition no-underline"
                            >
                                Activate with Invite Code
                            </Link>
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
