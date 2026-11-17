import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AgentAuthContext } from '../context/AgentAuthContext';

export default function AgentProtectedRoute() {
    const { agent, agentToken, loading } = useContext(AgentAuthContext);
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-500 font-semibold text-sm">Verifying Pickup Agent Authentication...</p>
                </div>
            </div>
        );
    }

    if (!agentToken || !agent) {
        return <Navigate to="/agent/login" state={{ from: location }} replace />;
    }

    if (agent.status !== 'active') {
        return (
            <div className="max-w-md mx-auto my-16 p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
                <span className="text-4xl block mb-2">🚫</span>
                <h2 className="text-xl font-bold text-red-900 mb-2">Account Inactive</h2>
                <p className="text-sm text-red-700 mb-4">
                    Your pickup agent account has been deactivated. Please contact your NGO coordinator to reactivate your credentials.
                </p>
                <button
                    onClick={() => {
                        localStorage.removeItem('agentToken');
                        localStorage.removeItem('agentUser');
                        window.location.href = '/agent/login';
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                    Return to Agent Login
                </button>
            </div>
        );
    }

    return <Outlet />;
}
