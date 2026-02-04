import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry",
    "Ladakh", "Jammu and Kashmir"
];

interface StateCitySelectorProps {
    onSelect: (state: string, city: string) => void;
    initialState?: string;
    initialCity?: string;
    filterActive?: boolean; // If true, only show active cities (requires fetching from API)
    availableLocations?: { state: string, city: string }[]; // Optional prop to filter cities based on active list
}

const StateCitySelector: React.FC<StateCitySelectorProps> = ({ onSelect, initialState = '', initialCity = '', filterActive = false, availableLocations = [] }) => {
    const [selectedState, setSelectedState] = useState(initialState);
    const [cityInput, setCityInput] = useState(initialCity); // Can be a dropdown if strict filtering is ON
    const [availableCities, setAvailableCities] = useState<string[]>([]);

    useEffect(() => {
        if (filterActive && availableLocations.length > 0 && selectedState) {
            const cities = availableLocations
                .filter(l => l.state === selectedState)
                .map(l => l.city);
            setAvailableCities(cities);
        } else {
            setAvailableCities([]);
        }
    }, [selectedState, availableLocations, filterActive]);

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const s = e.target.value;
        setSelectedState(s);
        setCityInput(''); // Reset city on state change
        onSelect(s, '');
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const c = e.target.value;
        setCityInput(c);
        if (selectedState) {
            onSelect(selectedState, c);
        }
    };

    return (
        <div className="space-y-3">
            <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 mb-1 block">State / Region</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 appearance-none"
                        value={selectedState}
                        onChange={handleStateChange}
                    >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedState && (
                <div className="relative animate-fade-in-up">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 mb-1 block">City / District</label>
                    {filterActive && availableCities.length > 0 ? (
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 appearance-none"
                                value={cityInput}
                                onChange={handleCityChange}
                            >
                                <option value="">Select City</option>
                                {availableCities.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Enter City Name"
                                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                                value={cityInput}
                                onChange={handleCityChange}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StateCitySelector;
