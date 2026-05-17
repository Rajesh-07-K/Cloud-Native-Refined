import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FileText, Search, Filter, Upload, Eye, RefreshCw } from 'lucide-react';

const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'badge-pending' },
  under_review: { label: 'Under Review', cls: 'badge-under_review' },
  approved: { label: 'Approved', cls: 'badge-approved' },
  rejected: { label: 'Rejected', cls: 'badge-rejected' },
  escalated: { label: 'Escalated', cls: 'badge-escalated' },
  draft: { label: 'Draft', cls: 'badge-draft' }
};

const PRIORITY_MAP = {
  low: 'badge-low', medium: 'badge-medium', high: 'badge-high', urgent: 'badge-urgent'
};

const DEPARTMENTS = ['All', 'HR', 'Finance', 'Legal', 'Operations', 'IT', 'Marketing', 'Sales', 'Executive'];
const STATUSES = ['all', 'pending', 'under_review', 'approved', 'rejected', 'escalated'];
const PRIORITIES = ['all', 'low', 'medium', 'high', 'urgent'];

const Documents = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: 'all', department: 'All', priority: 'all', search: '' });

  useEffect(() => { fetchDocuments(1); }, [filters]);

  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.department !== 'All') params.department = filters.department;
      if (filters.priority !== 'all') params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      const res = await axios.get('/documents', { params });
      setDocuments(res.data.documents || []);
      setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => setFilters(p => ({ ...p, [key]: value }));

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Documents</h2>
          <p>Manage and track all your documents across departments. ({pagination.total} total)</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => fetchDocuments(pagination.page)}>
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/upload" className="btn btn-primary">
            <Upload size={16} /> Upload Document
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div className="filters-bar" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.85rem', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem', width: '100%' }}
            />
          </div>

          <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="filter-select">
            {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>

          <select value={filters.department} onChange={e => handleFilterChange('department', e.target.value)} className="filter-select">
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>

          <select value={filters.priority} onChange={e => handleFilterChange('priority', e.target.value)} className="filter-select">
            {PRIORITIES.map(p => <option key={p} value={p}>{p === 'all' ? 'All Priorities' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-overlay" style={{ minHeight: 300 }}>
            <div className="spinner"></div>
            <span>Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h3>No documents found</h3>
            <p>Try adjusting your filters or upload a new document</p>
            <Link to="/upload" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Upload size={16} /> Upload First Document
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Workflow</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc._id}>
                    <td>
                      <div className="doc-name" onClick={() => navigate(`/documents/${doc._id}`)}>
                        {doc.title}
                      </div>
                      <div className="doc-id">{doc.uniqueId}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{doc.department}</td>
                    <td>
                      <span className={`badge ${STATUS_MAP[doc.status]?.cls || 'badge-draft'}`}>
                        {STATUS_MAP[doc.status]?.label || doc.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${PRIORITY_MAP[doc.priority] || 'badge-low'}`}>
                        {doc.priority}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {doc.workflowType?.replace(/-/g, ' ')}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{doc.uploadedBy?.name || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.uploadedBy?.department}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </td>
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={pagination.page <= 1} onClick={() => fetchDocuments(pagination.page - 1)}>
            ‹
          </button>
          {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchDocuments(p)}>
              {p}
            </button>
          ))}
          <button className="page-btn" disabled={pagination.page >= pagination.pages} onClick={() => fetchDocuments(pagination.page + 1)}>
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default Documents;
