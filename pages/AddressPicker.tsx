import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Address } from '../types';
import { ChevronLeft, MapPin, Navigation, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Fix for default Leaflet icon not showing in React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ coords, setCoords }: { coords: { lat: number, lng: number }, setCoords: (c: { lat: number, lng: number }) => void }) {
  const markerRef = useRef<L.Marker>(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          setCoords(marker.getLatLng());
        }
      },
    }),
    [setCoords],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[coords.lat, coords.lng]}
      ref={markerRef}>
    </Marker>
  );
}

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
        localStorage.setItem('aqua_address', JSON.stringify(newAddress));
        navigate('/dashboard');
      })
      .catch(err => {
        console.error(err);
        alert('Failed to save address');
      });
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfcfd] flex flex-col text-slate-900 shadow-2xl border-x border-slate-100">
      <header className="p-5 border-b border-slate-100 flex items-center gap-4 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-50 rounded-2xl transition text-slate-400 border border-transparent hover:border-slate-100">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Delivery <span className="text-blue-600">Locus</span></h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* Map Container */}
        <div className="h-[400px] bg-slate-50 relative overflow-hidden m-5 rounded-[3rem] border border-slate-100 shadow-inner group z-10">
          {coords ? (
            <MapContainer center={[coords.lat, coords.lng]} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker coords={coords} setCoords={setCoords} />
            </MapContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center">
              <div className="bg-white p-6 rounded-[2rem] shadow-xl mb-8 border border-slate-50 group-hover:scale-110 transition-transform duration-500"><Navigation className="text-blue-600" size={40} /></div>
              <p className="text-slate-950 font-black text-xl mb-2 tracking-tighter uppercase italic leading-none">Telemetry Required</p>
              <p className="text-[10px] text-slate-500 mb-10 font-black uppercase tracking-widest leading-relaxed">Authorize GPS for precise logistics dispatch.</p>
              <button
                onClick={getCurrentLocation}
                disabled={locating}
                className="bg-slate-950 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50"
              >
                {locating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div> : <><MapPin size={20} className="text-blue-500" /> Initialize Geofence</>}
              </button>
            </div>
          )}
          {coords && (
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-100">
              <button onClick={() => setCoords(null)} className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Reset Map</button>
            </div>
          )}
        </div>

        {/* Address Details Form */}
        <div className="px-7 py-5">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center"><Info size={16} className="text-blue-600" /></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Logistics Metadata</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Building/Sanctum Name</label>
              <input
                required
                className="w-full p-5 bg-white border border-slate-100 rounded-3xl focus:border-blue-600 outline-none font-bold text-slate-950 shadow-sm transition-all focus:shadow-xl"
                placeholder="E.g. Sky View Residency"
                value={formData.building}
                onChange={e => setFormData({ ...formData, building: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Unit/Portal No.</label>
              <input
                required
                className="w-full p-5 bg-white border border-slate-100 rounded-3xl focus:border-blue-600 outline-none font-bold text-slate-950 shadow-sm transition-all focus:shadow-xl"
                placeholder="E.g. Suite 402-B"
                value={formData.flatNo}
                onChange={e => setFormData({ ...formData, flatNo: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Zone Zipcode</label>
              <input
                required
                maxLength={6}
                type="tel"
                className="w-full p-5 bg-white border border-slate-100 rounded-3xl focus:border-blue-600 outline-none font-bold text-slate-950 shadow-sm transition-all focus:shadow-xl"
                placeholder="6-Digit Code"
                value={formData.pincode}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, pincode: val });
                }}
              />
            </div>

            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Point Designation</label>
              <div className="flex gap-3">
                {(['home', 'office', 'other'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`flex-1 py-4 px-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.type === t
                      ? 'bg-slate-950 text-white border-slate-950 shadow-xl scale-[1.05]'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 shadow-sm'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button className="w-full bg-slate-950 text-white font-black py-7 rounded-[2.5rem] mt-12 hover:bg-black transition-all shadow-2xl active:scale-95 text-[11px] uppercase tracking-[0.2em] border-b-4 border-blue-600">
              Commit Deployment Address
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddressPicker;
