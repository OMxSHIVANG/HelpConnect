import { useState, useContext } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AgentAuthContext } from '../context/AgentAuthContext';

function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const { agent, agentLogout } = useContext(AgentAuthContext);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleAgentLogout = () => {
        agentLogout();
        navigate('/agent/login');
    };

    const close = () => setMenuOpen(false);

    const linkClass = ({ isActive }) =>
        `font-medium text-sm no-underline transition-colors duration-150 ${
            isActive ? 'text-green-600 font-semibold' : 'text-slate-600 hover:text-green-600'
        }`;

    return (
        <nav className="bg-white border-b border-slate-200 px-5 py-3.5 sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">

                {/* Logo */}
                <Link to="/" className="no-underline flex items-center gap-2" onClick={close}>
                    <span className="text-xl sm:text-2xl font-extrabold text-green-600 tracking-tight">
                        🤝 HelpConnect
                    </span>
                </Link>

                {/* Mobile toggle */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle navigation menu"
                    className="md:hidden bg-transparent border-0 text-2xl cursor-pointer text-slate-700 p-1"
                >
                    {menuOpen ? '✕' : '☰'}
                </button>

                {/* Nav links */}
                <div className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-4 flex-wrap w-full md:w-auto mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200`}>

                    <NavLink to="/" end className={linkClass} onClick={close}>Home</NavLink>
                    <NavLink to="/requirements" className={linkClass} onClick={close}>Browse Needs</NavLink>
                    <NavLink to="/ngos" className={linkClass} onClick={close}>Explore NGOs</NavLink>
                    <NavLink to="/campaigns" className={linkClass} onClick={close}>Campaigns</NavLink>
                    <a href="/#about" className="font-medium text-sm no-underline text-slate-600 hover:text-green-600 transition-colors duration-150" onClick={close}>About</a>
                    <a href="/#contact" className="font-medium text-sm no-underline text-slate-600 hover:text-green-600 transition-colors duration-150" onClick={close}>Contact</a>

                    {user && (
                        <NavLink
                            to={user.role === 'user' ? '/donor/dashboard' : user.role === 'ngo' ? '/ngo/dashboard' : '/admin/dashboard'}
                            className={linkClass}
                            onClick={close}
                        >
                            Dashboard
                        </NavLink>
                    )}

                    {user && (
                        <NavLink
                            to={user.role === 'ngo' ? '/ngo/messages' : '/donor/messages'}
                            className={linkClass}
                            onClick={close}
                        >
                            💬 Messages
                        </NavLink>
                    )}

                    {user && user.role === 'user' && (
                        <NavLink to="/donor/donations" className={linkClass} onClick={close}>My Donations</NavLink>
                    )}

                    {user && user.role === 'ngo' && (
                        <NavLink
                            to="/ngo/dashboard"
                            className={({ isActive }) =>
                                `font-semibold text-sm no-underline transition-colors duration-150 ${isActive ? 'text-green-700' : 'text-green-600 hover:text-green-700'}`
                            }
                            onClick={close}
                        >
                            NGO Portal
                        </NavLink>
                    )}

                    {user && user.role === 'admin' && (
                        <NavLink
                            to="/admin/dashboard"
                            className={({ isActive }) =>
                                `font-semibold text-sm no-underline transition-colors duration-150 ${isActive ? 'text-red-600' : 'text-red-500 hover:text-red-600'}`
                            }
                            onClick={close}
                        >
                            Admin Panel
                        </NavLink>
                    )}

                    {agent && (
                        <NavLink
                            to="/agent/dashboard"
                            className={({ isActive }) =>
                                `font-bold text-sm no-underline transition-colors duration-150 flex items-center gap-1 ${
                                    isActive ? 'text-emerald-700 font-extrabold' : 'text-emerald-600 hover:text-emerald-700'
                                }`
                            }
                            onClick={close}
                        >
                            🛵 Agent Dashboard
                        </NavLink>
                    )}

                    {user ? (
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                                to={user.role === 'ngo' ? '/ngo/profile' : user.role === 'admin' ? '/admin/profile' : '/donor/profile'}
                                onClick={close}
                                className="no-underline text-slate-800 font-semibold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full text-xs transition"
                            >
                                👤 {user.name} ({user.role.toUpperCase()})
                            </Link>
                            <button
                                onClick={() => { close(); handleLogout(); }}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition cursor-pointer border-0"
                            >
                                Logout
                            </button>
                        </div>
                    ) : agent ? (
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                                to="/agent/dashboard"
                                onClick={close}
                                className="no-underline text-emerald-900 font-bold bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-full text-xs transition border border-emerald-300"
                            >
                                🛵 {agent.fullName} ({agent.agentId})
                            </Link>
                            <button
                                onClick={() => { close(); handleAgentLogout(); }}
                                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3.5 py-1.5 rounded-md text-xs transition cursor-pointer border-0"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                to="/agent/login"
                                onClick={close}
                                className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 no-underline px-3 py-1.5 rounded-md font-bold text-xs transition flex items-center gap-1"
                            >
                                🛵 Agent Portal
                            </Link>
                            <Link
                                to="/login"
                                onClick={close}
                                className="border border-slate-300 hover:border-green-500 text-slate-700 hover:text-green-700 no-underline px-3.5 py-1.5 rounded-md font-semibold text-xs transition"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                onClick={close}
                                className="bg-green-600 hover:bg-green-700 text-white no-underline px-3.5 py-1.5 rounded-md font-semibold text-xs transition"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;