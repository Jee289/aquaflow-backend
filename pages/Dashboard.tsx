import React, { useState, useEffect } from 'react';
import { User, Address, LocationConfig } from '../types.ts';
import { MapPin, LogOut, Droplet, Clock, ChevronRight, Wallet, ShieldCheck, Microscope, Zap, X, CheckCircle2, Headset, PhoneCall, MessageSquare, Lock, Gift, Share2, Box } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState<Address | null>(null);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [showAddCash, setShowAddCash] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hydration, setHydration] = useState(0); // in ml
  const DAILY_GOAL = 3500; // 3.5L

  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('pani_gadi_hydration');
    if (stored) {
      const { date, amount } = JSON.parse(stored);
      if (date === today) setHydration(amount);
      else setHydration(0); // Reset for new day
    }
  }, []);

  const updateHydration = async (ml: number) => {
    const newVal = Math.max(0, hydration + ml);
    setHydration(newVal);
    localStorage.setItem('pani_gadi_hydration', JSON.stringify({
      date: new Date().toDateString(),
      amount: newVal
    }));

    // Deplete Home Stock on server
    try {
      await api.patch(`/users/${user.uid}/hydration`, { ml });
      refreshUserData();
    } catch (e) {
      console.error("Failed to sync hydration to server", e);
    }
  };

  const refreshUserData = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/users/${user.uid}`);
      updateUser(res.data);
      if (res.data.address) setAddress(res.data.address);
    } catch (e) {
      console.error("Failed to refresh user data", e);
    }
  };

  useEffect(() => {
    if (user) {
      refreshUserData();
      api.get('/locations').then(res => setLocations(res.data)).catch(console.error);

      // Real-time Polling (10s) ...
      const interval = setInterval(refreshUserData, 10000);
      window.addEventListener('focus', refreshUserData);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', refreshUserData);
      };
    }
  }, []);

  if (!user) return null;

  // Fallback Logic: Try to find location by City, or fallback to District for legacy users
  const userCity = user.city || user.district;
  const locationInfo = locations?.find(l => l.city === userCity) || locations?.find(l => l.city === user.district);

  const upiApps = [
    { id: 'cashfree', name: 'Pay Now', icon: 'https://img.icons8.com/color/144/bank-card-back-side.png' }
  ];

  const handleAddCash = async (appId: string) => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return alert('Please enter a valid amount');
    setIsProcessing(true);

    const txnId = `TOPUP-${Date.now()}`;

    try {
      const res = await api.post('/cashfree/create-order', {
        orderId: txnId,
        amount: amount,
        customerId: user.uid,
        customerPhone: user.phone,
        customerName: user.name,
        customerEmail: user.email
      });

      if (res.data.success) {
        const { payment_session_id } = res.data;
        const cashfree = new (window as any).Cashfree({ mode: "sandbox" });

        cashfree.checkout({
          paymentSessionId: payment_session_id,
          redirectTarget: "_modal",
        });

        // Simple Poller for Wallet Topup
        const interval = setInterval(async () => {
          try {
            const vRes = await api.post('/cashfree/verify', { orderId: txnId });
            if (vRes.data.success && vRes.data.status === 'PAID') {
              clearInterval(interval);

              // Call Backend to Credit Wallet
              // Ideally backend does this on webhook, but for now we simulate api call
              // We need an endpoint for wallet topup or just update user locally + patch
              // For security, backend should verify and then update.
              // Assuming verify endpoint just checks status. We will patch user.

              // Wallet updated by backend in /verify route
              // Just refresh user data to see new balance
              // const newWallet = user.wallet + amount;
              // await api.patch(`/users/${user.uid}`, { wallet: newWallet });

              setIsProcessing(false);
              setShowSuccess(true);
              refreshUserData();
              setTimeout(() => {
                setShowSuccess(false);
                setShowAddCash(false);
                setAddAmount('');
              }, 3000);
            }
          } catch (e) { console.error(e); }
        }, 3000);

        setTimeout(() => clearInterval(interval), 120000);

      } else {
        alert('Cashfree Init Failed');
        setIsProcessing(false);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
      setIsProcessing(false);
    }
  };

  const trustPhotos = [
    { url: 'https://images.unsplash.com/photo-1664575196412-ed801e8333a1?auto=format&fit=crop&w=800&q=80', title: 'Expert Lab Verification', desc: 'Tested by Indian Scientists', icon: <Microscope size={14} className="text-blue-500" /> },
    { url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80', title: 'Smart Filtration Check', desc: 'Indian Engineers Monitored', icon: <Zap size={14} className="text-amber-500" /> },
    { url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80', title: 'Final Purity Seal', desc: '100% Quality Inspected', icon: <ShieldCheck size={14} className="text-green-500" /> }
  ];

  const securityDepositValue = (user.activeBarrels || 0) * 200;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] shadow-2xl overflow-x-hidden flex flex-col text-slate-900 border-x border-slate-100 pt-4">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-5 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg rotate-3">
            <Droplet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-slate-950">Pani Gadi</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">Member</div>
              <button onClick={() => navigate('/select-area')} className="flex items-center gap-1 text-[10px] text-indigo-400 font-black uppercase tracking-widest hover:text-indigo-600 transition">
                <MapPin size={10} className="text-indigo-500" /> {user.district}
              </button>
            </div>
          </div>
        </div>
        <button onClick={logout} className="p-2.5 text-slate-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all border border-slate-100">
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <section className="p-5 space-y-4">
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white p-8 rounded-[2.5rem] shadow-2xl overflow-hidden relative border-b-4 border-indigo-400">
            <div className="z-10 relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 opacity-80">Available Balance</p>
                  <h2 className="text-5xl font-black mt-2 tracking-tighter">₹{Number(user.wallet).toFixed(0)}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-100 opacity-80 flex items-center justify-end gap-1"><Lock size={10} /> Security</p>
                  <h4 className="text-xl font-black mt-1">₹{securityDepositValue}</h4>
                  <p className="text-[8px] text-indigo-200 font-black uppercase tracking-tighter">({user.activeBarrels || 0} Jar Unit{user.activeBarrels !== 1 ? 's' : ''})</p>
                </div>
              </div>
              <button onClick={() => setShowAddCash(true)} className="mt-8 bg-indigo-600 text-white text-[10px] font-black px-10 py-4 rounded-2xl shadow-xl shadow-indigo-900/40 active:scale-95 transition-all uppercase tracking-[0.2em] hover:bg-indigo-500">
                Top Up Wallet
              </button>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl"></div>
            <Wallet size={140} className="absolute -right-6 -bottom-6 text-white/5 rotate-12" />
          </div>
        </section>

        <section className="px-5 grid grid-cols-2 gap-4">
          <button
            onClick={() => address ? navigate('/order') : alert('Set delivery address first!')}
            className="flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-indigo-600 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="bg-indigo-50 p-4 rounded-3xl mb-4 group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-300">
              <Droplet className="text-indigo-600" size={32} />
            </div>
            <span className="font-black text-slate-950 text-[10px] uppercase tracking-[0.2em]">Order Water</span>
            {(user.orderCount || 0) < 3 && (
              <div className="absolute top-4 right-4 bg-emerald-500 text-[8px] font-black text-white px-2 py-1 rounded-lg shadow-lg animate-bounce uppercase">{(user.orderCount || 0) === 0 ? 'Free' : `${3 - user.orderCount} Free`}</div>
            )}
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-violet-600 transition-all active:scale-95 group"
          >
            <div className="bg-violet-50 p-4 rounded-3xl mb-4 group-hover:bg-violet-100 group-hover:scale-110 transition-all duration-300">
              <Clock className="text-violet-600" size={32} />
            </div>
            <span className="font-black text-slate-950 text-[10px] uppercase tracking-[0.2em]">Order Hist.</span>
          </button>
        </section>

        <section className="p-5 space-y-4">
          <div onClick={() => setShowSupport(true)} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-600 cursor-pointer transition-all group overflow-hidden relative">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-100 text-white group-hover:rotate-6 transition-transform">
                <MessageSquare size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">Regional Support</h3>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-500 font-bold leading-relaxed mt-1">{userCity} Operations Desk • 9am - 8pm</p>
              </div>
            </div>
            <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg">
                  <Droplet size={18} fill="currentColor" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">Water Tracker</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hydration Goal</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-950">{(hydration / 1000).toFixed(1)}L <span className="text-slate-300">/ {(DAILY_GOAL / 1000).toFixed(1)}L</span></p>
              </div>
            </div>

            <div className="relative h-4 bg-slate-50 rounded-full border border-slate-100 overflow-hidden mb-8">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                style={{ width: `${Math.min(100, (hydration / DAILY_GOAL) * 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Glass', ml: 250, icon: '🥛' },
                { label: 'Bottle', ml: 1000, icon: '🚰' },
                { label: 'Reset', ml: -hydration, icon: '🔄', isReset: true }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => updateHydration(item.ml)}
                  className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border
                    ${item.isReset
                      ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 hover:opacity-100'
                      : 'bg-white border-blue-50 text-blue-600 hover:border-blue-500 hover:shadow-xl'
                    }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              <div className="flex items-start gap-3">
                <Microscope size={14} className="text-blue-600 mt-0.5" />
                <p className="text-[9px] font-bold text-blue-800 leading-relaxed uppercase italic">
                  {hydration >= DAILY_GOAL
                    ? "Optimal cellular saturation achieved! Goal reached."
                    : `You need ${((DAILY_GOAL - hydration) / 1000).toFixed(1)}L more to maintain your biology.`
                  }
                </p>
              </div>
            </div>

            <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-400/5 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-100">
                  <Box size={24} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Current Stock</h3>
                  <p className="text-2xl font-black text-slate-900 mt-1 tracking-tighter">{(Number(user.homeStock || 0) / 1000).toFixed(1)}L <span className="text-slate-400 text-xs">Remaining</span></p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{Math.min(100, (Number(user.homeStock || 0) / (Number(user.activeBarrels || 1) * 20000)) * 100).toFixed(0)}% Full</p>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 relative z-10">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-amber-500" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {Number(user.homeStock) > 0
                    ? `Est. Run out: ${Math.ceil(Number(user.homeStock) / Math.max(1, hydration || 3500))} Days`
                    : "Out of Stock - Refill Required"
                  }
                </p>
              </div>
              {Number(user.homeStock) < 5000 && (
                <button onClick={() => navigate('/order')} className="mt-4 w-full bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-xl shadow-blue-900/40">
                  Order Refill Now
                </button>
              )}
            </div>

            <Droplet size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
          </div>

          <div onClick={() => navigate('/address')} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-slate-900 cursor-pointer transition-all group overflow-hidden relative">
            <div className="flex items-start gap-4 z-10 relative">
              <div className="bg-slate-100 p-4 rounded-2xl shadow-sm text-slate-900 group-hover:bg-slate-950 group-hover:text-white transition-all">
                <MapPin size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">Delivery Point</h3>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
                {address ? (
                  <p className="text-[10px] text-slate-500 font-black leading-relaxed mt-1 line-clamp-2 uppercase tracking-tight">{address.fullAddress}</p>
                ) : (
                  <p className="text-[10px] text-rose-500 mt-1 font-black underline uppercase tracking-widest leading-none">Address not configured</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 relative overflow-hidden group mt-6">
            <div className="flex items-start gap-5 z-10 relative">
              <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                <Gift size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-indigo-950 text-[11px] uppercase tracking-[0.2em] mb-1">Earn Credits</h3>
                <p className="text-[10px] text-indigo-800 font-bold leading-relaxed">Invite neighbors to Pani Gadi. You both get ₹25 when they refill!</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="px-5 py-3 bg-white border-2 border-dashed border-indigo-200 rounded-2xl font-black text-indigo-600 tracking-[0.2em] text-[11px]">
                    {user.referralCode}
                  </div>
                  <button
                    onClick={() => {
                      const msg = encodeURIComponent(`Hey! I'm using Pani Gadi for my water delivery. Use my code ${user.referralCode} to get ₹25 off your first order! Download here: https://panigadi.com`);
                      window.open(`https://wa.me/?text=${msg}`, '_blank');
                    }}
                    className="flex-1 bg-indigo-600 text-white p-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
                  >
                    <Share2 size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Share</span>
                  </button>
                </div>
              </div>
            </div>
            <Gift size={100} className="absolute -right-6 -bottom-6 text-indigo-600/5 rotate-12" />
          </div>
        </section>

        <section className="py-10">
          <div className="px-7 flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-slate-400">
              <ShieldCheck size={14} className="text-blue-600" />
              Quality Protocol
            </h2>
          </div>
          <div className="flex gap-6 overflow-x-auto px-6 pb-8 no-scrollbar">
            {trustPhotos.map((item, i) => (
              <div key={i} className="min-w-[300px] rounded-[3rem] overflow-hidden shadow-2xl flex-shrink-0 bg-white border border-slate-100 group">
                <div className="h-44 relative overflow-hidden">
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 flex items-center gap-2 shadow-xl">
                    {item.icon}
                    <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{item.title}</span>
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-tight leading-relaxed">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showSupport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border-2 border-blue-100">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100"><Headset size={32} /></div>
              <button onClick={() => setShowSupport(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X size={20} /></button>
            </div>
            <h2 className="text-2xl font-black mb-2">Regional Support</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Help for {userCity}</p>

            <div className="space-y-4">
              <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] mb-2">Admin Note</p>
                <p className="text-sm font-bold text-gray-600 leading-relaxed italic">"{locationInfo?.supportMsg || 'Our team is here to assist you with any delivery queries.'}"</p>
              </div>
              <a href={`tel:${locationInfo?.adminPhone}`} className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-[2.5rem] shadow-xl hover:opacity-95 transition-all active:scale-95 group">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Click to Call</p>
                  <p className="text-xl font-black">{locationInfo?.adminPhone || 'N/A'}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-12 transition-transform"><PhoneCall size={24} /></div>
              </a>
              <button
                onClick={() => { setShowSupport(false); navigate('/legal'); }}
                className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] py-4 hover:text-blue-600 transition-colors"
              >
                Terms & Cancellation Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCash && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="bg-green-100 p-6 rounded-full text-green-600 animate-bounce"><CheckCircle2 size={48} /></div>
                <h2 className="text-2xl font-black">Cash Added!</h2>
                <p className="text-gray-500 font-bold">Wallet updated successfully.</p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-6">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
                <div className="text-center"><h2 className="text-xl font-black">Connecting UPI...</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 animate-pulse">Awaiting external approval</p></div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black">Add Cash</h2><button onClick={() => setShowAddCash(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button></div>
                <div className="space-y-6">
                  {/* Recharge Packs - Re-designed to be Grid and Non-clipping */}
                  <div className="grid grid-cols-3 gap-2 p-1">
                    {[
                      { price: 500, bonus: 10, label: 'Starter', color: 'bg-blue-50 border-blue-100 text-blue-600' },
                      { price: 1000, bonus: 50, label: 'Popular', color: 'bg-indigo-50 border-indigo-100 text-indigo-600' },
                      { price: 2000, bonus: 200, label: 'Best Value', color: 'bg-emerald-50 border-emerald-100 text-emerald-600' }
                    ].map(pack => (
                      <button
                        key={pack.price}
                        onClick={() => setAddAmount(String(pack.price))}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all relative
                          ${addAmount === String(pack.price)
                            ? `${pack.color.replace('text-', 'bg-').replace('50', '200')} border-current shadow-lg scale-[1.02]`
                            : `${pack.color} border-transparent hover:border-blue-100`}`}
                      >
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-80 mb-1">{pack.label}</p>
                        <p className="text-lg font-black leading-none">₹{pack.price}</p>
                        <div className="mt-2 bg-white/70 px-1.5 py-0.5 rounded-lg border border-white/20">
                          <p className="text-[7px] font-black text-slate-900">+₹{pack.bonus}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Amount</label>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl">₹</span><input type="number" className="w-full p-5 pl-10 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-2xl" placeholder="0" value={addAmount} onChange={e => setAddAmount(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {upiApps.map(app => (
                      <button key={app.id} onClick={() => handleAddCash(app.id)} className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-600 transition-all group shadow-sm"><img src={app.icon} className="w-10 h-10 object-contain" alt={app.name} /><span className="text-[9px] font-black uppercase text-gray-400">{app.name}</span></button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t p-4 flex justify-around items-center z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center text-blue-600 font-black transition-all"><Droplet size={24} /><span className="text-[10px] mt-1 font-black">HOME</span></button>
        <button onClick={() => navigate('/history')} className="flex flex-col items-center text-gray-400 hover:text-blue-600 transition-colors"><Clock size={24} /><span className="text-[10px] mt-1 font-black">ORDERS</span></button>
        <button onClick={() => setShowSupport(true)} className="flex flex-col items-center text-gray-400 hover:text-blue-600 transition-colors"><Headset size={24} /><span className="text-[10px] mt-1 font-black">SUPPORT</span></button>
      </nav>
    </div>
  );
};

export default Dashboard;
