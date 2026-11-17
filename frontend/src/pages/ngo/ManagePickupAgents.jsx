import { useState, useEffect, useCallback } from 'react';
import API from '../../services/api';
import ProfilePhotoModal from '../../components/ProfilePhotoModal';

const VEHICLE_OPTIONS = ['Bike', 'Scooter', 'Car', 'Auto Rickshaw', 'Van', 'Mini Truck', 'Other'];

export default function ManagePickupAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [selectedAgentOrders, setSelectedAgentOrders] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [inviteModalData, setInviteModalData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    address: '',
    additionalDetails: '',
    profilePhoto: '',
    password: '',
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const res = await API.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.url || res.data?.imageUrl;
      if (url) {
        setFormData(prev => ({ ...prev, profilePhoto: url }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const refetchAgents = useCallback(async () => {
    try {
      setError('');
      const res = await API.get('/agents');
      if (res.data.success) {
        setAgents(res.data.agents || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pickup agents');
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    API.get('/agents')
      .then(res => {
        if (!ignore && res.data.success) {
          setAgents(res.data.agents || []);
        }
      })
      .catch(err => {
        if (!ignore) {
          setError(err.response?.data?.message || 'Failed to load pickup agents');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      vehicleType: 'Bike',
      vehicleNumber: '',
      address: '',
      additionalDetails: '',
      profilePhoto: '',
      password: '',
      status: 'active'
    });
  };

  const handleGenerateInvite = async (agent) => {
    try {
      const res = await API.post(`/agents/${agent._id}/invite`);
      if (res.data?.success) {
        setInviteModalData({
          agent: { ...agent, activationToken: res.data.activationToken },
          activationLink: res.data.activationLink,
          activationToken: res.data.activationToken
        });
        setAgents(prev => prev.map(a => (a._id === agent._id ? {
          ...a,
          activationToken: res.data.activationToken,
          isActivated: false
        } : a)));
        setSuccessMsg(`Activation token generated for "${agent.fullName}"!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate invitation link');
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      fullName: agent.fullName || '',
      phone: agent.phone || '',
      vehicleType: agent.vehicleType || 'Bike',
      vehicleNumber: agent.vehicleNumber || '',
      address: agent.address || '',
      additionalDetails: agent.additionalDetails || '',
      profilePhoto: agent.profilePhoto || '',
      status: agent.status || 'active'
    });
  };

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      setError('Agent full name must be at least 2 characters');
      return;
    }
    const cleanedPhone = (formData.phone || '').trim().replace(/[\s-]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanedPhone)) {
      setError('Please enter a valid 10 to 15 digit mobile number');
      return;
    }
    if (!formData.vehicleNumber || formData.vehicleNumber.trim().length < 4) {
      setError('Vehicle registration number must be at least 4 characters');
      return;
    }

    setSubmitting(true);

    try {
      if (editingAgent) {
        const res = await API.put(`/agents/${editingAgent._id}`, formData);
        if (res.data.success) {
          setSuccessMsg(`Agent "${res.data.agent.fullName}" updated successfully!`);
          setEditingAgent(null);
          refetchAgents();
        }
      } else {
        const res = await API.post('/agents', formData);
        if (res.data.success) {
          setSuccessMsg(`Agent "${res.data.agent.fullName}" registered with ID: ${res.data.agent.agentId}!`);
          setShowAddModal(false);
          resetForm();
          refetchAgents();

          if (res.data.activationLink || res.data.activationToken) {
            setInviteModalData({
              agent: res.data.agent,
              activationLink: res.data.activationLink,
              activationToken: res.data.activationToken
            });
          }
        }
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save agent details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent) => {
    const nextStatus = agent.status === 'active' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${nextStatus} agent ${agent.fullName}?`)) {
      return;
    }

    try {
      const res = await API.patch(`/agents/${agent._id}/status`);
      if (res.data.success) {
        setSuccessMsg(`Agent ${agent.fullName} is now ${res.data.agent.status}`);
        setAgents(prev => prev.map(a => (a._id === agent._id ? { ...a, status: res.data.agent.status } : a)));
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update agent status');
    }
  };

  const handleViewOrders = async (agent) => {
    setSelectedAgentOrders({ agent, orders: [] });
    setOrdersLoading(true);
    try {
      const res = await API.get(`/agents/${agent._id}/orders`);
      if (res.data.success) {
        setSelectedAgentOrders({ agent, orders: res.data.orders || [] });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to fetch agent orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const inactiveAgents = totalAgents - activeAgents;
  const totalPickups = agents.reduce((acc, curr) => acc + (curr.totalOrdersCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="bg-emerald-500/30 text-emerald-100 text-xs font-black uppercase px-3 py-1 rounded-full border border-emerald-400/30 inline-block mb-2">
            🛵 Authorized Logistics
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Manage Pickup Agents
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            Register, manage and assign verified field pickup agents for door-to-door donation collections.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-sm px-5 py-3 rounded-2xl shadow-md transition cursor-pointer self-start md:self-center flex items-center gap-2"
        >
          <span>➕</span>
          <span>Register New Agent</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-sm font-bold flex items-center gap-2">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Agents</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalAgents}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-emerald-600 uppercase">Active Agents</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{activeAgents}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase">Inactive Agents</p>
          <p className="text-2xl font-black text-slate-400 mt-1">{inactiveAgents}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-blue-600 uppercase">Total Pickups Handled</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalPickups}</p>
        </div>
      </div>

      {/* Agent Roster */}
      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading registered pickup agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-5xl">🛵</p>
          <h3 className="text-lg font-black text-slate-800">No Pickup Agents Registered Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You must register at least one active pickup agent before you can accept donation orders from donors.
          </p>
          <button
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer mt-2"
          >
            Register First Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const initials = agent.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const isActive = agent.status === 'active';

            return (
              <div
                key={agent._id}
                className={`bg-white rounded-3xl border p-5 shadow-2xs flex flex-col justify-between transition ${
                  isActive ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                <div className="space-y-4">
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {agent.profilePhoto ? (
                        <img
                          src={agent.profilePhoto}
                          alt={agent.fullName}
                          onClick={() => setPreviewPhoto({ url: agent.profilePhoto, name: agent.fullName, subtitle: `Pickup Agent (${agent.agentId})` })}
                          title="Click to view photo in medium size"
                          className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-2xs cursor-pointer hover:ring-2 hover:ring-emerald-400 hover:opacity-90 transition"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-base flex items-center justify-center border border-emerald-200">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="text-base font-black text-slate-900 leading-tight">{agent.fullName}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                            {agent.agentId}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            agent.isActivated
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {agent.isActivated ? '✓ Activated' : '⏳ Pending Activation'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  {/* Details section */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">📞 Phone:</span>
                      <a href={`tel:${agent.phone}`} className="font-bold text-slate-800 hover:text-emerald-700">
                        {agent.phone}
                      </a>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">🚗 Vehicle:</span>
                      <strong className="text-slate-800">{agent.vehicleType} ({agent.vehicleNumber})</strong>
                    </p>
                    {agent.address && (
                      <p className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 shrink-0">📍 Area:</span>
                        <span className="text-right text-slate-700 truncate">{agent.address}</span>
                      </p>
                    )}
                    <p className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">Active Pickups:</span>
                      <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-slate-200 text-[10px]">
                        {agent.activeOrdersCount || 0} active / {agent.totalOrdersCount || 0} total
                      </span>
                    </p>
                  </div>

                  {agent.additionalDetails && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100">
                      "{agent.additionalDetails}"
                    </p>
                  )}

                  {!agent.isActivated && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                          <span>🔑</span> Activation Token
                        </span>
                        {agent.activationToken ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(agent.activationToken);
                              setSuccessMsg(`Copied token for ${agent.fullName}!`);
                              setTimeout(() => setSuccessMsg(''), 3000);
                            }}
                            className="text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200 hover:bg-amber-300 px-2 py-0.5 rounded cursor-pointer border-0 transition"
                          >
                            Copy Token
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateInvite(agent)}
                            className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded cursor-pointer border-0 transition"
                          >
                            Generate Token
                          </button>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-slate-800 font-bold bg-white px-2 py-1 rounded border border-amber-200 truncate select-all">
                        {agent.activationToken || 'No token active — click Generate Token'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleViewOrders(agent)}
                    className="flex-1 min-w-[70px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                  >
                    📦 Orders
                  </button>
                  <button
                    onClick={() => handleGenerateInvite(agent)}
                    title="Generate activation invite link for this agent"
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    ✉️ Invite
                  </button>
                  <button
                    onClick={() => handleOpenEdit(agent)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer ${
                      isActive
                        ? 'bg-red-50 hover:bg-red-100 text-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Agent Modal */}
      {(showAddModal || editingAgent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingAgent ? `Edit Agent: ${editingAgent.fullName}` : 'Register New Pickup Agent'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingAgent ? 'Update vehicle or contact details' : 'Agent ID will be automatically generated'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAgent(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 bg-white"
                  >
                    {VEHICLE_OPTIONS.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Vehicle Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL 01 AB 1234"
                  value={formData.vehicleNumber}
                  onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Profile Photo (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={formData.profilePhoto}
                    onChange={e => setFormData({ ...formData, profilePhoto: e.target.value })}
                    className="flex-1 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600"
                  />
                  <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition whitespace-nowrap shadow-2xs">
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Address / Operating Sector (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi, Okhla Zone"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Additional Details / Notes (optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Available Mon-Sat 9AM-6PM, carries digital scale"
                  value={formData.additionalDetails}
                  onChange={e => setFormData({ ...formData, additionalDetails: e.target.value })}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600"
                />
              </div>

              {!editingAgent && (
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Initial Password (Optional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Leave empty to send an activation invite to agent"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    If left blank, an activation link will be generated for the agent to set their own password.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAgent(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Agent...' : editingAgent ? 'Save Changes' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Orders Modal */}
      {selectedAgentOrders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Assigned Orders: {selectedAgentOrders.agent.fullName}
                </h3>
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {selectedAgentOrders.agent.agentId} • {selectedAgentOrders.agent.vehicleType}
                </span>
              </div>
              <button
                onClick={() => setSelectedAgentOrders(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl"
              >
                ✕
              </button>
            </div>

            {ordersLoading ? (
              <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Loading assigned orders...
              </div>
            ) : selectedAgentOrders.orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-1">
                <p className="text-3xl">📦</p>
                <p className="text-xs font-bold">No donation orders assigned to this agent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedAgentOrders.orders.map(order => (
                  <div key={order._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">
                        {order.requirement?.title || 'Material Donation'} ({order.quantity} {order.requirement?.unit || 'items'})
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        👤 Donor: <strong>{order.donor?.name || 'Anonymous'}</strong> • 📞 {order.donor?.phone || 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        📍 {order.pickupAddress}, {order.city}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1.5">
                      <div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          {(order.pickupStatus || order.status).replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <a
                          href={`/donation/${order._id}/tracking`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 no-underline"
                        >
                          🗺️ Live Route
                        </a>
                        <a
                          href={`/pickup/agent/${order._id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100 no-underline"
                        >
                          📱 Agent GPS
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Ref: {order._id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedAgentOrders(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Invite Link Modal */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="text-center">
              <span className="text-4xl block mb-2">✉️</span>
              <h3 className="text-lg font-black text-slate-900">Agent Activation Invite</h3>
              <p className="text-xs text-slate-500 mt-1">
                Share this secure link with <strong>{inviteModalData.agent?.fullName}</strong> ({inviteModalData.agent?.agentId}) to activate their account and set their password.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Activation Link:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteModalData.activationLink}
                  className="w-full text-xs font-mono bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteModalData.activationLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap border-0"
                >
                  {copiedLink ? 'Copied! ✓' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Direct Activation Token */}
            {inviteModalData.activationToken && (
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <span>🔑</span> Activation Token:
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Valid for 7 days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteModalData.activationToken}
                    className="w-full text-xs font-mono font-bold bg-white p-2.5 rounded-xl border border-emerald-300 text-emerald-900 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteModalData.activationToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 3000);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap border-0"
                  >
                    {copiedToken ? 'Copied! ✓' : 'Copy Token'}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  The agent can open the link above or manually paste this token on <strong>/agent/activate</strong>.
                </p>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setInviteModalData(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medium size profile photo modal */}
      <ProfilePhotoModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto?.url}
        name={previewPhoto?.name}
        subtitle={previewPhoto?.subtitle || 'Pickup Agent Photo'}
      />
    </div>
  );
}
