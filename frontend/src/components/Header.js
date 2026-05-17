import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Search } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your document activity' },
  '/documents': { title: 'Documents', subtitle: 'All documents across departments' },
  '/upload': { title: 'Upload Document', subtitle: 'Submit a new document for approval' },
  '/notifications': { title: 'Notifications', subtitle: 'Your latest alerts and updates' },
  '/admin': { title: 'Admin Panel', subtitle: 'System management and configuration' },
};

const Header = ({ unreadCount = 0 }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');

  const page = Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k));
  const { title, subtitle } = page?.[1] || { title: 'Cloud Native', subtitle: '' };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/documents?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <header className="header">
      <div className="header-title">
        <div style={{ fontWeight: 700 }}>{title}</div>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      <div className="header-search">
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search documents... (Enter)"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <button className="icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
        <Bell size={17} />
        {unreadCount > 0 && <span className="notification-dot"></span>}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border)' }}>
        <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.82rem', cursor: 'pointer' }} onClick={() => navigate('/admin')}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ display: 'none' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.role}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
