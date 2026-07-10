/**
 * Office Manager Agent
 * The coordinator. Takes parsed intent/entities from the Router and orchestrates 
 * the specialist agents to perform the actual database operations.
 */

import { execute as executeCustomer } from './customer.js';
import { execute as executeInvoicing } from './invoicing.js';
import { execute as executeReminder } from './reminder.js';
import { execute as executeScheduling } from './scheduling.js';

export async function process(parsedCommand) {
  const { intent, entities, actions } = parsedCommand;
  const executedActions = [];
  const approvalsNeeded = [];
  
  // Try to find the customer first if mentioned
  let customer = null;
  if (entities.customerName) {
    const custResult = await executeCustomer({ action: 'find_customer', entities });
    customer = custResult.customer;
  }
  
  const ctx = { customer, entities };
  
  // Process intents in logical order
  
  // 1. Job Completion
  if (intent.includes('complete_job') && customer) {
    const res = await executeScheduling({ action: 'complete_job', ctx });
    if (res.success) {
      executedActions.push(res.actionCard);
      ctx.job = res.job; // Pass the completed job context down
    }
  }
  
  // 2. Payments & Invoicing
  if (intent.includes('record_payment') && customer) {
    const res = await executeInvoicing({ action: 'record_payment', ctx });
    if (res.success) {
      executedActions.push(res.actionCard);
      if (res.approvalCard) approvalsNeeded.push(res.approvalCard);
    }
  }
  
  // 3. Reminders & History
  if (intent.includes('create_annual_service_reminder') && customer) {
    const res = await executeReminder({ action: 'annual_service', ctx });
    if (res.success) {
      executedActions.push(res.actionCard);
      if (res.approvalCard) approvalsNeeded.push(res.approvalCard);
    }
    
    const histRes = await executeCustomer({ action: 'update_history', ctx });
    if (histRes.success) executedActions.push(histRes.actionCard);
  }
  
  // Fallback for simple unsupported commands
  if (executedActions.length === 0 && !customer) {
    executedActions.push({
      title: 'Action Not Fully Supported',
      details: 'I understood what you wanted, but that specific workflow is not yet fully implemented in Phase 2.',
      safe: true
    });
  }

  return {
    executed: executedActions,
    needsApproval: approvalsNeeded
  };
}
