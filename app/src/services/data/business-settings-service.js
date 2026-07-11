import { isDemoMode } from '../mode-service.js';
import { getProvider } from './data-provider.js';
import { logAudit } from './audit-service.js';

/**
 * Returns the hardcoded default settings for a fresh workspace or demo reset.
 */
export function getDefaultSettings() {
  return {
    businessProfile: {
      businessName: '',
      tradeType: 'Plumbing & Heating',
      phone: '',
      email: '',
      website: '',
      address: '',
      currency: 'GBP',
      timezone: 'Europe/London'
    },
    serviceTypes: [
      { id: 'boiler_service', name: 'Boiler service', active: true },
      { id: 'boiler_repair', name: 'Boiler repair', active: true },
      { id: 'gas_safety', name: 'Gas safety certificate', active: true },
      { id: 'radiator_repair', name: 'Radiator repair', active: true },
      { id: 'emergency_callout', name: 'Emergency callout', active: true },
      { id: 'installation', name: 'Installation', active: true },
      { id: 'general_plumbing', name: 'General plumbing', active: true },
      { id: 'custom', name: 'Custom', active: true }
    ],
    invoiceDefaults: {
      paymentTermsDays: 14,
      invoicePrefix: 'INV',
      defaultNotes: 'Thank you for your business.',
      paymentInstructions: 'Payment instructions not configured yet.',
      requireApprovalBeforeSending: true
    },
    quoteDefaults: {
      validityDays: 30,
      quotePrefix: 'QUO',
      defaultNotes: '',
      followUpDelayDays: 7,
      requireApprovalBeforeSending: true
    },
    reminderPreferences: {
      annualServiceMonths: 12,
      quoteFollowUpDays: 7,
      paymentFollowUpDays: 7,
      jobFollowUpDays: 1,
      enabledReminderTypes: [
        'annual_service',
        'payment',
        'quote_follow_up',
        'customer_follow_up',
        'job_follow_up',
        'custom'
      ]
    },
    approvalRules: {
      requireApprovalForCustomerMessages: true,
      requireApprovalForInvoiceDrafts: true,
      requireApprovalForQuoteDrafts: true,
      requireApprovalForPaymentReminders: true,
      requireApprovalForBulkActions: true,
      requireApprovalForHighRiskAI: true
    },
    onboardingState: {
      businessProfileComplete: false,
      serviceTypesReviewed: false,
      firstCustomerCreated: false,
      firstJobCreated: false,
      firstInvoiceDraftCreated: false,
      firstReminderCreated: false,
      aiCommandCentreTried: false,
      approvalQueueReviewed: false,
      feedbackSubmitted: false,
      betaLimitsDismissed: false
    }
  };
}

/**
 * Validate a specific settings section to ensure it meets the schema requirements.
 */
export function validateSettingsSection(section, data) {
  const defaults = getDefaultSettings();
  if (!defaults[section]) {
    throw new Error(`Invalid settings section: ${section}`);
  }
  
  // Basic structural validation: ensure no loose properties
  const validKeys = Object.keys(defaults[section]);
  
  if (Array.isArray(defaults[section])) {
    if (!Array.isArray(data)) throw new Error(`${section} must be an array`);
    return data;
  }
  
  const validated = {};
  for (const key of Object.keys(data)) {
    if (validKeys.includes(key)) {
      validated[key] = data[key];
    }
  }
  return validated;
}

/**
 * Get all settings combined into one object.
 */
export async function getSettings() {
  const demo = await isDemoMode();
  let dbSettings = {};

  if (demo) {
    const allSections = await getProvider().getAllSettings();
    if (allSections) {
      allSections.forEach(s => {
        dbSettings[s.section] = s;
      });
    }
  } else {
    // Production fetches the single business_settings row
    dbSettings = await getProvider().getBusinessSettingsRow();
  }

  const defaults = getDefaultSettings();
  
  // Merge DB settings over defaults
  return {
    businessProfile: { ...defaults.businessProfile, ...(dbSettings.businessProfile || dbSettings.business_profile || {}) },
    serviceTypes: dbSettings.serviceTypes || dbSettings.service_types || defaults.serviceTypes,
    invoiceDefaults: { ...defaults.invoiceDefaults, ...(dbSettings.invoiceDefaults || dbSettings.invoice_defaults || {}) },
    quoteDefaults: { ...defaults.quoteDefaults, ...(dbSettings.quoteDefaults || dbSettings.quote_defaults || {}) },
    reminderPreferences: { ...defaults.reminderPreferences, ...(dbSettings.reminderPreferences || dbSettings.reminder_preferences || {}) },
    approvalRules: { ...defaults.approvalRules, ...(dbSettings.approvalRules || dbSettings.approval_rules || {}) },
    onboardingState: { ...defaults.onboardingState, ...(dbSettings.onboardingState || dbSettings.onboarding_state || {}) }
  };
}

/**
 * Update a specific settings section.
 */
export async function updateSettingsSection(section, data) {
  const validatedData = validateSettingsSection(section, data);
  const demo = await isDemoMode();
  
  // For production, map camelCase section to snake_case column
  const columnMap = {
    businessProfile: 'business_profile',
    serviceTypes: 'service_types',
    invoiceDefaults: 'invoice_defaults',
    quoteDefaults: 'quote_defaults',
    reminderPreferences: 'reminder_preferences',
    approvalRules: 'approval_rules',
    onboardingState: 'onboarding_state'
  };

  const dbColumn = columnMap[section] || section;

  if (demo) {
    await getProvider().updateSettingSection(section, validatedData);
  } else {
    await getProvider().updateBusinessSettingsRow({ [dbColumn]: validatedData });
  }

  // Create audit log
  await logAudit(
    `${dbColumn}_updated`,
    'settings',
    null,
    { updated_keys: Object.keys(validatedData) }
  );

  return validatedData;
}

/**
 * Reset settings to defaults. Primarily used by Demo mode reset.
 */
export async function resetSettingsToDefaults() {
  const defaults = getDefaultSettings();
  
  for (const [section, data] of Object.entries(defaults)) {
    await updateSettingsSection(section, data);
  }
}
