import React, { useState, useEffect } from 'react';
import { LogOut, TrendingUp, Sparkles, MapPin, BarChart3, X, Plus, Trash2, CalendarRange, Users, Shield, ArrowRight, Droplet, Wallet, Building2, Globe, LayoutGrid, List, Bell, Send, Search, UserCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Order, DistrictConfig, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ODISHA_DISTRICTS = [
  "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack",
  "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur",
  "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", "Khordha",
  "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada",
  "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
];

const OwnerDashboard: React.FC = () => {
  const { logout, setImpersonatedDistrict } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<'overview' | 'admins' | 'users' | 'notifications'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [districtConfigs, setDistrictConfigs] = useState<DistrictConfig[]>([]);
  const [interestData, setInterestData] = useState<{ district: string, count: number }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);

  // Registration States
  const [newAdmin, setNewAdmin] = useState({ district: '', phone: '', name: '' });
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);

  // Drill-down State
  const [selectedRegistryDistrict, setSelectedRegistryDistrict] = useState<string | null>(null);

  // Notification State
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState<'GLOBAL' | string>('GLOBAL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [oRes, cRes, iRes, uRes, aRes] = await Promise.all([
        api.get('/orders'),
        api.get('/configs'),
        api.get('/interests'),
        api.get('/users'),
        api.get('/users?role=ADMIN')
      ]);

      setOrders(oRes.data);
      setDistrictConfigs(cRes.data);
      setInterestData(iRes.data);
      setUsers(uRes.data);
      setAdmins(aRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const totalGrossRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const globalActiveBarrels = users.reduce((sum, u) => sum + (u.activeBarrels || 0), 0);
  const totalLiability = globalActiveBarrels * 200;
  const totalConnections = globalActiveBarrels;

  const totalSecurityCollected = orders.reduce((sum, o) => {
    const barrels = o.items.find((i: any) => i.id === '20L')?.quantity || 0;
    return sum + (barrels * 200);
  }, 0);
  const netSales = totalGrossRevenue - totalSecurityCollected;

  const handlePortalEnter = (districtName: string) => {
    setImpersonatedDistrict(districtName);
    navigate('/admin');
  };

  const sendNotification = async () => {
    if (!notifMsg) return alert('Message required');
    // Simulated notification broadcast
    alert(`Notification Sent to ${notifTarget}: ${notifMsg}`);
    setNotifMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Droplet className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Pani Gadi <span className="text-blue-600 font-extrabold">Holdings</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={logout} className="text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Statistics Ticker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-2xl font-black">₹{totalGrossRevenue.toLocaleString()}</h3><p className="text-xs text-slate-500 font-bold uppercase">Gross Revenue</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-2xl font-black">₹{netSales.toLocaleString()}</h3><p className="text-xs text-emerald-600 font-bold uppercase">Pure Profit</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-2xl font-black">{totalConnections}</h3><p className="text-xs text-blue-600 font-bold uppercase">Active Connections</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-2xl font-black">₹{totalLiability.toLocaleString()}</h3><p className="text-xs text-rose-500 font-bold uppercase">Refund Liability</p></div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-2xl font-black">{districtConfigs.length}</h3><p className="text-xs text-slate-500 font-bold uppercase">Active Cities</p></div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 border-b border-slate-200 scrollbar-hide overflow-x-auto">
          {[
            { id: 'overview', label: 'Intelligence', icon: <BarChart3 size={18} /> },
            { id: 'admins', label: 'Admins', icon: <LayoutGrid size={18} /> },
            { id: 'users', label: 'Global Registry', icon: <Globe size={18} /> },
            { id: 'notifications', label: 'Broadcast', icon: <Bell size={18} /> }
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id as any)} className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${view === t.id ? 'text-blue-600 border-b-2 border-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* VIEW: OVERVIEW */}
        {view === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600" /> Regional Interest Heatmap</h3>
              <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={interestData}><XAxis dataKey="district" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <Sparkles className="absolute -right-4 -top-4 opacity-20 w-32 h-32" />
              <h3 className="text-xl font-bold mb-4">Expansion Logic</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">The high-interest areas on the chart represent untapped revenue. Appoint an Admin to these districts to unlock fleet operations.</p>
              <button onClick={() => setView('admins')} className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase tracking-widest hover:text-blue-300 transition-colors">Go to Appointment <ArrowRight size={16} /></button>
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
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" value={newAdmin.district} onChange={e => setNewAdmin({ ...newAdmin, district: e.target.value })}>
                  <option value="">-- Territory --</option>
                  {ODISHA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="text" placeholder="Phone Number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none" value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} />
                <button
                  onClick={async () => {
                    if (!newAdmin.phone || !newAdmin.name || !newAdmin.district) return alert('All fields required');
                    try {
                      await api.post('/auth/login', {
                        phone: newAdmin.phone,
                        name: newAdmin.name,
                        district: newAdmin.district,
                        role: 'ADMIN'
                      });
                      alert('Admin Appointed Successfully');
                      setNewAdmin({ district: '', phone: '', name: '' });
                      fetchData();
                    } catch (e) {
                      alert('Failed to appoint admin');
                      console.error(e);
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  Authorize Admin
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
                            className="font-bold text-slate-900 border-b border-blue-500 outline-none"
                            value={editingAdmin.name}
                            onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                          />
                        ) : (
                          <h4 className="font-bold text-slate-900">{a.name}</h4>
                        )}
                        <p className="text-xs text-slate-400 font-bold">{a.district} • {a.phone}</p>
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
                              className="p-2 bg-green-100 text-green-600 rounded-xl"
                            ><Users size={16} /></button>
                            <button onClick={() => setEditingAdmin(null)} className="p-2 bg-gray-100 text-gray-600 rounded-xl"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingAdmin(a)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition"><UserCircle size={16} /></button>
                            <button
                              onClick={async () => {
                                if (!confirm('Revoke Admin Access?')) return;
                                try {
                                  await api.delete(`/users/${a.uid}`);
                                  alert('Access Revoked');
                                  fetchData();
                                } catch (e) {
                                  alert('Failed to revoke access');
                                }
                              }}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition"
                            ><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handlePortalEnter(a.district)} className="w-full py-2 bg-slate-50 text-blue-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-2"><ExternalLink size={14} /> Enter Portal</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: GLOBAL REGISTRY (DISTRICT CENTRIC) */}
        {view === 'users' && (
          <div className="space-y-6">
            {!selectedRegistryDistrict ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ODISHA_DISTRICTS.map(d => {
                  const districtUsers = users.filter(u => u.district === d);
                  const hasAdmin = admins.some(a => a.district === d);
                  return (
                    <button key={d} onClick={() => setSelectedRegistryDistrict(d)} className="bg-white p-5 rounded-3xl border-2 border-slate-100 hover:border-blue-600 transition-all text-left shadow-sm group">
                      <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 rounded-xl ${hasAdmin ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}><MapPin size={20} /></div>
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h4 className="font-black text-slate-900">{d}</h4>
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
                <button onClick={() => setSelectedRegistryDistrict(null)} className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors"><X size={14} /> Back to Territory List</button>
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">{selectedRegistryDistrict}</h2>
                      <p className="text-xs font-bold text-slate-500">Managing regional user base and operations.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handlePortalEnter(selectedRegistryDistrict)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2"><ExternalLink size={16} /> Enter District Portal</button>
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
                        {users.filter(u => u.district === selectedRegistryDistrict).map(u => (
                          <tr key={u.uid} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs">{u.name.charAt(0)}</div><span className="font-bold text-sm">{u.name}</span></div></td>
                            <td className="text-sm font-medium text-slate-500">{u.phone}</td>
                            <td className="text-sm font-black text-slate-900">₹{u.wallet.toFixed(0)}</td>
                            <td className="text-sm font-bold"><span className="bg-slate-100 px-2 py-1 rounded-md">{u.activeBarrels || 0}</span></td>
                            <td className="text-[10px] font-black text-blue-600">{u.referralCode}</td>
                          </tr>
                        ))}
                        {users.filter(u => u.district === selectedRegistryDistrict).length === 0 && (
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
                  {ODISHA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
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
