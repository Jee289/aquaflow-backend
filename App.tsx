import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppRole } from './types';
import api from './services/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderWater from './pages/OrderWater';
import OrderHistory from './pages/OrderHistory';
import AddressPicker from './pages/AddressPicker';
import AdminDashboard from './pages/AdminDashboard';
import DeliveryAgent from './pages/DeliveryAgent';
import OwnerDashboard from './pages/OwnerDashboard';
import AreaSelector from './components/AreaSelector';
import Legal from './pages/Legal';

const PrivateRoute = ({ children, role }: { children: React.ReactNode, role?: AppRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex bg-white h-screen items-center justify-center">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if user needs to select a district (for non-OWNER users)
  if (user.role !== AppRole.OWNER && !user.district) {
    return <Navigate to="/select-area" />;
  }

  if (role && user.role !== role && user.role !== AppRole.OWNER) {
    // Basic protection: if role required and user is not that role (and not owner), redirect
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const AreaSelectorRoute = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;

  const handleDistrictSelect = async (district: string) => {
    try {
      // Update user's district in backend
      await api.patch(`/users/${user.uid}`, { district });
      // Update local state
      updateUser({ ...user, district });
      // Redirect based on role
      if (user.role === AppRole.ADMIN) navigate('/admin');
      else if (user.role === AppRole.AGENT) navigate('/delivery');
      else if (user.role === AppRole.OWNER) navigate('/owner');
      else navigate('/dashboard');
    } catch (err) {
      console.error('Failed to set district', err);
    }
  };

  return <AreaSelector onSelect={handleDistrictSelect} user={user} />;
};

const RootRedirect = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex bg-white h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  // Special case: If user has a role but no district yet (and is not an owner), send to selector
  if (user.role !== AppRole.OWNER && !user.district) {
    return <Navigate to="/select-area" />;
  }

  // Role-based routing
  if (user.role === AppRole.OWNER) return <Navigate to="/owner" />;
  if (user.role === AppRole.ADMIN) return <Navigate to="/admin" />;
  if (user.role === AppRole.AGENT) return <Navigate to="/delivery" />;

  return <Navigate to="/dashboard" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/select-area" element={<AreaSelectorRoute />} />

          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/order" element={<PrivateRoute><OrderWater /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
          <Route path="/address" element={<PrivateRoute><AddressPicker /></PrivateRoute>} />

          <Route path="/admin" element={<PrivateRoute role={AppRole.ADMIN}><AdminDashboard /></PrivateRoute>} />
          <Route path="/delivery" element={<PrivateRoute role={AppRole.AGENT}><DeliveryAgent /></PrivateRoute>} />
          <Route path="/owner" element={<PrivateRoute role={AppRole.OWNER}><OwnerDashboard /></PrivateRoute>} />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
