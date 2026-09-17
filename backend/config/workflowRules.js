const workflowRules = {
  'standard': {
    name: 'Standard Approval',
    steps: 2,
    description: 'Two-level approval: Manager then Admin',
    approvers: ['manager', 'admin'],
    sla: 72 // hours
  },
  'fast-track': {
    name: 'Fast Track',
    steps: 1,
    description: 'Single manager approval',
    approvers: ['manager'],
    sla: 24
  },
  'multi-level': {
    name: 'Multi-Level',
    steps: 3,
    description: 'Three-level: Manager → Senior Manager → Admin',
    approvers: ['manager', 'manager', 'admin'],
    sla: 120
  },
  'board-approval': {
    name: 'Board Approval',
    steps: 4,
    description: 'Full board approval chain',
    approvers: ['manager', 'manager', 'admin', 'admin'],
    sla: 168
  }
};

module.exports = workflowRules;
