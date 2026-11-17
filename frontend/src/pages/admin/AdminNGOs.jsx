import { useState, useEffect } from 'react';
import API from '../../services/api';
import Loading from '../../components/Loading';

export default function AdminNGOs() {
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters
  const [tab, setTab] = useState('all'); // all, pending, verified
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadNGOs = () => {
    API.get('/admin/ngos')
      .then((res) => {
        setNgos(Array.isArray(res.data) ? res.data : []);
        setError('');
      })
      .catch((err) => {
        console.error('Failed to fetch NGOs:', err);
        setError(err.response?.data?.message || 'Failed to load NGO listings.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNGOs();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadNGOs();
  };

  const handleSetVerification = async (ngoId, verifyStatus) => {
    setActionLoadingId(ngoId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await API.put(`/admin/ngos/${ngoId}/verify`, { isVerified: verifyStatus });
      setSuccessMsg(
        verifyStatus
          ? 'NGO profile verified successfully.'
          : 'NGO verification status marked as pending / rejected.'
      );
      setNgos((prev) =>
        prev.map((ngo) => (ngo._id === ngoId ? { ...ngo, isVerified: res.data.isVerified } : ngo))
      );
    } catch (err) {
      console.error('Failed to update NGO verification:', err);
      setError(err.response?.data?.message || 'Failed to update NGO status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteNGO = async (ngoId) => {
    if (!window.confirm('Are you sure you want to delete this NGO? This will remove all posted requirements and related donations.')) {
      return;
    }

    setActionLoadingId(ngoId);
    setError('');
    setSuccessMsg('');
    try {
      await API.delete(`/admin/ngos/${ngoId}`);
      setSuccessMsg('NGO and associated requirements deleted successfully.');
      setNgos((prev) => prev.filter((ngo) => ngo._id !== ngoId));
    } catch (err) {
      console.error('Failed to delete NGO:', err);
      setError(err.response?.data?.message || 'Failed to delete NGO.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered NGOs
  const filteredNGOs = ngos.filter((ngo) => {
    const matchesTab =
      tab === 'all' ||
      (tab === 'verified' && ngo.isVerified) ||
      (tab === 'pending' && !ngo.isVerified);

    const nameMatch = (ngo.ngoName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const regMatch = (ngo.registrationNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const cityMatch = (ngo.city || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && (nameMatch || regMatch || cityMatch);
  });

  const totalPages = Math.ceil(filteredNGOs.length / itemsPerPage) || 1;
  const paginatedNGOs = filteredNGOs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pendingCount = ngos.filter((n) => !n.isVerified).length;
  const verifiedCount = ngos.filter((n) => n.isVerified).length;

  if (loading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">NGO Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review registration certificates and verify community organizations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer border-0"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl text-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-2 md:border-b-0 md:pb-0 overflow-x-auto flex-wrap">
            <button
              onClick={() => {
                setTab('all');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-0 ${
                tab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All NGOs ({ngos.length})
            </button>

            <button
              onClick={() => {
                setTab('pending');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-0 flex items-center gap-1.5 ${
                tab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span>Pending Registration</span>
              <span className="bg-amber-500/30 px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => {
                setTab('verified');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-0 flex items-center gap-1.5 ${
                tab === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span>Verified NGOs</span>
              <span className="bg-emerald-500/30 px-1.5 py-0.2 rounded-full text-[10px]">
                {verifiedCount}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="w-full md:w-80 relative">
            <input
              type="text"
              placeholder="Search by NGO name, reg no, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
        </div>
      </div>

      {/* NGOs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <th className="py-3.5 px-4 font-semibold">NGO Name</th>
                <th className="py-3.5 px-4 font-semibold">Reg. Number</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th className="py-3.5 px-4 font-semibold">Contact / User</th>
                <th className="py-3.5 px-4 font-semibold">Account Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedNGOs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="text-4xl mb-2">🏢</div>
                    <p className="font-medium text-slate-600">No NGOs match the criteria</p>
                    <p className="text-xs text-slate-400">Try switching tabs or adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedNGOs.map((ngo) => (
                  <tr key={ngo._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{ngo.ngoName}</div>
                      {ngo.ngoType && (
                        <div className="text-xs text-slate-400">{ngo.ngoType}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {ngo.registrationNumber || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div>{ngo.city || '-'}</div>
                      <div className="text-xs text-slate-400">{ngo.state || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="text-xs font-semibold text-slate-800">{ngo.phone || '-'}</div>
                      <div className="text-xs text-slate-400">{ngo.user?.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          ngo.isVerified
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ngo.isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {ngo.isVerified ? 'VERIFIED ✓' : 'PENDING'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ngo.isVerified ? (
                          <button
                            onClick={() => handleSetVerification(ngo._id, false)}
                            disabled={actionLoadingId === ngo._id}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer disabled:opacity-50"
                          >
                            {actionLoadingId === ngo._id ? '...' : 'Revoke'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetVerification(ngo._id, true)}
                            disabled={actionLoadingId === ngo._id}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer disabled:opacity-50 shadow-xs"
                          >
                            {actionLoadingId === ngo._id ? '...' : 'Verify ✓'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNGO(ngo._id)}
                          disabled={actionLoadingId === ngo._id}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredNGOs.length)} of {filteredNGOs.length}{' '}
              results
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs font-semibold text-slate-700 flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
