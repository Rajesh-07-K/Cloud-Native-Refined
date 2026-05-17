import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import UploadDocument from './pages/UploadDocument';
import AdminPanel from './pages/AdminPanel';
import Notifications from './pages/Notifications';

import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: 48, height: 48 }}></div>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading DocFlow...</span>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Layout wrapper with sidebar + header
const AppLayout = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user) fetchUnreadCount();
    const interval = setInterval(() => { if (user) fetchUnreadCount(); }, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/notifications?limit=1');
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  return (
    <div className="app-layout">
      <Sidebar unreadCount={unreadCount} />
      <div className="main-content">
        <Header unreadCount={unreadCount} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c1c35',
            color: '#f1f5f9',
            border: '1px solid #2d2d52',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '500',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#1c1c35' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1c1c35' } },
          duration: 3500,
        }}
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/documents" element={
          <ProtectedRoute>
            <AppLayout><Documents /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/documents/:id" element={
          <ProtectedRoute>
            <AppLayout><DocumentDetail /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/documents/:id" element={
          <ProtectedRoute>
            <AppLayout><DocumentDetail /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/upload" element={
          <ProtectedRoute allowedRoles={['hod', 'mentor', 'administration']}>
            <AppLayout><UploadDocument /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <AppLayout><Notifications /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['administration']}>
            <AppLayout><AdminPanel /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '5rem' }}>🔍</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Page Not Found</h2>
            <p style={{ color: 'var(--text-muted)' }}>The page you're looking for doesn't exist.</p>
            <a href="/dashboard" className="btn btn-primary">Go to Dashboard</a>
          </div>
        } />
      </Routes>
    </>
  );
};

export default App;
