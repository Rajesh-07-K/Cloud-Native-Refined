import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import {
  FileText, Download, ArrowLeft, Check, X, AlertTriangle,
  User, Clock, Shield, Tag, Calendar, ChevronRight, Copy, Trash2,
  Brain, Network, Lock, ShieldCheck, ShieldAlert, Sparkles
} from 'lucide-react';

const STATUS_META = {
  pending: { label: 'Pending Review', cls: 'badge-pending', color: '#f59e0b' },
  under_review: { label: 'Under Review', cls: 'badge-under_review', color: '#06b6d4' },
  approved: { label: 'Fully Approved', cls: 'badge-approved', color: '#10b981' },
  rejected: { label: 'Rejected', cls: 'badge-rejected', color: '#ef4444' },
  escalated: { label: 'Escalated', cls: 'badge-escalated', color: '#a855f7' },
  draft: { label: 'Draft', cls: 'badge-draft', color: '#94a3b8' }
};

const ACTION_COLORS = {
  UPLOADED: '#6366f1', SUBMITTED: '#06b6d4', APPROVED: '#10b981',
  REJECTED: '#ef4444', ESCALATED: '#a855f7', VIEWED: '#64748b',
  DOWNLOADED: '#f59e0b', COMMENTED: '#0ea5e9', REASSIGNED: '#8b5cf6'
};

// Safely convert any value (including Python enum objects) to a displayable string
const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  // Python enum serialized as {value: 'normal'} or just the raw object
  if (typeof val === 'object') {
    if (val.value !== undefined) return String(val.value);
    // fallback: join all string values
    const strVals = Object.values(val).filter(v => typeof v === 'string' || typeof v === 'number');
    if (strVals.length > 0) return strVals.join(', ');
    try { return JSON.stringify(val); } catch { return ''; }
  }
  return String(val);
};

const DocumentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // 'approve' | 'reject' | 'escalate'
  const [actionForm, setActionForm] = useState({ comment: '', reason: '', file: null });
  const [processing, setProcessing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDocument(); }, [id]);

  const fetchDocument = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/documents/${id}`);
      setDoc(res.data.document);
    } catch (err) {
      toast.error('Document not found');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      let config = {};
      let payload;
      if (action === 'approve' && actionForm.file) {
        payload = new FormData();
        payload.append('comment', actionForm.comment);
        payload.append('file', actionForm.file);
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      } else {
        payload = action === 'reject'
          ? { comment: actionForm.comment, reason: actionForm.reason }
          : { comment: actionForm.comment };
      }

      await axios.post(`/documents/${id}/${action}`, payload, config);
      toast.success(`Document ${action}d successfully!`);
      setActionModal(null);
      setActionForm({ comment: '', reason: '', file: null });
      fetchDocument();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document request? This action cannot be undone.')) {
      return;
    }
    setProcessing(true);
    try {
      await axios.delete(`/documents/${id}`);
      toast.success('Document deleted successfully!');
      navigate('/documents');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
      setProcessing(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(doc.uniqueId);
    toast.success('Document ID copied!');
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await axios.get(`/documents/${id}/audit/verify`);
      setVerifyResult(res.data);
      if (res.data.valid) {
        toast.success('Audit trail cryptographically verified!');
      } else {
        toast.error(`Integrity compromised at index ${res.data.brokenAtIndex}!`);
      }
    } catch (err) {
      toast.error('Failed to verify audit trail');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <span>Loading document...</span>
    </div>
  );

  if (!doc) return null;

  const canApprove = (user.role === 'mentor' || user.role === 'hod' || user.role === 'administration') &&
    ['pending', 'under_review', 'escalated'].includes(doc.status);
  const canDelete = user.role === 'mentor' || user.role === 'hod' || user.role === 'administration';
  const statusMeta = STATUS_META[doc.status] || STATUS_META.draft;
  const progress = doc.totalWorkflowSteps > 0
    ? Math.round((doc.workflowStep / doc.totalWorkflowSteps) * 100)
    : 0;

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '0.75rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 style={{ fontSize: '1.4rem' }}>{doc.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
            <span className={`badge badge-${doc.priority}`}>{doc.priority}</span>
            {doc.isConfidential && <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>🔒 Confidential</span>}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span className="font-mono">{doc.uniqueId}</span>
              <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', height: 'auto' }} onClick={copyId}>
                <Copy size={11} />
              </button>
            </span>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/ask-ai')}>
            <Sparkles size={14} /> Ask AI
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowQR(!showQR)}>
            🔲 {showQR ? 'Hide' : 'Show'} QR
          </button>
          {doc.approvedFileUrl && (
            <a href={`http://localhost:5000${doc.approvedFileUrl}`} target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
              <Download size={14} /> Download Approved
            </a>
          )}
          {doc.fileUrl && (
            <a href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
              <Download size={14} /> {doc.approvedFileUrl ? 'Download Original' : 'Download'}
            </a>
          )}
          {canApprove && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => setActionModal('approve')}>
                <Check size={14} /> Approve
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setActionModal('reject')}>
                <X size={14} /> Reject
              </button>
              <button className="btn btn-warning btn-sm" onClick={() => setActionModal('escalate')}>
                <AlertTriangle size={14} /> Escalate
              </button>
            </>
          )}
          {canDelete && (
             <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={processing} style={{ marginLeft: '0.5rem' }}>
               <Trash2 size={14} /> Delete
             </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Workflow Progress */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Workflow Progress</h3>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Step {doc.workflowStep} of {doc.totalWorkflowSteps}
              </span>
            </div>
            <div className="progress-bar-wrap" style={{ marginBottom: '0.75rem' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%`, background: statusMeta.color !== '#94a3b8' ? `linear-gradient(90deg, ${statusMeta.color}, ${statusMeta.color}cc)` : 'var(--border)' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Submitted</span>
              <span style={{ color: statusMeta.color, fontWeight: 700 }}>{progress}% Complete</span>
              <span>Fully Approved</span>
            </div>

            {doc.rejectionReason && (
              <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.25rem' }}>Rejection Reason:</div>
                <div style={{ color: 'var(--text-secondary)' }}>{doc.rejectionReason}</div>
              </div>
            )}
          </div>

          {/* AI Insights (Phase 1) */}
          {doc.aiClassification && typeof doc.aiClassification === 'object' && (
            <div className="card" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.03), transparent)' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
                  <Brain size={16} /> AI Insights
                </h3>
                {doc.aiClassification.confidence != null && (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px' }}>
                    {Math.round(Number(doc.aiClassification.confidence) * 100)}% Confidence
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                {doc.aiClassification.urgency != null && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Urgency</div>
                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{safeStr(doc.aiClassification.urgency)}</div>
                  </div>
                )}
                {doc.aiValidation?.issues?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Validation Issues</div>
                      <div style={{ fontSize: '0.8rem' }}>{doc.aiValidation.issues.join(', ')}</div>
                    </div>
                  </div>
                )}
                {doc.aiValidation?.missingFields?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', color: '#f59e0b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    ⚠️ Missing fields: {doc.aiValidation.missingFields.join(', ')}
                  </div>
                )}
                {doc.aiExtractedMetadata && Object.keys(doc.aiExtractedMetadata).length > 0 && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Extracted Entities</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {Object.entries(doc.aiExtractedMetadata)
                        .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v) && !(typeof v === 'object'))
                        .map(([k, v]) => (
                        <span key={k} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          <strong style={{ color: 'var(--text-muted)' }}>{k}:</strong> {safeStr(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Audit Trail / Timeline */}
          <div className="card">
            <div className="card-header" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="card-title">📋 Audit Trail</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.auditLog.length} entries</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleVerify} 
                disabled={verifying}
                style={{ height: '28px', padding: '0 8px', fontSize: '0.75rem' }}
              >
                {verifying ? 'Verifying...' : <><Lock size={12} style={{ marginRight: '4px' }} /> Verify Integrity</>}
              </button>
            </div>
            
            {verifyResult && (
              <div style={{ 
                marginBottom: '1rem', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                background: verifyResult.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${verifyResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: verifyResult.valid ? '#059669' : '#dc2626'
              }}>
                {verifyResult.valid ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
                    {verifyResult.valid ? 'Cryptographically Verified' : 'Integrity Compromised'}
                  </strong>
                  {verifyResult.valid 
                    ? 'The audit log chain is intact and untampered.'
                    : `Tampering detected at log index ${verifyResult.brokenAtIndex}. The hash chain is broken.`}
                </div>
              </div>
            )}
            <div className="timeline">
              {[...doc.auditLog].reverse().map((log, i) => (
                <div className="timeline-item" key={i}>
                  <div className={`timeline-dot ${log.action?.toLowerCase()}`} style={{ background: ACTION_COLORS[log.action] || 'var(--primary)' }}></div>
                  <div className="timeline-content">
                    <div className="timeline-action" style={{ color: ACTION_COLORS[log.action] || 'var(--primary)' }}>
                      {log.action}
                    </div>
                    <div className="timeline-user">
                      {log.performedBy?.name || 'System'}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}> · {log.performedBy?.role}</span>
                    </div>
                    {log.comment && <div className="timeline-comment">{log.comment}</div>}
                    {log.metadata && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {log.metadata.trigger && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>
                            <Network size={10} style={{ marginRight: '3px', verticalAlign: '-1px' }}/> 
                            Auto-Routed
                          </span>
                        )}
                        {log.metadata.slaHours && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>
                            <Clock size={10} style={{ marginRight: '3px', verticalAlign: '-1px' }}/> 
                            SLA: {log.metadata.slaHours}h
                          </span>
                        )}
                      </div>
                    )}
                    <div className="timeline-time">
                      {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy · h:mm a') : '—'}
                      {log.hash && <span title={log.hash} style={{ marginLeft: '6px', fontSize: '0.6rem', color: 'var(--border)' }}>🔗</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* QR Code */}
          {showQR && (
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 className="card-title" style={{ marginBottom: '1rem', textAlign: 'left' }}>QR Code</h3>
              <div className="qr-wrapper" style={{ display: 'inline-block' }}>
                <QRCode
                  id="qr-code-canvas"
                  value={`${window.location.origin}/track/${doc.uniqueId}`}
                  size={160}
                />
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const canvas = document.getElementById('qr-code-canvas');
                  if (!canvas) { toast.error('QR code not ready yet'); return; }
                  // react-qr-code renders an svg by default, we need to convert it or just rely on standard browser download
                  // For SVG:
                  const svgData = new XMLSerializer().serializeToString(canvas);
                  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                  const svgUrl = URL.createObjectURL(svgBlob);
                  let downloadLink = document.createElement('a');
                  downloadLink.href = svgUrl;
                  downloadLink.download = `${doc.uniqueId}-QR.svg`;
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                }}>
                  Download QR Code
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Scan to access document directly
              </p>
            </div>
          )}

          {/* Document Info */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>Document Details</h3>
            {[
              { label: 'Uploaded By', value: doc.uploadedBy?.name, sub: doc.uploadedBy?.department, icon: <User size={14} /> },
              { label: 'Department', value: doc.department, icon: <Shield size={14} /> },
              { label: 'Workflow Type', value: doc.workflowType?.replace(/-/g, ' '), icon: <ChevronRight size={14} /> },
              { label: 'File Name', value: doc.fileName, icon: <FileText size={14} /> },
              { label: 'Uploaded', value: format(new Date(doc.createdAt), 'MMM d, yyyy'), icon: <Clock size={14} /> },
              ...(doc.deadline ? [{ label: 'Deadline', value: format(new Date(doc.deadline), 'MMM d, yyyy'), icon: <Calendar size={14} /> }] : []),
              ...(doc.currentHolder ? [{ label: 'Current Holder', value: doc.currentHolder?.name, icon: <User size={14} /> }] : []),
              ...(doc.assignedTo ? [{ label: 'Assigned To', value: doc.assignedTo?.name, icon: <Network size={14} /> }] : []),
            ].map(({ label, value, sub, icon }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingBottom: '0.85rem', marginBottom: '0.85rem', borderBottom: i < 6 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.1rem', flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value || '—'}</div>
                  {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
                </div>
              </div>
            ))}

            {/* Tags */}
            {doc.tags?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Tag size={12} /> Tags
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {doc.tags.map((tag, i) => (
                    <span key={i} style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {doc.description && (
            <div className="card">
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Description</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{doc.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Modals */}
      {actionModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setActionModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {actionModal === 'approve' ? '✅ Approve Document' :
                 actionModal === 'reject' ? '❌ Reject Document' : '⚠️ Escalate Document'}
              </h3>
              <button className="modal-close" onClick={() => setActionModal(null)}><X size={20} /></button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{doc.title}</strong>
              {actionModal === 'approve' && ' will be marked as approved and the uploader will be notified.'}
              {actionModal === 'reject' && ' will be rejected. This action is logged in the audit trail.'}
              {actionModal === 'escalate' && ' will be escalated to senior management for review.'}
            </p>

            {actionModal === 'reject' && (
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <input type="text" className="form-control" placeholder="e.g. Missing signatures, incomplete data..."
                  value={actionForm.reason} onChange={e => setActionForm(p => ({ ...p, reason: e.target.value }))} required />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Comment {actionModal !== 'approve' ? '' : '(optional)'}</label>
              <textarea className="form-control" placeholder="Add a note..."
                value={actionForm.comment} onChange={e => setActionForm(p => ({ ...p, comment: e.target.value }))}
                rows={3} />
            </div>

            {actionModal === 'approve' && user.role === 'administration' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Upload Approved Document (Optional)</label>
                <input type="file" className="form-control" onChange={e => setActionForm(p => ({ ...p, file: e.target.files[0] }))} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActionModal(null)} disabled={processing}>Cancel</button>
              <button
                className={`btn ${actionModal === 'approve' ? 'btn-success' : actionModal === 'reject' ? 'btn-danger' : 'btn-warning'}`}
                onClick={() => handleAction(actionModal)}
                disabled={processing || (actionModal === 'reject' && !actionForm.reason)}
              >
                {processing ? <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span> Processing...</> :
                 actionModal === 'approve' ? 'Approve' : actionModal === 'reject' ? 'Reject' : 'Escalate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetail;
