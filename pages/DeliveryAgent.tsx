import React, { useState, useEffect } from 'react';
import { Order, ReturnRequest } from '../types';
import { LogOut, MapPin, Phone, Check, Box, Truck, Zap, ZapOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DeliveryAgent: React.FC = () => {
  const { user, logout } = useAuth();
  const agentDistrict = user?.district || 'Unknown';
  const agentId = user?.uid;

  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'MY_TASKS' | 'POOL' | 'RETURNS'>('MY_TASKS');
  const [myZones, setMyZones] = useState<string[]>([]);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);
  const [sortedReturns, setSortedReturns] = useState<ReturnRequest[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    // Fetch agent's assigned zones
    if (user?.assignedZones) {
      try {
        const assignedZones = JSON.parse(user.assignedZones);
        setMyZones(assignedZones);
      } catch (e) {
        console.error('Failed to parse assigned zones');
      }
    }

    // Fetch data
    const fetchTasks = () => {
      Promise.all([
        api.get(`/orders?district=${agentDistrict}`),
        api.get(`/returns?district=${agentDistrict}`)
      ]).then(([oRes, rRes]) => {
        setOrders(oRes.data);
        setReturnRequests(rRes.data);
      }).catch(err => {
        console.error('Failed to fetch tasks:', err);
      });
    };
    fetchTasks();
    const inv = setInterval(fetchTasks, 15000);
    return () => clearInterval(inv);
  }, [agentDistrict, user]);

  // Filter Logic
  const myDeliveries = orders.filter(o => o.assignedAgentId === agentId && (o.status === 'pending' || o.status === 'shipped'));
  const poolDeliveries = orders.filter(o => !o.assignedAgentId && (o.status === 'pending' || o.status === 'shipped'));

  const pendingOrders = activeTab === 'MY_TASKS' ? myDeliveries : poolDeliveries;
  const pendingReturns = returnRequests.filter(r => r.status === 'pending');

  // Separate pool orders by zone
  const myZonePoolOrders = poolDeliveries.filter(o => o.detectedZone && myZones.includes(o.detectedZone));
  const otherPoolOrders = poolDeliveries.filter(o => !o.detectedZone || !myZones.includes(o.detectedZone));

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  };

  useEffect(() => {
    if (!isOptimizing) {
      setSortedOrders(pendingOrders);
      setSortedReturns(pendingReturns);
    } else if (currentPos) {
      const sortFn = (a: any, b: any) => {
        const latA = a.address?.latitude || 0;
        const lngA = a.address?.longitude || 0;
        const latB = b.address?.latitude || 0;
        const lngB = b.address?.longitude || 0;
        if (!latA || !latB) return 0;
        return getDistance(currentPos.lat, currentPos.lng, latA, lngA) - getDistance(currentPos.lat, currentPos.lng, latB, lngB);
      };

      setSortedOrders([...pendingOrders].sort(sortFn));
      setSortedReturns([...pendingReturns].sort(sortFn));
    }
  }, [orders, returnRequests, isOptimizing, currentPos, activeTab, agentId]);

  const toggleOptimization = () => {
    if (!isOptimizing) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsOptimizing(true);
          },
          (err) => {
            alert('Location access denied.');
          }
        );
      } else {
        alert('Geolocation is not supported.');
      }
    } else {
      setIsOptimizing(false);
      setCurrentPos(null);
    }
  };

  const updateOrderStatus = async (orderId: string, status: 'delivered' | 'cancelled') => {
    if (status === 'cancelled' && !confirm('Cancel task?')) return;
    try {
      await api.patch(`/orders/${orderId}`, { status });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) { alert('Failed to update status'); }
  };

  const updateReturnStatus = async (returnId: string, status: 'completed' | 'cancelled') => {
    try {
      await api.patch(`/returns/${returnId}`, { status });
      setReturnRequests(returnRequests.map(r => r.id === returnId ? { ...r, status } : r));
    } catch (e) { alert('Failed to update status'); }
  };

  const claimOrder = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}`, { assignedAgentId: agentId });
      alert('Order Picked! Moved to My Tasks.');
      setOrders(orders.map(o => o.id === orderId ? { ...o, assignedAgentId: agentId } : o));
      setActiveTab('MY_TASKS');
    } catch (e) {
      alert('Failed to claim order. It might be already taken.');
    }
  };

  const openInMaps = (lat?: number, lng?: number) => {
    if (lat === undefined || lng === undefined) return alert("Coordinates missing.");
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col text-slate-900 pb-12 shadow-2xl border-x border-slate-100">
      <header className="px-6 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-950 p-2 rounded-xl shadow-lg rotate-3">
            <Truck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">Fleet <span className="text-indigo-600">Unit</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">{agentDistrict} Division</p>
          </div>
        </div>
        <button onClick={logout} className="p-2.5 text-slate-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all border border-slate-100">
          <LogOut size={18} />
        </button>
      </header>

      <div className="p-5 space-y-5">
        <div className="bg-indigo-950 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border-b-4 border-indigo-600">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Active Load</p>
            <h2 className="text-6xl font-black mt-2 tracking-tighter italic">{pendingOrders.length + pendingReturns.length}</h2>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Real-time Sync Active</span>
            </div>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/5 p-8 rounded-full blur-2xl"></div>
          <Truck size={140} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
        </div>

        <button
          onClick={toggleOptimization}
          className={`w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 border-2 ${isOptimizing ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-900/20' : 'bg-white text-indigo-950 border-slate-100 hover:border-indigo-600'}`}
        >
          {isOptimizing ? <><Zap size={18} className="animate-pulse" /> Dispatch Logic Active</> : <><ZapOff size={18} /> Enable Route Optimization</>}
        </button>
      </div>

      <div className="px-5">
        <nav className="flex gap-1.5 p-1.5 bg-slate-100 rounded-[2rem] border border-white">
          {(['MY_TASKS', 'POOL', 'RETURNS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 rounded-[1.75rem] text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap 
                ${activeTab === tab
                  ? 'bg-white text-indigo-600 shadow-sm scale-[1.03]'
                  : 'text-indigo-400 hover:text-indigo-600'
                }`}
            >
              {tab === 'MY_TASKS' ? 'Active' : tab === 'POOL' ? 'Pool' : 'Pickups'}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-6 px-5 space-y-6">
        {activeTab === 'MY_TASKS' || activeTab === 'POOL' ? (
          <>
            {activeTab === 'POOL' && myZonePoolOrders.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Priority Sector Tasks</h3>
                </div>
                {myZonePoolOrders.map((o) => (
                  <div key={o.id} className="bg-white p-7 rounded-[2.5rem] border border-blue-200 transition-all shadow-xl shadow-blue-100/20 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <h3 className="font-black text-xl tracking-tighter text-slate-950 uppercase italic">{o.userName}</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Order #{o.id}</p>
                        {o.detectedZone && (
                          <span className="text-[8px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg inline-block mt-3 border border-blue-100">
                            {o.detectedZone} sector
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 space-y-5 border border-slate-100 relative z-10">
                      <div className="flex gap-4">
                        <MapPin className="text-blue-600 shrink-0" size={20} />
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Destination</p>
                          <p className="text-[11px] font-bold text-slate-700 leading-relaxed uppercase">{o.address?.fullAddress}</p>
                          {o.items && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Inventory Load:</p>
                              {o.items.map((item, i) => (
                                <p key={i} className="text-[10px] font-black text-blue-700 uppercase tracking-tight">{item.quantity}x {item.name}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => openInMaps(o.address?.latitude, o.address?.longitude)} className="w-full bg-white border border-slate-100 text-slate-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:border-blue-600 hover:text-blue-600">
                        Launch Navigation
                      </button>
                    </div>

                    <button onClick={() => claimOrder(o.id)} className="w-full bg-slate-950 text-white py-5 px-6 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all relative z-10 group-hover:bg-blue-600">
                      <Truck size={18} /> Accept Deployment
                    </button>
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
                  </div>
                ))}
              </div>
            )}

            {(activeTab === 'MY_TASKS' ? sortedOrders : activeTab === 'POOL' ? otherPoolOrders : []).map((o, idx) => (
              <div key={o.id} className={`bg-white p-7 rounded-[2.5rem] border transition-all shadow-sm relative overflow-hidden group ${idx === 0 && activeTab === 'MY_TASKS' ? 'border-blue-600 ring-4 ring-blue-50 scale-[1.02] shadow-2xl' : 'border-slate-100'}`}>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="font-black text-xl tracking-tighter text-slate-950 uppercase italic">{o.userName}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Session #{o.id}</p>
                  </div>
                  {activeTab === 'MY_TASKS' && (
                    <a href={`tel:${o.userPhone}`} className="bg-slate-950 text-white p-4 rounded-2xl active:scale-95 transition shadow-2xl hover:bg-blue-600"><Phone size={20} /></a>
                  )}
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 space-y-5 border border-slate-100 relative z-10">
                  <div className="flex gap-4">
                    <MapPin className="text-rose-600 shrink-0" size={20} />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Point of Handover</p>
                      <p className="text-[11px] font-bold text-slate-700 leading-relaxed uppercase">{o.address?.fullAddress}</p>
                      {o.items && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Manifest:</p>
                          {o.items.map((item, i) => (
                            <p key={i} className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.quantity}x {item.name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => openInMaps(o.address?.latitude, o.address?.longitude)} className="w-full bg-white border border-slate-100 text-slate-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:border-slate-950 hover:text-slate-950">
                    Open Satellite Link
                  </button>
                </div>

                <div className="flex gap-4 pt-2 relative z-10">
                  {activeTab === 'MY_TASKS' ? (
                    <>
                      <button onClick={() => updateOrderStatus(o.id, 'cancelled')} className="flex-1 bg-white text-slate-400 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-100 active:scale-95 transition hover:text-rose-600 hover:border-rose-100">Abound</button>
                      <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="flex-[2] bg-blue-600 text-white py-5 px-6 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-blue-500"><Check size={20} /> Verify Delivery</button>
                    </>
                  ) : (
                    <button onClick={() => claimOrder(o.id)} className="w-full bg-slate-950 text-white py-5 px-6 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-blue-600">
                      <Truck size={18} /> Acquire Task
                    </button>
                  )}
                </div>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </>
        ) : (
          sortedReturns.map((r) => (
            <div key={r.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 transition-all shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="space-y-1">
                  <h3 className="font-black text-xl tracking-tighter text-slate-950 uppercase italic">{r.userName}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Reclaim #{r.id}</p>
                  {r.barrelCount && (
                    <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl inline-block mt-4 border border-amber-100">
                      {r.barrelCount} Units Required
                    </span>
                  )}
                </div>
                <a href={`tel:${r.userPhone}`} className="bg-slate-950 text-white p-4 rounded-2xl shadow-2xl active:scale-95 transition hover:bg-amber-600"><Phone size={20} /></a>
              </div>
              <div className="bg-amber-50/30 p-6 rounded-[2rem] mb-6 space-y-5 border border-amber-100/50 relative z-10">
                <div className="flex gap-4">
                  <MapPin className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <p className="text-[9px] font-black uppercase text-amber-900/40 tracking-widest mb-1.5">Collection Point</p>
                    <p className="text-[11px] font-bold text-amber-900 leading-snug uppercase">{r.address?.fullAddress}</p>
                  </div>
                </div>
                <button onClick={() => openInMaps(r.address?.latitude, r.address?.longitude)} className="w-full bg-white border border-amber-100 text-amber-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">Launch Navigation</button>
              </div>
              <div className="flex gap-4 pt-2 relative z-10">
                <button onClick={() => updateReturnStatus(r.id, 'cancelled')} className="flex-1 bg-white text-slate-400 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-100 active:scale-95 transition hover:text-rose-600 hover:border-rose-100">Skip</button>
                <button onClick={() => updateReturnStatus(r.id, 'completed')} className="flex-[2] bg-amber-500 text-white py-5 px-6 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl shadow-amber-900/20 text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-amber-400"><Check size={20} /> Collect Units</button>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeliveryAgent;
