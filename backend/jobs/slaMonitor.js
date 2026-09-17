const cron = require('node-cron');
const Document = require('../models/Document');
const User = require('../models/User');
const { escalateDocument } = require('../services/escalationService');
const workflowRules = require('../config/workflowRules');

let monitorTask = null;

const runSlaMonitorOnce = async () => {
  try {
    console.log('[SLA Monitor] Starting SLA check...');
    
    const activeDocuments = await Document.find({
      status: { $in: ['pending', 'under_review'] }
    });

    if (activeDocuments.length === 0) {
      console.log('[SLA Monitor] No active documents to check.');
      return;
    }

    // Get the system actor for audit logging
    const systemAdmin = await User.findOne({ email: 'admin@college.edu' });
    if (!systemAdmin) {
      console.warn('[SLA Monitor] System admin (admin@college.edu) not found for audit logging.');
      return;
    }

    for (const doc of activeDocuments) {
      // 1. Determine SLA
      const rule = workflowRules[doc.workflowType];
      if (!rule) continue;
      const slaHours = rule.sla;

      // 2. Determine start timestamp
      // Usually, it's the last time it entered this status. 
      // We look for the most recent log where `toStatus` equals `doc.status`.
      const relevantLogs = [...doc.auditLog]
        .filter(log => log.toStatus === doc.status)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      const startTime = relevantLogs.length > 0 ? relevantLogs[0].timestamp : doc.updatedAt;

      // 3. Calculate elapsed hours
      const elapsedMs = Date.now() - new Date(startTime).getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      // 4. Compare
      if (elapsedHours > slaHours) {
        // 5. Idempotency Check: search entire auditLog
        const alreadyEscalated = doc.auditLog.some(log => 
          log.action === 'ESCALATED' && 
          log.metadata && 
          log.metadata.trigger === 'auto-sla-breach' &&
          log.timestamp > startTime // Ensure it was escalated for THIS particular breach
        );

        if (!alreadyEscalated) {
          console.log(`[SLA Monitor] Escalating document ${doc._id} (elapsed: ${elapsedHours.toFixed(2)}h > SLA: ${slaHours}h)`);
          
          await escalateDocument(
            doc._id, 
            systemAdmin._id, 
            `Auto-escalated due to SLA breach (${elapsedHours.toFixed(2)}h > ${slaHours}h)`, 
            {
              trigger: 'auto-sla-breach',
              workflowType: doc.workflowType,
              slaHours: slaHours
            }
          );
        }
      }
    }
    
    console.log('[SLA Monitor] SLA check complete.');
  } catch (error) {
    console.error('[SLA Monitor] Error during check:', error);
  }
};

const startSlaMonitor = () => {
  if (monitorTask) {
    console.log('[SLA Monitor] Monitor already running.');
    return;
  }

  // Run every 15 minutes
  monitorTask = cron.schedule('*/15 * * * *', () => {
    runSlaMonitorOnce();
  });
  console.log('[SLA Monitor] Scheduled SLA Monitor (*/15 * * * *).');
};

module.exports = {
  runSlaMonitorOnce,
  startSlaMonitor
};
