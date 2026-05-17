const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Helper: create notification
const createNotification = async (recipientId, type, title, message, documentId) => {
  try {
    await Notification.create({ recipient: recipientId, type, title, message, document: documentId });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// Helper: get workflow target roles based on steps
const getNextRole = (step, workflowType) => {
  if (workflowType === 'fast-track') return 'hod'; // Just HOD for quick
  if (workflowType === 'standard') {
    return step === 0 ? 'mentor' : 'hod';
  }
  if (workflowType === 'multi-level') {
    return step === 0 ? 'mentor' : (step === 1 ? 'hod' : 'administration');
  }
  return 'administration'; // default
};

// Helper: get workflow steps count
const getWorkflowSteps = (workflowType) => {
  const steps = { 'standard': 2, 'fast-track': 1, 'multi-level': 3, 'board-approval': 4 };
  return steps[workflowType] || 2;
};

// @route   POST /api/documents/upload
// @desc    Upload a new document
// @access  Private (Student, Mentor, HOD, Administration)
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    // File is now optional for letter requests

    const { title, description, department, priority, workflowType, deadline, isConfidential, tags } = req.body;

    if (!title || !department || !workflowType) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Title, department, and workflow type are required.' });
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const doc = new Document({
      title: title.trim(),
      description: description || '',
      department,
      priority: priority || 'medium',
      workflowType,
      status: 'pending',
      uploadedBy: req.user._id,
      currentHolder: req.user._id,
      fileUrl,
      fileName: req.file ? req.file.originalname : 'Request Letter (No Attachment)',
      fileSize: req.file ? req.file.size : 0,
      fileType: req.file ? req.file.mimetype : 'text/plain',
      deadline: deadline ? new Date(deadline) : null,
      isConfidential: isConfidential === 'true',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      totalWorkflowSteps: getWorkflowSteps(workflowType)
    });

    // Generate QR code
    const qrData = JSON.stringify({
      id: doc.uniqueId,
      title: doc.title,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${doc._id}`
    });
    doc.qrCode = await QRCode.toDataURL(qrData);

    // Add initial audit log
    doc.auditLog.push({
      action: 'UPLOADED',
      performedBy: req.user._id,
      comment: 'Document uploaded and submitted for review',
      fromStatus: null,
      toStatus: 'pending'
    });

    await doc.save();

    // Find the next role in chain (Mentor for most)
    const nextRole = getNextRole(0, doc.workflowType);
    let notifyUsers = await User.find({ role: nextRole, department, isActive: true });
    
    if (notifyUsers.length === 0 && nextRole === 'administration') {
      notifyUsers = await User.find({ role: 'administration', isActive: true });
    }

    for (const user of notifyUsers) {
      await createNotification(
        user._id,
        'approval_request',
        'New Document Pending Approval',
        `"${doc.title}" requires your approval. Priority: ${doc.priority}`,
        doc._id
      );
    }

    const populated = await Document.findById(doc._id)
      .populate('uploadedBy', 'name email role department')
      .populate('currentHolder', 'name email role');

    res.status(201).json({ success: true, message: 'Document uploaded successfully', document: populated });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/documents
// @desc    Get documents (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, department, priority, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (req.user.role === 'student') {
      query.uploadedBy = req.user._id;
    } else if (req.user.role === 'mentor' || req.user.role === 'hod') {
      query.$or = [
        { department: req.user.department },
        { assignedTo: req.user._id },
        { currentHolder: req.user._id }
      ];
    }

    if (status && status !== 'all') query.status = status;
    if (department && department !== 'all') query.department = department;
    if (priority && priority !== 'all') query.priority = priority;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email department')
      .populate('currentHolder', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      documents,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/documents/:id
// @desc    Get single document
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email department role')
      .populate('currentHolder', 'name email role department')
      .populate('assignedTo', 'name email role department')
      .populate('auditLog.performedBy', 'name email role');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Add viewed log
    doc.auditLog.push({
      action: 'VIEWED',
      performedBy: req.user._id,
      comment: `Viewed by ${req.user.name}`,
      fromStatus: doc.status,
      toStatus: doc.status
    });
    await doc.save();

    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/documents/:id/approve
// @desc    Approve a document
// @access  Private (Mentor, HOD, Administration)
router.post('/:id/approve', protect, authorize('mentor', 'hod', 'administration'), async (req, res) => {
  try {
    const { comment } = req.body;
    const doc = await Document.findById(req.params.id).populate('uploadedBy', 'name email');

    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    if (!['pending', 'under_review', 'escalated'].includes(doc.status)) {
      return res.status(400).json({ success: false, message: 'Document cannot be approved in its current state.' });
    }

    const prevStatus = doc.status;
    doc.workflowStep += 1;
    
    if (doc.workflowStep >= doc.totalWorkflowSteps) {
      doc.status = 'approved';
      doc.approvedAt = new Date();
    } else {
      doc.status = 'under_review';
    }

    doc.auditLog.push({
      action: 'APPROVED',
      performedBy: req.user._id,
      comment: comment || 'Approved',
      fromStatus: prevStatus,
      toStatus: doc.status
    });

    await doc.save();

    // Notify uploader
    await createNotification(
      doc.uploadedBy._id,
      'approved',
      doc.status === 'approved' ? 'Document Fully Approved! 🎉' : 'Document Progressed',
      `"${doc.title}" has been ${doc.status === 'approved' ? 'fully approved' : 'approved by ' + req.user.role + ' and progressed'}.`,
      doc._id
    );

    // Notify next person in chain if not fully approved
    if (doc.status !== 'approved') {
      const nextRole = getNextRole(doc.workflowStep, doc.workflowType);
      let nextUsers = await User.find({ role: nextRole, department: doc.department, isActive: true });
      if (nextUsers.length === 0 && nextRole === 'administration') {
        nextUsers = await User.find({ role: 'administration', isActive: true });
      }
      
      for (const user of nextUsers) {
        await createNotification(
          user._id,
          'approval_request',
          'Document Forwarded For Your Approval',
          `"${doc.title}" has been forwarded to you for approval.`,
          doc._id
        );
      }
    }

    res.json({ success: true, message: `Document ${doc.status === 'approved' ? 'fully approved' : 'progressed to next step'}`, document: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/documents/:id/reject
// @desc    Reject a document
// @access  Private (Mentor, HOD, Administration)
router.post('/:id/reject', protect, authorize('mentor', 'hod', 'administration'), async (req, res) => {
  try {
    const { comment, reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required.' });

    const doc = await Document.findById(req.params.id).populate('uploadedBy', 'name email');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    const prevStatus = doc.status;
    doc.status = 'rejected';
    doc.rejectedAt = new Date();
    doc.rejectionReason = reason;

    doc.auditLog.push({
      action: 'REJECTED',
      performedBy: req.user._id,
      comment: comment || reason,
      fromStatus: prevStatus,
      toStatus: 'rejected'
    });

    await doc.save();

    await createNotification(
      doc.uploadedBy._id,
      'rejected',
      'Document Rejected',
      `"${doc.title}" was rejected. Reason: ${reason}`,
      doc._id
    );

    res.json({ success: true, message: 'Document rejected', document: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/documents/:id/escalate
// @desc    Escalate a document
// @access  Private (Mentor, HOD, Administration)
router.post('/:id/escalate', protect, authorize('mentor', 'hod', 'administration'), async (req, res) => {
  try {
    const { comment } = req.body;
    const doc = await Document.findById(req.params.id).populate('uploadedBy', 'name email');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    const prevStatus = doc.status;
    doc.status = 'escalated';

    doc.auditLog.push({
      action: 'ESCALATED',
      performedBy: req.user._id,
      comment: comment || 'Escalated for senior review',
      fromStatus: prevStatus,
      toStatus: 'escalated'
    });

    await doc.save();

    // Notify administrations
    const admins = await User.find({ role: 'administration', isActive: true });
    for (const admin of admins) {
      await createNotification(admin._id, 'escalated', 'Document Escalated', `"${doc.title}" has been escalated and requires administration attention.`, doc._id);
    }

    res.json({ success: true, message: 'Document escalated', document: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/documents/:id/qr
// @desc    Get QR code for a document
// @access  Private
router.get('/:id/qr', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select('qrCode uniqueId title');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    res.json({ success: true, qrCode: doc.qrCode, uniqueId: doc.uniqueId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/documents/track/:uniqueId
// @desc    Track document by unique ID (public QR scan)
// @access  Private
router.get('/track/:uniqueId', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ uniqueId: req.params.uniqueId })
      .populate('uploadedBy', 'name email department')
      .populate('currentHolder', 'name email role')
      .populate('auditLog.performedBy', 'name email role');

    if (!doc) return res.status(404).json({ success: false, message: 'Document not found with that ID.' });
    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
