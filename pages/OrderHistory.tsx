import React, { useState, useMemo, useEffect } from 'react';
import { Order, ReturnRequest, DistrictConfig } from '../types';
import { ChevronLeft, Box, ChevronRight, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [address, setAddress] = useState<any>(null); // To be fetched

  const [showReturn, setShowReturn] = useState(false);
  const [activeTab, setActiveTab] = useState<'ONGOING' | 'COMPLETED' | 'CANCELLED'>('ONGOING');
  const [returnDate, setReturnDate] = useState('');
  const [returnBarrelCount, setReturnBarrelCount] = useState(1);

  useEffect(() => {
    if (user) {
      // Fetch Orders
      api.get(`/orders?userId=${user.uid}`).then(res => setOrders(res.data)).catch(console.error);
      // Local Addr check
      const savedAddr = localStorage.getItem('aqua_address');
      if (savedAddr) setAddress(JSON.parse(savedAddr));
    }
  }, [user]);

  const ongoingOrders = orders.filter(o => o.status === 'pending' || o.status === 'shipped');
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const currentList = activeTab === 'ONGOING' ? ongoingOrders : activeTab === 'COMPLETED' ? completedOrders : cancelledOrders;

  const dateOptions = useMemo(() => {
    const options = [];
    const start = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      options.push({
        iso: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    return options;
  }, []);

  const handleReturnConfirm = () => {
    if (!user) return;
    if (!address) return alert('Set delivery address first!');
    if (!returnDate) return alert('Select a pickup date');
    if (returnBarrelCount > (user.activeBarrels || 0)) return alert(`Max ${user.activeBarrels || 0} allowed.`);

    const newReq: ReturnRequest = {
      id: `RET-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: user.uid,
      userName: user.name,
      userPhone: user.phone,
      district: user.district || '',
      address: address,
      returnDate,
      barrelCount: returnBarrelCount,
      status: 'pending',
      timestamp: Date.now()
    };

    // Send to Backend
    api.post('/returns', newReq)
      .then(() => {
        alert('Pickup scheduled successfully!');
        setShowReturn(false);
        // Optionally navigate to dashboard or refresh orders if we showed returns there
        navigate('/dashboard');
      })
      .catch(err => {
        console.error(err);
        alert('Failed to schedule return');
      });
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col text-slate-900 shadow-2xl border-x border-slate-100">
      <div className="p-5 border-b border-slate-100 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-xl z-30">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-50 rounded-2xl transition text-slate-400 border border-transparent hover:border-slate-100"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Purchase <span className="text-indigo-600">History</span></h1>
      </div>

      <div className="p-6 bg-white border-b border-slate-100 space-y-6">
        <button
          onClick={() => (user.activeBarrels || 0) > 0 ? setShowReturn(true) : alert("No active connections found.")}
          className="w-full bg-indigo-950 text-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-indigo-900/10 active:scale-95 transition-all group relative overflow-hidden"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg group-hover:rotate-6 transition-transform"><Box size={22} /></div>
            <div className="text-left">
              <h4 className="font-black text-[11px] uppercase tracking-[0.2em] leading-none">Schedule Jar Return</h4>
              <p className="text-[9px] font-bold text-indigo-500 mt-1.5 uppercase tracking-widest">Active Units: {user.activeBarrels || 0}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-600 group-hover:translate-x-1 transition-transform z-10" />
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl opacity-50"></div>
        </button>

        <nav className="flex gap-1.5 p-1.5 bg-slate-100 rounded-[2rem] border border-white">
          {(['ONGOING', 'COMPLETED', 'CANCELLED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all 
                ${activeTab === tab
                  ? 'bg-white text-indigo-600 shadow-sm scale-[1.03]'
                  : 'text-indigo-400 hover:text-indigo-600'
                }`}
            >
              {tab === 'ONGOING' ? 'Live' : tab.toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-10">
        {currentList.length === 0 ? (
          <div className="text-center py-24 opacity-20 flex flex-col items-center">
            <div className="bg-slate-100 p-8 rounded-full mb-6 text-slate-900"><Box size={48} /></div>
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Registry is empty</p>
          </div>
        ) : (
          currentList.map(order => (
            <div key={order.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-7 shadow-sm hover:shadow-xl hover:border-blue-600 transition-all group overflow-hidden relative">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="font-black text-[11px] text-indigo-600 uppercase tracking-[0.2em] mb-1">REQ #{order.id}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date(order.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-colors
                  ${order.status === 'delivered' ? 'border-emerald-100 text-emerald-600 bg-emerald-50/50' :
                    order.status === 'cancelled' ? 'border-rose-100 text-rose-600 bg-rose-50/50' :
                      'border-amber-100 text-amber-600 bg-amber-50/50'
                  }`}>
                  {order.status}
                </div>
              </div>

              <div className="space-y-3 mb-6 border-y border-dashed border-slate-100 py-6 relative z-10">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-black text-slate-950 uppercase tracking-tight">
                    <span>{item.name} <span className="text-slate-400 ml-2">x{item.quantity}</span></span>
                    <span className="font-black text-slate-950">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-end relative z-10">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Dispatch Date</p>
                  <p className="text-sm font-black text-slate-900 mt-1 uppercase">{new Date(order.deliveryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Grand Total</p>
                  <p className="text-3xl font-black tracking-tighter text-slate-950">₹{order.totalAmount}</p>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          ))
        )}
      </div>

      {showReturn && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-end justify-center backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[3.5rem] p-10 animate-in slide-in-from-bottom-10 duration-500 shadow-2xl border-t border-white">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tighter uppercase italic text-slate-950">Return <span className="text-indigo-600">Vault</span></h2>
              <button onClick={() => setShowReturn(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-100"><X size={24} /></button>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 justify-center shadow-inner">
                <button onClick={() => setReturnBarrelCount(Math.max(1, returnBarrelCount - 1))} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl font-black text-2xl text-slate-950 shadow-sm hover:border-blue-600 transition-colors">-</button>
                <div className="text-center">
                  <span className="text-5xl font-black tracking-tighter text-slate-950">{returnBarrelCount}</span>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Units</p>
                </div>
                <button onClick={() => setReturnBarrelCount(Math.min(user.activeBarrels || 1, returnBarrelCount + 1))} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl font-black text-2xl text-slate-950 shadow-sm hover:border-blue-600 transition-colors">+</button>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Pickup window</label>
                <div className="grid grid-cols-4 gap-3">
                  {dateOptions.map(opt => (
                    <button
                      key={opt.iso}
                      onClick={() => setReturnDate(opt.iso)}
                      className={`flex flex-col items-center justify-center py-5 rounded-2xl border transition-all 
                         ${returnDate === opt.iso
                          ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-xl shadow-indigo-900/20'
                          : 'bg-white border-slate-100 text-indigo-400 hover:border-indigo-200'
                        }`}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">{opt.dayName}</span>
                      <span className="text-xl font-black">{opt.dayNum}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={handleReturnConfirm} className="w-full bg-slate-950 text-white font-black py-6 rounded-[2rem] shadow-2xl uppercase tracking-[0.2em] text-[11px] hover:bg-black transition-all active:scale-95">Schedule Vault Retrieval</button>
              </div>
              <p className="text-[8px] text-center text-slate-400 font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3"><ShieldCheck size={14} className="text-blue-600" /> Professional Pickup Service</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}