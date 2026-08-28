import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import DonorDashboard from './pages/donor/DonorDashboard';
import DonorProfile from './pages/donor/DonorProfile';
import PostDonation from './pages/donor/PostDonation';
import MyDonations from './pages/donor/MyDonations';
import DonationDetail from './pages/donor/DonationDetail';
import DonorNotifications from './pages/donor/DonorNotifications';

import NGODashboard from './pages/ngo/NGODashboard';
import NGOProfile from './pages/ngo/NGOProfile';
import NGONotifications from './pages/ngo/NGONotifications';

import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import VolunteerProfile from './pages/volunteer/VolunteerProfile';
import ActiveDelivery from './pages/volunteer/ActiveDelivery';
import VolunteerHistory from './pages/volunteer/VolunteerHistory';
import VolunteerNotifications from './pages/volunteer/VolunteerNotifications';

import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Donor Routes */}
          <Route path="/donor/dashboard" element={
            <ProtectedRoute allowedRole="donor"><DonorDashboard /></ProtectedRoute>
          } />
          <Route path="/donor/profile" element={
            <ProtectedRoute allowedRole="donor"><DonorProfile /></ProtectedRoute>
          } />
          <Route path="/donor/donate" element={
            <ProtectedRoute allowedRole="donor"><PostDonation /></ProtectedRoute>
          } />
          <Route path="/donor/donations" element={
            <ProtectedRoute allowedRole="donor"><MyDonations /></ProtectedRoute>
          } />
          <Route path="/donor/donation/:id" element={
            <ProtectedRoute allowedRole="donor"><DonationDetail /></ProtectedRoute>
          } />
          <Route path="/donor/notifications" element={
            <ProtectedRoute allowedRole="donor"><DonorNotifications /></ProtectedRoute>
          } />

          {/* NGO Routes */}
          <Route path="/ngo/dashboard" element={
            <ProtectedRoute allowedRole="ngo"><NGODashboard /></ProtectedRoute>
          } />
          <Route path="/ngo/profile" element={
            <ProtectedRoute allowedRole="ngo"><NGOProfile /></ProtectedRoute>
          } />
          <Route path="/ngo/notifications" element={
            <ProtectedRoute allowedRole="ngo"><NGONotifications /></ProtectedRoute>
          } />

          {/* Volunteer Routes */}
          <Route path="/volunteer/dashboard" element={
            <ProtectedRoute allowedRole="volunteer"><VolunteerDashboard /></ProtectedRoute>
          } />
          <Route path="/volunteer/profile" element={
            <ProtectedRoute allowedRole="volunteer"><VolunteerProfile /></ProtectedRoute>
          } />
          <Route path="/volunteer/active" element={
            <ProtectedRoute allowedRole="volunteer"><ActiveDelivery /></ProtectedRoute>
          } />
          <Route path="/volunteer/history" element={
            <ProtectedRoute allowedRole="volunteer"><VolunteerHistory /></ProtectedRoute>
          } />
          <Route path="/volunteer/notifications" element={
            <ProtectedRoute allowedRole="volunteer"><VolunteerNotifications /></ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;