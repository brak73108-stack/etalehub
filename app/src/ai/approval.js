/**
 * @fileoverview Approval Queue Manager for EtaleHub AI
 *
 * Manages the queue of actions that require user approval before execution.
 * Every customer-facing action goes through this queue — no exceptions.
 *
 * @module approval
 */

import { getAuditLog } from './agents/safety.js';

// ─── In-memory approval queue ───────────────────────────────────────────────

/**
 * Pending approval records.
 * In production this would be backed by a database table.
 * @type {Map<string, Object>}
 */
const pendingApprovals = new Map();

/**
 * History of resolved (approved/rejected) approvals.
 * @type {Array<Object>}
 */
const resolvedApprovals = [];

// ─── ID generator ───────────────────────────────────────────────────────────

let _approvalCounter = 0;

/**
 * @returns {string}
 */
function generateApprovalId() {
  _approvalCounter += 1;
  return `appr_${Date.now()}_${_approvalCounter}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Add an action to the approval queue.
 *
 * @param {Object} action — the action awaiting approval
 * @param {string} action.type
 * @param {string} action.description
 * @param {Object} [action.data]
 * @returns {Object} the approval record
 */
export function queueForApproval(action) {
  const id = action.approvalId || generateApprovalId();
  const record = {
    id,
    actionId: action.id || null,
    type: action.type,
    description: action.description,
    data: action.data || {},
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  };

  pendingApprovals.set(id, record);
  return record;
}

/**
 * Get all pending approval records.
 *
 * @returns {Array<Object>}
 */
export function getPendingApprovals() {
  return Array.from(pendingApprovals.values()).filter(
    record => record.status === 'pending'
  );
}

/**
 * Approve an action — marks it as approved, moves it to resolved,
 * and returns the action data for execution.
 *
 * @param {string} id — approval record ID
 * @param {string} [approvedBy='user'] — who approved
 * @returns {Promise<Object>} the resolved record
 * @throws {Error} if the approval ID is not found or already resolved
 */
export async function approveAction(id, approvedBy = 'user') {
  const record = pendingApprovals.get(id);
  if (!record) {
    throw new Error(`Approval record "${id}" not found.`);
  }
  if (record.status !== 'pending') {
    throw new Error(`Approval "${id}" has already been ${record.status}.`);
  }

  record.status = 'approved';
  record.resolvedAt = new Date().toISOString();
  record.resolvedBy = approvedBy;

  // Move to resolved history
  pendingApprovals.delete(id);
  resolvedApprovals.push(record);

  // Create an audit entry for the approval
  try {
    // Attempt to log to the safety agent's audit
    const { createAuditEntry } = await import('./agents/safety.js');
    if (typeof createAuditEntry === 'function') {
      createAuditEntry(
        { id: record.actionId, type: record.type, description: record.description, data: record.data },
        'approved'
      );
    }
  } catch {
    // Safety module may not export createAuditEntry directly — that's fine.
    // The approval is still recorded in resolvedApprovals.
  }

  // TODO: Execute the actual action here once agents are wired up
  // e.g. await executeAction(record.type, record.data);

  return record;
}

/**
 * Reject an action — marks it as rejected and logs the rejection.
 *
 * @param {string} id — approval record ID
 * @param {string} [rejectedBy='user'] — who rejected
 * @param {string} [reason=''] — rejection reason
 * @returns {Promise<Object>} the resolved record
 * @throws {Error} if the approval ID is not found or already resolved
 */
export async function rejectAction(id, rejectedBy = 'user', reason = '') {
  const record = pendingApprovals.get(id);
  if (!record) {
    throw new Error(`Approval record "${id}" not found.`);
  }
  if (record.status !== 'pending') {
    throw new Error(`Approval "${id}" has already been ${record.status}.`);
  }

  record.status = 'rejected';
  record.resolvedAt = new Date().toISOString();
  record.resolvedBy = rejectedBy;
  record.rejectionReason = reason;

  // Move to resolved history
  pendingApprovals.delete(id);
  resolvedApprovals.push(record);

  // Create an audit entry for the rejection
  try {
    const { createAuditEntry } = await import('./agents/safety.js');
    if (typeof createAuditEntry === 'function') {
      createAuditEntry(
        { id: record.actionId, type: record.type, description: record.description, data: record.data },
        'rejected'
      );
    }
  } catch {
    // Audit logging is best-effort
  }

  return record;
}

/**
 * Get the count of pending approvals.
 * @returns {number}
 */
export function getApprovalCount() {
  return getPendingApprovals().length;
}

/**
 * Get the full approval history (resolved items).
 * @returns {Array<Object>}
 */
export function getApprovalHistory() {
  return [...resolvedApprovals];
}

/**
 * Get a specific approval record by ID (pending or resolved).
 * @param {string} id
 * @returns {Object|null}
 */
export function getApproval(id) {
  if (pendingApprovals.has(id)) return pendingApprovals.get(id);
  return resolvedApprovals.find(r => r.id === id) || null;
}

export default {
  queueForApproval,
  getPendingApprovals,
  approveAction,
  rejectAction,
  getApprovalCount,
  getApprovalHistory,
  getApproval,
};
