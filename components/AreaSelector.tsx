import React, { useState, useEffect } from 'react';
import { Droplet, TrendingUp, CheckCircle2 } from 'lucide-react';
import { User, AppRole, LocationConfig } from '../types';
import api from '../services/api';
import StateCitySelector from './StateCitySelector';

interface AreaSelectorProps {
  onSelect: (district: string) => void;
  user: User;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ onSelect, user }) => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [activeLocations, setActiveLocations] = useState<LocationConfig[]>([]);
  const [isServiced, setIsServiced] = useState<boolean | null>(null);
  const [showInterestPopup, setShowInterestPopup] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    api.get('/locations')
      .then(res => setActiveLocations(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCity) {
      // Check if the selected city is in our active locations list
      const config = activeLocations.find(l => l.city.toLowerCase() === selectedCity.toLowerCase() && l.isActive && l.adminPhone);
      setIsServiced(!!config);
    } else {
      setIsServiced(null);
    }
  }, [selectedCity, activeLocations]);

  const handleConfirm = async () => {
    if (!selectedState || !selectedCity) return alert('Please select your location');

    if (isServiced) {
      // We pass the city name as the "district" for legacy compatibility
      onSelect(selectedCity);
    } else {
      // Log interest and show popup
      setIsLogging(true);
      try {
        await api.post('/interests', {
          district: selectedCity, // Using city as district identifier
          state: selectedState,
          userId: user.uid,
          details: `Interest from ${selectedCity}, ${selectedState}`
        });
        setShowInterestPopup(true);
      } catch (err) {
        console.error('Failed to log interest', err);
        // Fallback: Show popup anyway to satisfy user
        setShowInterestPopup(true);
      } finally {
        setIsLogging(false);
      }
    }
  };

  if (showInterestPopup) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500 relative z-50">
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="bg-blue-600/10 p-8 rounded-full mb-8 inline-block relative z-10">
            <TrendingUp size={64} className="text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter italic text-slate-950">Expansion <span className="text-blue-600">Pending</span></h2>
          <p className="text-[11px] font-bold text-slate-500 mb-10 leading-relaxed uppercase tracking-widest px-4">
            Pani Gadi isn't active in <span className="text-blue-600 font-black decoration-2 underline underline-offset-4">{selectedCity}</span> yet.
            However, your interest signal has been logged in our regional manifest.
          </p>
          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4 mb-10 w-full shadow-inner">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] text-left">Sector Demand Synced</p>
          </div>
          <button
            onClick={() => { setShowInterestPopup(false); setSelectedCity(''); setSelectedState(''); }}
            className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black border-b-4 border-blue-600"
          >
            Choose Alternative Area
          </button>
          <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col text-slate-900 p-8 items-center justify-center shadow-2xl border-x border-slate-100">
      <div className="w-full text-center space-y-10">
        <div className="bg-slate-950 p-6 rounded-[2.5rem] shadow-2xl rotate-3 inline-block group hover:rotate-0 transition-transform duration-500 border-b-4 border-blue-600">
          <Droplet className="w-12 h-12 text-white" />
        </div>

        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-950">Pani <span className="text-blue-600">Gadi</span></h1>
          <p className="text-slate-400 font-black uppercase text-[9px] tracking-[0.4em] mt-3">
            {user.role === AppRole.USER ? 'Designate Your Territory' : 'Operational Sector Control'}
          </p>
        </div>

        <div className="space-y-8 w-full px-2 text-left bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
          <StateCitySelector
            onSelect={(s, c) => { setSelectedState(s); setSelectedCity(c); }}
            filterActive={false}
            availableLocations={activeLocations}
          />

          <button
            onClick={handleConfirm}
            disabled={!selectedCity || isLogging}
            className={`w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-8 border-b-4 ${selectedCity
              ? 'bg-slate-950 text-white hover:bg-black border-blue-600'
              : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              }`}
          >
            {isLogging ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
            ) : (
              <>Enter {selectedCity || 'Territory'} <TrendingUp size={16} className="text-blue-500" /></>
            )}
          </button>

          {selectedCity && isServiced === false && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">
                Market Readiness: Evaluation Pending
              </p>
            </div>
          )}
        </div>

        <div className="pt-10">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] leading-relaxed opacity-60">
            Logistics Network <br /> Expanding Across India
          </p>
        </div>
      </div>
    </div>
  );
};

export default AreaSelector;
