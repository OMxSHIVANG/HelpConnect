import { useState, useEffect } from 'react';
import API from '../../services/api';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'donation_accepted':
      return { icon: '🎉', bg: 'bg-blue-100 text-blue-700' };
    case 'donation_completed':
      return { icon: '✅', bg: 'bg-green-100 text-green-700' };
    case 'donation_picked_up':
      return { icon: '🚚', bg: 'bg-purple-100 text-purple-700' };
    case 'donation_rejected':
      return { icon: '❌', bg: 'bg-red-100 text-red-700' };
    case 'donation_new':
      return { icon: '📦', bg: 'bg-yellow-100 text-yellow-700' };
    case 'ngo_verified':
      return { icon: '🛡️', bg: 'bg-emerald-100 text-emerald-700' };
    case 'requirement_fulfilled':
      return { icon: '🎯', bg: 'bg-indigo-100 text-indigo-700' };
    default:
      return { icon: '🔔', bg: 'bg-slate-100 text-slate-700' };
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return 'Just now';
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h ago`;
  if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function DonorNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = () => {
    API.get('/donor/notifications')
      .then(r => {
        setNotifications(r.data.notifications || []);
        setUnreadCount(r.data.unreadCount || 0);
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await API.put('/donor/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOneRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await API.put(`/donor/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-sm">Loading notifications...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">Updates on your donation offers and favorite NGOs.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer border-0 transition disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark All as Read'}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {notifications.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <p className="text-5xl mb-3">🔔</p>
          <h3 className="text-lg font-bold text-slate-800">No notifications yet</h3>
          <p className="text-slate-500 text-sm mt-1">
            When NGOs respond to your donations, you'll see alerts here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map(notif => {
            const { icon, bg } = getNotificationIcon(notif.type);
            return (
              <div
                key={notif._id}
                onClick={() => handleMarkOneRead(notif._id, notif.isRead)}
                className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer ${
                  notif.isRead ? 'hover:bg-slate-50 opacity-80' : 'bg-green-50/30 hover:bg-green-50/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${bg}`}>
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${notif.isRead ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {!notif.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" title="Unread" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
