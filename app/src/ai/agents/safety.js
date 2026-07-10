/**
 * Safety & Approval Agent
 * Final gatekeeper. Ensures no customer-facing messages are sent automatically.
 * Routes dangerous actions to the Approval Queue.
 */

import { create as createApproval } from '../../services/data/approvals-service.js';
import { create as createAudit } from '../../services/data/audit-service.js';

export async function evaluate(officeResult) {
  const executed = [...(officeResult.executed || [])];
  const needsApproval = [];
  
  // Look through the pending approvals proposed by the specialist agents
  // and formally persist them to the approvals database.
  if (officeResult.needsApproval && officeResult.needsApproval.length > 0) {
    for (const action of officeResult.needsApproval) {
      
      // Save it to IndexedDB
      const approvalId = await createApproval({
        actionType: action.actionType,
        entityType: action.entityType,
        entityId: action.entityId,
        proposedAction: action.proposedAction,
        riskLevel: action.riskLevel || 'medium',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      // Add the ID to the card so the UI can approve/reject it later
      const approvalCard = {
        ...action,
        id: approvalId
      };
      
      needsApproval.push(approvalCard);
      
      await createAudit({
        action: 'approval_requested',
        entityType: 'approval',
        entityId: approvalId,
        details: { message: `Requested approval for: ${action.actionType}` },
        beforeData: null,
        afterData: action.proposedAction,
        source: 'ai',
        riskLevel: action.riskLevel || 'medium',
        approvalStatus: 'pending',
        timestamp: new Date().toISOString()
      });
    }
  }

  return {
    executed,
    needsApproval
  };
}
