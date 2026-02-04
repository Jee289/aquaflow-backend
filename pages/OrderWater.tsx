import React, { useState, useEffect, useMemo } from 'react';
import { OrderItem, Order, Product } from '../types';
import { ChevronLeft, ShoppingBag, Truck, Wallet, X, Info, Droplets, GlassWater, Settings, CheckCircle2, CreditCard, Sparkles, Zap, ShieldCheck, Gift, RotateCcw, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProductVisual: React.FC<{ style: string }> = ({ style }) => {
  if (style === 'style:barrel') {
    return (
      <div className="w-28 h-28 flex items-center justify-center bg-indigo-50 rounded-2xl border-2 border-indigo-600/10 relative overflow-hidden">
        <div className="w-16 h-20 bg-indigo-400 border-[3px] border-indigo-900 rounded-lg relative">
          <div className="w-6 h-3 bg-indigo-900 absolute -top-3 left-1/2 -translate-x-1/2 rounded-t-md"></div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <Droplets size={24} className="text-white opacity-40" />
          </div>
          <div className="absolute bottom-2 left-0 right-0 h-1 bg-black/10"></div>
          <div className="absolute bottom-4 left-0 right-0 h-1 bg-black/10"></div>
        </div>
      </div>
    );
  }
  if (style === 'style:dispenser') {
    return (
      <div className="w-28 h-28 flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-blue-600/10 relative overflow-hidden">
        <div className="w-16 h-16 bg-white border-[3px] border-blue-900 rounded-xl relative">
          <div className="w-10 h-6 bg-blue-500 border-2 border-blue-900 absolute -top-4 left-1/2 -translate-x-1/2 rounded-full"></div>
          <div className="w-2 h-6 bg-blue-900 absolute bottom-4 -right-2 rotate-45 rounded-full"></div>
          <Settings size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-200" />
        </div>
      </div>
    );
  }
  if (style === 'style:bottle') {
    return (
      <div className="w-28 h-28 flex items-center justify-center bg-blue-50 rounded-2xl border-2 border-blue-600/10 relative overflow-hidden">
        <div className="w-10 h-20 bg-blue-200 border-[3px] border-blue-900 rounded-full relative">
          <div className="w-6 h-3 bg-blue-900 absolute -top-2 left-1/2 -translate-x-1/2 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <GlassWater size={20} className="text-white/60" />
          </div>
        </div>
      </div>
    );
  }
  return <div className="w-28 h-28 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center font-black text-gray-400 text-[10px] uppercase">No Style</div>;
};

const OrderWater: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [address, setAddress] = useState<any>(null); // Fetch address or use local storage


  const [activeTab, setActiveTab] = useState<'REGULAR' | 'PREMIUM'>('REGULAR');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [barrelReturns, setBarrelReturns] = useState<number>(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'WALLET'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [useReferralBonus, setUseReferralBonus] = useState(false);

  useEffect(() => {
    // Load products
    api.get('/products').then(res => setProducts(res.data)).catch(console.error);

    // Load address from Backend
    if (user) {
      api.get(`/users/${user.uid}`)
        .then(res => {
          if (res.data.address) setAddress(res.data.address);
        })
        .catch(console.error);
    }
  }, [user]);

  // Razorpay handles all UPI apps internally

  const now = new Date();
  const currentHour = now.getHours();

  const jarQty = quantities['20L'] || 0;
  const bottleCaseQty = quantities['1L'] || 0;
  const isBulkOrder = jarQty >= 5 || bottleCaseQty >= 5;

  let isSameDayAvailable = false;
  if (currentHour < 12) {
    isSameDayAvailable = true;
  } else if (currentHour < 18 && isBulkOrder) {
    isSameDayAvailable = true;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const minDeliveryDate = isSameDayAvailable ? todayStr : tomorrowStr;

  useEffect(() => {
    if (!deliveryDate || deliveryDate < minDeliveryDate) {
      setDeliveryDate(minDeliveryDate);
    }
  }, [minDeliveryDate]);

  const dateOptions = useMemo(() => {
    const options = [];
    const start = new Date(minDeliveryDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      options.push({
        iso: d.toISOString().split('T')[0],
        display: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    return options;
  }, [minDeliveryDate]);

  const filteredProducts = products.filter(p =>
    activeTab === 'REGULAR' ? (p.type === 'REGULAR' || p.type === 'ACCESSORY') : p.type === 'PREMIUM'
  );

  const updateQty = (product: Product, delta: number) => {
    const currentQty = quantities[product.id] || 0;
    const newQty = Math.max(0, currentQty + delta);
    if (newQty > product.stock) {
      alert(`Only ${product.stock} units available in stock!`);
      return;
    }
    setQuantities(prev => ({ ...prev, [product.id]: newQty }));
  };

  const summary = useMemo(() => {
    if (!user) return { items: [], subtotal: 0, delivery: 0, securityFees: 0, discountApplied: 0, total: 0 };

    let subtotal = 0;
    let delivery = 0;
    let securityFees = 0;
    let discountApplied = 0;
    const items: OrderItem[] = [];

    products.forEach(p => {
      const qty = quantities[p.id] || 0;
      if (qty > 0) {
        subtotal += p.price * qty;
        if (p.id === '20L') {
          if (Number(user.orderCount) > 0) delivery = 10;

          // STRICT LOGIC: 
          // 1. Only exchange Pani Gadi barrels. Return qty cannot exceed orders or owned barrels.
          const maxPossibleRefill = Math.min(qty, user.activeBarrels || 0);
          const actualReturns = Math.min(barrelReturns, maxPossibleRefill);

          const chargeQty = Math.max(0, qty - actualReturns);
          securityFees += chargeQty * 200;
        }
        items.push({ ...p, quantity: qty } as OrderItem);
      }
    });

    if (useReferralBonus) discountApplied = Math.min(Number(user.referralBalance || 0), 25);
    const total = subtotal + delivery + securityFees - discountApplied;
    return { items, subtotal, delivery, securityFees, discountApplied, total };
  }, [user, products, quantities, barrelReturns, useReferralBonus]);

  const handleOrder = async (appId?: string) => {
    if (!user) return;
    if (paymentMethod === 'WALLET' && Number(user.wallet) < summary.total) {
      alert('Insufficient Wallet Balance. Please add funds or use UPI.');
      return;
    }
    setIsProcessing(true);

    const orderId = `AQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const p20LQty = quantities['20L'] || 0;

    // Define createOrderInDb function first
    const createOrderInDb = () => {
      const order: Order = {
        id: orderId,
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        items: summary.items,
        totalAmount: summary.total,
        deliveryCharge: summary.delivery,
        securityFees: summary.securityFees,
        discountApplied: summary.discountApplied,
        status: 'pending',
        deliveryDate,
        district: user.district || 'Unknown',
        state: user.state,
        city: user.city,
        address,
        paymentMethod,
        barrelReturns: p20LQty > 0 ? Math.min(barrelReturns, Math.min(p20LQty, user.activeBarrels || 0)) : 0,
        timestamp: Date.now()
      };

      // Send to backend
      api.post('/orders', order).then(() => {
        // Wallet logic handled if method was WALLET, this is mostly for the Record
      }).catch(err => {
        console.error('Order Sync Failed', err);
      });
    };

    if (paymentMethod === 'UPI') {
      // INITIATE CASHFREE
      setIsProcessing(true);

      try {
        // 1. Create Order Session in Backend
        const res = await api.post('/cashfree/create-order', {
          orderId,
          amount: summary.total,
          customerId: user.uid,
          customerPhone: user.phone,
          customerName: user.name,
          customerEmail: user.email
        });

        if (res.data.success) {
          const { payment_session_id } = res.data;
          const cashfree = new (window as any).Cashfree({
            mode: "sandbox" // "production" in prod
          });

          // 2. Open Checkout
          cashfree.checkout({
            paymentSessionId: payment_session_id,
            redirectTarget: "_modal", // Open in popup
          }).then(() => {
            console.log("Cashfree Checkout Opened");
          });

          // 3. Poll for status separately or handle webhook/redirect?
          // For _modal, we might need to handle the promise or an event, but Cashfree JS v3 mostly relies on redirect or embedded.
          // Actually for _modal, we don't get a promise resolution on success easily without polling or closure.
          // Let's implement a verify button/poller interaction or rely on user clicking "I have Paid" if modal closes?
          // Better: Poll verify endpoint every 5s for 2-3 mins? 

          // For simplicity in this "Agent" flow, we will set up a polite poller
          let pollCount = 0;
          const interval = setInterval(async () => {
            try {
              pollCount++;
              const vRes = await api.post('/cashfree/verify', { orderId });
              if (vRes.data.success && vRes.data.status === 'PAID') {
                clearInterval(interval);
                setIsProcessing(false);
                setIsSuccess(true);
                setTimeout(() => navigate('/dashboard'), 2500);

                // Create Order in DB
                createOrderInDb();
              } else if (pollCount > 30) { // Stop  after 30 attempts (90 seconds)
                clearInterval(interval);
                setIsProcessing(false);
                alert('Payment verification timed out. Please check your payment status in your bank app.');
              }
            } catch (e: any) {
              console.error('Verify Error:', e);
              // If order not found (404), stop polling
              if (e.response?.status === 404) {
                clearInterval(interval);
                setIsProcessing(false);
                alert('Order not found. This may be a test order that has expired. Please try creating a new order.');
              } else if (pollCount > 30) {
                clearInterval(interval);
                setIsProcessing(false);
                alert('Unable to verify payment. Please contact support if amount was deducted.');
              }
            }
          }, 3000);

          // Clear interval after 2 minutes to stop polling
          setTimeout(() => {
            clearInterval(interval);
            if (isProcessing) {
              setIsProcessing(false);
              alert('Payment verification timed out. Please check Dashboard for order status.');
            }
          }, 120000);

        } else {
          alert('Cashfree Init Failed');
          setIsProcessing(false);
        }

      } catch (e: any) {
        alert('Payment Error: ' + e.message);
        setIsProcessing(false);
      }
      return;
    }

    setTimeout(() => {
      const order: Order = {
        id: orderId,
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        items: summary.items,
        totalAmount: summary.total,
        deliveryCharge: summary.delivery,
        securityFees: summary.securityFees,
        discountApplied: summary.discountApplied,
        status: 'pending',
        deliveryDate,
        district: user.district || 'Unknown',
        state: user.state,
        city: user.city,
        address,
        paymentMethod,
        timestamp: Date.now()
      };

      // Send to backend
      api.post('/orders', order).then(() => {
        if (paymentMethod === 'WALLET') {
          const newWallet = user.wallet - summary.total;
          api.patch(`/users/${user.uid}`, { wallet: newWallet });
          updateUser({ ...user, wallet: newWallet }); // Update local state immediately
        }
        setIsProcessing(false);
        setIsSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2500);
      }).catch(err => {
        alert('Order Failed');
        console.error(err);
        setIsProcessing(false);
      })
    }, 4000); // Increased timeout to allow for UPI app switch simulation
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col text-slate-900 shadow-2xl border-x border-slate-100">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-50 rounded-2xl transition text-slate-400 border border-transparent hover:border-slate-100"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Secure <span className="text-blue-600">Order</span></h1>
        </div>
        <div className="bg-indigo-950 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-indigo-900/10">
          <p className="text-[8px] font-black uppercase text-slate-500 leading-none mb-1 tracking-widest text-center">Wallet</p>
          <p className="text-sm font-black leading-tight tracking-tight">₹{Number(user.wallet).toFixed(0)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36 no-scrollbar">
        <div className="p-5">
          <nav className="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] border border-white">
            {(['REGULAR', 'PREMIUM'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all
                  ${activeTab === tab
                    ? 'bg-white text-indigo-600 shadow-sm scale-[1.03]'
                    : 'text-indigo-400 hover:text-indigo-600'
                  }`}
              >
                {tab === 'PREMIUM' ? 'Case Pack' : 'Standard'}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-5 space-y-6">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-600 transition-all group">
              <div className="flex gap-6">
                <ProductVisual style={p.image} />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-lg text-slate-950 leading-tight uppercase tracking-tight">{p.name}</h3>
                      <span className={`text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${p.stock > 10 ? 'border-emerald-100 text-emerald-600 bg-emerald-50/50' : 'border-rose-100 text-rose-600 bg-rose-50/50'}`}>
                        {p.stock} In Stock
                      </span>
                    </div>
                    <div className="flex items-end gap-1 mt-2">
                      <p className="text-black font-black text-3xl tracking-tighter">₹{p.price}</p>
                      <span className="text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">/ unit</span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{p.id === 'DISP' ? 'Purchase' : 'Units'}</span>
                      <div className="flex items-center gap-5">
                        <button onClick={() => updateQty(p, -1)} className="w-11 h-11 rounded-2xl border border-slate-100 flex items-center justify-center font-black text-xl hover:bg-slate-50 transition-colors shadow-sm">-</button>
                        <span className="font-black text-2xl w-6 text-center text-slate-950">{quantities[p.id] || 0}</span>
                        <button
                          onClick={() => updateQty(p, 1)}
                          disabled={p.stock <= (quantities[p.id] || 0)}
                          className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black text-xl shadow-xl transition-all 
                            ${p.stock <= (quantities[p.id] || 0)
                              ? 'opacity-20 border-slate-200'
                              : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95'
                            }`}
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {p.id === '20L' && quantities['20L'] > 0 && (
                <div className="mt-8 bg-slate-950 p-6 rounded-[2rem] border-b-4 border-blue-600 relative overflow-hidden group/exchange">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <RotateCcw size={16} className="text-blue-500" />
                          <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">Barrel Exchange</span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Owned Inventory: {user?.activeBarrels || 0}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-4">
                          <button onClick={() => setBarrelReturns(Math.max(0, barrelReturns - 1))} className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white shadow-sm hover:bg-slate-700">-</button>
                          <span className="font-black text-xl w-4 text-center text-white">{barrelReturns}</span>
                          <button
                            onClick={() => {
                              const maxPossible = Math.min(quantities['20L'] || 0, user?.activeBarrels || 0);
                              setBarrelReturns(Math.min(barrelReturns + 1, maxPossible));
                            }}
                            className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-sm hover:bg-blue-500"
                          >+</button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-1">
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest italic leading-tight">Authentic Pani Gadi Units Only</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">Deposit: ₹200 / Unit (Refundable)</p>
                    </div>
                  </div>
                  <Droplets size={80} className="absolute -right-6 -bottom-6 text-white/5 rotate-12" />
                </div>
              )}

              {p.id === 'DISP' && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Manual pump unit. Non-refundable disposal item.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 mt-10 pb-10">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-slate-950 p-3 rounded-2xl text-white shadow-xl rotate-3"><Calendar size={22} /></div>
              <div>
                <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em]">Logistics Schedule</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select Delivery window</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-8">
              {dateOptions.map((opt) => (
                <button
                  key={opt.iso}
                  onClick={() => setDeliveryDate(opt.iso)}
                  className={`flex flex-col items-center justify-center py-5 rounded-2xl border transition-all 
                    ${deliveryDate === opt.iso
                      ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-xl shadow-indigo-900/20'
                      : 'bg-white border-slate-100 text-indigo-400 hover:border-indigo-200'
                    }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">{opt.dayName}</span>
                  <span className="text-xl font-black">{opt.dayNum}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex items-start gap-3">
                  <Info size={14} className="text-blue-600 mt-1 shrink-0" />
                  <p className="text-[9px] font-black text-slate-500 uppercase leading-snug tracking-widest italic">
                    Same-day processing available for orders placed before 12:00 PM.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Zap size={14} className="text-amber-500 mt-1 shrink-0" />
                  <p className="text-[9px] font-black text-slate-500 uppercase leading-snug tracking-widest italic">
                    Bulk requests (5+ units) enjoy priority dispatch until 6:00 PM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {summary.total >= 0 && (Object.values(quantities).some((q: number) => q > 0)) && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-40 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center gap-6">
            <div className="flex flex-col pl-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Liability</p>
              <p className="text-4xl font-black tracking-tighter text-slate-950">₹{summary.total}</p>
            </div>
            <button onClick={() => setShowCheckout(true)} className="flex-1 bg-slate-950 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl hover:bg-black group">
              Confirm Order <ShoppingBag size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-end justify-center backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[3.5rem] p-10 max-h-[94vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-500 shadow-2xl border-t border-white">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-8">
                <div className="bg-emerald-50 p-10 rounded-full text-emerald-600 animate-bounce shadow-inner">
                  <CheckCircle2 size={80} />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase italic">Success!</h2>
                  <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-widest">Dispatching regional unit...</p>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-10">
                <div className="relative">
                  <div className="animate-spin rounded-full h-28 w-28 border-t-4 border-b-4 border-blue-600/20"></div>
                  <div className="absolute top-0 animate-spin rounded-full h-28 w-28 border-t-4 border-blue-600"></div>
                  <CreditCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-950" size={32} />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Encrypting Payment</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4 animate-pulse">Awaiting secure gateway...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase italic">Order <span className="text-blue-600">Invoice</span></h2>
                  <button onClick={() => setShowCheckout(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-100"><X size={24} /></button>
                </div>

                <div className="space-y-4 mb-8">
                  {summary.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-900 font-black text-[11px] uppercase tracking-tight">{item.name} <span className="text-blue-600 ml-2">Qty {item.quantity}</span></span>
                      <span className="font-black text-slate-950">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <span>Logistics Fee</span>
                      <span className="text-slate-900">{summary.delivery === 0 ? <span className="text-emerald-600">Complimentary</span> : `₹${summary.delivery}`}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <span>Vault Deposit</span>
                      <span className="text-slate-900">₹{summary.securityFees}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase text-blue-600 border-t border-slate-200 pt-3 mt-3 tracking-widest">
                      <span>Dispatch Date</span>
                      <span className="font-black">{new Date(deliveryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {summary.discountApplied > 0 && (
                      <div className="flex justify-between text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                        <span className="flex items-center gap-1"><Gift size={12} /> Referral Applied</span>
                        <span>- ₹{summary.discountApplied}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-6 flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Grand Total</span>
                    <span className="text-5xl font-black text-slate-950 tracking-tighter">₹{summary.total}</span>
                  </div>
                </div>

                {user.referralBalance > 0 && !useReferralBonus && (
                  <button onClick={() => setUseReferralBonus(true)} className="w-full mb-8 p-5 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-between group transition-all hover:border-emerald-500">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2.5 rounded-xl shadow-sm"><Gift className="text-emerald-600" size={20} /></div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">Available Bonus</p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-1">Deduct ₹25 from total</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-600 underline uppercase tracking-widest group-hover:no-underline">Redeem</span>
                  </button>
                )}

                <div className="space-y-4 mb-10">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Settlement Method</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setPaymentMethod('UPI')} className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === 'UPI' ? 'border-blue-600 bg-white shadow-2xl scale-[1.02]' : 'border-slate-50 opacity-40 grayscale'}`}>
                      <CreditCard size={28} className={paymentMethod === 'UPI' ? 'text-blue-600' : ''} />
                      <span className="font-black text-[9px] uppercase tracking-widest">Secure UPI</span>
                    </button>
                    <button onClick={() => setPaymentMethod('WALLET')} className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === 'WALLET' ? 'border-blue-600 bg-white shadow-2xl scale-[1.02]' : 'border-slate-50 opacity-40 grayscale'}`}>
                      <Wallet size={28} className={paymentMethod === 'WALLET' ? 'text-blue-600' : ''} />
                      <span className="font-black text-[9px] uppercase tracking-widest text-center">Wallet (₹{Number(user.wallet)})</span>
                    </button>
                  </div>
                </div>

                <button onClick={() => handleOrder()} className="w-full bg-slate-950 text-white font-black py-7 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all text-[11px] uppercase tracking-[0.2em] hover:bg-black">
                  {paymentMethod === 'UPI' ? 'Authorize Payment' : 'Complete Transaction'} <Sparkles size={20} />
                </button>
                <p className="text-[8px] text-center text-slate-400 font-black uppercase tracking-[0.4em] mt-10 flex items-center justify-center gap-3"><ShieldCheck size={14} className="text-emerald-500" /> AES-256 Encrypted Transfer</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderWater;
