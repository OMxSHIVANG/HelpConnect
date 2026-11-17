import { useState, useContext } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const navItems = [
  { to: '/admin/dashboard', icon: '📊', label: 'Overview' },
  { to: '/admin/profile', icon: '👤', label: 'Admin Profile' },
  { to: '/admin/alerts', icon: '🚨', label: 'Anomaly Alerts' },
  { to: '/admin/audit-logs', icon: '📜', label: 'Audit Logs' },
  { to: '/admin/campaigns', icon: '🎯', label: 'Campaigns' },
  { to: '/admin/reviews', icon: '⭐', label: 'Donor Reviews' },
  { to: '/admin/users', icon: '👥', label: 'Manage Users' },
  { to: '/admin/ngos', icon: '🏢', label: 'Manage NGOs' },
  { to: '/admin/donations', icon: '📦', label: 'All Donations' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout() {
  const { user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-5 border-b border-slate-700">
        <Link to="/admin/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold group-hover:bg-red-600 transition">🛡</div>
          <div>
            <p className="font-bold text-white text-sm group-hover:text-red-300 transition">{user?.name}</p>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors no-underline ${isActive ? 'bg-slate-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            onClick={() => setSidebarOpen(false)}>
            <div className="flex items-center gap-3">
              <span>{item.icon}</span>{item.label}
            </div>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-slate-800 transition cursor-pointer border-0 bg-transparent text-left">
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <div className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0">{renderSidebar()}</div>
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-60 z-50">{renderSidebar()}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 text-white">
          <button onClick={() => setSidebarOpen(true)} className="text-xl bg-transparent border-0 cursor-pointer text-white p-1">☰</button>
          <span className="font-bold">🛡 Admin Panel</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
