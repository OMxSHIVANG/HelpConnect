import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = () => {
    setLoading(true);
    API.get('/admin/suspicious-alerts')
      .then((res) => {
        if (res.data.success) {
          setAlerts(res.data.alerts || []);
        }
      })
      .catch((err) => console.error('Fetch alerts error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get('/admin/suspicious-alerts')
      .then((res) => {
        if (active && res.data.success) {
          setAlerts(res.data.alerts || []);
        }
      })
      .catch((err) => console.error('Fetch alerts error:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">HIGH SEVERITY</span>;
      case 'medium':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">MEDIUM</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">NOTICE</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🚨 Fraud Prevention & Anomaly Alerts</h1>
          <p className="text-slate-500 text-sm">
            Real-time heuristic anomaly detection monitoring donation spam, cancellation spikes, and unverified backlogs.
          </p>
        </div>
        <button
          onClick={loadAlerts}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer border-0"
        >
          ↻ Scan Now
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Scanning activity patterns...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <span className="text-4xl block mb-2">🛡️</span>
          <h2 className="text-base font-bold text-slate-900">Platform Activity Normal</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No high-frequency anomalies, spam patterns, or unusual cancellation spikes detected in the last 24 hours.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(alert.severity)}
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {alert.description}
                </p>
                <div className="text-[10px] text-slate-400">
                  Detected: {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {alert.actionUrl ? (
                  <Link
                    to={alert.actionUrl}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold no-underline transition"
                  >
                    Investigate
                  </Link>
                ) : (
                  <Link
                    to="/admin/donations"
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold no-underline transition"
                  >
                    Review Activity
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
