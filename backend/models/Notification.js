const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['approval_request', 'approved', 'rejected', 'escalated', 'deadline_warning', 'new_document', 'comment', 'reassigned'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
