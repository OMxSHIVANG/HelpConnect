import { useState, useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

const navItems = [
  { to: '/donor/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/donor/impact-passport', icon: '🛂', label: 'My Impact Passport' },
  { to: '/donor/smart-match', icon: '✨', label: 'Smart Item Match' },
  { to: '/donor/pickups', icon: '🚚', label: 'My Pickup Appointments' },
  { to: '/donor/recurring', icon: '🔁', label: 'Recurring Commitments' },
  { to: '/donor/profile', icon: '👤', label: 'My Profile' },
  { to: '/donor/donations', icon: '📦', label: 'My Donations' },
  { to: '/donor/messages', icon: '💬', label: 'Messages' },
  { to: '/donor/favourites', icon: '❤️', label: 'Favourite NGOs' },
  { to: '/donor/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/donor/settings', icon: '⚙️', label: 'Settings' },
];

export default function DonorLayout() {
  const { user, logout } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D';

  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              onClick={() => setPhotoModalOpen(true)}
              title="Click to view photo in medium size"
              className="w-10 h-10 rounded-full object-cover border-2 border-green-200 cursor-pointer hover:ring-2 hover:ring-green-400 hover:opacity-90 transition"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">{initials}</div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{user?.name}</p>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">DONOR</span>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors no-underline ${isActive ? 'bg-green-50 text-green-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            onClick={() => setSidebarOpen(false)}>
            <span className="text-sm">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent text-left">
          <span className="text-sm">🚪</span> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-60 md:flex-shrink-0">
        {renderSidebar()}
      </div>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-60 bg-white z-50">
            {renderSidebar()}
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="text-xl text-slate-700 bg-transparent border-0 cursor-pointer p-1">☰</button>
          <span className="font-bold text-green-600">🤝 HelpConnect</span>
        </div>
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photoUrl={user?.avatar}
        name={user?.name}
        subtitle="Donor Profile Photo"
      />
    </div>
  );
}
