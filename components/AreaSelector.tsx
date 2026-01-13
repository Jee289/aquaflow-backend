import React, { useState, useEffect } from 'react';
import { MapPin, Droplet, ChevronRight, TrendingUp, CheckCircle2 } from 'lucide-react';
import { User, AppRole, DistrictConfig } from '../types';
import api from '../services/api';

const ODISHA_DISTRICTS = [
  "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack",
  "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur",
  "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", "Khordha",
  "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada",
  "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
];

interface AreaSelectorProps {
  onSelect: (district: string) => void;
  user: User;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ onSelect, user }) => {
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtConfigs, setDistrictConfigs] = useState<DistrictConfig[]>([]);
  const [isServiced, setIsServiced] = useState<boolean | null>(null);
  const [showInterestPopup, setShowInterestPopup] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    api.get('/configs').then(res => setDistrictConfigs(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      const config = districtConfigs.find(c => c.district === selectedDistrict);
      setIsServiced(!!(config && config.adminPhone));
    } else {
      setIsServiced(null);
    }
  }, [selectedDistrict, districtConfigs]);

  const handleConfirm = async () => {
    if (!selectedDistrict) return alert('Please select a district');

    if (isServiced) {
      onSelect(selectedDistrict);
    } else {
      // Log interest and show popup
      setIsLogging(true);
      try {
        await api.post('/interests', { district: selectedDistrict });
        setShowInterestPopup(true);
      } catch (err) {
        console.error('Failed to log interest', err);
      } finally {
        setIsLogging(false);
      }
    }
  };

  if (showInterestPopup) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-50 p-8 rounded-[3rem] mb-8 border-2 border-blue-100">
          <TrendingUp size={64} className="text-blue-600 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">Coming Soon!</h2>
        <p className="text-gray-500 font-bold mb-8 leading-relaxed">
          Pani Gadi isn't active in <span className="text-blue-600 font-black">{selectedDistrict}</span> yet.
          But your interest has been recorded!
        </p>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4 mb-8 w-full">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
          <p className="text-xs font-black text-emerald-800 uppercase tracking-widest text-left">Regional Demand Logged</p>
        </div>
        <button
          onClick={() => { setShowInterestPopup(false); setSelectedDistrict(''); }}
          className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Choose Another District
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col text-black p-6 items-center justify-center">
      <div className="w-full text-center space-y-8">
        <div className="bg-white border-2 border-black p-4 rounded-3xl inline-block shadow-lg">
          <Droplet className="w-12 h-12 text-blue-600" />
        </div>

        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 uppercase">Pani Gadi</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest px-4">
            {user.role === AppRole.USER ? 'Select your territory' : 'Select operational city'}
          </p>
        </div>

        <div className="space-y-6 w-full px-2">
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
              <MapPin size={22} />
            </div>
            <select
              className="w-full p-5 pl-14 bg-gray-50 border-2 border-gray-100 rounded-[2rem] focus:border-black outline-none font-bold text-lg appearance-none cursor-pointer transition-all"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              <option value="" disabled>-- Pick Your District --</option>
              {ODISHA_DISTRICTS.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronRight size={20} className="rotate-90" />
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedDistrict || isLogging}
            className={`w-full py-5 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedDistrict
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isLogging ? 'Processing...' : `Enter ${selectedDistrict || 'Pani Gadi'}`}
          </button>

          {selectedDistrict && isServiced === false && (
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">
              * Expansion Pending in this District
            </p>
          )}
        </div>

        <div className="pt-8 border-t border-dashed border-gray-100">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
            Reliable Water Delivery <br /> Serving All 30 Districts of Odisha
          </p>
        </div>
      </div>
    </div>
  );
};

export default AreaSelector;
