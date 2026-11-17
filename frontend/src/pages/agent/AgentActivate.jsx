import { useState, useContext } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AgentAuthContext } from '../../context/AgentAuthContext';

export default function AgentActivate() {
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState(() => searchParams.get('token') || '');
    const [agentId, setAgentId] = useState(() => searchParams.get('agentId') || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { agentActivate } = useContext(AgentAuthContext);
    const navigate = useNavigate();

    const handleActivate = async (e) => {
        e.preventDefault();
        setError('');

        if (!token.trim()) {
            setError('Activation token is required. Please check your invitation link.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const data = await agentActivate({
                activationToken: token.trim(),
                agentId: agentId.trim().toUpperCase(),
                password,
                confirmPassword
            });

            if (data?.success) {
                alert('Account activated successfully! Welcome to HelpConnect Logistics.');
                navigate('/agent/dashboard', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Activation failed. The token may be expired or invalid.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-center">
                    <span className="text-4xl block mb-2">🎉</span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Activate Agent Account</h2>
                    <p className="mt-2 text-xs text-slate-500 font-medium">
                        Set up your secure password to start accepting donation pickups
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={handleActivate}>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Activation Token
                        </label>
                        <input
                            type="text"
                            required
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Enter the activation token received from NGO"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Agent ID (Optional / Auto-filled)
                        </label>
                        <input
                            type="text"
                            value={agentId}
                            onChange={(e) => setAgentId(e.target.value)}
                            placeholder="e.g. AGT-XXXXXX"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Create New Password (min. 6 characters)
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Choose a strong password"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-600/20 cursor-pointer border-0 mt-2"
                    >
                        {submitting ? 'Activating Account...' : 'Complete Activation & Login'}
                    </button>
                </form>

                <div className="pt-4 border-t border-slate-100 text-center text-xs">
                    <p className="text-slate-500">
                        Already activated?{' '}
                        <Link to="/agent/login" className="font-bold text-emerald-600 hover:underline">
                            Sign In to Agent Portal
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
