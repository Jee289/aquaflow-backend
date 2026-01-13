import React, { useState, useEffect } from 'react';
import { Order, ReturnRequest } from '../types';
import { LogOut, MapPin, Phone, Check, Box, Truck, Zap, ZapOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DeliveryAgent: React.FC = () => {
  const { user, logout } = useAuth();
  const agentDistrict = user?.district || 'Unknown';

  const [orders, setOrders] = useState<Order[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'DELIVERIES' | 'RETURNS'>('DELIVERIES');

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [sortedOrders, setSortedOrders] = useState<Order[]>([]);
  const [sortedReturns, setSortedReturns] = useState<ReturnRequest[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    // Fetch data
    const fetchTasks = () => {
      Promise.all([
        api.get(`/orders?district=${agentDistrict}`),
        api.get(`/returns?district=${agentDistrict}`)
      ]).then(([oRes, rRes]) => {
        setOrders(oRes.data);
        setReturnRequests(rRes.data);
      });
    };
    fetchTasks();
    const inv = setInterval(fetchTasks, 15000); // Polling for new tasks
    return () => clearInterval(inv);
  }, [agentDistrict]);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'shipped');
  const pendingReturns = returnRequests.filter(r => r.status === 'pending');

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Simple Pythagorean distance for local coordinates (accurate enough for city delivery)
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
  }, [orders, returnRequests, isOptimizing, currentPos]);

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

  const openInMaps = (lat?: number, lng?: number) => {
    if (lat === undefined || lng === undefined) return alert("Coordinates missing.");
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col text-slate-900 pb-10">
      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div><h1 className="text-xl font-black uppercase tracking-tight">Fleet: {agentDistrict}</h1></div>
        </div>
        <button onClick={logout} className="p-3 bg-slate-100 rounded-2xl text-slate-500 hover:text-red-600 transition-colors shadow-sm"><LogOut size={22} /></button>
      </header>

      <div className="p-5 flex flex-col gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between relative overflow-hidden border-b-4 border-blue-800">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Tasks Remaining</p>
            <h2 className="text-5xl font-black mt-1 tracking-tighter">{pendingOrders.length + pendingReturns.length}</h2>
          </div>
          <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md z-10"><Truck size={40} /></div>
        </div>

        <button
          onClick={toggleOptimization}
          className={`w-full py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 ${isOptimizing ? 'bg-green-600 text-white shadow-green-100' : 'bg-white text-blue-600 border-2 border-blue-50'
            }`}
        >
          {isOptimizing ? <><Zap size={18} /> Optimization Active</> : <><ZapOff size={18} /> Optimize Delivery Path</>}
        </button>
      </div>

      <div className="flex px-5 pt-2 gap-3">
        <button onClick={() => setActiveTab('DELIVERIES')} className={`flex-1 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'DELIVERIES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-100'}`}>Deliveries ({pendingOrders.length})</button>
        <button onClick={() => setActiveTab('RETURNS')} className={`flex-1 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'RETURNS' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white text-slate-400 border border-slate-100'}`}>Pickups ({pendingReturns.length})</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-6 px-5 space-y-6">
        {activeTab === 'DELIVERIES' ? (
          sortedOrders.map((o, idx) => (
            <div key={o.id} className={`bg-white p-6 rounded-[2.5rem] border transition-all shadow-sm ${idx === 0 ? 'border-blue-500 ring-4 ring-blue-50 scale-[1.02]' : 'border-slate-50'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h3 className="font-black text-xl tracking-tight text-slate-900">{o.userName}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID: #{o.id}</p>
                </div>
                <a href={`tel:${o.userPhone}`} className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl active:scale-95 transition shadow-sm border border-blue-100"><Phone size={22} /></a>
              </div>

              <div className="bg-slate-50 p-5 rounded-3xl mb-6 space-y-4 border border-slate-100">
                <div className="flex gap-3">
                  <MapPin className="text-red-500 shrink-0" size={20} />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-0.5">Delivery Address</p>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{o.address?.fullAddress}</p>
                  </div>
                </div>
                <button onClick={() => openInMaps(o.address?.latitude, o.address?.longitude)} className="w-full bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-slate-50">Open in Navigation</button>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => updateOrderStatus(o.id, 'cancelled')} className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider border border-red-100 active:scale-95 transition">Skip</button>
                <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="flex-[2] bg-blue-600 text-white py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg text-[10px] uppercase tracking-widest active:scale-95 transition-transform"><Check size={18} /> Confirm Handover</button>
              </div>
            </div>
          ))
        ) : (
          sortedReturns.map((r, idx) => (
            <div key={r.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h3 className="font-black text-xl tracking-tight text-slate-900">{r.userName}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pickup ID: #{r.id}</p>
                </div>
                <a href={`tel:${r.userPhone}`} className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl shadow-sm border border-amber-100 active:scale-95 transition"><Phone size={22} /></a>
              </div>
              <div className="bg-amber-50/30 p-5 rounded-3xl mb-6 space-y-4 border border-amber-100/50">
                <div className="flex gap-3">
                  <MapPin className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs font-bold text-amber-900 leading-snug">{r.address?.fullAddress}</p>
                </div>
                <button onClick={() => openInMaps(r.address?.latitude, r.address?.longitude)} className="w-full bg-white border border-amber-100 text-amber-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">Open in Navigation</button>
              </div>
              <div className="flex gap-3 pt-4 border-t border-amber-100/50">
                <button onClick={() => updateReturnStatus(r.id, 'cancelled')} className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider border border-red-100 active:scale-95 transition">Skip</button>
                <button onClick={() => updateReturnStatus(r.id, 'completed')} className="flex-[2] bg-amber-500 text-white py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-100 text-[10px] uppercase tracking-widest active:scale-95 transition-transform"><Check size={18} /> Verified Collection</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default DeliveryAgent;
