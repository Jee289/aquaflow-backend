import React, { useState, useEffect } from 'react';
import { LogOut, TrendingUp, Sparkles, MapPin, BarChart3, X, Plus, Trash2, CalendarRange, Users, Shield, ArrowRight, Droplet, Wallet, Building2, Globe, LayoutGrid, List, Bell, Send, Search, UserCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Order, LocationConfig, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StateCitySelector from '../components/StateCitySelector';

const OwnerDashboard: React.FC = () => {
  const { logout, setImpersonatedDistrict } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<'overview' | 'admins' | 'users' | 'locations' | 'notifications' | 'sales'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [interestData, setInterestData] = useState<{ district: string, count: number }[]>([]); // Keep district for legacy interest or migrate
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);

  // Registration States
  const [newAdmin, setNewAdmin] = useState({ state: '', city: '', phone: '', name: '' });
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);

  // New Location State
  const [newLocation, setNewLocation] = useState({ state: '', city: '' });

  // Drill-down State
  const [selectedRegistryLocation, setSelectedRegistryLocation] = useState<{ state: string, city: string } | null>(null);

  // Notification State
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState<'GLOBAL' | string>('GLOBAL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const activeLocations = React.useMemo(() => locations.filter(l => l.isActive), [locations]);

  const fetchData = async () => {
    try {
      const [oRes, lRes, iRes, uRes, aRes] = await Promise.all([
        api.get('/orders'),
        api.get('/locations'),
        api.get('/interests'),
        api.get('/users'),
        api.get('/users?role=ADMIN')
      ]);

      setOrders(oRes.data);
      setLocations(lRes.data);
      setInterestData(iRes.data);
      setUsers(uRes.data);
      setAdmins(aRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const totalGrossRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const globalActiveBarrels = users.reduce((sum, u) => sum + (u.activeBarrels || 0), 0);
  const totalLiability = globalActiveBarrels * 200;
  const totalConnections = globalActiveBarrels;
  const netSales = totalGrossRevenue - (orders.length * 200); // Rough approximation or use items

  const handlePortalEnter = (state: string, city: string) => {
    // Legacy support: if only district name used, we might need a composite key or just city name if unique enough for now
    // For now, let's use "City" as the identifier for "District" logic in older components
    setImpersonatedDistrict(city);
    navigate('/admin');
  };

  const sendNotification = async () => {
    if (!notifMsg) return alert('Message required');
    alert(`Notification Sent to ${notifTarget}: ${notifMsg}`);
    setNotifMsg('');
  };

  const handleAddLocation = async () => {
    if (!newLocation.state || !newLocation.city) return alert('State and City required');
    try {
      await api.post('/locations', newLocation);
      alert('Location Added');
      setNewLocation({ state: '', city: '' });
      fetchData();
    } catch (e: any) {
      alert('Failed to add location: ' + e.message);
    }
  };

  const toggleLocationStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.patch(`/locations/${id}`, { isActive: !currentStatus });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-slate-950 p-2.5 rounded-2xl shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
              <Droplet className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic text-slate-950">
                Pani Gadi <span className="text-blue-600">Holdings</span>
              </h1>
              <div className="flex items-center gap-2">
                <Shield size={10} className="text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Strategic Oversight Terminal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={logout} className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        {/* Statistics Ticker */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-blue-200 transition-all">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Gross Revenue</p>
            <div className="flex items-end gap-1">
              <h3 className="text-3xl font-black text-slate-900 leading-none">₹{totalGrossRevenue.toLocaleString()}</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mb-1"></div>
            </div>
          </div>
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-emerald-200 transition-all">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Net Profit</p>
            <div className="flex items-end gap-1">
              <h3 className="text-3xl font-black text-emerald-600 leading-none">₹{netSales.toLocaleString()}</h3>
              <TrendingUp size={16} className="text-emerald-500 mb-1" />
            </div>
          </div>
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-indigo-200 transition-all">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3">Connections</p>
            <h3 className="text-3xl font-black text-indigo-950 leading-none">{totalConnections} <span className="text-xs text-indigo-300">Jars</span></h3>
          </div>
          <div className="bg-indigo-900 p-7 rounded-[2rem] shadow-xl text-white border-b-4 border-indigo-400">
            <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest mb-3">Territories</p>
            <h3 className="text-3xl font-black leading-none">{locations.filter(l => l.isActive).length} <span className="text-xs text-indigo-400">Active</span></h3>
          </div>
          <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 group hover:border-violet-200 transition-all">
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3">Global Users</p>
            <h3 className="text-3xl font-black text-indigo-950 leading-none">{users.length}</h3>
          </div>
        </section>

        {/* Dynamic Navigation */}
        <nav className="flex gap-2 p-1.5 bg-indigo-50/50 rounded-3xl w-fit overflow-x-auto no-scrollbar border border-white shadow-inner">
          {[
            { id: 'overview', label: 'Intelligence', icon: <BarChart3 size={16} /> },
            { id: 'sales', label: 'Sales Reports', icon: <TrendingUp size={16} /> },
            { id: 'locations', label: 'Expansion', icon: <MapPin size={16} /> },
            { id: 'admins', label: 'Regional Chiefs', icon: <Shield size={16} /> },
            { id: 'users', label: 'Global Registry', icon: <Globe size={16} /> },
            { id: 'notifications', label: 'Broadcast', icon: <Bell size={16} /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id as any)}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all
                ${view === t.id
                  ? 'bg-white text-indigo-600 shadow-sm scale-105'
                  : 'text-indigo-400 hover:text-indigo-600 hover:bg-white/50'
                }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {/* VIEW: OVERVIEW */}
        {view === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-600" /> Regional Interest Heatmap</h3>
              <div className="h-72" style={{ minHeight: '288px' }}>
                {interestData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interestData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="district" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <BarChart3 size={48} className="mb-2 opacity-50" />
                    <p className="text-sm font-bold">No Interest Data Yet</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-black p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <Sparkles className="absolute -right-4 -top-4 opacity-20 w-32 h-32 text-indigo-500" />
              <h3 className="text-xl font-bold mb-4 italic uppercase">Expansion Logic</h3>
              <p className="text-sm text-indigo-200 mb-6 leading-relaxed">The high-interest areas on the chart represent untapped revenue. ADD NEW LOCATIONS in the Locations tab to start serving.</p>
              <button onClick={() => setView('locations')} className="flex items-center gap-2 text-indigo-400 font-black text-sm uppercase tracking-widest hover:text-indigo-300 transition-colors">Manage Territories <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* VIEW: LOCATIONS (NEW) */}
        {view === 'locations' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-6">Launch New Territory</h3>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full">
                  <StateCitySelector
                    onSelect={(s, c) => setNewLocation({ state: s, city: c })}
                    initialState={newLocation.state}
                    initialCity={newLocation.city}
                  />
                </div>
                <button onClick={handleAddLocation} className="h-[52px] px-8 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors border-b-4 border-indigo-800">
                  Launch City
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map(loc => (
                <div key={loc.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col justify-between group hover:border-indigo-300 transition-colors hover:shadow-lg">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{loc.state}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!confirm("Delete Territory? This cannot be undone.")) return;
                            try {
                              await api.delete(`/locations/${loc.id}`);
                              fetchData();
                            } catch (e) { alert("Failed to delete"); }
                          }}
                          className="p-1 rounded-full text-slate-300 bg-slate-100 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => toggleLocationStatus(loc.id, loc.isActive)} className={`p-1 rounded-full ${loc.isActive ? 'text-green-500 bg-green-50' : 'text-slate-300 bg-slate-100'}`}>
                          <CheckCircle size={16} fill={loc.isActive ? "currentColor" : "none"} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xl font-black text-indigo-950 uppercase italic">{loc.city}</h4>
                    {loc.adminPhone ? (
                      <p className="text-xs text-indigo-600 font-bold mt-1">Admin: {loc.adminPhone}</p>
                    ) : (
                      <p className="text-xs text-amber-500 font-bold mt-1">No Admin Assigned</p>
                    )}
                  </div>
                </div>
              ))}
              {locations.length === 0 && <p className="text-slate-400">No locations configured yet.</p>}
            </div>
          </div>
        )}

        {/* VIEW: ADMINS (REGISTRY) */}
        {view === 'admins' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-black">Appoint Regional Chief</h3>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <input type="text" placeholder="Admin Name" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} />

                {/* Replaced hardcoded select with StateCitySelector hooked to internal state */}
                {/* Replaced hardcoded select with StateCitySelector hooked to internal state */}
                <StateCitySelector
                  onSelect={(s, c) => setNewAdmin(prev => ({ ...prev, state: s, city: c }))}
                  initialState={newAdmin.state}
                  initialCity={newAdmin.city}
                  filterActive={false} // Allow selecting ANY configured location
                  availableLocations={locations}
                />

                <input type="text" placeholder="Phone Number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} />
                <button
                  disabled={loading}
                  onClick={async () => {
                    if (!newAdmin.phone || !newAdmin.name || !newAdmin.state || !newAdmin.city) return alert('All fields required');

                    setLoading(true);
                    console.log('Creating Admin:', newAdmin); // Debug

                    try {
                      await api.post('/auth/create-staff', {
                        phone: newAdmin.phone,
                        name: newAdmin.name,
                        district: newAdmin.city,
                        state: newAdmin.state,
                        city: newAdmin.city,
                        role: 'ADMIN'
                      });
                      alert('Admin Appointed Successfully');
                      setNewAdmin({ state: '', city: '', phone: '', name: '' });
                      fetchData();
                    } catch (e: any) {
                      console.error(e);
                      const msg = e.response?.data?.error || 'Failed to appoint admin';
                      alert(`Error: ${msg}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 border-b-4 border-indigo-800"
                >
                  {loading ? 'Authorizing...' : 'Authorize Admin'}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-black">Active Council</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {admins.map(a => (
                  <div key={a.uid} className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col gap-3 group">
                    <div className="flex justify-between items-center">
                      <div>
                        {editingAdmin?.uid === a.uid ? (
                          <input
                            className="font-black text-indigo-950 border-b-2 border-indigo-500 outline-none bg-transparent"
                            value={editingAdmin.name}
                            onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                          />
                        ) : (
                          <h4 className="font-black text-indigo-950 uppercase italic tracking-tight">{a.name}</h4>
                        )}
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">{a.city}, {a.state} • {a.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        {editingAdmin?.uid === a.uid ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await api.patch(`/users/${a.uid}`, { name: editingAdmin.name });
                                  alert('Admin Updated');
                                  setEditingAdmin(null);
                                  fetchData();
                                } catch (e) {
                                  alert('Update failed');
                                }
                              }}
                              className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-sm"
                            ><Users size={16} /></button>
                            <button onClick={() => setEditingAdmin(null)} className="p-2 bg-indigo-50 text-indigo-400 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition shadow-sm"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingAdmin(a)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition shadow-sm"><UserCircle size={16} /></button>
                            <button
                              onClick={async () => {
                                if (!confirm('Revoke Admin Access?')) return;
                                try {
                                  await api.delete(`/users/${a.uid}`);
                                  if (a.city) {
                                    // Remove admin from location config if needed (optional sync)
                                  }
                                  alert('Access Revoked');
                                  fetchData();
                                } catch (e) {
                                  alert('Failed to revoke access');
                                }
                              }}
                              className="p-2 bg-rose-50 text-rose-400 rounded-xl border border-rose-100 hover:bg-rose-500 hover:text-white transition shadow-sm"
                            ><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handlePortalEnter(a.state!, a.city!)} className="w-full py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-indigo-100 shadow-sm"><ExternalLink size={14} /> Strategic Portal</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: GLOBAL REGISTRY (DISTRICT CENTRIC) */}
        {view === 'users' && (
          <div className="space-y-6">
            {!selectedRegistryLocation ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {locations.filter(l => l.isActive).map(loc => {
                  const districtUsers = users.filter(u => u.city === loc.city && u.state === loc.state);
                  const hasAdmin = admins.some(a => a.city === loc.city && a.state === loc.state);
                  return (
                    <button key={loc.id} onClick={() => setSelectedRegistryLocation(loc)} className="bg-white p-5 rounded-3xl border-2 border-slate-100 hover:border-blue-600 transition-all text-left shadow-sm group">
                      <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 rounded-xl ${hasAdmin ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}><MapPin size={20} /></div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h4 className="font-black text-slate-900">{loc.city}</h4>
                      <p className="text-[10px] uppercase text-slate-400">{loc.state}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{districtUsers.length} Users Registry</p>
                      <div className="mt-4 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${hasAdmin ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="text-[8px] font-black uppercase text-slate-400">{hasAdmin ? 'Operational' : 'Idle'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                <button onClick={() => setSelectedRegistryLocation(null)} className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors"><X size={14} /> Back to Territory List</button>
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">{selectedRegistryLocation.city}</h2>
                      <p className="text-xs font-bold text-slate-500">{selectedRegistryLocation.state}</p>
                      <p className="text-xs font-bold text-slate-500 mt-2">Managing regional user base and operations.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handlePortalEnter(selectedRegistryLocation.state, selectedRegistryLocation.city)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2"><ExternalLink size={16} /> Enter District Portal</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-50">
                          <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Customer</th>
                          <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone</th>
                          <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Wallet</th>
                          <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Barrels</th>
                          <th className="text-left py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Referral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.city === selectedRegistryLocation.city && u.state === selectedRegistryLocation.state).map(u => (
                          <tr key={u.uid} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">{u.name.charAt(0)}</div><span className="font-bold text-sm">{u.name}</span></div></td>
                            <td className="text-sm font-medium text-slate-500">{u.phone}</td>
                            <td className="text-sm font-black text-slate-900">₹{Number(u.wallet || 0).toFixed(0)}</td>
                            <td className="text-sm font-bold"><span className="bg-slate-100 px-2 py-1 rounded-md">{u.activeBarrels || 0}</span></td>
                            <td className="text-[10px] font-black text-blue-600">{u.referralCode}</td>
                          </tr>
                        ))}
                        {users.filter(u => u.city === selectedRegistryLocation.city && u.state === selectedRegistryLocation.state).length === 0 && (
                          <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No registered users in this district yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: SALES REPORTS */}
        {view === 'sales' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-6">Daily Sales Report by Location</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">Today's Revenue</p>
                  <h3 className="text-3xl font-black text-blue-900">
                    ₹{orders.filter(o => (o.status === 'shipped' || o.status === 'delivered') && new Date(o.timestamp).toDateString() === new Date().toDateString()).reduce((sum, o) => sum + Number(o.totalAmount), 0).toLocaleString()}
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                  <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-2">Orders Today</p>
                  <h3 className="text-3xl font-black text-green-900">
                    {orders.filter(o => (o.shippedAt && new Date(Number(o.shippedAt)).toDateString() === new Date().toDateString()) || (o.deliveredAt && new Date(Number(o.deliveredAt)).toDateString() === new Date().toDateString())).length}
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                  <p className="text-xs font-black uppercase tracking-widest text-purple-600 mb-2">Active Locations</p>
                  <h3 className="text-3xl font-black text-purple-900">{activeLocations.length}</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left">State</th>
                      <th className="px-6 py-4 text-left">City</th>
                      <th className="px-6 py-4 text-right">Today's Orders</th>
                      <th className="px-6 py-4 text-right">Today's Revenue</th>
                      <th className="px-6 py-4 text-right">Total Orders</th>
                      <th className="px-6 py-4 text-right">Total Revenue</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeLocations.map(loc => {
                      const todayStr = new Date().toDateString();
                      const locationOrders = orders.filter(o => o.city === loc.city && o.state === loc.state);
                      const todayOrders = locationOrders.filter(o =>
                        (o.shippedAt && new Date(Number(o.shippedAt)).toDateString() === todayStr) ||
                        (o.deliveredAt && new Date(Number(o.deliveredAt)).toDateString() === todayStr)
                      );
                      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
                      const totalRevenue = locationOrders.filter(o => o.status === 'shipped' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

                      return (
                        <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-700">{loc.state}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{loc.city}</td>
                          <td className="px-6 py-4 text-right font-bold text-blue-600">{todayOrders.length}</td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">₹{todayRevenue.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-600">{locationOrders.length}</td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-900">₹{totalRevenue.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                const headers = ['Order ID', 'Date Placed', 'Customer', 'Phone', 'Items', 'Total Amount', 'Status', 'Shipped At', 'Delivered At'];
                                const rows = todayOrders.map(o => [
                                  o.id,
                                  new Date(o.timestamp).toLocaleDateString(),
                                  o.userName,
                                  o.userPhone,
                                  o.items.map(i => `${i.name} (${i.quantity})`).join('; '),
                                  o.totalAmount,
                                  o.status,
                                  o.shippedAt ? new Date(Number(o.shippedAt)).toLocaleString() : 'N/A',
                                  o.deliveredAt ? new Date(Number(o.deliveredAt)).toLocaleString() : 'N/A'
                                ]);
                                const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `daily_sales_${loc.city}_${new Date().toISOString().split('T')[0]}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              }}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                            >
                              Download CSV
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: BROADCAST (NOTIFICATIONS) */}
        {view === 'notifications' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2 mb-8">
              <div className="bg-blue-600 p-5 rounded-[2.5rem] inline-block text-white shadow-xl shadow-blue-100 mb-2"><Bell size={32} /></div>
              <h3 className="text-2xl font-black">Strategic Broadcast</h3>
              <p className="text-sm text-slate-500 font-medium px-12">Only the Owner can send global announcements. Use this to notify users about holiday closures, price drops, or expansion news.</p>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Target Audience</label>
                <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none font-bold" value={notifTarget} onChange={e => setNotifTarget(e.target.value)}>
                  <option value="GLOBAL">All Districts (Global)</option>
                  {locations.filter(l => l.isActive).map(d => <option key={d.id} value={d.city}>{d.city} ({d.state})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Announcement Message</label>
                <textarea rows={5} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none font-bold text-slate-700 resize-none" placeholder="Type your personalized message here..." value={notifMsg} onChange={e => setNotifMsg(e.target.value)} />
              </div>

              <button onClick={sendNotification} className="w-full bg-slate-900 text-white py-5 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-black">
                <Send size={18} /> Deploy Notification
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
