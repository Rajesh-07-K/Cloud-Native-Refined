const crypto = require('crypto');

/**
 * Generates a SHA-256 hash for an audit log entry.
 * @param {Object} entry - The audit log entry (excluding hash fields).
 * @param {string} prevHash - The hash of the previous audit log entry.
 * @returns {string} - The SHA-256 hash.
 */
function generateHash(entry, prevHash) {
  // Extract only the specific fields required for hashing to ensure deterministic behavior.
  // Note: performedBy might be an ObjectId, so we convert it to string.
  // timestamp might be a Date object, convert to ISO string if it is.
  const hashInput = {
    action: entry.action,
    performedBy: entry.performedBy ? entry.performedBy.toString() : null,
    comment: entry.comment || '',
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : (entry.timestamp || new Date().toISOString()),
    fromStatus: entry.fromStatus || null,
    toStatus: entry.toStatus || null
  };

  const payload = prevHash + JSON.stringify(hashInput);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Chains a new audit entry to an existing audit log.
 * @param {Array} auditLog - The current audit log array.
 * @param {Object} newEntry - The new audit entry to be added.
 * @returns {Object} - The enriched entry with prevHash and hash.
 */
function chainAuditEntry(auditLog, newEntry) {
  let prevHash = 'GENESIS';
  
  if (auditLog && auditLog.length > 0) {
    const lastEntry = auditLog[auditLog.length - 1];
    if (lastEntry.hash) {
      prevHash = lastEntry.hash;
    } else {
        // Handle legacy unhashed entry gracefully - we just chain from it as if its hash is empty
        prevHash = 'LEGACY_UNHASHED'; 
    }
  }

  // Ensure timestamp exists for hashing
  if (!newEntry.timestamp) {
    newEntry.timestamp = new Date();
  }

  const hash = generateHash(newEntry, prevHash);
  
  return {
    ...newEntry,
    prevHash,
    hash
  };
}

/**
 * Verifies the integrity of an entire audit log chain.
 * @param {Array} auditLog - The audit log array to verify.
 * @returns {Object} - { valid: true } or { valid: false, brokenAtIndex: N }
 */
function verifyAuditChain(auditLog) {
  if (!auditLog || auditLog.length === 0) {
    return { valid: true };
  }

  let expectedPrevHash = 'GENESIS';

  for (let i = 0; i < auditLog.length; i++) {
    const entry = auditLog[i];

    // Skip verification for legacy entries that don't have hashes,
    // but update expectedPrevHash for the next entry if possible.
    if (!entry.hash && !entry.prevHash) {
        expectedPrevHash = 'LEGACY_UNHASHED';
        continue;
    }

    if (entry.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtIndex: i };
    }

    const recomputedHash = generateHash(entry, entry.prevHash);

    if (entry.hash !== recomputedHash) {
      return { valid: false, brokenAtIndex: i };
    }

    expectedPrevHash = entry.hash;
  }

  return { valid: true };
}

module.exports = {
  generateHash,
  chainAuditEntry,
  verifyAuditChain
};
