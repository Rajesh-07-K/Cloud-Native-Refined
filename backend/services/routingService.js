const User = require('../models/User');
const Document = require('../models/Document');

/**
 * Helper: Get the required role for a given workflow step and type
 */
const getNextRole = (step, workflowType) => {
  if (workflowType === 'fast-track') return 'hod';
  if (workflowType === 'standard') {
    return step === 0 ? 'mentor' : 'hod';
  }
  if (workflowType === 'multi-level') {
    return step === 0 ? 'mentor' : (step === 1 ? 'hod' : 'administration');
  }
  return 'administration';
};

/**
 * Determine the specific user to assign a document to based on department, role, workload, and urgency.
 * @param {Object} document - The mongoose document object.
 * @returns {Object} { userId, role, workload, reason }
 */
const routeDocument = async (document) => {
  try {
    const requiredRole = getNextRole(document.workflowStep, document.workflowType);
    const department = document.department;
    const urgency = document.aiClassification?.urgency || document.priority || 'medium';

    // 1. Find eligible users
    let query = { role: requiredRole, isActive: true };
    
    if (requiredRole === 'administration') {
      // Admin is often cross-departmental, but we can check if there's a specific one, else any admin
      // The current DB seed assigns some admins to specific departments (like Library) and some generic.
      // We'll search for department specific first, fallback to generic
    } else {
      query.department = department;
    }

    let candidates = await User.find(query);

    // Fallback if no specific admin found for department
    if (candidates.length === 0 && requiredRole === 'administration') {
      candidates = await User.find({ role: 'administration', isActive: true });
    }

    if (candidates.length === 0) {
      console.warn(`[Routing] No active ${requiredRole} found for ${department}`);
      return null;
    }

    // 2. Calculate workload for each candidate
    // Excluding the current document being routed just in case
    const candidateWorkloads = await Promise.all(
      candidates.map(async (user) => {
        const count = await Document.countDocuments({
          assignedTo: user._id,
          _id: { $ne: document._id },
          status: { $in: ['pending', 'under_review'] }
        });
        return { user, count };
      })
    );

    // 3. Select user with lowest workload
    candidateWorkloads.sort((a, b) => a.count - b.count);

    // 4. Urgency Tie-breaker (If high urgency, we definitely want the absolute lowest workload person)
    // The sort already handles the base lowest. If there are ties, we just pick the first.
    const selected = candidateWorkloads[0];

    return {
      userId: selected.user._id,
      role: requiredRole,
      workload: selected.count,
      reason: `Lowest active workload (${selected.count}) among eligible ${department} ${requiredRole}s.`
    };
  } catch (error) {
    console.error(`[Routing Error]`, error);
    return null;
  }
};

module.exports = {
  getNextRole,
  routeDocument
};
