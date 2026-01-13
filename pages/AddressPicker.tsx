import React, { useState } from 'react';
import { Address } from '../types';
import { ChevronLeft, MapPin, Navigation, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AddressPicker: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    building: '',
    flatNo: '',
    pincode: '',
    type: 'home' as 'home' | 'office' | 'other',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const getCurrentLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocating(false);
        },
        () => {
          alert('Unable to retrieve your location. Using default center.');
          setCoords({ lat: 20.5937, lng: 78.9629 });
          setLocating(false);
        }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) return alert('Please mark location on map first for accuracy');
    if (!user) return alert('Please login first');

    const newAddress: Address = {
      id: Date.now().toString(),
      ...formData,
      latitude: coords.lat,
      longitude: coords.lng,
      fullAddress: `${formData.flatNo}, ${formData.building}, Pincode: ${formData.pincode}`
    };

    // Save to Backend
    api.patch(`/users/${user.uid}`, { address: newAddress })
      .then(() => {
        // Also update local storage for fallback or context sync if needed, 
        // but backend is primary now.
        localStorage.setItem('aqua_address', JSON.stringify(newAddress));
        navigate('/dashboard');
      })
      .catch(err => {
        console.error(err);
        alert('Failed to save address');
      });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col text-black">
      <div className="p-4 border-b flex items-center gap-4 bg-white sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition text-black">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-black tracking-tight">Set Delivery Location</h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Map Simulator */}
        <div className="h-72 bg-gray-50 relative overflow-hidden m-4 rounded-3xl border-2 border-gray-100 shadow-inner">
          {coords ? (
            <div className="w-full h-full flex items-center justify-center bg-blue-50/50">
              <div className="text-center p-6 bg-white rounded-3xl shadow-xl border-2 border-blue-100 scale-110">
                <MapPin size={48} className="text-red-500 animate-bounce mx-auto" />
                <p className="mt-4 font-black text-black">Location Pinned!</p>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Accuracy: High</p>
                <button onClick={() => setCoords(null)} className="mt-4 text-[10px] font-black text-gray-400 hover:text-black transition uppercase underline">Reset Marker</button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-white p-6 rounded-full shadow-lg mb-6 border border-gray-100"><MapPin className="text-blue-600" size={40} /></div>
              <p className="text-black font-black text-lg mb-2 leading-tight">Enable GPS for Accuracy</p>
              <p className="text-xs text-gray-500 mb-8 font-medium">Exact coordinates help our delivery agents find you faster.</p>
              <button
                onClick={getCurrentLocation}
                disabled={locating}
                className="bg-white text-black border-2 border-black px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-gray-50 transition shadow-lg"
              >
                {locating ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div> : <><Navigation size={20} /> Fetch My Location</>}
              </button>
            </div>
          )}
        </div>

        {/* Address Details Form */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-6">
            <Info size={16} className="text-blue-600" />
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Address Details</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-black uppercase tracking-widest px-1">Building / Society Name</label>
              <input
                required
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black outline-none font-bold text-black"
                placeholder="E.g. Emerald Heights"
                value={formData.building}
                onChange={e => setFormData({ ...formData, building: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-black uppercase tracking-widest px-1">House / Flat No.</label>
              <input
                required
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black outline-none font-bold text-black"
                placeholder="E.g. 102, Wing C"
                value={formData.flatNo}
                onChange={e => setFormData({ ...formData, flatNo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-black uppercase tracking-widest px-1">Pincode</label>
              <input
                required
                maxLength={6}
                type="tel"
                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black outline-none font-bold text-black"
                placeholder="Enter 6-digit Pincode"
                value={formData.pincode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, pincode: val });
                }}
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-black uppercase tracking-widest px-1">Save Address As</label>
              <div className="flex gap-4">
                {(['home', 'office', 'other'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`flex-1 py-4 px-2 rounded-2xl font-black border-2 transition-all capitalize ${formData.type === t
                      ? 'bg-white text-black border-black shadow-lg scale-[1.05]'
                      : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full bg-white text-black border-2 border-black font-black py-6 rounded-3xl mt-12 hover:bg-gray-50 transition-all shadow-2xl active:scale-[0.98]">
              Save & Proceed
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressPicker;
