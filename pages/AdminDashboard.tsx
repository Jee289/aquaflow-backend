import React, { useState, useEffect } from 'react';
import { Order, Product, ReturnRequest, DistrictConfig, User } from '../types';
import { LogOut, ShoppingCart, Package, Edit3, Droplets, GlassWater, Settings, ClipboardList, Banknote, ShieldCheck, CheckCircle2, Users, Plus, Trash2, X, Save, ChefHat, Truck, ArrowLeft, ArrowRightLeft, Search, Wallet, IndianRupee, Headset, MessageSquare, RotateCcw, CalendarRange, MapPin, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProductVisualSmall: React.FC<{ style: string }> = ({ style }) => {
  const iconClass = "text-white w-5 h-5 drop-shadow-md";
  if (style === 'style:barrel') return (
    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
      <Droplets size={20} className={iconClass} />
    </div>
  );
  if (style === 'style:dispenser') return (
    <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
      <Settings size={20} className={iconClass} />
    </div>
  );
  if (style === 'style:bottle') return (
    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-300 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
      <GlassWater size={20} className={iconClass} />
    </div>
  );
  return (
    <div className="w-12 h-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center">
      <Package size={16} className="text-slate-200" />
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { user, logout, impersonatedDistrict } = useAuth();
  const navigate = useNavigate();

  // Impersonation Logic: If Owner is viewing, use the selected district
  const adminDistrict = impersonatedDistrict || user?.district || 'Unknown';

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [districtConfigs, setDistrictConfigs] = useState<DistrictConfig[]>([]);
  const [agents, setAgents] = useState<any[]>([]); // List of agents for assignment

  const [activeTab, setActiveTab] = useState<'orders' | 'prep' | 'refunds' | 'zones' | 'agents' | 'inventory' | 'support' | 'reports'>('orders');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ type: 'REGULAR', name: '', price: 0, stock: 10, image: 'style:barrel', securityFee: 0 });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [supportMsg, setSupportMsg] = useState('');
  const [districtUsers, setDistrictUsers] = useState<User[]>([]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', description: '', postalCodes: '', landmarks: '' });
  const [editingZone, setEditingZone] = useState<any | null>(null);


  // Fetch Data
  const fetchData = async () => {
    try {
      const [oRes, pRes, rRes, cRes, aRes, uRes, zRes] = await Promise.all([
        api.get(`/orders?district=${adminDistrict}`),
        api.get('/products'),
        api.get(`/returns?district=${adminDistrict}`),
        api.get('/configs'),
        api.get('/users?role=AGENT'),
        api.get('/users'),
        api.get(`/zones?district=${adminDistrict}`)
      ]);

      // Simple direct updates - React's reconciliation handles unnecessary re-renders
      setOrders(oRes.data);
      setProducts(pRes.data);
      setReturnRequests(rRes.data);
      setDistrictConfigs(cRes.data);
      setZones(zRes.data);

      const regionalUsers = uRes.data.filter((u: any) => u.district === adminDistrict);
      setDistrictUsers(regionalUsers);

      const districtAgents = aRes.data.filter((a: any) => a.district === adminDistrict);
      setAgents(districtAgents);

      const myConfig = cRes.data.find((d: DistrictConfig) => d.district === adminDistrict);
      if (myConfig) {
        setSupportMsg(myConfig.supportMsg || '');
      }
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Real-time Update: Poll every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminDistrict]); // Only re-run if district changes


  const totalConnections = districtUsers.reduce((sum, u) => sum + (u.activeBarrels || 0), 0);
  const refundLiability = totalConnections * 200;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  const config = districtConfigs.find(d => d.district === adminDistrict);
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const prepCounts = orders.filter(o => o.status === 'pending').reduce((acc: Record<string, { name: string, qty: number }>, o) => {
    o.items.forEach(item => {
      if (!acc[item.id]) acc[item.id] = { name: item.name, qty: 0 };
      acc[item.id].qty += item.quantity;
    });
    return acc;
  }, {});

  const handleUpdateSupport = async () => {
    if (!supportMsg.trim()) return alert('Enter a support message');
    try {
      await api.patch('/configs', { district: adminDistrict, supportMsg });
      alert('Support message updated successfully');
      fetchData();
    } catch (err) {
      alert('Failed to update support message');
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return alert('Name and Price required');
    const fullProduct = {
      ...newProduct,
      id: `PRD-${Date.now()}`,
      unit: newProduct.id === '20L' ? 'barrel' : 'unit'
    };

    try {
      await api.post('/products', fullProduct);
      alert('Product added successfully');
      setShowAddProduct(false);
      fetchData();
    } catch (err) {
      alert('Failed to add product');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingId) return;
    try {
      await api.patch(`/products/${editingId}`, editForm);
      alert('Product updated');
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert('Failed to update product');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      alert('Product deleted');
      fetchData();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await api.patch(`/orders/${orderId}`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const assignAgent = async (orderId: string, agentId: string) => {
    try {
      await api.patch(`/orders/${orderId}`, { assignedAgentId: agentId || null });
      alert(agentId ? 'Agent assigned successfully' : 'Order unassigned');
      fetchData(); // Refresh to see update
    } catch (err) {
      alert('Failed to assign agent');
    }
  };

  const shipAllForProduct = async (productId: string) => {
    const ordersToShip = pendingOrders.filter(o => o.items.some(i => i.id === productId));
    if (ordersToShip.length === 0) return alert('No pending orders for this item.');
    if (!confirm(`Mark ${ordersToShip.length} orders as SHIPPED?`)) return;
    try {
      await Promise.all(ordersToShip.map(o => api.patch(`/orders/${o.id}`, { status: 'shipped' })));
      alert('Batch Update Successful');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Batch Update Partial/Failed');
    }
  };

  const handleRefund = async (returnId: string) => {
    if (!confirm("Confirm Cash Refund Allotted? This will deduct from user wallet and close the connection.")) return;
    try {
      await api.patch(`/returns/${returnId}`, { status: 'refunded' });
      alert("Refund Processed & Connection Closed.");
      fetchData();
    } catch (e) {
      alert("Failed to process refund");
    }
  };

  const pendingRefunds = returnRequests.filter(r => (r.status === 'pending' || r.status === 'completed') && r.district === adminDistrict);

  const navItems = [
    { id: 'orders', label: 'Order Feed', icon: <ShoppingCart size={14} /> },
    { id: 'prep', label: 'Prep Hub', icon: <ChefHat size={14} /> },
    { id: 'refunds', label: 'Security Refunds', icon: <RotateCcw size={14} /> },
    { id: 'zones', label: 'Territories', icon: <MapPin size={14} /> },
    { id: 'agents', label: 'Fleet Management', icon: <Truck size={14} /> },
    { id: 'inventory', label: 'Regional Store', icon: <Package size={14} /> },
    { id: 'support', label: 'Support Msg', icon: <MessageSquare size={14} /> },
    { id: 'reports', label: 'Analytics', icon: <BarChart3 size={14} /> }
  ] as const;

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {user?.role === 'OWNER' && (
                <button
                  onClick={() => navigate('/owner')}
                  className="p-4 bg-white border border-slate-100 rounded-[1.5rem] text-slate-400 hover:text-slate-950 hover:shadow-xl hover:border-slate-200 transition-all active:scale-95 group/back"
                  title="Return to Owner Control"
                >
                  <ArrowLeft size={20} className="group-hover/back:-translate-x-1 transition-transform" />
                </button>
              )}
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-2xl rotate-3 group hover:rotate-0 transition-transform duration-500 border-b-4 border-indigo-400">
                <Droplets className="text-white w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic text-indigo-900">Pani <span className="text-indigo-600">Gadi</span> Admin</h1>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></div>
                  <p className="text-indigo-400 font-black uppercase text-[10px] tracking-[0.4em]">{adminDistrict || 'Sector'} Command Terminal</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full lg:w-auto">
            <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 min-w-[180px] group hover:shadow-xl transition-all relative overflow-hidden">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 relative z-10">Active Flux</p>
              <h3 className="text-3xl font-black tracking-tighter relative z-10 text-indigo-950">{totalConnections} <span className="text-xs text-indigo-200 font-bold uppercase italic ml-1">Units</span></h3>
              <div className="absolute right-[-10%] bottom-[-10%] w-20 h-20 bg-indigo-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 min-w-[180px] group hover:shadow-xl transition-all relative overflow-hidden">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 relative z-10">Mission Queue</p>
              <h3 className="text-3xl font-black text-rose-500 tracking-tighter relative z-10">{pendingOrdersCount} <span className="text-xs text-rose-200 font-bold uppercase italic ml-1">Tasks</span></h3>
              <div className="absolute right-[-10%] bottom-[-10%] w-20 h-20 bg-rose-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 p-7 rounded-[2.5rem] shadow-2xl shadow-indigo-900/40 min-w-[180px] text-white border-b-4 border-indigo-400 group relative overflow-hidden">
              <p className="text-[9px] font-black uppercase text-indigo-300 tracking-[0.2em] mb-2 relative z-10">Fiscal Exposure</p>
              <h3 className="text-3xl font-black tracking-tighter relative z-10">₹{(refundLiability / 1000).toFixed(1)}k</h3>
              <div className="absolute right-[-20%] bottom-[-20%] w-24 h-24 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            </div>
          </div>
        </header>

        <nav className="flex items-center gap-1 p-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar sticky top-5 z-40 backdrop-blur-xl bg-white/90">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap
                ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-xl translate-y-[-2px] border-b-2 border-indigo-400'
                  : 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
            >
              <span className={activeTab === item.id ? 'text-indigo-300' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="ml-auto pr-3 border-l border-slate-100 pl-3">
            <button onClick={logout} className="p-4 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100">
              <LogOut size={18} />
            </button>
          </div>
        </nav>

        <main className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeTab === 'orders' ? (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-10 py-8 tracking-[0.2em]">Assignment ID</th>
                      <th className="px-10 py-8 tracking-[0.2em]">Flux Entity</th>
                      <th className="px-10 py-8 tracking-[0.2em]">Payload Manifest</th>
                      <th className="px-10 py-8 tracking-[0.2em]">Operational Status</th>
                      <th className="px-10 py-8 text-right tracking-[0.2em]">Terminal Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.map(o => (
                      <tr key={o.id} className="text-sm hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="flex flex-col">
                            <span className="font-black text-indigo-600 tracking-tighter text-base">#{o.id}</span>
                            <span className="text-[9px] font-black text-indigo-300 uppercase mt-1 tracking-widest">Logged: {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="space-y-1">
                            <div className="font-black text-indigo-950 uppercase italic tracking-tight">{o.userName}</div>
                            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg inline-block uppercase tracking-[0.1em]">{o.userPhone}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight line-clamp-1 max-w-[220px]" title={o.address?.fullAddress}>
                              {o.address?.fullAddress || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-wrap gap-1.5">
                            {o.items.map((item, idx) => (
                              <span key={idx} className="bg-slate-100 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-tight text-slate-600 border border-slate-200">
                                {item.name} <span className="text-indigo-600">x{item.quantity}</span>
                              </span>
                            ))}
                          </div>
                          {o.barrelReturns > 0 && (
                            <div className="mt-3 text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 inline-flex items-center gap-2 uppercase tracking-widest">
                              <RotateCcw size={12} className="animate-spin-slow" /> Reclaim {o.barrelReturns} Units
                            </div>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          <div className="space-y-3">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black border-2 uppercase tracking-widest inline-block ${o.status === 'delivered' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                              o.status === 'shipped' ? 'border-indigo-500 text-indigo-600 bg-indigo-50' :
                                o.status === 'cancelled' ? 'border-rose-500 text-rose-600 bg-rose-50' :
                                  'border-amber-500 text-amber-600 bg-amber-50'
                              }`}>
                              {o.status}
                            </span>

                            <div className="relative group/select">
                              {o.status !== 'delivered' && o.status !== 'cancelled' ? (
                                <div className="flex items-center gap-2">
                                  <Truck size={14} className="text-slate-400" />
                                  <select
                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-indigo-400 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                                    value={o.assignedAgentId || ''}
                                    onChange={(e) => assignAgent(o.id, e.target.value)}
                                  >
                                    <option value="">Detached</option>
                                    {agents.map(a => (
                                      <option key={a.uid} value={a.uid}>{a.name}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                o.assignedAgentId && (
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={12} className="text-indigo-500" /> {agents.find(a => a.uid === o.assignedAgentId)?.name || 'Unknown Operator'}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                            {o.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateOrderStatus(o.id, 'cancelled')}
                                  className="p-3 text-rose-500 bg-white border border-rose-100 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                                  title="Abort Mission"
                                >
                                  <X size={18} />
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(o.id, 'shipped')}
                                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 border-b-4 border-indigo-400"
                                >
                                  Deploy
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center justify-center opacity-20">
                            <ShoppingCart size={48} className="mb-4" />
                            <p className="font-black text-xs uppercase tracking-[0.4em]">Zero Active Transmissions</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'prep' ? (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Preparation Central</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Aggregated Manifest for Current Deployment Cycle</p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
                  <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest">Real-time Syncing</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {Object.keys(prepCounts).map(id => (
                  <div key={id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 group relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{prepCounts[id].name}</p>
                      <h4 className="text-6xl font-black mb-10 text-indigo-950 tracking-tighter">{prepCounts[id].qty}</h4>
                      <div className="space-y-4">
                        <button
                          onClick={() => shipAllForProduct(id)}
                          className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-indigo-400"
                        >
                          <Truck size={18} className="text-white" /> Batch Dispatch
                        </button>
                      </div>
                    </div>
                    <div className="absolute -top-10 -right-10 bg-indigo-50 p-16 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500">
                      <Package size={80} className="text-indigo-600" />
                    </div>
                  </div>
                ))}
                {Object.keys(prepCounts).length === 0 && (
                  <div className="col-span-full py-20 bg-white rounded-[3rem] border border-slate-100 text-center">
                    <div className="opacity-20 flex flex-col items-center">
                      <ChefHat size={48} className="mb-4" />
                      <p className="font-black text-xs uppercase tracking-[0.4em]">Hub Idle: No Pending Prep</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'refunds' ? (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Security Settlements</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Process Regional Cash Refunds for Reclaimed Assets</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pendingRefunds.map(r => (
                  <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group transition-all hover:shadow-2xl">
                    <div className="absolute top-0 right-0 p-5 bg-slate-50 rounded-bl-[2rem] border-b border-l border-slate-100">
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest ${r.status === 'completed' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-amber-100/50 text-amber-600'}`}>
                        {r.status === 'completed' ? 'Verified' : 'In Transit'}
                      </span>
                    </div>
                    <div className="mb-8">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Transmission #{r.id.slice(-6).toUpperCase()}</p>
                      <h3 className="text-2xl font-black text-indigo-950 uppercase italic tracking-tight">{r.userName}</h3>
                      <p className="font-black text-indigo-300 text-[10px] uppercase tracking-widest mt-1">{r.userPhone}</p>
                    </div>

                    <div className="flex items-center gap-5 mb-10 bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 shadow-inner">
                      <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg rotate-3 group-hover:rotate-0 transition-transform border-b-2 border-indigo-400">
                        {r.barrelCount}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-indigo-800 tracking-widest leading-none">Recovered Units</p>
                        <p className="text-xl font-black text-indigo-950 mt-1.5">₹{r.barrelCount * 200}</p>
                      </div>
                    </div>

                    {r.status === 'completed' ? (
                      <button
                        onClick={() => handleRefund(r.id)}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-emerald-500"
                      >
                        Authorize Settlement <Banknote size={18} className="text-emerald-400" />
                      </button>
                    ) : (
                      <div className="w-full py-5 bg-slate-50 text-slate-300 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] text-center border-2 border-slate-100 border-dashed">
                        Awaiting Field Verification
                      </div>
                    )}
                    <div className="absolute right-[-10%] bottom-[-10%] w-24 h-24 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ))}
                {pendingRefunds.length === 0 && (
                  <div className="col-span-full py-20 bg-white rounded-[3rem] border border-slate-100 text-center">
                    <div className="opacity-20 flex flex-col items-center">
                      <RotateCcw size={48} className="mb-4" />
                      <p className="font-black text-xs uppercase tracking-[0.4em]">Settlement Vault Clear</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'inventory' ? (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Regional Logistics Hub</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Catalog and Resource Management</p>
                </div>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 border-b-4 border-indigo-400"
                >
                  <Plus size={18} className="text-white" /> Catalog New Entity
                </button>
              </div>

              {showAddProduct && (
                <div className="fixed inset-0 bg-indigo-950/60 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="bg-white p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 relative border border-slate-100">
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tight">Provision Entity</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Define New Logistics Asset</p>
                      </div>
                      <button onClick={() => setShowAddProduct(false)} className="p-3 bg-slate-50 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100"><X size={20} /></button>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Asset Identity</label>
                        <input
                          className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                          value={newProduct.name}
                          onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder="e.g. 20L NEON JAR"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Tariff (₹)</label>
                          <input
                            type="number"
                            className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                            value={newProduct.price}
                            onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                            placeholder="000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Quantity</label>
                          <input
                            type="number"
                            className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                            value={newProduct.stock}
                            onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                            placeholder="00"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Classification Style</label>
                        <div className="flex gap-4">
                          {['style:barrel', 'style:bottle', 'style:dispenser'].map(s => (
                            <button
                              key={s}
                              onClick={() => {
                                let defaultFee = 0;
                                if (s === 'style:barrel') defaultFee = 200;
                                setNewProduct({ ...newProduct, image: s, securityFee: defaultFee });
                              }}
                              className={`flex-1 p-4 rounded-2xl border-2 transition-all group ${newProduct.image === s ? 'border-indigo-600 bg-indigo-50 shadow-lg scale-105' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                            >
                              <div className="flex justify-center mb-2 group-hover:scale-110 transition-transform"><ProductVisualSmall style={s} /></div>
                              <p className="text-[8px] font-black uppercase text-center text-slate-400">{s.split(':')[1]}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Product Category</label>
                        <div className="flex gap-4">
                          {[
                            { id: 'REGULAR', label: 'Standard' },
                            { id: 'PREMIUM', label: 'Case Pack' },
                            { id: 'ACCESSORY', label: 'Accessory' }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => setNewProduct({ ...newProduct, type: t.id as any })}
                              className={`flex-1 py-3 rounded-2xl border-2 text-[8px] font-black uppercase tracking-widest transition-all 
                                ${newProduct.type === t.id ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' : 'border-slate-100 bg-white text-slate-400 hover:border-indigo-200'}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Security Fee (₹)</label>
                          <input
                            type="number"
                            className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                            value={newProduct.securityFee}
                            onChange={e => setNewProduct({ ...newProduct, securityFee: Number(e.target.value) })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Public Note</label>
                          <input
                            className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                            value={newProduct.note}
                            onChange={e => setNewProduct({ ...newProduct, note: e.target.value })}
                            placeholder="Optional info..."
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddProduct}
                        className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl mt-6 hover:bg-indigo-700 transition-all border-b-4 border-indigo-400 active:scale-95"
                      >
                        Deploy to Catalog
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                        <th className="px-10 py-8 tracking-[0.2em]">Visual Profile</th>
                        <th className="px-10 py-8 tracking-[0.2em]">Asset Valuation</th>
                        <th className="px-10 py-8 tracking-[0.2em]">Regional Stock</th>
                        <th className="px-10 py-8 text-right tracking-[0.2em]">Logistics Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-6">
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:scale-110 transition-transform">
                                <ProductVisualSmall style={p.image} />
                              </div>
                              {editingId === p.id ? (
                                <input
                                  className="p-4 border-2 border-indigo-600 rounded-2xl font-black outline-none bg-white shadow-xl text-sm"
                                  value={editForm.name}
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                              ) : (
                                <span className="font-black text-indigo-950 uppercase italic tracking-tight text-lg">{p.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            {editingId === p.id ? (
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-indigo-300">₹</span>
                                <input
                                  type="number"
                                  className="p-4 pl-8 border-2 border-indigo-600 rounded-2xl w-32 outline-none font-black bg-white shadow-xl text-sm"
                                  value={editForm.price}
                                  onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                />
                              </div>
                            ) : (
                              <span className="font-black text-indigo-950 text-lg tracking-tighter">₹{p.price}</span>
                            )}
                          </td>
                          <td className="px-10 py-8">
                            {editingId === p.id ? (
                              <input
                                type="number"
                                className="p-4 border-2 border-indigo-600 rounded-2xl w-24 outline-none font-black bg-white shadow-xl text-sm text-center"
                                value={editForm.stock}
                                onChange={e => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${p.stock > 10 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                                <span className="font-black text-indigo-950 text-lg tracking-tighter">{p.stock}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                              {editingId === p.id ? (
                                <>
                                  <button onClick={handleUpdateProduct} className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all active:scale-95"><Save size={18} /></button>
                                  <button onClick={() => setEditingId(null)} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"><X size={18} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingId(p.id); setEditForm(p); }} className="p-4 border border-slate-200 bg-white text-slate-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"><Edit3 size={18} /></button>
                                  <button onClick={() => deleteProduct(p.id)} className="p-4 border border-rose-100 bg-white text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"><Trash2 size={18} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'agents' ? (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Fleet Command</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Provision and Deploy Regional Delivery Agents</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Add Agent Form */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Onboard Agent</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Register New Fleet Personnel</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Agent Name</label>
                      <input
                        type="text"
                        placeholder="Full Legal Name"
                        className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                        value={newAgentName}
                        onChange={e => setNewAgentName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Communication Channel (WhatsApp)</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        className="w-full p-5 bg-indigo-50 border border-indigo-100 rounded-3xl font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                        value={newAgentPhone}
                        onChange={e => setNewAgentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (newAgentPhone.length !== 10 || !newAgentName) return alert('Enter name and valid 10-digit phone number');
                        try {
                          await api.post('/auth/create-staff', {
                            phone: newAgentPhone,
                            name: newAgentName,
                            district: adminDistrict,
                            state: user?.state || '',
                            city: user?.city || adminDistrict,
                            role: 'AGENT'
                          });
                          alert(`Agent ${newAgentName} added successfully`);
                          setNewAgentPhone('');
                          setNewAgentName('');
                          fetchData();
                        } catch (err: any) {
                          console.error('Failed to add agent:', err);
                          alert(err.response?.data?.error || 'Failed to add agent');
                        }
                      }}
                      className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all border-b-4 border-indigo-400 active:scale-95 flex items-center justify-center gap-3"
                    >
                      Deploy Personnel <Users size={18} className="text-white" />
                    </button>
                  </div>
                  <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                </div>

                {/* Agent List */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black uppercase italic tracking-tight text-indigo-950">Active Fleet <span className="text-indigo-600 ml-2">[{agents.length}]</span></h3>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                    {agents.map(agent => (
                      <div key={agent.uid} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group transition-all hover:bg-white hover:shadow-lg hover:border-blue-200">
                        {editingAgent?.uid === agent.uid ? (
                          <div className="space-y-4">
                            <input
                              value={editingAgent.name}
                              onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                              className="w-full p-4 border-2 border-slate-950 rounded-2xl font-black outline-none bg-white shadow-xl"
                            />
                            <div className="flex gap-3">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.patch(`/users/${editingAgent.uid}`, { name: editingAgent.name });
                                    alert('Agent record updated');
                                    setEditingAgent(null);
                                    fetchData();
                                  } catch (err) {
                                    alert('Failed to update agent record');
                                  }
                                }}
                                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingAgent(null)}
                                className="flex-1 bg-slate-200 text-slate-500 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-300 transition-all"
                              >
                                Abort
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg group-hover:bg-indigo-500 transition-colors border-b-2 border-indigo-400">
                                  <Truck size={20} />
                                </div>
                                <div>
                                  <p className="font-black text-indigo-950 uppercase italic tracking-tight text-lg">{agent.name}</p>
                                  <p className="text-[10px] font-black text-indigo-300 tracking-[0.2em] uppercase mt-0.5">{agent.phone}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingAgent({ uid: agent.uid, name: agent.name })} className="p-3 bg-white border border-indigo-100 rounded-xl text-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
                                  <Edit3 size={16} />
                                </button>
                                <button onClick={async () => {
                                  if (!confirm('Excommunicate this agent?')) return;
                                  try {
                                    await api.delete(`/users/${agent.uid}`);
                                    fetchData();
                                  } catch (err) { alert('Operation Failed'); }
                                }} className="p-3 bg-white border border-rose-100 rounded-xl text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Assigned Territories</p>
                              <div className="flex flex-wrap gap-2">
                                {zones.map(zone => {
                                  let assignedZones: string[] = [];
                                  try {
                                    if (Array.isArray(agent.assignedZones)) {
                                      assignedZones = agent.assignedZones;
                                    } else if (typeof agent.assignedZones === 'string') {
                                      assignedZones = JSON.parse(agent.assignedZones);
                                    }
                                  } catch (e) { assignedZones = []; }

                                  const isAssigned = assignedZones.includes(zone.name);
                                  return (
                                    <button
                                      key={zone.id}
                                      onClick={async () => {
                                        const newZones = isAssigned
                                          ? assignedZones.filter(z => z !== zone.name)
                                          : [...assignedZones, zone.name];
                                        try {
                                          await api.patch(`/users/${agent.uid}`, { assignedZones: JSON.stringify(newZones) });
                                          fetchData();
                                        } catch (err) { alert('Failed to update zones'); }
                                      }}
                                      className={`px-4 py-2.5 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${isAssigned ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-indigo-100 text-indigo-300 hover:border-indigo-300'}`}
                                    >
                                      {zone.name}
                                    </button>
                                  );
                                })}
                                {zones.length === 0 && <span className="text-[10px] font-black text-slate-300 uppercase italic">No Zones Established</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {agents.length === 0 && <p className="text-center py-10 opacity-30 font-black uppercase text-[10px] tracking-widest">No Active Personnel</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'support' ? (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Regional Support Console</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Direct Communication and Emergency Broadcasts</p>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8 relative overflow-hidden group">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-1">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg transform -rotate-6 group-hover:rotate-0 transition-transform">
                      <MessageSquare size={16} className="text-white" />
                    </div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Tactical Broadcast Message</label>
                  </div>
                  <textarea
                    placeholder="e.g., 'Operational Alert: Extreme weather in Puri Central. Deliveries may experience 2-hour latency.'"
                    className="w-full p-8 bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] font-bold text-indigo-950 outline-none focus:border-indigo-600 transition-all min-h-[180px] resize-none shadow-inner text-lg leading-relaxed"
                    value={supportMsg}
                    onChange={e => setSupportMsg(e.target.value)}
                  />
                  <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <ShieldCheck size={14} className="text-amber-600" />
                    <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">This transmission will be visible to all active users in the {adminDistrict} territory.</p>
                  </div>
                </div>
                <button
                  onClick={handleUpdateSupport}
                  className="w-full bg-indigo-600 text-white py-7 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-2xl hover:bg-indigo-700 transition-all border-b-4 border-indigo-400 active:scale-95 flex items-center justify-center gap-4"
                >
                  Authorize & Broadcast <Zap size={18} className="text-indigo-300" />
                </button>
                <div className="absolute right-[-5%] bottom-[-5%] w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

          ) : activeTab === 'reports' ? (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Regional Analytics</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Intelligence and Logistics Performance Metrics</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => {
                    const todayStr = new Date().toDateString();
                    const todayOrders = orders.filter(o => (o.shippedAt && new Date(Number(o.shippedAt)).toDateString() === todayStr) || (o.deliveredAt && new Date(Number(o.deliveredAt)).toDateString() === todayStr));
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
                    link.setAttribute("download", `daily_sales_${adminDistrict}_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                  }} className="bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 shadow-xl hover:bg-indigo-50 transition-all active:scale-95">
                    <CalendarRange size={16} /> Daily Sales Manifest
                  </button>
                  <button onClick={() => {
                    const headers = ['Order ID', 'Date', 'Customer', 'Items', 'Total Amount', 'Status', 'Delivery Charge'];
                    const rows = orders.map(o => [
                      o.id, new Date(o.timestamp).toLocaleDateString(), o.userName, o.items.map(i => `${i.name} (${i.quantity})`).join('; '), o.totalAmount, o.status, o.deliveryCharge
                    ]);
                    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `comprehensive_report_${adminDistrict}_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                  }} className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 border-b-4 border-emerald-600">
                    <ClipboardList size={16} className="text-emerald-400" /> Archive Master CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Gross Regional Revenue', value: `₹${orders.filter(o => o.status === 'shipped' || o.status === 'delivered').reduce((sum, o) => sum + Number(o.totalAmount), 0).toLocaleString()}`, color: 'text-indigo-950', sub: 'Cumulative Total' },
                  { label: 'Current Cycle Yield', value: `₹${orders.filter(o => (o.status === 'shipped' || o.status === 'delivered') && new Date(o.timestamp).toDateString() === new Date().toDateString()).reduce((sum, o) => sum + Number(o.totalAmount), 0).toLocaleString()}`, color: 'text-emerald-600', sub: 'Today (Verified)' },
                  { label: 'Fleet Transmissions', value: `${orders.filter(o => o.status === 'shipped' && o.shippedAt && new Date(Number(o.shippedAt)).toDateString() === new Date().toDateString()).length} Units`, color: 'text-indigo-600', sub: 'Active Shipments' },
                  { label: 'Terminal Deliveries', value: `${orders.filter(o => o.status === 'delivered' && o.deliveredAt && new Date(Number(o.deliveredAt)).toDateString() === new Date().toDateString()).length} Units`, color: 'text-violet-600', sub: 'Finalized Today' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-3">{stat.label}</p>
                    <h3 className={`text-3xl font-black ${stat.color} tracking-tighter`}>{stat.value}</h3>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 bg-slate-50 inline-block px-3 py-1 rounded-full">{stat.sub}</p>
                    <div className="absolute right-[-10%] bottom-[-10%] w-20 h-20 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors"></div>
                  </div>
                ))}
              </div>

              <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Inventory Dispersion</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Resource allocation by asset class</p>
                  </div>
                  <BarChart3 size={32} className="text-slate-950 opacity-10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(prepCounts).map(id => (
                    <div key={id} className="group p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] flex justify-between items-center transition-all hover:bg-white hover:shadow-xl hover:border-indigo-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black group-hover:bg-indigo-500 transition-colors shadow-lg">
                          {prepCounts[id].name.charAt(0)}
                        </div>
                        <span className="font-black text-indigo-950 uppercase italic tracking-tight">{prepCounts[id].name}</span>
                      </div>
                      <span className="font-black bg-white border border-indigo-200 text-indigo-950 px-5 py-2 rounded-2xl shadow-sm text-lg tracking-tighter">
                        {prepCounts[id].qty} <span className="text-[10px] uppercase text-indigo-400 ml-1">Units</span>
                      </span>
                    </div>
                  ))}
                  {Object.keys(prepCounts).length === 0 && (
                    <div className="col-span-full py-16 text-center opacity-30">
                      <Package size={48} className="mx-auto mb-4" />
                      <p className="font-black uppercase text-[10px] tracking-[0.4em]">Resource Silos Empty Today</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'zones' ? (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Territory Control Center</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Geospatial Mapping and Automated Dispatch Units</p>
                </div>
                <button
                  onClick={() => { setEditingZone(null); setNewZone({ name: '', description: '', postalCodes: '', landmarks: '' }); setShowAddZone(true); }}
                  className="bg-indigo-600 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 border-b-4 border-indigo-400"
                >
                  <MapPin size={18} className="text-white" /> Establish Vector Zone
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Identified Vectors', value: zones.length, color: 'bg-indigo-50 text-indigo-600', sub: 'Operational Units' },
                  {
                    label: 'Deployed Agents', value: agents.filter(a => {
                      try {
                        const z = Array.isArray(a.assignedZones) ? a.assignedZones : JSON.parse(a.assignedZones || '[]');
                        return z.length > 0;
                      } catch (e) { return false; }
                    }).length, color: 'bg-emerald-50 text-emerald-600', sub: 'Assigned Personnel'
                  },
                  { label: 'Automated Logins', value: orders.filter(o => o.detectedZone && o.timestamp && new Date(o.timestamp).toDateString() === new Date().toDateString()).length, color: 'bg-violet-50 text-violet-600', sub: 'Today (Vector-Mapped)' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.color.split(' ')[0]} p-8 rounded-[3rem] border border-current opacity-70 group hover:opacity-100 transition-opacity`}>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-2">{stat.label}</p>
                    <div className="flex items-end gap-3">
                      <h3 className="text-5xl font-black tracking-tighter">{stat.value}</h3>
                      <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">{stat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {zones.map(zone => {
                  const zoneAgents = agents.filter(a => {
                    try {
                      const assigned = Array.isArray(a.assignedZones) ? a.assignedZones : JSON.parse(a.assignedZones || '[]');
                      return assigned.includes(zone.name);
                    } catch (e) { return false; }
                  });
                  const zoneOrders = orders.filter(o => o.detectedZone === zone.name && o.status === 'pending');

                  return (
                    <div key={zone.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black rotate-3 group-hover:rotate-0 transition-transform shadow-lg">
                              <MapPin size={20} />
                            </div>
                            <h3 className="text-3xl font-black uppercase italic tracking-tight">{zone.name}</h3>
                          </div>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">{zone.description || 'No Vector Description'}</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => { setEditingZone(zone); setShowAddZone(true); }} className="p-4 bg-indigo-50 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"><Edit3 size={18} /></button>
                          <button onClick={async () => {
                            if (!confirm('Decommission this vector?')) return;
                            try {
                              await api.delete(`/zones/${zone.id}`);
                              fetchData();
                            } catch (e) { alert('Operation Failed'); }
                          }} className="p-4 bg-rose-50 text-rose-300 hover:bg-rose-500 hover:text-white transition-all rounded-2xl border border-rose-100"><Trash2 size={18} /></button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex flex-col justify-between">
                          <p className="text-[8px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-4">Postal Bounds</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(zone.postalcodes || []).map((code: string, idx: number) => (
                              <span key={idx} className="text-[10px] font-black text-indigo-800 bg-white px-3 py-1 rounded-xl shadow-sm border border-indigo-100">{code}</span>
                            ))}
                            {(zone.postalcodes || []).length === 0 && <span className="text-[10px] font-black text-indigo-300 uppercase italic">Unbounded</span>}
                          </div>
                        </div>
                        <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex flex-col justify-between">
                          <p className="text-[8px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-4">Tactical Landmarks</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(zone.landmarks || []).map((landmark: string, idx: number) => (
                              <span key={idx} className="text-[10px] font-black text-emerald-800 bg-white px-3 py-1 rounded-xl shadow-sm border border-emerald-100">{landmark}</span>
                            ))}
                            {(zone.landmarks || []).length === 0 && <span className="text-[10px] font-black text-emerald-300 uppercase italic">No Markers</span>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.3em]">Assigned Fleet Personnel</p>
                          <span className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full">{zoneAgents.length} Agents</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {zoneAgents.map(agent => (
                            <div key={agent.uid} className="bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="text-xs font-black text-slate-950 uppercase italic tracking-tight">{agent.name}</span>
                            </div>
                          ))}
                          {zoneAgents.length === 0 && (
                            <div className="w-full p-4 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No Tactical Deployment</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {zoneOrders.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-slate-100">
                          <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-3xl border border-amber-100">
                            <div className="bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg">
                              {zoneOrders.length}
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest leading-none">Awaiting Dispatch</p>
                              <p className="text-xs font-black text-amber-950 mt-1">Strategic Intervention Required</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  );
                })}

                {zones.length === 0 && (
                  <div className="col-span-full py-24 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
                    <div className="opacity-20 flex flex-col items-center">
                      <MapPin size={64} className="mb-6" />
                      <p className="font-black text-sm uppercase tracking-[0.5em]">No Strategic Vectors Defined</p>
                      <button
                        onClick={() => setShowAddZone(true)}
                        className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest border-b-4 border-indigo-800"
                      >
                        Initialize First Vector
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add/Edit Zone Modal */}
              {(showAddZone || editingZone) && (
                <div className="fixed inset-0 bg-indigo-950/60 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="bg-white p-12 rounded-[4rem] max-w-2xl w-full shadow-2xl animate-in zoom-in duration-500 relative border border-slate-100 overflow-y-auto max-h-[95vh] no-scrollbar">
                    <div className="flex justify-between items-center mb-12">
                      <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tight">{editingZone ? 'Vector Configuration' : 'Vector Establishment'}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Geospatial Strategic Endpoint Definition</p>
                      </div>
                      <button onClick={() => { setShowAddZone(false); setEditingZone(null); setNewZone({ name: '', description: '', postalCodes: '', landmarks: '' }); }} className="p-4 bg-slate-50 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100">
                        <X size={24} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Vector Identity *</label>
                        <input
                          type="text"
                          value={editingZone ? editingZone.name : newZone.name}
                          onChange={(e) => editingZone ? setEditingZone({ ...editingZone, name: e.target.value }) : setNewZone({ ...newZone, name: e.target.value })}
                          placeholder="e.g., North PUR-1"
                          className="w-full p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Vector Manifest</label>
                        <input
                          type="text"
                          value={editingZone ? editingZone.description : newZone.description}
                          onChange={(e) => editingZone ? setEditingZone({ ...editingZone, description: e.target.value }) : setNewZone({ ...newZone, description: e.target.value })}
                          placeholder="Operational Scope"
                          className="w-full p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Postal Identifiers (CSV)</label>
                        <input
                          type="text"
                          value={editingZone ? (editingZone.postalcodes || []).join(', ') : newZone.postalCodes}
                          onChange={(e) => editingZone ? setEditingZone({ ...editingZone, postalcodes: e.target.value.split(',').map(s => s.trim()).filter(s => s) }) : setNewZone({ ...newZone, postalCodes: e.target.value })}
                          placeholder="752001, 752002"
                          className="w-full p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Tactical Markers (CSV)</label>
                        <input
                          type="text"
                          value={editingZone ? (editingZone.landmarks || []).join(', ') : newZone.landmarks}
                          onChange={(e) => editingZone ? setEditingZone({ ...editingZone, landmarks: e.target.value.split(',').map(s => s.trim()).filter(s => s) }) : setNewZone({ ...newZone, landmarks: e.target.value })}
                          placeholder="Victory Square, Main Terminal"
                          className="w-full p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] font-black text-indigo-950 outline-none focus:border-indigo-600 transition shadow-inner"
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const zoneData = editingZone ? {
                          name: editingZone.name,
                          description: editingZone.description,
                          postalCodes: editingZone.postalcodes || [],
                          landmarks: editingZone.landmarks || []
                        } : {
                          district: adminDistrict,
                          state: user?.state,
                          city: user?.city,
                          name: newZone.name,
                          description: newZone.description,
                          postalCodes: newZone.postalCodes.split(',').map(s => s.trim()).filter(s => s),
                          landmarks: newZone.landmarks.split(',').map(s => s.trim()).filter(s => s)
                        };

                        if (!zoneData.name) return alert('Vector Identity Required');

                        try {
                          if (editingZone) {
                            await api.patch(`/zones/${editingZone.id}`, zoneData);
                            alert('Vector Configuration Synced');
                          } else {
                            await api.post('/zones', zoneData);
                            alert('Vector Established Successfully');
                          }
                          setShowAddZone(false);
                          setEditingZone(null);
                          setNewZone({ name: '', description: '', postalCodes: '', landmarks: '' });
                          fetchData();
                        } catch (e: any) { alert('Transmission Failure: ' + e.message); }
                      }}
                      className="w-full bg-indigo-600 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-indigo-700 transition-all border-b-4 border-indigo-400 active:scale-95 flex items-center justify-center gap-4"
                    >
                      Deploy Vector Blueprint <Zap size={18} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
