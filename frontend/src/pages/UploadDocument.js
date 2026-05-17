import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, FileText, X, Calendar, Tag, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics',
  'Mechanical', 'Civil', 'Mathematics', 'Physics', 'Chemistry',
  'Administration', 'Library'
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const WORKFLOWS = [
  { value: 'fast-track', label: 'Fast Track', desc: 'Single approval – 24hrs SLA', icon: '⚡' },
  { value: 'standard', label: 'Standard', desc: 'Two-level approval – 72hrs SLA', icon: '📋' },
  { value: 'multi-level', label: 'Multi-Level', desc: 'Three-step chain – 120hrs SLA', icon: '🔗' },
  { value: 'board-approval', label: 'Board Approval', desc: 'Full board sign-off – 168hrs SLA', icon: '🏛️' },
];

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const UploadDocument = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragover, setDragover] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', department: user?.department || 'Computer Science',
    priority: 'medium', workflowType: 'standard', deadline: '', isConfidential: false, tags: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Document title is required');

    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    if (file) fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    try {
      const res = await axios.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      toast.success('Document uploaded successfully! 🎉');
      navigate(`/documents/${res.data.document._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <h2>Request / Upload Document</h2>
          <p>Submit a formal request or a document. It will receive a unique ID and route to appropriate approvers.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Main Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* File Drop Zone */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 className="card-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} /> Attach File <span style={{fontSize: '0.8rem', color:'var(--text-muted)'}}>(Optional)</span>
              </h3>
              {!file ? (
                <div
                  className={`upload-zone ${dragover ? 'dragover' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                  onDragLeave={() => setDragover(false)}
                  onDrop={handleFileDrop}
                >
                  <div className="upload-icon">
                    <Upload size={28} />
                  </div>
                  <h3>Drop your file here or click to browse</h3>
                  <p>Drag and drop to upload instantly</p>
                  <p className="file-types">PDF, Word, Excel, PowerPoint, Images, TXT, CSV · Max 10MB</p>
                </div>
              ) : (
                <div>
                  <div className="file-preview">
                    <div className="file-preview-icon">
                      <FileText size={20} />
                    </div>
                    <div className="file-preview-info">
                      <div className="file-preview-name">{file.name}</div>
                      <div className="file-preview-size">{formatBytes(file.size)}</div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFile(null)}>
                      <X size={14} />
                    </button>
                  </div>
                  {uploading && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <span>Uploading...</span><span>{uploadProgress}%</span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileDrop}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv" />
            </div>

            {/* Document Info */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} /> Document Information
              </h3>

              <div className="form-group">
                <label className="form-label">Document Title *</label>
                <input type="text" name="title" className="form-control" placeholder="e.g. Q4 Budget Approval Request"
                  value={form.title} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea name="description" className="form-control" rows={3}
                  placeholder="Brief description of the document purpose and contents..."
                  value={form.description} onChange={handleChange} />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select name="department" className="form-control" value={form.department} onChange={handleChange}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority *</label>
                  <select name="priority" className="form-control" value={form.priority} onChange={handleChange}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <div className="form-control-icon">
                    <Calendar className="icon" size={16} />
                    <input type="date" name="deadline" className="form-control" value={form.deadline} onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <div className="form-control-icon">
                    <Tag className="icon" size={16} />
                    <input type="text" name="tags" className="form-control" placeholder="finance, q4, budget"
                      value={form.tags} onChange={handleChange} />
                  </div>
                  <span className="form-hint">Comma-separated tags</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <input type="checkbox" id="isConfidential" name="isConfidential"
                  checked={form.isConfidential} onChange={handleChange}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                <label htmlFor="isConfidential" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  <span style={{ marginRight: '0.5rem' }}>🔒</span> Mark as Confidential
                </label>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Workflow Selector */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>Workflow Type</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {WORKFLOWS.map(wf => (
                  <div
                    key={wf.value}
                    onClick={() => setForm(p => ({ ...p, workflowType: wf.value }))}
                    style={{
                      padding: '0.9rem',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${form.workflowType === wf.value ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.workflowType === wf.value ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{wf.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{wf.label}</span>
                      {form.workflowType === wf.value && <CheckCircle size={14} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.7rem' }}>{wf.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Box */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>Ready to Submit?</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} /> Unique document ID generated
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} /> QR code created automatically
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} /> Approvers notified instantly
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} style={{ color: 'var(--success)' }} /> Immutable audit trail started
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={uploading}>
                {uploading ? (
                  <><Loader size={16} className="spin" /> Uploading {uploadProgress}%</>
                ) : (
                  <><Upload size={16} /> Submit Request</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UploadDocument;
