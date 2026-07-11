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
  
  // 4. Reporting & Q&A (Read Only)
  const reportingIntents = [
    'show_today_jobs', 'check_overdue_invoices', 'show_unpaid_invoices', 
    'show_quote_followups', 'show_incomplete_jobs', 'show_due_reminders', 
    'what_needs_attention', 'summarize_customer', 'ask_business_question'
  ];
  const matchedReportIntent = reportingIntents.find(i => intent.includes(i));
  if (matchedReportIntent) {
    const { execute: executeReporting } = await import('./reporting.js');
    const res = await executeReporting({ action: matchedReportIntent, ctx });
    if (res && res.success && res.actionCard) {
      executedActions.push(res.actionCard);
    }
  }

  // 5. New Customer Workflows
  const customerIntents = ['create_customer', 'update_customer', 'archive_customer'];
  const matchedCustomerIntent = customerIntents.find(i => intent.includes(i));
  if (matchedCustomerIntent) {
    const res = await executeCustomer({ action: matchedCustomerIntent, ctx });
    if (res && res.success) {
      if (res.actionCard) executedActions.push(res.actionCard);
      if (res.approvalCard) approvalsNeeded.push(res.approvalCard);
    }
  }

  // 6. New Job Workflows
  const jobIntents = ['create_job', 'update_job_status', 'cancel_job'];
  const matchedJobIntent = jobIntents.find(i => intent.includes(i));
  if (matchedJobIntent) {
    const res = await executeScheduling({ action: matchedJobIntent, ctx });
    if (res && res.success) {
      if (res.actionCard) executedActions.push(res.actionCard);
      if (res.approvalCard) approvalsNeeded.push(res.approvalCard);
    }
  }

  // 7. New Money Workflows (Invoices & Quotes)
  const moneyIntents = ['create_invoice_draft', 'mark_invoice_paid', 'create_quote_draft', 'mark_quote_accepted', 'mark_quote_rejected', 'expire_quote'];
  const matchedMoneyIntent = moneyIntents.find(i => intent.includes(i));
  if (matchedMoneyIntent) {
    const res = await executeInvoicing({ action: matchedMoneyIntent, ctx });
    if (res && res.success) {
      if (res.actionCard) executedActions.push(res.actionCard);
      if (res.approvalCard) approvalsNeeded.push(res.approvalCard);
    }
  }

  // 8. New Reminder Workflows
  const reminderIntents = ['create_reminder', 'complete_reminder', 'dismiss_reminder'];
  const matchedReminderIntent = reminderIntents.find(i => intent.includes(i));
  if (matchedReminderIntent) {
    const res = await executeReminder({ action: matchedReminderIntent, ctx });
    if (res && res.success) {
      if (res.actionCard) executedActions.push(res.actionCard);
      if (res.approvalCard) approvalsNeeded.push(res.approvalCard);
    }
  }

  // Fallback for simple unsupported commands
  if (executedActions.length === 0 && approvalsNeeded.length === 0 && !customer) {
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
