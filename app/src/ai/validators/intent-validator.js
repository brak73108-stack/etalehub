/**
 * Validates the structured output from the LLM or Local pattern provider.
 * Enforces strict safety, duplicate prevention, intent whitelisting, and entity safety.
 */

const ALLOWED_INTENTS = [
  'create_customer',
  'update_customer',
  'create_job',
  'complete_job',
  'record_payment',
  'create_invoice_draft',
  'create_quote_draft',
  'create_reminder',
  'create_annual_service_reminder',
  'check_overdue_invoices',
  'show_today_jobs',
  'create_audit_note',
  'ask_business_question'
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
    safeToExecute: !!result.safeToExecute,
    userConfirmationRequired: !!result.userConfirmationRequired,
    explanation: result.explanation || 'No explanation provided.'
  };

  // Intent Whitelist Enforcement
  validated.intents = validated.intents.filter(intent => ALLOWED_INTENTS.includes(intent));
  if (validated.intents.length === 0) {
    validated.intents = ['ask_business_question'];
    validated.safeToExecute = false;
    validated.explanation = 'Could not confidently map command to a supported workflow.';
  }

  // Entity ID Safety bounds checking
  if (validated.entities.customerId) {
    const validIds = (context.matchingCustomers || []).map(c => c.id);
    if (!validIds.includes(validated.entities.customerId)) {
      validated.safeToExecute = false;
      validated.userConfirmationRequired = true;
      validated.explanation = `LLM returned unverified customerId: ${validated.entities.customerId}`;
    }
  }

  if (validated.entities.jobId) {
    const validIds = (context.matchingJobs || []).map(j => j.id);
    if (!validIds.includes(validated.entities.jobId)) {
      validated.safeToExecute = false;
      validated.userConfirmationRequired = true;
      validated.explanation = `LLM returned unverified jobId: ${validated.entities.jobId}`;
    }
  }

  // Ambiguity Check
  if (context.matchingCustomers && context.matchingCustomers.length > 1) {
    // If the LLM didn't confidently narrow it down to 1 ID, or we have multiple namesakes
    // Force user confirmation
    if (!validated.entities.customerId || validated.confidence < 0.95) {
       validated.userConfirmationRequired = true;
       validated.safeToExecute = false;
       if (!validated.missingInformation.includes('Which customer did you mean?')) {
          validated.missingInformation.push('Which customer did you mean?');
       }
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
  const isPaymentReminder = validated.intents.includes('create_reminder') && validated.entities.type === 'payment';
  const isBulkAction = validated.entities.bulk === true; // Generic flag if LLM supports it
  
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
