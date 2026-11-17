import { useState, useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

const navItems = [
  { to: '/ngo/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/ngo/profile', icon: '🏢', label: 'Organization Profile' },
  { to: '/ngo/transparency', icon: '🛡️', label: 'Transparency Score' },
  { to: '/ngo/pickups', icon: '🚚', label: 'Pickup Calendar' },
  { to: '/ngo/agents', icon: '🛵', label: 'Manage Pickup Agents' },
  { to: '/ngo/campaigns', icon: '🎯', label: 'Impact Campaigns' },
  { to: '/ngo/donations', icon: '📥', label: 'Donation Requests' },
  { to: '/ngo/create-requirement', icon: '➕', label: 'Create Requirement' },
  { to: '/ngo/requirements', icon: '📋', label: 'Manage Requirements' },
  { to: '/ngo/donors', icon: '👥', label: 'Donor List' },
  { to: '/ngo/messages', icon: '💬', label: 'Messages' },
  { to: '/ngo/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/ngo/settings', icon: '⚙️', label: 'Settings' },
];

export default function NGOLayout() {
  const { user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };
  const ngoName = user?.ngoProfile?.ngoName || user?.name || 'NGO';
  const initials = ngoName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-100 bg-green-700">
        <div className="flex items-center gap-3">
          {user?.ngoProfile?.logo ? (
            <img
              src={user.ngoProfile.logo}
              alt={ngoName}
              onClick={() => setPhotoModalOpen(true)}
              title="Click to view logo in medium size"
              className="w-10 h-10 rounded-full object-cover border-2 border-green-300 cursor-pointer hover:ring-2 hover:ring-white hover:opacity-90 transition"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-green-700 font-bold text-sm">{initials}</div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{ngoName}</p>
            {user?.ngoProfile?.isVerified ? (
              <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">✓ VERIFIED</span>
            ) : (
              <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">PENDING</span>
            )}
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors no-underline ${isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            onClick={() => setSidebarOpen(false)}>
            <span className="text-sm">{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent text-left">
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0">{renderSidebar()}</div>
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-60 bg-white z-50">{renderSidebar()}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-xl text-slate-700 bg-transparent border-0 cursor-pointer p-1">☰</button>
          <span className="font-bold text-green-600">🤝 HelpConnect NGO</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6"><Outlet /></main>
      </div>

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photoUrl={user?.ngoProfile?.logo}
        name={ngoName}
        subtitle="NGO Organization Logo"
      />
    </div>
  );
}
