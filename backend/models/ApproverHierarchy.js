const mongoose = require('mongoose');

const approverHierarchySchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    unique: true,
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
  chain: [
    {
      role: {
        type: String,
        required: true,
        enum: ['mentor', 'hod', 'administration']
      },
      fallbackUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      maxHoldHours: {
        type: Number,
        required: true,
        default: 24
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('ApproverHierarchy', approverHierarchySchema);
