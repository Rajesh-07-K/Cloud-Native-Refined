import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Users, FileText, BarChart2, Settings, Search,
  CheckCircle, XCircle, AlertCircle, Eye, Trash2
} from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Mathematics', 'Physics', 'Chemistry',
  'Administration', 'Library'
];
const ROLE_COLORS = { administration: 'badge-admin', hod: 'badge-hod', mentor: 'badge-mentor', student: 'badge-student' };

const AdminPanel = () => {
  const [tab, setTab] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilters, setUserFilters] = useState({ search: '', role: 'all', department: 'All' });
  const navigate = useNavigate();

  useEffect(() => {
    if (tab === 'analytics') fetchStats();
    else if (tab === 'users') fetchUsers();
    else if (tab === 'documents') fetchDocuments();
  }, [tab, userFilters]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/stats');
      setStats(res.data.stats);
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (userFilters.search) params.search = userFilters.search;
      if (userFilters.role !== 'all') params.role = userFilters.role;
      if (userFilters.department !== 'All') params.department = userFilters.department;
      const res = await axios.get('/admin/users', { params });
      setUsers(res.data.users || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin/documents', { params: { limit: 20 } });
      setDocuments(res.data.documents || []);
    } catch { toast.error('Failed to load admin documents'); }
    finally { setLoading(false); }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await axios.put(`/admin/users/${userId}`, { role });
      toast.success('User role updated');
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  const toggleUserStatus = async (userId, isActive) => {
    try {
      if (!isActive) {
        await axios.delete(`/admin/users/${userId}`);
        toast.success('User deactivated');
      } else {
        await axios.put(`/admin/users/${userId}`, { isActive: true });
        toast.success('User activated');
      }
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update user'); }
  };

  const TABS = [
    { key: 'analytics', label: 'Analytics', icon: BarChart2 },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'documents', label: 'All Documents', icon: FileText },
    { key: 'workflows', label: 'Workflow Config', icon: Settings },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>⚙️ Admin Panel</h2>
          <p>System overview, user management, and workflow configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ flex: 'none' }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="animate-in">
          {loading || !stats ? (
            <div className="loading-overlay"><div className="spinner"></div></div>
          ) : (
            <>
              <div className="stat-grid">
                {[
                  { label: 'Total Users', value: stats.users.total, icon: Users, color: '#6366f1' },
                  { label: 'Total Documents', value: stats.documents.total, icon: FileText, color: '#0ea5e9' },
                  { label: 'Pending Approval', value: stats.documents.pending, icon: AlertCircle, color: '#f59e0b' },
                  { label: 'Approved', value: stats.documents.approved, icon: CheckCircle, color: '#10b981' },
                  { label: 'Rejected', value: stats.documents.rejected, icon: XCircle, color: '#ef4444' },
                  { label: 'Escalated', value: stats.documents.escalated, icon: AlertCircle, color: '#a855f7' },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ '--stat-color': s.color }}>
                    <div className="stat-icon"><s.icon size={22} /></div>
                    <div className="stat-info">
                      <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="analytics-grid">
                {/* By Department */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>📊 Documents by Department</h3>
                  {stats.documents.byDepartment?.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}><p>No data yet</p></div>
                  ) : (
                    stats.documents.byDepartment?.map((item, i) => {
                      const pct = stats.documents.total > 0 ? ((item.count / stats.documents.total) * 100).toFixed(1) : 0;
                      return (
                        <div key={i} style={{ marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 600 }}>{item._id}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{item.count} · {pct}%</span>
                          </div>
                          <div className="progress-bar-wrap">
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* By Role */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>👥 Users by Role</h3>
                  {stats.users.byRole?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span className={`badge ${ROLE_COLORS[item._id] || 'badge-student'}`} style={{ textTransform: 'capitalize' }}>
                        {item._id}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.count}</span>
                    </div>
                  ))}

                  <h3 className="card-title" style={{ marginTop: '1.5rem', marginBottom: '1.25rem' }}>🎯 By Priority</h3>
                  {stats.documents.byPriority?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span className={`badge badge-${item._id}`} style={{ textTransform: 'capitalize' }}>{item._id}</span>
                      <span style={{ fontWeight: 700 }}>{item.count}</span>
                    </div>
                  ))}
                </div>

                {/* Recent Documents */}
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <h3 className="card-title" style={{ marginBottom: '1rem' }}>🕐 Recently Uploaded</h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th><th>Uploaded By</th><th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentDocuments?.map(doc => (
                          <tr key={doc._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${doc._id}`)}>
                            <td className="doc-name">{doc.title}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{doc.uploadedBy?.name}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="animate-in">
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div className="filters-bar" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem', flex: 1 }}>
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userFilters.search}
                  onChange={e => setUserFilters(p => ({ ...p, search: e.target.value }))}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', width: '100%' }}
                />
              </div>
              <select className="filter-select" value={userFilters.role} onChange={e => setUserFilters(p => ({ ...p, role: e.target.value }))}>
                <option value="all">All Roles</option>
                <option value="administration">Administration</option>
                <option value="hod">HOD</option>
                <option value="mentor">Mentor</option>
                <option value="student">Student</option>
              </select>
              <select className="filter-select" value={userFilters.department} onChange={e => setUserFilters(p => ({ ...p, department: e.target.value }))}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-overlay"><div className="spinner"></div></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            value={u.role}
                            onChange={e => updateUserRole(u._id, e.target.value)}
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            <option value="student">Student</option>
                            <option value="mentor">Mentor</option>
                            <option value="hod">HOD</option>
                            <option value="administration">Administration</option>
                          </select>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.department}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: u.isActive ? 'var(--success)' : 'var(--danger)' }}>
                            {u.isActive ? '● Active' : '● Inactive'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {u.lastLogin ? format(new Date(u.lastLogin), 'MMM d, yyyy') : 'Never'}
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleUserStatus(u._id, !u.isActive)}
                          >
                            {u.isActive ? <><Trash2 size={12} /> Deactivate</> : <><CheckCircle size={12} /> Activate</>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Documents Tab */}
      {tab === 'documents' && (
        <div className="animate-in">
          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-overlay"><div className="spinner"></div></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Document</th><th>Dept</th><th>Status</th><th>Priority</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc._id}>
                        <td>
                          <div className="doc-name" onClick={() => navigate(`/documents/${doc._id}`)}>{doc.title}</div>
                          <div className="doc-id">{doc.uniqueId}</div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{doc.department}</td>
                        <td><span className={`badge badge-${doc.status}`}>{doc.status?.replace('_', ' ')}</span></td>
                        <td><span className={`badge badge-${doc.priority}`}>{doc.priority}</span></td>
                        <td style={{ fontSize: '0.82rem' }}>{doc.uploadedBy?.name || '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/documents/${doc._id}`)}>
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow Config Tab */}
      {tab === 'workflows' && (
        <div className="animate-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {[
              { name: 'Fast Track', icon: '⚡', steps: 1, sla: '24 hours', approvers: 'Mentor', color: '#f59e0b' },
              { name: 'Standard', icon: '📋', steps: 2, sla: '72 hours', approvers: 'Mentor → HOD', color: '#6366f1' },
              { name: 'Multi-Level', icon: '🔗', steps: 3, sla: '120 hours', approvers: 'Mentor → HOD → Administration', color: '#0ea5e9' },
              { name: 'Level 4 Approval', icon: '🏛️', steps: 4, sla: '168 hours', approvers: 'Mentor → HOD → Administration → Principal', color: '#a855f7' },
            ].map((wf, i) => (
              <div key={i} className="card" style={{ borderTop: `3px solid ${wf.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>{wf.icon}</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{wf.name}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    { label: 'Approval Steps', value: wf.steps },
                    { label: 'SLA', value: wf.sla },
                    { label: 'Approver Chain', value: wf.approvers },
                  ].map(({ label, value }, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  {Array.from({ length: wf.steps }).map((_, j) => (
                    <div key={j} style={{ height: 6, flex: 1, borderRadius: 3, background: wf.color, opacity: 0.6 + (j * 0.1) }}></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
