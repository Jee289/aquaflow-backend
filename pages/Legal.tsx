import React from 'react';
import { ChevronLeft, ShieldCheck, ScrollText, RotateCcw, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Legal: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col text-slate-900 shadow-2xl border-x border-slate-100">
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-5 flex items-center gap-4 sticky top-0 z-30">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-50 rounded-2xl transition text-slate-400 border border-transparent hover:border-slate-100"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-black tracking-tighter uppercase italic">Legal <span className="text-blue-600">Policy</span></h1>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-10 no-scrollbar">
                {/* Terms and Conditions */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
                            <ScrollText size={20} />
                        </div>
                        <h2 className="font-black text-lg uppercase tracking-tight">Terms & Conditions</h2>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-xs text-slate-500 leading-relaxed space-y-3">
                        <p>Welcome to **Pani Gadi**. By using our mobile application and services, you agree to comply with and be bound by the following terms and conditions.</p>

                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest pt-2">1. Service Eligibility</p>
                        <p>Our services are available only in designated serviceable areas. We reserve the right to refuse service to any location at our discretion.</p>

                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest pt-2">2. User Account</p>
                        <p>You are responsible for maintaining the confidentiality of your account credentials. All activities under your account are your sole responsibility.</p>

                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest pt-2">3. Pricing & Payments</p>
                        <p>All prices are subject to change without prior notice. Payments must be made via the provided online methods (Cashfree) or Wallet top-ups. Jar deposits are refundable upon return of authentic Pani Gadi barrels in good condition.</p>

                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest pt-2">4. Quality Standard</p>
                        <p>Pani Gadi guarantees the purity and quality of the water delivered. Once the seal is broken by the customer, we are no longer liable for external contamination.</p>
                    </div>
                </section>

                {/* Cancellation & Refund Policy */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-600 p-2 rounded-xl text-white shadow-lg shadow-rose-100">
                            <RotateCcw size={20} />
                        </div>
                        <h2 className="font-black text-lg uppercase tracking-tight">Cancellation & Refund</h2>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-xs text-slate-500 leading-relaxed space-y-3">
                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">1. Order Cancellation</p>
                        <p>You can cancel your order within **15 minutes** of placement for a full refund to your wallet. Orders already dispatched cannot be cancelled.</p>

                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest pt-2">2. Refunds</p>
                        <p>Refunds for cancelled orders or failed delivery attempts will be credited back to your **Pani Gadi Wallet** within 24-48 hours. Bank account refunds are processed as per the payment gateway's timeline (usually 5-7 business days).</p>

                        <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest pt-2">3. Damage/Issues</p>
                        <p>If you receive a leaky or damaged barrel, please report it to the delivery agent immediately. We will replace the unit at no extra cost.</p>
                    </div>
                </section>

                {/* Privacy Policy */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-100">
                            <ShieldCheck size={20} />
                        </div>
                        <h2 className="font-black text-lg uppercase tracking-tight">Privacy Policy</h2>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-xs text-slate-500 leading-relaxed space-y-3">
                        <p>We value your privacy. Your phone number and location data are collected solely for the purpose of order processing, OTP verification, and delivery logistics. We **do not** sell your data to third parties.</p>
                    </div>
                </section>

                <div className="pt-6 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">© 2026 Pani Gadi Operations</p>
                    <p className="text-[8px] text-slate-300 mt-2 italic px-10">Last Updated: February 2026</p>
                </div>
            </div>
        </div>
    );
};

export default Legal;
