import React, { useState, useEffect } from 'react';
import { AppRole, LocationConfig } from '../types';
import { Droplet, Ticket, Lock, ShieldCheck, ArrowRight, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StateCitySelector from '../components/StateCitySelector';

const Login: React.FC = () => {
    const { login, sendOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [availableLocations, setAvailableLocations] = useState<LocationConfig[]>([]);
    const [loginTab, setLoginTab] = useState<'USER' | 'ADMIN'>('USER');
    const [adminType, setAdminType] = useState<'WHATSAPP' | 'OWNER'>('WHATSAPP');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [referralInput, setReferralInput] = useState('');

    const [userState, setUserState] = useState('');
    const [userCity, setUserCity] = useState('');

    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let timer: any;
        if (resendTimer > 0) {
            timer = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    useEffect(() => {
        api.get('/locations')
            .then(res => setAvailableLocations(res.data.filter((l: any) => l.isActive)))
            .catch(err => console.error("Failed to load locations", err));
    }, []);

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loginTab === 'ADMIN' && adminType === 'OWNER' && email && password) {
            setLoading(true);
            try {
                const loggedInUser = await login(undefined, undefined, undefined, 'OWNER', undefined, undefined, email, password);
                if (loggedInUser) navigate('/owner');
                else alert('Invalid Credentials');
            } catch (err: any) {
                alert(err.response?.data?.error || 'Login Failed');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (phone.length < 10) return alert('Enter valid 10-digit phone number');

        if (loginTab === 'USER') {
            if (!name) return alert('Please enter your name');
            if (!userState || !userCity) return alert('Please select your location');
        }

        setLoading(true);

        try {
            await sendOtp(phone);
            setStep(2);
            setResendTimer(20);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (otp.length < 6) return alert('Enter 6-digit OTP');

        setLoading(true);
        try {
            let loggedInUser;
            if (loginTab === 'USER') {
                loggedInUser = await verifyOtp(phone, otp, name, userCity, userState, 'USER');
            } else {
                loggedInUser = await verifyOtp(phone, otp, undefined, undefined, undefined, 'ADMIN');
            }

            if (loggedInUser) {
                if (loggedInUser.role === 'ADMIN') navigate('/admin');
                else if (loggedInUser.role === 'AGENT') navigate('/delivery');
                else if (loggedInUser.role === 'OWNER') navigate('/owner');
                else navigate('/dashboard');
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Verification failed. Please check OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        try {
            await sendOtp(phone);
            setResendTimer(20);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#f8fafc] text-slate-900 overflow-hidden relative">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md bg-white p-10 rounded-[3.5rem] shadow-2xl border border-indigo-50 relative z-10 transition-all duration-500">
                <div className="flex flex-col items-center justify-center mb-10">
                    <div className="bg-indigo-600 p-5 rounded-3xl shadow-2xl rotate-3 mb-6 group hover:rotate-0 transition-transform duration-500 border-b-4 border-indigo-400">
                        <Droplet className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-indigo-950">Pani <span className="text-indigo-600">Gadi</span></h1>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mt-2">Logistics Control</p>
                </div>

                <nav className="flex gap-1.5 p-1.5 bg-indigo-50/50 rounded-[2rem] border border-white mb-10">
                    <button
                        type="button"
                        onClick={() => { setLoginTab('USER'); setStep(1); setOtp(''); }}
                        className={`flex-1 py-4 rounded-[1.75rem] font-black text-[9px] uppercase tracking-[0.2em] transition-all 
                            ${loginTab === 'USER'
                                ? 'bg-white text-indigo-600 shadow-sm scale-[1.03]'
                                : 'text-indigo-400 hover:text-indigo-600'
                            }`}
                    >
                        Customer
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginTab('ADMIN'); setStep(1); setOtp(''); }}
                        className={`flex-1 py-4 rounded-[1.75rem] font-black text-[9px] uppercase tracking-[0.2em] transition-all 
                            ${loginTab === 'ADMIN'
                                ? 'bg-white text-indigo-600 shadow-sm scale-[1.03]'
                                : 'text-indigo-400 hover:text-indigo-600'
                            }`}
                    >
                        Authority
                    </button>
                </nav>

                {step === 1 ? (
                    <form onSubmit={handleAction} className="space-y-6">
                        {loginTab === 'ADMIN' && (
                            <div className="space-y-4 mb-8">
                                <div className="flex gap-2 p-1.5 bg-indigo-50 rounded-2xl border border-indigo-100/50">
                                    <button
                                        type="button"
                                        onClick={() => setAdminType('WHATSAPP')}
                                        className={`flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all 
                                            ${adminType === 'WHATSAPP'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-indigo-400 hover:text-indigo-600'
                                            }`}
                                    >
                                        WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdminType('OWNER')}
                                        className={`flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all 
                                            ${adminType === 'OWNER'
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'text-indigo-400 hover:text-indigo-600'
                                            }`}
                                    >
                                        Root Admin
                                    </button>
                                </div>

                                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex items-start gap-4">
                                    <ShieldCheck className="text-indigo-600 shrink-0" size={20} />
                                    <p className="text-[10px] font-bold text-indigo-800 leading-relaxed uppercase tracking-tight">
                                        {adminType === 'OWNER'
                                            ? 'Secure Root Access: Authorized biometric/email credentials required.'
                                            : 'Fleet Access: Register encrypted mobile terminal to continue.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            {loginTab === 'USER' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Identity Name</label>
                                        <input
                                            type="text"
                                            className="w-full p-5 bg-white border border-indigo-100 rounded-3xl focus:border-indigo-600 outline-none font-bold text-indigo-950 shadow-sm transition-all focus:shadow-xl"
                                            placeholder="Ex: Alexander Pierce"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Operational Zone</label>
                                        <StateCitySelector
                                            onSelect={(s, c) => { setUserState(s); setUserCity(c); }}
                                            filterActive={true}
                                            availableLocations={availableLocations}
                                        />
                                    </div>
                                </>
                            )}

                            {((loginTab === 'ADMIN' && adminType === 'OWNER' && email !== '') || (loginTab === 'ADMIN' && adminType === 'OWNER' && password !== '')) ? (
                                <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Secure Email</label>
                                        <input
                                            type="email"
                                            className="w-full p-5 bg-white border border-indigo-100 rounded-3xl focus:border-indigo-600 outline-none font-bold text-indigo-950 shadow-sm transition-all focus:shadow-xl"
                                            placeholder="admin@panigadi.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Access Token</label>
                                        <input
                                            type="password"
                                            className="w-full p-5 bg-white border border-indigo-100 rounded-3xl focus:border-indigo-600 outline-none font-bold text-indigo-950 shadow-sm transition-all focus:shadow-xl"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-center pt-2">
                                        <button type="button" onClick={() => { setEmail(''); setPassword(''); }} className="text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest transition-colors underline decoration-2 underline-offset-4">Switch to Mobile Auth</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">
                                        {loginTab === 'USER' ? 'Mobile Link' : 'Secure Line'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-indigo-100 pr-3 mr-3">
                                            <MessageSquare size={14} className="text-emerald-500" />
                                            <span className="font-black text-indigo-950 text-sm tracking-tighter">+91</span>
                                        </div>
                                        <input
                                            type="tel"
                                            className="w-full p-5 pl-24 bg-white border border-indigo-100 rounded-3xl focus:border-indigo-600 outline-none font-bold text-indigo-950 shadow-sm transition-all focus:shadow-xl tracking-[0.1em]"
                                            placeholder="00000 00000"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            required={!email}
                                        />
                                    </div>
                                    {loginTab === 'ADMIN' && adminType === 'OWNER' && (
                                        <div className="flex justify-center pt-4">
                                            <button type="button" onClick={() => { setEmail(' '); }} className="text-[9px) font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest transition-colors underline decoration-2 underline-offset-4">Switch to Biometric/Email</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {loginTab === 'USER' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 ml-1 flex items-center gap-2"><Ticket size={12} className="text-indigo-600" /> Redemption Code (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full p-5 bg-white border border-indigo-100 rounded-3xl focus:border-indigo-600 outline-none font-bold text-indigo-950 shadow-sm transition-all focus:shadow-xl uppercase tracking-widest"
                                        placeholder="VAULT-77"
                                        value={referralInput}
                                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2.5rem] mt-8 hover:bg-indigo-700 transition-all shadow-2xl active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-[0.2em] relative overflow-hidden group border-b-4 border-indigo-800"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                                ) : (
                                    <>
                                        <MessageSquare size={18} className="text-emerald-400 group-hover:scale-125 transition-transform" />
                                        {loginTab === 'USER' ? 'Verify via WhatsApp' : 'Secure Entry'}
                                        <ArrowRight size={16} className="text-indigo-300" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-10 animate-in fade-in zoom-in duration-500">
                        <div className="space-y-6 text-center">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Verifying Identity Terminal</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    className="w-full p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] text-center text-4xl font-black tracking-[0.4em] focus:border-indigo-600 outline-none text-indigo-950 transition-all shadow-inner"
                                    placeholder="••••••"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    autoFocus
                                />
                                <div className="bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100 inline-flex items-center gap-2 mx-auto">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <p className="text-[9px] text-emerald-700 font-black uppercase tracking-widest italic">WhatsApp Code Dispatched to +91 {phone.slice(0, 3)}...{phone.slice(-3)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-[11px] uppercase tracking-[0.2em] border-b-4 border-indigo-800"
                            >
                                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white mx-auto"></div> : 'Confirm Credentials'}
                            </button>

                            <div className="flex flex-col gap-3 items-center">
                                {resendTimer > 0 ? (
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Resend available in {resendTimer}s</p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors py-2 underline decoration-2 underline-offset-4"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                                <button type="button" onClick={() => setStep(1)} className="text-center w-full text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors py-2">Recalibrate Profile</button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            <div className="mt-12 flex flex-col items-center gap-4 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] text-indigo-400 flex items-center gap-3">
                    <ShieldCheck size={14} className="text-emerald-500" /> AES-256 Quantum Shield
                </p>
                <button
                    onClick={() => navigate('/legal')}
                    className="text-[10px] font-black text-indigo-300 hover:text-indigo-600 uppercase tracking-widest transition-colors py-2 underline decoration-1 underline-offset-4"
                >
                    Terms & Cancellation Policy
                </button>
            </div>
        </div>
    );
};

export default Login;
