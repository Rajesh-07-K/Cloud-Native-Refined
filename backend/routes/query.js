const express = require('express');
const axios = require('axios');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

const router = express.Router();

const AI_SERVICE_BASE = `http://localhost:${process.env.AI_SERVICE_PORT || 8000}`;

/**
 * Build a MongoDB query for the authenticated user's accessible documents,
 * matching a text search term (question keywords).
 * Mirrors the access rules from GET /api/documents.
 */
const buildStatusLookupQuery = (user, searchText) => {
  let base = {};

  if (user.role === 'student') {
    base.uploadedBy = user._id;
  } else if (user.role === 'mentor' || user.role === 'hod') {
    base.$or = [
      { department: user.department },
      { assignedTo: user._id },
      { currentHolder: user._id }
    ];
  }
  // administration: no base filter — can see all

  if (searchText && searchText.trim()) {
    // Use MongoDB text index (title + description + uniqueId)
    base.$text = { $search: searchText.trim() };
  }

  return base;
};

/**
 * @swagger
 * /api/query/ask:
 *   post:
 *     summary: Ask the AI agent a question about documents
 *     tags: [Query]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI answer with source documents
 */
router.post('/ask', protect, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    // ── Step 1: Pre-fetch MongoDB document context for STATUS queries ──────────
    // We always attempt a lookup so the AI service has context without hitting MongoDB itself.
    // The AI classifies the query first, so having context available doesn't hurt.
    const statusQuery = buildStatusLookupQuery(req.user, question);
    let statusContext = [];

    try {
      const docs = await Document.find(statusQuery)
        .limit(5)
        .populate('assignedTo', 'name email role')
        .populate('currentHolder', 'name email role')
        .populate('uploadedBy', 'name email')
        .select('uniqueId title status department workflowStep totalWorkflowSteps deadline assignedTo currentHolder aiClassification uploadedBy');

      statusContext = docs.map(d => ({
        _id: d._id.toString(),
        uniqueId: d.uniqueId,
        title: d.title,
        status: d.status,
        department: d.department,
        workflowStep: d.workflowStep,
        totalWorkflowSteps: d.totalWorkflowSteps,
        deadline: d.deadline ? d.deadline.toISOString() : null,
        assignedTo: d.assignedTo ? { name: d.assignedTo.name, role: d.assignedTo.role } : null,
        currentHolder: d.currentHolder ? { name: d.currentHolder.name, role: d.currentHolder.role } : null,
        aiClassification: d.aiClassification || {}
      }));
    } catch (lookupErr) {
      console.warn('[Query] Status lookup failed (non-fatal):', lookupErr.message);
    }

    // ── Step 2: Forward to AI service ─────────────────────────────────────────
    const aiPayload = {
      question: question.trim(),
      user_id: req.user._id.toString(),
      user_role: req.user.role,
      user_department: req.user.department || '',
      status_context: statusContext
    };

    const aiResponse = await axios.post(`${AI_SERVICE_BASE}/query/ask`, aiPayload, {
      timeout: 30000 // 30s — LLM inference can be slow
    });

    const { answer, source_documents, query_type } = aiResponse.data;

    res.json({
      success: true,
      answer,
      sourceDocuments: source_documents || [],
      queryType: query_type
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return res.status(503).json({
        success: false,
        message: 'The AI service is currently unavailable. Please try again later.',
        answer: 'The AI service is currently unavailable. Your status queries can still be made directly from the Documents page.'
      });
    }
    console.error('[Query] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
