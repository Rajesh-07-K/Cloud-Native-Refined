import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

const TYPE_META = {
  approval_request: { icon: Bell, cls: 'notif-pending' },
  approved: { icon: CheckCircle, cls: 'notif-approved' },
  rejected: { icon: XCircle, cls: 'notif-rejected' },
  escalated: { icon: AlertTriangle, cls: 'notif-escalated' },
  new_document: { icon: FileText, cls: 'notif-default' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/notifications?limit=50');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await axios.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={22} /> Notifications
            {unreadCount > 0 && <span className="nav-badge" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>{unreadCount} unread</span>}
          </h2>
          <p>Stay updated on document approvals, rejections, and system alerts.</p>
        </div>
        <div className="page-header-actions">
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner"></div></div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={56} style={{ opacity: 0.3 }} />
            <h3>All caught up!</h3>
            <p>You have no notifications at this time.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div className="notification-list">
            {notifications.map(notif => {
              const meta = TYPE_META[notif.type] || TYPE_META.new_document;
              const Icon = meta.icon;
              return (
                <div
                  key={notif._id}
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.isRead) markRead(notif._id);
                    if (notif.document?._id) navigate(`/documents/${notif.document._id}`);
                  }}
                >
                  <div className={`notification-icon-wrap ${meta.cls}`}>
                    <Icon size={16} />
                  </div>
                  <div className="notification-body">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-msg">{notif.message}</div>
                    {notif.document && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', marginTop: '0.25rem' }}>
                        📄 {notif.document.title} · {notif.document.uniqueId}
                      </div>
                    )}
                    <div className="notification-time">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {!notif.isRead ? (
                    <div className="notification-unread-dot"></div>
                  ) : (
                    <Check size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
