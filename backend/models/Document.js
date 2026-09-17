const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['UPLOADED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ESCALATED', 'VIEWED', 'DOWNLOADED', 'REASSIGNED', 'COMMENTED', 'DEADLINE_CHANGED']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  fromStatus: String,
  toStatus: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  hash: {
    type: String,
    default: ''
  },
  prevHash: {
    type: String,
    default: ''
  }
});

const documentSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    unique: true,
    default: () => `DOC-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`
  },
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: [
      'Computer Science',
      'Information Technology',
      'Electronics',
      'Mechanical',
      'Civil',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Administration',
      'Library'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  workflowType: {
    type: String,
    required: [true, 'Workflow type is required'],
    enum: ['standard', 'fast-track', 'multi-level', 'board-approval']
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'under_review', 'approved', 'rejected', 'escalated', 'archived'],
    default: 'draft'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentHolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tags: [{ type: String, trim: true }],
  fileUrl: {
    type: String,
    default: ''
  },
  fileName: { type: String, default: 'Request Letter (No Attachment)' },
  fileSize: { type: Number, default: 0 },
  fileType: { type: String, default: '' },
  approvedFileUrl: { type: String, default: '' },
  approvedFileName: { type: String, default: '' },
  qrCode: { type: String, default: '' },
  deadline: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  workflowStep: { type: Number, default: 0 },
  totalWorkflowSteps: { type: Number, default: 1 },
  auditLog: [auditLogSchema],
  isConfidential: { type: Boolean, default: false },
  version: { type: Number, default: 1 },
  aiClassification: {
    documentType: String,
    suggestedDepartment: String,
    urgency: { type: String, enum: ['low','normal','high'] },
    confidence: Number
  },
  aiExtractedMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  aiValidation: {
    isValid: Boolean,
    missingFields: [String],
    missingSignature: Boolean,
    issues: [String]
  },
  aiProcessedAt: Date
}, { timestamps: true });

// Text search index
documentSchema.index({ title: 'text', description: 'text', uniqueId: 'text' });
documentSchema.index({ status: 1, department: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Document', documentSchema);
