import React, { useState, useEffect } from 'react';
import { Order, Product, ReturnRequest, DistrictConfig, User } from '../types';
import { LogOut, ShoppingCart, Package, Edit3, Droplets, GlassWater, Settings, ClipboardList, Banknote, ShieldCheck, CheckCircle2, Users, Plus, Trash2, X, Save, ChefHat, Truck, ArrowLeft, ArrowRightLeft, Search, Wallet, IndianRupee, Headset, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProductVisualSmall: React.FC<{ style: string }> = ({ style }) => {
  if (style === 'style:barrel') return <div className="w-10 h-10 bg-blue-100 border-2 border-blue-600 rounded-lg flex items-center justify-center"><Droplets size={16} className="text-blue-600" /></div>;
  if (style === 'style:dispenser') return <div className="w-10 h-10 bg-gray-100 border-2 border-gray-400 rounded-lg flex items-center justify-center"><Settings size={16} className="text-gray-600" /></div>;
  if (style === 'style:bottle') return <div className="w-10 h-10 bg-blue-50 border-2 border-blue-300 rounded-lg flex items-center justify-center"><GlassWater size={16} className="text-blue-400" /></div>;
  return <div className="w-10 h-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg" />;
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

  const [activeTab, setActiveTab] = useState<'orders' | 'prep' | 'refunds' | 'agents' | 'inventory' | 'support' | 'reports'>('orders');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, stock: 10, type: 'REGULAR', image: 'style:barrel', securityFee: 0 });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [agents, setAgents] = useState<any[]>([]);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [supportMsg, setSupportMsg] = useState('');
  const [districtUsers, setDistrictUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchData();
  }, [adminDistrict]);

  const fetchData = async () => {
    try {
      const [oRes, pRes, rRes, cRes, aRes, uRes] = await Promise.all([
        api.get(`/orders?district=${adminDistrict}`),
        api.get('/products'),
        api.get(`/returns?district=${adminDistrict}`),
        api.get('/configs'),
        api.get('/users?role=AGENT'),
        api.get('/users') // This might be heavy, but for a district it's fine. 
      ]);
      setOrders(oRes.data);
      setProducts(pRes.data);
      setReturnRequests(rRes.data);
      setDistrictConfigs(cRes.data);

      const regionalUsers = uRes.data.filter((u: any) => u.district === adminDistrict);
      setDistrictUsers(regionalUsers);

      // Filter agents by current district
      const agentsList = aRes.data.filter((a: any) => a.district === adminDistrict);
      setAgents(agentsList);

      const myConfig = cRes.data.find((d: DistrictConfig) => d.district === adminDistrict);
      if (myConfig) setSupportMsg(myConfig.supportMsg || '');
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  const totalConnections = districtUsers.reduce((sum, u) => sum + (u.activeBarrels || 0), 0);
  const refundLiability = totalConnections * 200;

  const config = districtConfigs.find(d => d.district === adminDistrict);
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const prepCounts = pendingOrders.reduce((acc: Record<string, { name: string, qty: number }>, o) => {
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
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) {
      alert('Failed to update status');
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-white text-black min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-6">
          <div><h1 className="text-4xl font-black tracking-tighter uppercase">Pani Gadi Admin</h1><p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{adminDistrict}</p></div>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="bg-blue-50 px-6 py-3 rounded-2xl border-2 border-blue-100">
            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Active Connections</p>
            <h3 className="text-2xl font-black">{totalConnections} Jars</h3>
          </div>
          <div className="bg-rose-50 px-6 py-3 rounded-2xl border-2 border-rose-100">
            <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-1">Refund Liability</p>
            <h3 className="text-2xl font-black">₹{refundLiability.toLocaleString()}</h3>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-black font-black bg-white border-2 border-blue-600 px-6 py-3 rounded-2xl shadow-xl hover:bg-blue-50 transition"><LogOut size={20} /> Logout</button>
      </header>

      <div className="flex border-b border-gray-100 gap-8 mb-4 overflow-x-auto no-scrollbar">
        {(['orders', 'prep', 'refunds', 'agents', 'inventory', 'support', 'reports'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>{tab.replace('prep', 'Prep hub').replace('refunds', 'Security Refunds')}</button>
        ))}
      </div>

      {activeTab === 'orders' ? (
        <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100"><tr><th className="px-8 py-6">ID</th><th className="px-8 py-6">Customer</th><th className="px-8 py-6">Items</th><th className="px-8 py-6">Status</th><th className="px-8 py-6 text-right">Dispatch</th></tr></thead>
            <tbody className="divide-y divide-gray-50 text-black">
              {orders.map(o => (
                <tr key={o.id} className="text-sm hover:bg-gray-50">
                  <td className="px-8 py-6 font-black text-blue-600">#{o.id}</td><td className="px-8 py-6 font-bold">{o.userName}</td><td className="px-8 py-6 font-black text-[10px] text-gray-400 uppercase">{o.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td><td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 uppercase ${o.status === 'delivered' ? 'border-green-500 text-green-600' : o.status === 'shipped' ? 'border-blue-500 text-blue-600' : 'border-yellow-500 text-yellow-600'}`}>{o.status}</span></td>
                  <td className="px-8 py-6 text-right">
                    {o.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => updateOrderStatus(o.id, 'cancelled')} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 transition">Cancel</button>
                        <button onClick={() => updateOrderStatus(o.id, 'shipped')} className="bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">Ship</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={5} className="px-8 py-20 text-center opacity-30 italic font-black text-xs uppercase">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'prep' ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black">Preparation Hub</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aggregate items for current shift</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.keys(prepCounts).map(id => (
              <div key={id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-gray-100 group relative overflow-hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{prepCounts[id].name}</p>
                <h4 className="text-5xl font-black mb-6 text-black">{prepCounts[id].qty}</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => shipAllForProduct(id)}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Truck size={14} /> Mark Shipped (Batch)
                  </button>
                </div>
                <div className="absolute -top-4 -right-4 bg-gray-50 p-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Droplets size={24} className="text-blue-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'refunds' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black">Security Refunds</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Process Cash Settlements</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRefunds.map(r => (
              <div key={r.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 bg-gray-50 rounded-bl-3xl border-b border-l border-gray-100">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Request #{r.id}</p>
                  <h3 className="text-xl font-black">{r.userName}</h3>
                  <p className="font-bold text-gray-400 text-xs">{r.userPhone}</p>
                </div>
                <div className="flex items-center gap-4 mb-6 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">{r.barrelCount}</div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest leading-none">Jars Returning</p>
                    <p className="text-sm font-black mt-0.5">₹{r.barrelCount * 200} Refund</p>
                  </div>
                </div>
                {r.status === 'completed' ? (
                  <button onClick={() => handleRefund(r.id)} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                    Refund Allotted <Banknote size={16} className="inline ml-1 mb-0.5" />
                  </button>
                ) : (
                  <div className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest text-center">
                    Waiting for Agent
                  </div>
                )}
              </div>
            ))}
            {pendingRefunds.length === 0 && <p className="col-span-3 text-center opacity-30 font-black uppercase tracking-widest py-20">No active refund requests</p>}
          </div>
        </div>
      ) : activeTab === 'inventory' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div><h2 className="text-2xl font-black">Regional Store</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add or Remove offerings</p></div>
            <button onClick={() => setShowAddProduct(true)} className="bg-blue-600 text-white px-6 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition"><Plus size={16} /> Add Item</button>
          </div>

          {showAddProduct && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black">Add New Product</h3>
                  <button onClick={() => setShowAddProduct(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</label>
                    <input className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. 20L Water Jar" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price (₹)</label>
                      <input type="number" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stock</label>
                      <input type="number" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-blue-600 transition" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })} placeholder="10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type</label>
                    <select className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold outline-none" value={newProduct.type} onChange={(e: any) => setNewProduct({ ...newProduct, type: e.target.value })}>
                      <option value="REGULAR">Regular</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="ACCESSORY">Accessory</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Image Style</label>
                    <div className="flex gap-4 mt-2">
                      {['style:barrel', 'style:bottle', 'style:dispenser'].map(s => (
                        <button key={s} onClick={() => setNewProduct({ ...newProduct, image: s })} className={`p-2 rounded-xl border-2 ${newProduct.image === s ? 'border-blue-600 bg-blue-50' : 'border-gray-100'}`}>
                          <ProductVisualSmall style={s} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddProduct} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-4">Save Product</button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b"><tr><th className="px-8 py-6">Item Name</th><th className="px-8 py-6">Price</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6 text-right">Actions</th></tr></thead>
              <tbody className="divide-y">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-8 py-6 flex items-center gap-4">
                      <ProductVisualSmall style={p.image} />
                      {editingId === p.id ? <input className="p-2 border-2 border-black rounded-xl font-bold outline-none" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /> : <span className="font-black">{p.name}</span>}
                    </td>
                    <td className="px-8 py-6">{editingId === p.id ? <input type="number" className="p-2 border-2 border-black rounded-xl w-24 outline-none font-bold" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })} /> : <span className="font-black">₹{p.price}</span>}</td>
                    <td className="px-8 py-6">{editingId === p.id ? <input type="number" className="p-2 border-2 border-black rounded-xl w-24 outline-none font-bold" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: Number(e.target.value) })} /> : <span className="font-black">{p.stock}</span>}</td>
                    <td className="px-8 py-6 text-right space-x-2">
                      {editingId === p.id ? (<><button onClick={handleUpdateProduct} className="p-2 bg-black text-white rounded-lg"><Save size={18} /></button><button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button></>) : (<><button onClick={() => { setEditingId(p.id); setEditForm(p); }} className="p-2.5 border-2 rounded-xl hover:bg-black hover:text-white transition-all"><Edit3 size={18} /></button><button onClick={() => deleteProduct(p.id)} className="p-2.5 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button></>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'agents' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black">Fleet Management</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provision Delivery Agents</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Agent Form */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-xl space-y-4">
              <h3 className="text-lg font-black">Add New Agent</h3>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Agent Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-black transition"
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Agent WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-black transition"
                  value={newAgentPhone}
                  onChange={e => setNewAgentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
              <button
                onClick={async () => {
                  if (newAgentPhone.length !== 10 || !newAgentName) return alert('Enter name and valid 10-digit phone number');
                  try {
                    await api.post('/auth/login', {
                      phone: newAgentPhone,
                      name: newAgentName,
                      district: adminDistrict,
                      role: 'AGENT'
                    });
                    alert(`Agent ${newAgentName} added successfully`);
                    setNewAgentPhone('');
                    setNewAgentName('');
                    fetchData();
                  } catch (err) {
                    alert('Failed to add agent');
                  }
                }}
                className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
              >
                Add to Fleet
              </button>
            </div>

            {/* Agent List */}
            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-xl">
              <h3 className="text-lg font-black mb-4">Active Agents ({agents.length})</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {agents.map(agent => (
                  <div key={agent.uid} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    {editingAgent?.uid === agent.uid ? (
                      <div className="space-y-2">
                        <input
                          value={editingAgent.name}
                          onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                          className="w-full p-2 border-2 border-black rounded-xl font-bold outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(`/users/${editingAgent.uid}`, { name: editingAgent.name });
                                alert('Agent updated');
                                setEditingAgent(null);
                                fetchData();
                              } catch (err) {
                                alert('Failed to update');
                              }
                            }}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAgent(null)}
                            className="flex-1 bg-gray-200 px-3 py-2 rounded-xl font-black text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black">{agent.name}</p>
                          <p className="text-xs text-gray-500 font-bold">{agent.phone}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAgent(agent)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Delete this agent?')) return;
                              try {
                                await api.delete(`/users/${agent.uid}`);
                                alert('Agent deleted');
                                fetchData();
                              } catch (err) {
                                alert('Failed to delete');
                              }
                            }}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-black hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {agents.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No agents added yet</p>}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'support' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-black">Regional Support</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Communication</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Support Message</label>
              <textarea
                placeholder="e.g., 'Heavy rain today, deliveries may be delayed by 2 hours...'"
                className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-black transition min-h-[120px] resize-none"
                value={supportMsg}
                onChange={e => setSupportMsg(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-2 font-bold">This message will be displayed to all customers in {adminDistrict} district.</p>
            </div>
            <button
              onClick={handleUpdateSupport}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              Broadcast Message
            </button>
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center px-2">
            <div><h2 className="text-2xl font-black">Performance Reports</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue & Inventory Analytics</p></div>
            <button onClick={() => {
              const headers = ['Order ID', 'Date', 'Customer', 'Items', 'Total Amount', 'Status', 'Delivery Charge'];
              const rows = orders.map(o => [
                o.id, new Date(o.timestamp).toLocaleDateString(), o.userName, o.items.map(i => `${i.name} (${i.quantity})`).join('; '), o.totalAmount, o.status, o.deliveryCharge
              ]);
              const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `report_${adminDistrict}_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
            }} className="bg-green-600 text-white px-6 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition hover:bg-green-700"><ClipboardList size={16} /> Download CSV</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-xl">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Gross Revenue</p>
              <h3 className="text-3xl font-black text-black">₹{orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-xl">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Today's Revenue</p>
              <h3 className="text-3xl font-black text-green-600">₹{orders.filter(o => o.status !== 'cancelled' && new Date(o.timestamp).toDateString() === new Date().toDateString()).reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-xl">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Shipped Today</p>
              <h3 className="text-3xl font-black text-blue-600">{orders.filter(o => o.status === 'shipped' && new Date(o.timestamp).toDateString() === new Date().toDateString()).length} Orders</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-xl">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Delivered Today</p>
              <h3 className="text-3xl font-black text-purple-600">{orders.filter(o => o.status === 'delivered' && new Date(o.timestamp).toDateString() === new Date().toDateString()).length} Orders</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-xl">
            <h3 className="text-lg font-black mb-6">Daily Inventory Shipped</h3>
            <div className="space-y-4">
              {Object.keys(prepCounts).map(id => (
                <div key={id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="font-bold">{prepCounts[id].name}</span>
                  <span className="font-black bg-black text-white px-3 py-1 rounded-lg">{prepCounts[id].qty} Units</span>
                </div>
              ))}
              {Object.keys(prepCounts).length === 0 && <p className="text-center text-gray-400 italic font-bold">No active shipments today.</p>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
