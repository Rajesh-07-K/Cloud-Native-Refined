const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get users list (for assignment dropdown)
// @access  Private (Manager, Admin)
router.get('/', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { role, department } = req.query;
    const query = { isActive: true };
    if (role) query.role = role;
    if (department) query.department = department;
    const users = await User.find(query).select('name email role department').sort({ name: 1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/profile
// @desc    Update own profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, department } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (department) updates.department = department;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
