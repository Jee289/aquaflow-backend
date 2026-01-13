import React, { useState, useEffect, useMemo } from 'react';
import { OrderItem, Order, Product } from '../types';
import { ChevronLeft, ShoppingBag, Truck, Wallet, X, Info, Droplets, GlassWater, Settings, CheckCircle2, CreditCard, Sparkles, Zap, ShieldCheck, Gift, RotateCcw, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProductVisual: React.FC<{ style: string }> = ({ style }) => {
  if (style === 'style:barrel') {
    return (
      <div className="w-28 h-28 flex items-center justify-center bg-blue-50 rounded-2xl border-2 border-blue-600/10 relative overflow-hidden">
        <div className="w-16 h-20 bg-blue-400 border-[3px] border-blue-900 rounded-lg relative">
          <div className="w-6 h-3 bg-blue-900 absolute -top-3 left-1/2 -translate-x-1/2 rounded-t-md"></div>
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

  const calculateSummary = () => {
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
          if (user.orderCount > 0) delivery += 10 * qty;
          const chargeQty = Math.max(0, qty - barrelReturns);
          securityFees += chargeQty * 200;
        }
        items.push({ ...p, quantity: qty } as OrderItem);
      }
    });

    if (useReferralBonus) discountApplied = Math.min(user.referralBalance, 25);
    const total = subtotal + delivery + securityFees - discountApplied;
    return { items, subtotal, delivery, securityFees, discountApplied, total };
  };

  const summary = calculateSummary();

  const handleOrder = (appId?: string) => {
    if (!user) return;
    if (paymentMethod === 'WALLET' && user.wallet < summary.total) {
      alert('Insufficient Wallet Balance. Please add funds or use UPI.');
      return;
    }
    setIsProcessing(true);

    const orderId = `AQ-${Math.floor(100000 + Math.random() * 900000)}`;

    if (paymentMethod === 'UPI') {
      // INITIATE RAZORPAY

      api.post('/razorpay/initiate', {
        amount: summary.total,
        userId: user.uid,
        transactionId: orderId,
        note: `Order ${orderId}`,
      }).then(response => {
        console.log(`[Order] Razorpay Initiate Response:`, response.data);
        if (response.data.success) {
          const options = {
            key: response.data.key_id,
            amount: response.data.amount,
            currency: "INR",
            name: "Pani Gadi",
            description: response.data.description || `Order ${orderId}`,
            order_id: response.data.order_id,
            handler: function (razorpayResponse: any) {
              console.log('[Order] Razorpay Payment Success:', razorpayResponse);
              // Verify payment
              api.post('/razorpay/verify', {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                userId: user.uid,
                type: 'order'
              }).then(verifyRes => {
                console.log('[Order] Verification Response:', verifyRes.data);
                if (verifyRes.data.success) {
                  setIsProcessing(false);
                  setIsSuccess(true);
                  setTimeout(() => navigate('/dashboard'), 2500);
                } else {
                  alert('Payment verification failed. Please contact support.');
                  setIsProcessing(false);
                }
              }).catch(verifyErr => {
                console.error('[Order] Verification error:', verifyErr);
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
                console.log('[Order] Payment cancelled by user');
                setIsProcessing(false);
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          setIsProcessing(false);
        } else {
          alert(`Payment Initialization Failed: ${response.data.message || 'Check Server Logs'}`);
          setIsProcessing(false);
        }
      }).catch(err => {
        const msg = err.response?.data?.message || err.response?.data?.error || 'Payment Initialization Failed';
        alert(`Error: ${msg}`);
        setIsProcessing(false);
      });
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
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col text-black">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-1 hover:bg-gray-100 rounded-full transition"><ChevronLeft size={24} /></button>
          <h1 className="text-xl font-black">Order Water</h1>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Wallet</p>
          <p className="text-sm font-black leading-tight">₹{user.wallet.toFixed(0)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <div className="flex p-4 gap-3">
          {(['REGULAR', 'PREMIUM'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 rounded-3xl font-black transition-all border-2 ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600 scale-[1.02]' : 'bg-white text-gray-400 border-gray-100'
                }`}
            >
              {tab === 'PREMIUM' ? 'Premium Case' : 'Regular Jars'}
            </button>
          ))}
        </div>

        <div className="px-4 space-y-4">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-white border-2 border-gray-100 p-4 rounded-[2rem] shadow-sm hover:border-blue-600 transition-all overflow-hidden">
              <div className="flex gap-4">
                <ProductVisual style={p.image} />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-lg text-black leading-tight">{p.name}</h3>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${p.stock > 10 ? 'border-green-200 text-green-600' : 'border-red-200 text-red-600'}`}>
                        {p.stock} units
                      </span>
                    </div>
                    <p className="text-black font-black text-2xl mt-1">₹{p.price}</p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.id === 'DISP' ? 'Buy' : 'Quantity'}</span>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateQty(p, -1)} className="w-10 h-10 rounded-2xl border-2 border-gray-100 flex items-center justify-center font-black text-xl hover:bg-gray-50 transition-colors">-</button>
                        <span className="font-black text-xl w-6 text-center">{quantities[p.id] || 0}</span>
                        <button
                          onClick={() => updateQty(p, 1)}
                          disabled={p.stock <= (quantities[p.id] || 0)}
                          className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-xl shadow-lg transition-all ${p.stock <= (quantities[p.id] || 0) ? 'opacity-30 border-gray-200' : 'border-blue-600 bg-white text-blue-600'}`}
                        >+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {p.id === '20L' && (
                <div className="mt-4 bg-blue-50/50 p-4 rounded-[1.5rem] border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black uppercase text-blue-800 tracking-widest">Return jar</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setBarrelReturns(Math.max(0, barrelReturns - 1))} className="w-8 h-8 rounded-xl bg-white border border-blue-200 flex items-center justify-center font-black text-blue-600 shadow-sm">-</button>
                      <span className="font-black text-sm w-4 text-center text-blue-900">{barrelReturns}</span>
                      <button onClick={() => setBarrelReturns(barrelReturns + 1)} className="w-8 h-8 rounded-xl bg-white border border-blue-200 flex items-center justify-center font-black text-blue-600 shadow-sm">+</button>
                    </div>
                  </div>
                  <div className="bg-white/60 p-3 rounded-xl">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Security Fee will be Rs 200 per jar</p>
                    <p className="text-[9px] font-black text-green-600 uppercase tracking-tighter mt-0.5">Amount is refundable</p>
                  </div>
                </div>
              )}

              {p.id === 'DISP' && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Rs 250 per dispenser non refundable.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 mt-8 pb-8">
          <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Calendar size={20} /></div>
              <div>
                <h3 className="text-sm font-black text-black uppercase tracking-widest">Delivery Schedule</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Pick your preferred date</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {dateOptions.map((opt) => (
                <button
                  key={opt.iso}
                  onClick={() => setDeliveryDate(opt.iso)}
                  className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all shadow-sm ${deliveryDate === opt.iso
                    ? 'bg-blue-600 border-blue-600 text-white scale-105'
                    : 'bg-white border-gray-100 text-black hover:border-blue-200'
                    }`}
                >
                  <span className="text-[9px] font-black uppercase opacity-60">{opt.dayName}</span>
                  <span className="text-xl font-black">{opt.dayNum}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[9px] font-black text-amber-800 uppercase leading-tight tracking-tighter italic">
                    Standard same day: Order before 12:00 PM.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Zap size={14} className="text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-[9px] font-black text-blue-800 uppercase leading-tight tracking-tighter italic">
                    Bulk order (5+ Jars/Cases): Order before 6:00 PM for same day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {summary.total >= 0 && (Object.values(quantities).some((q: number) => q > 0)) && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t-2 border-gray-100 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] rounded-t-[2.5rem]">
          <div className="flex justify-between items-center gap-4">
            <div className="flex flex-col pl-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payable</p>
              <p className="text-3xl font-black">₹{summary.total}</p>
            </div>
            <button onClick={() => setShowCheckout(true)} className="flex-1 bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-2xl uppercase tracking-widest">Checkout <ShoppingBag size={22} /></button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 max-h-[94vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-6">
                <div className="bg-green-100 p-8 rounded-full text-green-600 animate-bounce">
                  <CheckCircle2 size={80} />
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-black text-black">Order Placed!</h2>
                  <p className="text-gray-500 font-bold mt-2">Connecting to delivery unit...</p>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-8">
                <div className="relative">
                  <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600"></div>
                  <CreditCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={32} />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-black">Verifying Secure Payment</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3 animate-pulse">Please wait...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-black tracking-tighter">Order Summary</h2>
                  <button onClick={() => setShowCheckout(false)} className="p-3 bg-gray-100 rounded-full"><X size={24} /></button>
                </div>

                <div className="space-y-4 mb-6">
                  {summary.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                      <span className="text-gray-800 font-bold">{item.name} <span className="text-blue-600 ml-1">x{item.quantity}</span></span>
                      <span className="font-black text-black">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Delivery Charge</span>
                      <span>{summary.delivery === 0 ? <span className="text-green-600">FREE (First Order)</span> : `₹${summary.delivery}`}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-500">
                      <span>Security Fee (Refundable)</span>
                      <span>₹{summary.securityFees}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-blue-600 border-t pt-2 mt-2">
                      <span>Scheduled Date</span>
                      <span className="font-black">{new Date(deliveryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {summary.discountApplied > 0 && (
                      <div className="flex justify-between text-xs font-bold text-green-600">
                        <span className="flex items-center gap-1"><Gift size={12} /> Referral Bonus Applied</span>
                        <span>- ₹{summary.discountApplied}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 flex justify-between items-center">
                    <span className="text-xl font-black text-black">Total Payable</span>
                    <span className="text-4xl font-black text-black">₹{summary.total}</span>
                  </div>
                </div>

                {user.referralBalance > 0 && !useReferralBonus && (
                  <button onClick={() => setUseReferralBonus(true)} className="w-full mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Gift className="text-green-600" size={20} />
                      <div className="text-left">
                        <p className="text-[10px] font-black text-green-800 uppercase tracking-widest leading-none">Use Referral Bonus</p>
                        <p className="text-xs font-bold text-green-700 mt-1">Redeem ₹25 on this order</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-green-600 underline uppercase tracking-widest">Apply</span>
                  </button>
                )}

                <div className="space-y-6 mb-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPaymentMethod('UPI')} className={`p-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'UPI' ? 'border-blue-600 bg-white shadow-xl' : 'border-gray-50 grayscale opacity-40'}`}>
                        <CreditCard size={24} />
                        <span className="font-black text-[10px] uppercase">Pay Online</span>
                      </button>
                      <button onClick={() => setPaymentMethod('WALLET')} className={`p-5 rounded-[1.5rem] border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'WALLET' ? 'border-blue-600 bg-white shadow-xl' : 'border-gray-50 grayscale opacity-40'}`}>
                        <Wallet size={24} />
                        <div className="flex flex-col items-center">
                          <span className="font-black text-[10px] uppercase">Wallet (₹{user.wallet})</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {paymentMethod === 'UPI' && (
                  <button onClick={() => handleOrder()} className="w-full bg-blue-600 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform uppercase tracking-widest">Pay Now <CreditCard size={28} /></button>
                )}
                {paymentMethod === 'WALLET' && (
                  <button onClick={() => handleOrder()} className="w-full bg-blue-600 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-transform uppercase tracking-widest">Pay & Confirm <Truck size={28} /></button>
                )}
                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-6 flex items-center justify-center gap-2"><ShieldCheck size={14} className="text-blue-600" /> SECURE TRANSACTION</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderWater;
