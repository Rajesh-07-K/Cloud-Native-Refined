import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Upload, Bell, Shield, LogOut, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['administration', 'hod', 'mentor', 'student'] },
  { to: '/documents', icon: FileText, label: 'Documents', roles: ['administration', 'hod', 'mentor', 'student'] },
  { to: '/upload', icon: Upload, label: 'Upload Document', roles: ['hod', 'mentor', 'student'] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['administration', 'hod', 'mentor', 'student'] },
  { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['administration'] },
];

const Sidebar = ({ unreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Cloud Native" style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
        <div className="logo-text">
          <h1>Cloud Native</h1>
          <span>Document Workflow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>

        {NAV_ITEMS.filter(item => item.roles.includes(user?.role)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
            {item.to === '/notifications' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </NavLink>
        ))}

        {user?.role === 'administration' && (
          <>
            <div className="nav-section-label" style={{ marginTop: '1rem' }}>Administration</div>
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings className="nav-icon" />
              <span>Workflow Config</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="user-profile-card">
          <div className="user-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : '👤'}</div>
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="role">{user?.role} • {user?.department}</div>
          </div>
          <button onClick={handleLogout} className="icon-btn" style={{ border: 'none', background: 'transparent' }} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
