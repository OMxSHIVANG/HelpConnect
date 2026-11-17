import { useState, useEffect, useContext } from 'react';
import API from '../../services/api';
import Loading from '../../components/Loading';
import { AuthContext } from '../../context/AuthContext';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

export default function AdminUsers() {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUser, setPreviewUser] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, user, ngo, admin
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, suspended

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadUsers = () => {
    API.get('/admin/users')
      .then((res) => {
        setUsers(res.data);
        setError('');
      })
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        setError(err.response?.data?.message || 'Failed to load user accounts.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadUsers();
  };

  const handleToggleSuspend = async (userId, currentStatus) => {
    setActionLoadingId(userId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await API.put(`/admin/users/${userId}/suspend`);
      setSuccessMsg(res.data.message || `User status updated successfully.`);
      // Update local state directly
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId
            ? { ...u, isActive: res.data.user ? res.data.user.isActive : !currentStatus }
            : u
        )
      );
    } catch (err) {
      console.error('Failed to toggle suspension:', err);
      setError(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will remove all associated profiles and data.')) {
      return;
    }

    setActionLoadingId(userId);
    setError('');
    setSuccessMsg('');
    try {
      await API.delete(`/admin/users/${userId}`);
      setSuccessMsg('User account deleted successfully.');
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.message || 'Failed to delete user account.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const nameMatch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || emailMatch;

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    const isActive = u.isActive !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'suspended' && !isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">ADMIN</span>;
      case 'ngo':
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">NGO</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">DONOR</span>;
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Total {users.length} registered accounts across donors, NGO representatives, and system administrators.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer border-0 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh
        </button>
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

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Roles</option>
            <option value="user">Donors / Users</option>
            <option value="ngo">NGO Accounts</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                <th className="py-3.5 px-4 font-semibold">User</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold">Phone / City</th>
                <th className="py-3.5 px-4 font-semibold">Registered</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="text-4xl mb-2">👤</div>
                    <p className="font-medium text-slate-600">No users found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isActive = u.isActive !== false;
                  const isSelf = currentUser?._id === u._id;
                  const initials = (u.name || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              onClick={() => setPreviewUser(u)}
                              title="Click to view photo in medium size"
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 hover:opacity-90 transition"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              {u.name}
                              {isSelf && (
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{u.phone || '-'}</div>
                        <div className="text-xs text-slate-400">{u.city || u.location || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleToggleSuspend(u._id, isActive)}
                                disabled={actionLoadingId === u._id}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition border cursor-pointer disabled:opacity-50 ${
                                  isActive
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {actionLoadingId === u._id
                                  ? '...'
                                  : isActive
                                  ? 'Suspend'
                                  : 'Unsuspend'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u._id)}
                                disabled={actionLoadingId === u._id}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}{' '}
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

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={Boolean(previewUser)}
        onClose={() => setPreviewUser(null)}
        photoUrl={previewUser?.avatar}
        name={previewUser?.name}
        subtitle={`${previewUser?.role?.toUpperCase()} Profile Photo`}
      />
    </div>
  );
}
