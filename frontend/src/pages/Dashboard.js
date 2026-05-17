import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Clock, CheckCircle, XCircle, Upload, Bell,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';



const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docRes, notifRes] = await Promise.all([
        axios.get('/documents?limit=8'),
        axios.get('/notifications?limit=6')
      ]);
      const docs = docRes.data.documents || [];

      setUnreadCount(notifRes.data.unreadCount || 0);

      setStats({
        total: docRes.data.pagination?.total || docs.length,
        pending: docs.filter(d => d.status === 'pending' || d.status === 'under_review').length,
        approved: docs.filter(d => d.status === 'approved').length,
        rejected: docs.filter(d => d.status === 'rejected').length,
      });
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };



  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    { label: 'Total Documents', value: stats.total, icon: FileText, color: '#6366f1', colorRgb: '99, 102, 241' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: '#f59e0b', colorRgb: '245, 158, 11' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: '#10b981', colorRgb: '16, 185, 129' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#ef4444', colorRgb: '239, 68, 68' },
  ];

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <span>Loading dashboard...</span>
    </div>
  );

  return (
    <div className="animate-in">
      {/* Welcome Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 style={{ fontSize: '1.75rem' }}>
            {getGreeting()}, <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{user?.name?.split(' ')[0]}</span> 👋
          </h2>
          <p>Here's what's happening with your documents today.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
          {user?.role !== 'administration' && (
            <Link to="/upload" className="btn btn-primary">
              <Upload size={16} /> Upload Document
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ '--stat-color': s.color, '--stat-color-rgb': s.colorRgb }}>
            <div className="stat-icon">
              <s.icon size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card quick-nav-card" onClick={() => navigate('/documents')} style={{ cursor: 'pointer', textAlign: 'center', padding: '2.5rem' }}>
          <FileText size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
          <h3>Manage Documents</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>View, filter, and track all your documentation</p>
        </div>
        
        {user?.role !== 'administration' && (
          <div className="card quick-nav-card" onClick={() => navigate('/upload')} style={{ cursor: 'pointer', textAlign: 'center', padding: '2.5rem' }}>
            <Upload size={48} style={{ color: 'var(--secondary)', margin: '0 auto 1rem' }} />
            <h3>Upload New Request</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Submit files for approval workflow</p>
          </div>
        )}

        <div className="card quick-nav-card" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer', textAlign: 'center', padding: '2.5rem', position: 'relative' }}>
          {unreadCount > 0 && <span className="nav-badge" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '1rem', padding: '0.2rem 0.6rem' }}>{unreadCount}</span>}
          <Bell size={48} style={{ color: 'var(--warning)', margin: '0 auto 1rem' }} />
          <h3>Notifications</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Stay updated on document statuses</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
