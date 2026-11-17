import { useState, useEffect } from 'react';
import API from '../../services/api';
import Loading from '../../components/Loading';

export default function AdminDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadDonations = () => {
    API.get('/admin/donations')
      .then((res) => {
        setDonations(res.data);
        setError('');
      })
      .catch((err) => {
        console.error('Failed to fetch donations:', err);
        setError(err.response?.data?.message || 'Failed to load platform donation records.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadDonations();
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Completed</span>;
      case 'accepted':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Accepted</span>;
      case 'pickup_scheduled':
        return <span className="bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Pickup Scheduled</span>;
      case 'picked_up':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Picked Up</span>;
      case 'received':
        return <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Received</span>;
      case 'distributed':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Distributed</span>;
      case 'rejected':
        return <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Rejected</span>;
      case 'cancelled':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Cancelled</span>;
      default:
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold">Pending</span>;
    }
  };

  // Filter donations
  const filteredDonations = donations.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const donorName = d.donor?.name || '';
    const reqTitle = d.requirement?.title || '';
    const ngoName = d.ngo?.ngoName || '';
    const matchesSearch =
      donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reqTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ngoName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage) || 1;
  const paginatedDonations = filteredDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Donations</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete transaction ledger of relief goods and supplies pledged between donors and NGOs.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer border-0 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search by donor, NGO, or item..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Statuses ({donations.length})</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="picked_up">Picked Up</option>
            <option value="received">Received</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <th className="py-3.5 px-4 font-semibold w-12">#</th>
                <th className="py-3.5 px-4 font-semibold">Requirement / Category</th>
                <th className="py-3.5 px-4 font-semibold">Donor</th>
                <th className="py-3.5 px-4 font-semibold">NGO</th>
                <th className="py-3.5 px-4 font-semibold text-center">Qty</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDonations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="text-4xl mb-2">📦</div>
                    <p className="font-medium text-slate-600">No donations found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search criteria or status filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedDonations.map((d, index) => {
                  const isExpanded = expandedId === d._id;
                  const itemNumber = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr key={d._id} className="group hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{itemNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{d.requirement?.title || 'Direct Donation'}</div>
                        <div className="text-xs text-slate-400 capitalize">{d.requirement?.category || d.category || 'General'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{d.donor?.name || 'Anonymous'}</div>
                        <div className="text-xs text-slate-400">{d.donor?.email || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{d.ngo?.ngoName || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-center text-slate-900">{d.quantity}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(d.status)}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => toggleExpand(d._id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border-0"
                        >
                          {isExpanded ? 'Hide ▲' : 'View ▼'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Expanded Row Detail Drawer */}
        {expandedId && (
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            {(() => {
              const d = donations.find((x) => x._id === expandedId);
              if (!d) return null;
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Item & Notes</h4>
                    <p className="text-sm font-semibold text-slate-800">{d.requirement?.title || 'Direct Donation'}</p>
                    <p className="text-xs text-slate-600 mt-1 italic">
                      "{d.notes || d.description || 'No notes provided by donor.'}"
                    </p>
                    {d.extraItems && (
                      <div className="mt-2 text-xs font-bold text-purple-700 bg-purple-50 p-2 rounded-lg">
                        🎁 Extra Items: {d.extraItems}
                      </div>
                    )}
                    {d.pickupAddress && (
                      <div className="mt-3 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Pickup Address: </span>
                        {d.pickupAddress}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Parties Involved</h4>
                    <p className="text-xs text-slate-700">
                      <span className="font-semibold">Donor: </span>
                      {d.donor?.name} ({d.donor?.email})
                    </p>
                    <p className="text-xs text-slate-700 mt-1">
                      <span className="font-semibold">Recipient NGO: </span>
                      {d.ngo?.ngoName}
                    </p>
                    <p className="text-xs text-slate-700 mt-1">
                      <span className="font-semibold">Quantity: </span>
                      {d.quantity} units
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">System Audit</h4>
                    <p className="text-xs text-slate-500 font-mono">ID: {d._id}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Created: {new Date(d.createdAt).toLocaleString()}
                    </p>
                    {d.updatedAt && (
                      <p className="text-xs text-slate-500 mt-1">
                        Updated: {new Date(d.updatedAt).toLocaleString()}
                      </p>
                    )}
                    <div className="mt-3">
                      <button
                        onClick={() => toggleExpand(d._id)}
                        className="text-xs text-red-600 hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0"
                      >
                        Close Detail View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredDonations.length)} of{' '}
              {filteredDonations.length} records
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
