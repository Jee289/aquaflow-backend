
import React, { useState, useEffect } from 'react';
import { User, AppRole, Address, Order } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderWater from './pages/OrderWater';
import OrderHistory from './pages/OrderHistory';
import AddressPicker from './pages/AddressPicker';
import AdminDashboard from './pages/AdminDashboard';
import DeliveryAgent from './pages/DeliveryAgent';
import AreaSelector from './components/AreaSelector';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [page, setPage] = useState<string>('login');
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Track admin phone numbers per district and active agents per district
  const [districtAdmins, setDistrictAdmins] = useState<Record<string, string>>({
    'Khordha': '9999999999',
    'Cuttack': '9999999999',
    'Puri': '7750038967'
  });
  const [districtsWithAgents, setDistrictsWithAgents] = useState<string[]>(['Khordha', 'Cuttack', 'Puri', 'Ganjam']);

  useEffect(() => {
    const savedUser = localStorage.getItem('aqua_user');
    const savedAddress = localStorage.getItem('aqua_address');
    const savedOrders = localStorage.getItem('aqua_orders');
    
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      if (!user.district) setPage('select-area');
      else if (user.role === AppRole.ADMIN) setPage('admin');
      else if (user.role === AppRole.AGENT) setPage('agent');
      else setPage('dashboard');
    }
    if (savedAddress) setCurrentAddress(JSON.parse(savedAddress));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('aqua_user', JSON.stringify(user));
    setPage('select-area');
  };

  const handleDistrictSelect = (district: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, district };
    setCurrentUser(updatedUser);
    localStorage.setItem('aqua_user', JSON.stringify(updatedUser));
    
    // Register role-specific activity in district
    if (currentUser.role === AppRole.ADMIN) {
      setDistrictAdmins(prev => ({ ...prev, [district]: currentUser.phone }));
    } else if (currentUser.role === AppRole.AGENT) {
      setDistrictsWithAgents(prev => Array.from(new Set([...prev, district])));
    }

    if (updatedUser.role === AppRole.ADMIN) setPage('admin');
    else if (updatedUser.role === AppRole.AGENT) setPage('agent');
    else setPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('aqua_user');
    setPage('login');
  };

  const isServiceable = (district: string) => {
    return !!districtAdmins[district] && districtsWithAgents.includes(district);
  };

  const renderPage = () => {
    if (!currentUser && page !== 'login') return <Login onLogin={handleLogin} />;
    
    if (currentUser && !currentUser.district && page !== 'select-area') {
      return <AreaSelector onSelect={handleDistrictSelect} user={currentUser} />;
    }

    const supportPhone = currentUser?.district ? (districtAdmins[currentUser.district] || '7750038967') : '7750038967';

    switch (page) {
      case 'login':
        return <Login onLogin={handleLogin} />;
      case 'select-area':
        return <AreaSelector onSelect={handleDistrictSelect} user={currentUser!} />;
      case 'dashboard':
        if (currentUser?.role === AppRole.USER && !isServiceable(currentUser.district!)) {
           return (
             <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
               <div className="bg-white p-8 rounded-[3rem] border-2 border-black mb-8 shadow-xl">
                 <img src="https://cdn-icons-png.flaticon.com/512/2830/2830305.png" className="w-32 h-32 grayscale opacity-20 mx-auto mb-4" />
                 <h2 className="text-3xl font-black mb-4">Coming Soon!</h2>
                 <p className="text-gray-500 font-bold leading-relaxed">
                   AquaFlow is currently expanding to <span className="text-black">{currentUser.district}</span>.
                   Hang tight, we'll be there soon!
                 </p>
               </div>
               <button 
                 onClick={() => setPage('select-area')}
                 className="text-black font-black underline underline-offset-4 hover:opacity-70 transition"
               >
                 Try another district
               </button>
               <button onClick={handleLogout} className="mt-8 text-red-500 font-bold text-sm">Logout</button>
             </div>
           );
        }
        return (
          <Dashboard 
            user={currentUser!} 
            address={currentAddress} 
            onLogout={handleLogout}
            onNavigate={setPage}
          />
        );
      case 'order-water':
        return <OrderWater user={currentUser!} address={currentAddress!} onNavigate={setPage} onPlaceOrder={(o) => {
          const updated = [o, ...orders];
          setOrders(updated);
          localStorage.setItem('aqua_orders', JSON.stringify(updated));
        }} />;
      case 'order-history':
        return (
          <OrderHistory 
            orders={orders.filter(o => o.userId === currentUser?.uid)} 
            onNavigate={setPage} 
            supportPhone={supportPhone}
          />
        );
      case 'address-picker':
        return <AddressPicker onSave={(a) => {
          setCurrentAddress(a);
          localStorage.setItem('aqua_address', JSON.stringify(a));
          setPage('dashboard');
        }} onBack={() => setPage('dashboard')} />;
      case 'admin':
        return <AdminDashboard onLogout={handleLogout} orders={orders} />;
      case 'agent':
        return <DeliveryAgent onLogout={handleLogout} orders={orders} setOrders={(newOrders) => {
          setOrders(newOrders);
          localStorage.setItem('aqua_orders', JSON.stringify(newOrders));
        }} />;
      default:
        return <Dashboard user={currentUser!} address={currentAddress} onLogout={handleLogout} onNavigate={setPage} />;
    }
  };

  return <div className="min-h-screen bg-white text-black">{renderPage()}</div>;
};

export default App;
