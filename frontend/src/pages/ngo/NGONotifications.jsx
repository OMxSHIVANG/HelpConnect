import { useState, useEffect } from 'react';
import API from '../../services/api';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'donation_new':
      return { icon: '📦', bg: 'bg-green-100 text-green-700' };
    case 'donation_accepted':
      return { icon: '✅', bg: 'bg-blue-100 text-blue-700' };
    case 'donation_completed':
      return { icon: '🏆', bg: 'bg-emerald-100 text-emerald-700' };
    case 'donation_picked_up':
      return { icon: '🚚', bg: 'bg-purple-100 text-purple-700' };
    case 'donation_rejected':
      return { icon: '❌', bg: 'bg-red-100 text-red-700' };
    case 'ngo_verified':
      return { icon: '🛡️', bg: 'bg-green-100 text-green-800' };
    case 'ngo_rejected':
      return { icon: '⚠️', bg: 'bg-amber-100 text-amber-800' };
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

export default function NGONotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let ignore = false;
    API.get('/donor/notifications')
      .then(r => {
        if (!ignore) {
          setNotifications(r.data.notifications || []);
          setUnreadCount(r.data.unreadCount || 0);
        }
      })
      .catch(e => {
        if (!ignore) {
          setError(e.response?.data?.message || 'Failed to load notifications');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
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
            <h1 className="text-2xl font-extrabold text-slate-900">Notifications 🔔</h1>
            {unreadCount > 0 && (
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time updates about donation requests, verifications, and community activities.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3.5 py-2 rounded-lg transition border border-green-200 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">📭</p>
          <h3 className="font-bold text-slate-800 text-base">No notifications yet</h3>
          <p className="text-slate-500 text-sm mt-1">
            When donors submit donations or requirements are updated, alerts will show here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const { icon, bg } = getNotificationIcon(n.type);
            return (
              <div
                key={n._id}
                onClick={() => handleMarkOneRead(n._id, n.isRead)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-4 ${
                  n.isRead
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-green-50/40 border-green-200 hover:border-green-300 shadow-2xs'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${bg}`}>
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-bold truncate ${n.isRead ? 'text-slate-800' : 'text-slate-900'}`}>
                      {n.title}
                    </h4>
                    <span className="text-2xs text-slate-400 whitespace-nowrap flex-shrink-0">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>

                {!n.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-green-600 flex-shrink-0 self-center" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
