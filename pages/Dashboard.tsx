import React, { useState, useEffect } from 'react';
import { User, Address, DistrictConfig } from '../types.ts';
import { MapPin, LogOut, Droplet, Clock, ChevronRight, Wallet, ShieldCheck, Microscope, Zap, X, CheckCircle2, Headset, PhoneCall, MessageSquare, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState<Address | null>(null);
  const [districtConfigs, setDistrictConfigs] = useState<DistrictConfig[]>([]);
  const [showAddCash, setShowAddCash] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      api.get('/configs').then(res => setDistrictConfigs(res.data));

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

  const districtInfo = districtConfigs.find(d => d.district === user.district);

  const upiApps = [
    { id: 'razorpay', name: 'Pay Now', icon: 'https://img.icons8.com/color/144/bank-card-back-side.png' }
  ];

  const handleAddCash = (appId: string) => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) return alert('Please enter a valid amount');
    setIsProcessing(true);

    const txnId = `TOPUP-${Date.now()}`;

    api.post('/razorpay/initiate', {
      amount: amount,
      userId: user.uid,
      transactionId: txnId,
      note: `Wallet Topup`,
    }).then(response => {
      console.log(`[Dashboard] Razorpay Initiate Response:`, response.data);
      if (response.data.success) {
        const options = {
          key: response.data.key_id,
          amount: response.data.amount,
          currency: "INR",
          name: "Pani Gadi",
          description: response.data.description || "Wallet Topup",
          order_id: response.data.order_id,
          handler: function (razorpayResponse: any) {
            console.log('[Dashboard] Razorpay Payment Success:', razorpayResponse);
            // Verify payment
            api.post('/razorpay/verify', {
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
              userId: user.uid,
              type: 'topup'
            }).then(verifyRes => {
              console.log('[Dashboard] Verification Response:', verifyRes.data);
              if (verifyRes.data.success) {
                setIsProcessing(false);
                setShowSuccess(true);
                refreshUserData();
                setTimeout(() => {
                  setShowSuccess(false);
                  setShowAddCash(false);
                  setAddAmount('');
                }, 3000);
              } else {
                alert('Payment verification failed. Please contact support.');
                setIsProcessing(false);
              }
            }).catch(verifyErr => {
              console.error('[Dashboard] Verification error:', verifyErr);
              alert('Payment verification error. Please contact support.');
              setIsProcessing(false);
            });
          },
          prefill: {
            name: user.name,
            contact: user.phone,
            email: user.email || 'user@example.com'
          },
          theme: {
            color: "#2563eb"
          },
          modal: {
            ondismiss: function () {
              console.log('[Dashboard] Payment cancelled by user');
              setIsProcessing(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setIsProcessing(false);
      } else {
        alert(`Payment Error: ${response.data.message || 'Check Server Logs'}`);
        setIsProcessing(false);
      }
    }).catch(err => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Payment Failed to Initialize';
      alert(`Error: ${msg}`);
      setIsProcessing(false);
    });
  };

  const trustPhotos = [
    { url: 'https://images.unsplash.com/photo-1664575196412-ed801e8333a1?auto=format&fit=crop&w=800&q=80', title: 'Expert Lab Verification', desc: 'Tested by Indian Scientists', icon: <Microscope size={14} className="text-blue-500" /> },
    { url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80', title: 'Smart Filtration Check', desc: 'Indian Engineers Monitored', icon: <Zap size={14} className="text-amber-500" /> },
    { url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80', title: 'Final Purity Seal', desc: '100% Quality Inspected', icon: <ShieldCheck size={14} className="text-green-500" /> }
  ];

  const securityDepositValue = (user.activeBarrels || 0) * 200;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-lg overflow-x-hidden flex flex-col text-black">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Droplet size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-black text-black leading-tight">Pani Gadi</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-tighter shadow-sm flex items-center gap-1">UID: {user.uid}</div>
              <button onClick={() => navigate('/select-area')} className="flex items-center gap-1 text-[10px] text-gray-500 font-black uppercase tracking-widest hover:text-blue-600 transition">
                <MapPin size={10} /> {user.district}
              </button>
            </div>
          </div>
        </div>
        <button onClick={logout} className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl transition-all shadow-sm border border-red-100"><LogOut size={18} /></button>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <section className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-7 rounded-[2.5rem] shadow-xl overflow-hidden relative border-b-4 border-blue-900">
            <div className="z-10 relative">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Wallet Balance</p>
                  <h2 className="text-4xl font-black mt-1">₹{user.wallet.toFixed(0)}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 flex items-center justify-end gap-1"><Lock size={10} /> Barrel Deposits</p>
                  <h4 className="text-xl font-black mt-1">₹{securityDepositValue}</h4>
                  <p className="text-[8px] opacity-60 font-bold uppercase tracking-tighter">({user.activeBarrels || 0} Connection{user.activeBarrels !== 1 ? 's' : ''})</p>
                </div>
              </div>
              <button onClick={() => setShowAddCash(true)} className="mt-6 bg-white text-blue-700 text-[10px] font-black px-8 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-wider">+ Add Cash</button>
            </div>
            <Wallet size={120} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
          </div>
        </section>

        <div className="px-4 grid grid-cols-2 gap-4">
          <button onClick={() => address ? navigate('/order') : alert('Set delivery address first!')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-blue-600 rounded-[2.5rem] shadow-xl transition-all active:scale-95 group">
            <div className="bg-blue-50 p-4 rounded-3xl mb-3 group-hover:bg-blue-100 transition-colors"><Droplet className="text-blue-600" size={32} /></div>
            <span className="font-black text-blue-600 text-xs uppercase tracking-widest">Order Now</span>
            {user.orderCount === 0 && <span className="text-[8px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full mt-2 animate-pulse">FREE DELIVERY</span>}
          </button>
          <button onClick={() => navigate('/history')} className="flex flex-col items-center justify-center p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-sm hover:border-blue-600 transition-all group">
            <div className="bg-gray-50 p-4 rounded-3xl mb-3 group-hover:bg-blue-50 transition-colors"><Clock className="text-black" size={32} /></div>
            <span className="font-black text-black text-xs uppercase tracking-widest">History</span>
          </button>
        </div>

        <section className="p-4">
          <div onClick={() => setShowSupport(true)} className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-6 rounded-[2.5rem] border-2 border-blue-200 hover:border-blue-600 cursor-pointer transition-all shadow-sm group">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:rotate-12 transition-transform"><MessageSquare size={24} /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between"><h3 className="font-black text-blue-800 text-sm uppercase tracking-widest">Regional Support</h3><ChevronRight size={16} className="text-blue-400" /></div>
                <p className="text-[11px] text-blue-600/70 font-bold leading-relaxed mt-1">Need help with your {user.district} delivery? We're available 9am - 8pm.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-4">
          <div onClick={() => navigate('/address')} className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-transparent hover:border-blue-600 cursor-pointer transition-all shadow-sm group">
            <div className="flex items-start gap-4">
              <div className="bg-white p-4 rounded-[1.5rem] shadow-lg border border-gray-100 group-hover:border-blue-100 transition-colors"><MapPin className="text-blue-600" size={24} /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between"><h3 className="font-black text-black text-sm uppercase tracking-widest">Delivery Address</h3><ChevronRight size={16} className="text-gray-400" /></div>
                {address ? <p className="text-[11px] text-gray-500 font-bold leading-relaxed mt-1 line-clamp-2">{address.fullAddress}</p> : <p className="text-[11px] text-red-500 mt-1 font-black underline">No location saved. Set now!</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="px-6 flex items-center justify-between mb-5"><h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-gray-400"><ShieldCheck size={14} className="text-blue-600" /> Our Quality Promise</h2></div>
          <div className="flex gap-5 overflow-x-auto px-4 pb-6 no-scrollbar">
            {trustPhotos.map((item, i) => (
              <div key={i} className="min-w-[280px] rounded-[2.5rem] overflow-hidden shadow-2xl flex-shrink-0 border-2 border-gray-100 bg-white">
                <div className="h-40 relative overflow-hidden"><img src={item.url} alt={item.title} className="w-full h-full object-cover" /><div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/50 flex items-center gap-2 shadow-lg">{item.icon}<span className="text-[10px] font-black text-black uppercase">{item.title}</span></div></div>
                <div className="p-5"><span className="text-xs font-black text-black">{item.desc}</span></div>
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
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Help for {user.district}</p>

            <div className="space-y-4">
              <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100">
                <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] mb-2">Admin Note</p>
                <p className="text-sm font-bold text-gray-600 leading-relaxed italic">"{districtInfo?.supportMsg || 'Our team is here to assist you with any delivery queries.'}"</p>
              </div>
              <a href={`tel:${districtInfo?.adminPhone}`} className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-[2.5rem] shadow-xl hover:opacity-95 transition-all active:scale-95 group">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Click to Call</p>
                  <p className="text-xl font-black">{districtInfo?.adminPhone}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-12 transition-transform"><PhoneCall size={24} /></div>
              </a>
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
                <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black">Add Cash</h2><button onClick={() => setShowAddCash(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button></div>
                <div className="space-y-6">
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
