import { useState, useEffect } from 'react';
import API from '../../services/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleRefresh = (pageNum = 1) => {
    setLoading(true);
    API.get(`/admin/audit-logs?page=${pageNum}&limit=25`)
      .then((res) => {
        if (res.data.success) {
          setLogs(res.data.logs || []);
          setTotalPages(res.data.pages || 1);
          setTotalLogs(res.data.total || 0);
          setPage(res.data.page || 1);
        }
      })
      .catch((err) => console.error('Fetch audit logs error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    API.get(`/admin/audit-logs?page=${page}&limit=25`)
      .then((res) => {
        if (active && res.data.success) {
          setLogs(res.data.logs || []);
          setTotalPages(res.data.pages || 1);
          setTotalLogs(res.data.total || 0);
        }
      })
      .catch((err) => console.error('Fetch audit logs error:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const action = log.action?.toLowerCase() || '';
    const performer = log.performedBy?.name?.toLowerCase() || '';
    const code = log.donation?.verificationCode?.toLowerCase() || '';
    const ngo = log.donation?.ngo?.ngoName?.toLowerCase() || '';
    return action.includes(term) || performer.includes(term) || code.includes(term) || ngo.includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📜 System Audit & Compliance Logs</h1>
          <p className="text-slate-500 text-sm">
            Immutable blockchain-style event ledger recording every donation status change, actor, and verification hash.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Total Logged Events: {totalLogs}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by action, actor, verification code, or NGO..."
          className="flex-1 max-w-md px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button
          onClick={() => handleRefresh(1)}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Retrieving tamper-evident audit records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No audit records found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">State Transition</th>
                  <th className="px-4 py-3">Donation / Code</th>
                  <th className="px-4 py-3">Performed By</th>
                  <th className="px-4 py-3">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString();
                  return (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 font-sans">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] uppercase font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <span className="text-slate-400">{log.fromStatus || 'none'}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="font-bold text-slate-800">{log.toStatus || 'active'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-sans">
                          {log.donation?.verificationCode || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Qty: {log.donation?.quantity || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <div className="font-semibold text-slate-800">{log.performedBy?.name || 'System Actor'}</div>
                        <div className="text-[10px] text-slate-400">Role: {log.performerRole || 'system'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-sans max-w-xs truncate">
                        {log.notes || 'Status updated via authenticated API'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
