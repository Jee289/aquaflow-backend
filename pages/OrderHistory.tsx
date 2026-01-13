import React, { useState, useMemo, useEffect } from 'react';
import { Order, ReturnRequest, DistrictConfig } from '../types';
import { ChevronLeft, Box, ChevronRight } from 'lucide-react';
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
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col text-black">
      <div className="p-4 border-b flex items-center gap-4 sticky top-0 bg-white z-10">
        <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-gray-100 rounded-full transition text-black"><ChevronLeft size={24} /></button>
        <h1 className="text-xl font-black">My Orders</h1>
      </div>

      <div className="p-4 bg-gray-50 border-b space-y-4">
        <button
          onClick={() => (user.activeBarrels || 0) > 0 ? setShowReturn(true) : alert("No deposits found.")}
          className="w-full bg-blue-600 text-white p-5 rounded-[2rem] flex items-center justify-between shadow-xl shadow-blue-100 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Box size={20} /></div>
            <div className="text-left"><h4 className="font-black text-[11px] uppercase tracking-widest leading-none">Return Empty Jars</h4><p className="text-[9px] font-bold opacity-70 mt-1 uppercase">Deposits: {user.activeBarrels || 0}</p></div>
          </div>
          <ChevronRight size={18} />
        </button>

        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100">
          {(['ONGOING', 'COMPLETED', 'CANCELLED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white' : 'text-gray-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {currentList.length === 0 ? (
          <div className="text-center py-20 opacity-30 flex flex-col items-center">
            <Box size={48} className="mb-4" />
            <p className="font-black uppercase tracking-widest text-[10px]">No {activeTab.toLowerCase()} orders</p>
          </div>
        ) : (
          currentList.map(order => (
            <div key={order.id} className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 shadow-sm hover:border-black transition-all">
              <div className="flex justify-between items-start mb-4">
                <div><h3 className="font-black text-[10px] text-blue-600 uppercase tracking-widest mb-1">#{order.id}</h3><p className="text-[10px] text-gray-400 font-bold">{new Date(order.timestamp).toLocaleDateString()}</p></div>
                <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase border-2 ${order.status === 'delivered' ? 'border-green-500 text-green-700' : order.status === 'cancelled' ? 'border-red-500 text-red-700' : 'border-amber-500 text-amber-700'
                  }`}>{order.status}</div>
              </div>
              <div className="space-y-2 mb-4 border-y border-dashed border-gray-100 py-4">
                {order.items.map((item, i) => (<div key={i} className="flex justify-between text-xs font-bold text-black"><span>{item.name} <span className="text-gray-400">x{item.quantity}</span></span><span className="font-black text-[10px]">₹{item.price * item.quantity}</span></div>))}
              </div>
              <div className="flex justify-between items-end"><p className="text-[9px] font-bold text-gray-400 uppercase">Delivery: {order.deliveryDate}</p><p className="text-2xl font-black tracking-tighter">₹{order.totalAmount}</p></div>
            </div>
          ))
        )}
      </div>

      {showReturn && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 animate-in slide-in-from-bottom duration-300">
            <h2 className="text-2xl font-black mb-6">Schedule Return</h2>
            <div className="space-y-6">
              <div className="flex items-center gap-6 bg-gray-50 p-6 rounded-3xl border-2 border-gray-100 justify-center">
                <button onClick={() => setReturnBarrelCount(Math.max(1, returnBarrelCount - 1))} className="w-12 h-12 bg-white border-2 border-blue-600 rounded-xl font-black text-2xl text-blue-600">-</button>
                <span className="text-4xl font-black">{returnBarrelCount}</span>
                <button onClick={() => setReturnBarrelCount(Math.min(user.activeBarrels || 1, returnBarrelCount + 1))} className="w-12 h-12 bg-white border-2 border-blue-600 rounded-xl font-black text-2xl text-blue-600">+</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {dateOptions.map(opt => (
                  <button key={opt.iso} onClick={() => setReturnDate(opt.iso)} className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${returnDate === opt.iso ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-xl shadow-blue-100' : 'bg-white border-gray-100 text-black hover:border-blue-200'}`}>
                    <span className="text-[9px] font-black uppercase opacity-60 mb-1">{opt.dayName}</span><span className="text-xl font-black">{opt.dayNum}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowReturn(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px]">Cancel</button>
                <button onClick={handleReturnConfirm} className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-[10px]">Schedule Pickup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}