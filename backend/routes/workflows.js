const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

const workflowRules = require('../config/workflowRules');

// @route   GET /api/workflows/rules
// @desc    Get all workflow rules
// @access  Private
router.get('/rules', protect, async (req, res) => {
  res.json({ success: true, workflows: workflowRules });
});

module.exports = router;
