import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import {
  FileText, CheckCircle, Clock, Shield, AlertTriangle, User, ChevronRight, XCircle
} from 'lucide-react';
import './TrackDocument.css';

const STATUS_META = {
  pending: { label: 'Pending Review', color: '#f59e0b', icon: <Clock size={20} /> },
  under_review: { label: 'Under Review', color: '#06b6d4', icon: <Clock size={20} /> },
  approved: { label: 'Fully Approved', color: '#10b981', icon: <CheckCircle size={20} /> },
  rejected: { label: 'Rejected', color: '#ef4444', icon: <XCircle size={20} /> },
  escalated: { label: 'Escalated', color: '#a855f7', icon: <AlertTriangle size={20} /> },
  draft: { label: 'Draft', color: '#94a3b8', icon: <FileText size={20} /> }
};

const ACTION_COLORS = {
  UPLOADED: '#6366f1', SUBMITTED: '#06b6d4', APPROVED: '#10b981',
  REJECTED: '#ef4444', ESCALATED: '#a855f7', VIEWED: '#64748b',
  DOWNLOADED: '#f59e0b', COMMENTED: '#0ea5e9', REASSIGNED: '#8b5cf6'
};

const TrackDocument = () => {
  const { uniqueId } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await axios.get(`/documents/track/${uniqueId}`);
        setDoc(res.data.document);
      } catch (err) {
        setError('Document not found or invalid QR code.');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [uniqueId]);

  if (loading) {
    return (
      <div className="track-container loading">
        <div className="spinner"></div>
        <p>Loading document details...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="track-container error">
        <AlertTriangle size={48} color="#ef4444" />
        <h2>{error}</h2>
        <Link to="/" className="btn btn-primary mt-4">Go to Home</Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[doc.status] || STATUS_META.draft;

  return (
    <div className="track-container">
      <div className="track-card">
        <div className="track-header" style={{ borderBottom: `4px solid ${statusMeta.color}` }}>
          <div className="status-icon" style={{ color: statusMeta.color }}>
            {statusMeta.icon}
          </div>
          <h1>{doc.title}</h1>
          <div className="doc-id">{doc.uniqueId}</div>
          <span className="badge" style={{ backgroundColor: `${statusMeta.color}22`, color: statusMeta.color, marginTop: '0.5rem', display: 'inline-block' }}>
            {statusMeta.label}
          </span>
        </div>

        <div className="track-content">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label"><User size={14}/> Uploaded By</span>
              <span className="info-value">{doc.uploadedBy?.name || 'Unknown'}</span>
              <span className="info-sub">{doc.uploadedBy?.department || ''}</span>
            </div>
            <div className="info-item">
              <span className="info-label"><Shield size={14}/> Pending Authority</span>
              <span className="info-value">{doc.currentHolder?.name || 'None'}</span>
              <span className="info-sub">{doc.currentHolder?.role || ''}</span>
            </div>
            <div className="info-item">
              <span className="info-label"><ChevronRight size={14}/> Workflow Steps</span>
              <span className="info-value">Step {doc.workflowStep} of {doc.totalWorkflowSteps}</span>
            </div>
            <div className="info-item">
              <span className="info-label"><FileText size={14}/> Digital Copy</span>
              {doc.approvedFileUrl ? (
                <a href={`http://localhost:5000${doc.approvedFileUrl}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  View Approved Document
                </a>
              ) : doc.fileUrl ? (
                <a href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  View Original Document
                </a>
              ) : (
                <span className="info-value text-muted">No attachment</span>
              )}
            </div>
          </div>

          <div className="timeline-section">
            <h3>Workflow History</h3>
            <div className="timeline">
              {[...doc.auditLog].reverse().map((log, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-dot" style={{ background: ACTION_COLORS[log.action] || '#6366f1' }}></div>
                  <div className="timeline-content">
                    <div className="timeline-action" style={{ color: ACTION_COLORS[log.action] || '#6366f1' }}>{log.action}</div>
                    <div className="timeline-user">{log.performedBy?.name || 'System'}</div>
                    {log.comment && <div className="timeline-comment">{log.comment}</div>}
                    <div className="timeline-time">
                      {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy · h:mm a') : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="track-footer">
          DocFlow Smart Tracking &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default TrackDocument;
