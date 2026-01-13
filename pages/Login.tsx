import React, { useState, useEffect } from 'react';
import { AppRole, DistrictConfig } from '../types.ts';
import { Droplet, Ticket, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [districtConfigs, setDistrictConfigs] = useState<DistrictConfig[]>([]);
  const [loginTab, setLoginTab] = useState<'USER' | 'ADMIN'>('USER');
  const [adminType, setAdminType] = useState<'WHATSAPP' | 'OWNER'>('WHATSAPP');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch configs for district detection logic
    api.get('/configs')
      .then(res => setDistrictConfigs(res.data))
      .catch(err => console.error("Failed to load configs", err));
  }, []);

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();

    // Owner Login
    if (loginTab === 'ADMIN' && adminType === 'OWNER') {
      if (email === 'owner@gmail.com' && password === 'admin123') {
        // For owner, we might need a special login API or just reuse login with specific credentials
        // Simulating for now or use the API if it supports email/pass
        // Since API uses phone, we might need to adjust or sending a special owner phone
        login('0000000000', 'System Owner', undefined, AppRole.OWNER).then(() => navigate('/owner'));
      } else {
        alert('Invalid Owner Credentials');
      }
      return;
    }

    if (phone.length < 10) return alert('Enter valid 10-digit phone number');
    if (loginTab === 'USER' && !name) return alert('Please enter your name');

    setLoading(true);
    // Simulate OTP generation call
    setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 1000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '1234') {
      try {
        // Determine District/Role logic (client side prediction, but server handles auth)
        const assignedAdminDist = districtConfigs.find(d => d.adminPhone === phone);
        const assignedAgentDist = districtConfigs.find(d => d.agentPhones.includes(phone));

        let detectedDistrict = undefined;
        let detectedRole = undefined;

        if (assignedAdminDist) {
          detectedDistrict = assignedAdminDist.district;
          detectedRole = AppRole.ADMIN;
        }
        if (assignedAgentDist) {
          detectedDistrict = assignedAgentDist.district;
          detectedRole = AppRole.AGENT;
        }

        const loggedInUser = await login(phone, name, detectedDistrict, detectedRole);

        if (loggedInUser) {
          if (loggedInUser.role === AppRole.ADMIN) navigate('/admin');
          else if (loggedInUser.role === AppRole.AGENT) navigate('/delivery');
          else if (loggedInUser.role === AppRole.OWNER) navigate('/owner');
          else navigate('/dashboard');
        } else {
          // Fallback if no user returned (should catch in error block mainly)
          navigate('/dashboard');
        }
      } catch (error) {
        alert('Login Failed. Please try again.');
        console.error(error);
      }
    } else {
      alert('Invalid OTP (Try 1234)');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-black">
      <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-black">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="bg-white border-2 border-black p-4 rounded-3xl shadow-lg mb-2">
            <Droplet className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">Pani Gadi</h1>
        </div>

        <div className="flex gap-2 mb-8 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          <button
            type="button"
            onClick={() => { setLoginTab('USER'); setStep(1); setOtp(''); }}
            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${loginTab === 'USER' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
          >
            Customer Login
          </button>
          <button
            type="button"
            onClick={() => { setLoginTab('ADMIN'); setStep(1); setOtp(''); }}
            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${loginTab === 'ADMIN' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
          >
            Admin login
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleAction} className="space-y-4">
            {loginTab === 'ADMIN' && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAdminType('WHATSAPP')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border-2 transition-all ${adminType === 'WHATSAPP' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}
                >
                  WhatsApp Login
                </button>
                <button
                  type="button"
                  onClick={() => setAdminType('OWNER')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border-2 transition-all ${adminType === 'OWNER' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}
                >
                  System Owner
                </button>
              </div>
            )}

            {(loginTab === 'USER' || (loginTab === 'ADMIN' && adminType === 'WHATSAPP')) ? (
              <>
                {loginTab === 'USER' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest px-1">Your Name</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black outline-none font-bold"
                      placeholder="Enter Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black outline-none font-bold"
                    placeholder="99999 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                  />
                </div>
                {loginTab === 'USER' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest px-1 flex items-center gap-1"><Ticket size={10} /> Referral (Optional)</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black outline-none font-bold uppercase"
                      placeholder="REF-XXXX"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Owner Email</label>
                  <input
                    type="email"
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black outline-none font-bold"
                    placeholder="owner@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest px-1">Master Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-black outline-none font-bold"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  </div>
                </div>
              </>
            )}

            <button
              disabled={loading}
              className="w-full bg-black text-white border-2 border-black font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 flex justify-center items-center gap-3 mt-4"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (loginTab === 'USER' ? 'Sign Up / Sign In' : 'Secure Login')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2 text-center">
              <label className="text-xs font-black uppercase tracking-widest text-black">Enter OTP sent to {phone}</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-center text-3xl font-black tracking-[1em] focus:border-black outline-none text-black"
                placeholder="----"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[10px] text-gray-400 font-bold mt-2 italic">Verification Hint: Use 1234</p>
            </div>
            <button className="w-full bg-black text-white border-2 border-black font-black py-5 rounded-2xl shadow-xl active:scale-95">
              Verify OTP
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-black text-xs font-bold hover:underline opacity-60">Back</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
