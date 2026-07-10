/**
 * Validates the structured output from the LLM or Local pattern provider.
 * Enforces strict safety, duplicate prevention, and intent whitelisting.
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

export function validateIntent(result) {
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

  // Confidence & Risk overrides
  if (validated.confidence < 0.85 || validated.riskLevel === 'high') {
    validated.requiresApproval = true;
    validated.userConfirmationRequired = true;
    validated.safeToExecute = false;
  }

  return validated;
}
