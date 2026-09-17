const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApproverHierarchy = require('../models/ApproverHierarchy');
const { chainAuditEntry } = require('../utils/auditHash');

const createNotification = async (recipientId, type, title, message, documentId) => {
  try {
    await Notification.create({ recipient: recipientId, type, title, message, document: documentId });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

/**
 * Reusable escalation function.
 * Handles both manual escalation (from a user) and auto-SLA escalation (from cron).
 * @param {String} documentId - Document ID to escalate
 * @param {Object} performedByUserId - User ID performing the action (system admin for auto)
 * @param {String} comment - Escalation comment
 * @param {Object} metadata - Optional metadata (e.g. { trigger: 'auto-sla-breach' })
 */
const escalateDocument = async (documentId, performedByUserId, comment, metadata = {}) => {
  const doc = await Document.findById(documentId).populate('uploadedBy', 'name email');
  if (!doc) throw new Error('Document not found');
  
  if (!['pending', 'under_review'].includes(doc.status) && doc.status !== 'escalated') {
    throw new Error('Document cannot be escalated in its current state');
  }

  const prevStatus = doc.status;
  doc.status = 'escalated';

  let newAssigneeId = null;

  // Auto-SLA escalation specific logic
  if (metadata.trigger === 'auto-sla-breach') {
    // 1. Determine current role
    // For this, we need to know what role it's currently sitting at.
    // We can guess it from the current workflow step, or current assignee's role.
    let currentRole = null;
    if (doc.assignedTo) {
      const currentAssignee = await User.findById(doc.assignedTo);
      if (currentAssignee) {
        currentRole = currentAssignee.role;
      }
    }

    if (!currentRole) {
      // Fallback to workflow definition
      const { getNextRole } = require('./routingService');
      currentRole = getNextRole(doc.workflowStep, doc.workflowType);
    }

    if (currentRole) {
      // 2. Find ApproverHierarchy entry
      const hierarchy = await ApproverHierarchy.findOne({ department: doc.department });
      if (hierarchy) {
        const chainEntry = hierarchy.chain.find(c => c.role === currentRole);
        if (chainEntry && chainEntry.fallbackUserId) {
          // 3 & 4. Reassign to fallbackUserId
          doc.assignedTo = chainEntry.fallbackUserId;
          newAssigneeId = chainEntry.fallbackUserId;
          metadata.previousAssignee = doc.assignedTo ? doc.assignedTo.toString() : 'none';
          metadata.newAssignee = newAssigneeId.toString();
        }
      }
    }
  }

  doc.auditLog.push(chainAuditEntry(doc.auditLog, {
    action: 'ESCALATED',
    performedBy: performedByUserId,
    comment: comment || 'Escalated for senior review',
    fromStatus: prevStatus,
    toStatus: 'escalated',
    metadata
  }));

  await doc.save();

  // Notify new assignee if auto-escalated, otherwise notify all admins
  if (newAssigneeId) {
    await createNotification(
      newAssigneeId,
      'escalated',
      'SLA Breach Escalation',
      `"${doc.title}" has breached SLA and has been automatically escalated to you.`,
      doc._id
    );
  } else {
    // Standard manual escalation behavior - notify administration users
    const admins = await User.find({ role: 'administration', isActive: true });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'escalated',
        'Document Escalated',
        `"${doc.title}" has been escalated and requires administration attention.`,
        doc._id
      );
    }
  }

  return doc;
};

module.exports = {
  escalateDocument
};
