const express = require('express');
const User = require('../models/User');
const Document = require('../models/Document');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get system analytics
// @access  Administration
router.get('/stats', protect, authorize('administration'), async (req, res) => {
  try {
    const [
      totalUsers, totalDocuments,
      pendingDocs, approvedDocs, rejectedDocs, escalatedDocs,
      usersByRole, docsByDepartment, docsByPriority, recentDocs
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Document.countDocuments(),
      Document.countDocuments({ status: 'pending' }),
      Document.countDocuments({ status: 'approved' }),
      Document.countDocuments({ status: 'rejected' }),
      Document.countDocuments({ status: 'escalated' }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Document.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
      Document.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Document.find().populate('uploadedBy', 'name').sort({ createdAt: -1 }).limit(5)
    ]);

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentActivity = await Document.countDocuments({ createdAt: { $gte: last30Days } });

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, byRole: usersByRole },
        documents: {
          total: totalDocuments, pending: pendingDocs, approved: approvedDocs,
          rejected: rejectedDocs, escalated: escalatedDocs, recentActivity,
          byDepartment: docsByDepartment, byPriority: docsByPriority
        },
        recentDocuments: recentDocs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Administration
router.get('/users', protect, authorize('administration'), async (req, res) => {
  try {
    const { role, department, search, page = 1, limit = 20 } = req.query;
    let query = {};
    if (role && role !== 'all') query.role = role;
    if (department && department !== 'all') query.department = department;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

    res.json({ success: true, users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user role/status
// @access  Administration
router.put('/users/:id', protect, authorize('administration'), async (req, res) => {
  try {
    const { role, department, isActive } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (department) updates.department = department;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, message: 'User updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Deactivate user
// @access  Administration
router.delete('/users/:id', protect, authorize('administration'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User deactivated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/documents
// @desc    Get all documents (admin view)
// @access  Administration
router.get('/documents', protect, authorize('administration'), async (req, res) => {
  try {
    const { status, department, search, page = 1, limit = 15 } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (department && department !== 'all') query.department = department;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email department')
      .populate('currentHolder', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, documents, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
