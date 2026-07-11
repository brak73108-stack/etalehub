/**
 * Validates the structured output from the LLM or Local pattern provider.
 * Enforces strict safety, duplicate prevention, intent whitelisting, and entity safety.
 */

const ALLOWED_INTENTS = [
  'create_customer',
  'update_customer',
  'archive_customer',
  'summarize_customer',
  'create_job',
  'update_job',
  'update_job_status',
  'complete_job',
  'cancel_job',
  'create_invoice_draft',
  'mark_invoice_sent',
  'mark_invoice_paid',
  'void_invoice',
  'create_quote_draft',
  'mark_quote_sent',
  'mark_quote_accepted',
  'mark_quote_rejected',
  'expire_quote',
  'record_payment',
  'create_reminder',
  'create_annual_service_reminder',
  'complete_reminder',
  'dismiss_reminder',
  'show_today_jobs',
  'check_overdue_invoices',
  'show_unpaid_invoices',
  'show_quote_followups',
  'show_incomplete_jobs',
  'show_due_reminders',
  'what_needs_attention',
  'ask_business_question',
  'unsupported',
  'clarification_required'
];

export function validateIntent(result, context = {}) {
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid intent format: expected object.');
  }

  // Schema Validation
  const validated = {
    intents: Array.isArray(result.intents) ? result.intents : [],
    entities: result.entities || {},
    confidence: typeof result.confidence === 'number' ? result.confidence : 0,
    riskLevel: result.riskLevel || 'high',
    requiresApproval: !!result.requiresApproval,
    suggestedWorkflow: result.suggestedWorkflow || '',
    missingInformation: Array.isArray(result.missingInformation) ? result.missingInformation : [],
    options: [], // Added for clarification options
    safeToExecute: !!result.safeToExecute,
    userConfirmationRequired: !!result.userConfirmationRequired,
    explanation: result.explanation || 'No explanation provided.'
  };

  // Intent Whitelist Enforcement
  validated.intents = validated.intents.filter(intent => ALLOWED_INTENTS.includes(intent));
  if (validated.intents.length === 0 || validated.intents.includes('unsupported')) {
    validated.intents = ['unsupported'];
    validated.safeToExecute = false;
    validated.explanation = 'Could not confidently map command to a supported workflow, or requested action is unsafe.';
  }

  // Helper for triggering clarification
  const requireClarification = (missingField) => {
    validated.userConfirmationRequired = true;
    validated.safeToExecute = false;
    if (!validated.intents.includes('clarification_required')) {
      validated.intents.push('clarification_required');
    }
    if (!validated.missingInformation.includes(missingField)) {
      validated.missingInformation.push(missingField);
    }
  };

  // Missing Fields Enforcement
  const ents = validated.entities;
  
  if (validated.intents.includes('record_payment')) {
    if (!ents.amount) requireClarification('Amount is required for recording a payment.');
    if (!ents.customerId && !ents.invoiceId && !ents.jobId) requireClarification('Which customer, invoice, or job is this payment for?');
  }

  if (validated.intents.includes('mark_invoice_paid')) {
    if (!ents.invoiceId && !ents.invoiceNumber) requireClarification('Which invoice is paid?');
  }

  if (validated.intents.includes('create_invoice_draft')) {
    if (!ents.amount) requireClarification('Amount is required to draft an invoice.');
    if (!ents.customerId && !ents.customerName) requireClarification('Which customer is this invoice for?');
  }

  if (validated.intents.includes('create_job')) {
    if (!ents.customerId && !ents.customerName) requireClarification('Which customer is this job for?');
    if (!ents.jobType && !ents.jobTitle) requireClarification('What type of job is this?');
  }

  if (validated.intents.includes('complete_job')) {
    if (!ents.jobId && !ents.jobTitle) requireClarification('Which job is complete?');
  }

  // Entity ID Safety bounds checking
  if (ents.customerId) {
    const validIds = (context.matchingCustomers || []).map(c => c.id);
    if (!validIds.includes(ents.customerId)) {
      validated.safeToExecute = false;
      requireClarification('Found an unverified customer ID. Please clarify.');
    }
  }

  if (ents.jobId) {
    const validIds = (context.matchingJobs || []).map(j => j.id);
    if (!validIds.includes(ents.jobId)) {
      validated.safeToExecute = false;
      requireClarification('Found an unverified job ID. Please clarify.');
    }
  }

  // Ambiguity Check
  if (context.matchingCustomers && context.matchingCustomers.length > 1) {
    // If the LLM didn't confidently narrow it down to 1 ID, or we have multiple namesakes
    // Force user confirmation
    if (!ents.customerId || validated.confidence < 0.95) {
       requireClarification('Which customer did you mean?');
       validated.options = context.matchingCustomers.map(c => ({
           id: String(c.id),
           label: `${c.name} — ${c.address || c.email || 'No address'}`
       }));
    }
  }

  if (context.matchingJobs && context.matchingJobs.length > 1) {
    if (!ents.jobId || validated.confidence < 0.95) {
       requireClarification('Which job did you mean?');
       validated.options = context.matchingJobs.map(j => ({
           id: String(j.id),
           label: `${j.title} — ${j.status.toUpperCase()}`
       }));
    }
  }

  // Confidence & Risk overrides
  if (validated.confidence < 0.85 || validated.riskLevel === 'high') {
    validated.requiresApproval = true;
    validated.userConfirmationRequired = true;
    validated.safeToExecute = false;
  }

  // --- Business Settings & Approval Overrides ---
  const settings = context.businessSettings || {};
  const approvalRules = settings.approvalRules || {};
  
  // Default safer behavior for unknowns
  const reqInvoiceApproval = approvalRules.requireApprovalForInvoiceDrafts ?? true;
  const reqQuoteApproval = approvalRules.requireApprovalForQuoteDrafts ?? true;

  // Check Settings
  if (validated.intents.includes('create_invoice_draft') && reqInvoiceApproval) {
    validated.requiresApproval = true;
  }
  if (validated.intents.includes('create_quote_draft') && reqQuoteApproval) {
    validated.requiresApproval = true;
  }

  // Mandatory Safety Overrides (cannot be disabled by settings)
  const isCustomerMessage = validated.intents.some(i => i.includes('message') || i.includes('send'));
  const isPaymentReminder = validated.intents.includes('create_reminder') && ents.type === 'payment';
  const isBulkAction = ents.bulk === true; // Generic flag if LLM supports it
  
  if (isCustomerMessage || isPaymentReminder || isBulkAction) {
    validated.requiresApproval = true;
    validated.safeToExecute = false;
  }

  // Double check high risk
  if (validated.riskLevel === 'high') {
    validated.requiresApproval = true;
    validated.safeToExecute = false;
  }

  return validated;
}
