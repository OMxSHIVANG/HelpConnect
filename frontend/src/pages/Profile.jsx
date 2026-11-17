import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Profile() {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-slate-500 text-sm">
                Loading profile...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === 'ngo') {
        return <Navigate to="/ngo/profile" replace />;
    }

    if (user.role === 'admin') {
        return <Navigate to="/admin/profile" replace />;
    }

    // Default to donor dashboard profile
    return <Navigate to="/donor/profile" replace />;
}

export default Profile;
