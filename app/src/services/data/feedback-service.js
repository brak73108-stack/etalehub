import { isDemoMode } from '../mode-service.js';
import { createFeedback as providerCreateFeedback } from './data-provider.js';
import { logAudit } from './audit-service.js';
import { getSettings, updateSettingsSection } from './business-settings-service.js';

export async function validateFeedback(data) {
  if (!data.feedbackType) throw new Error("Feedback type is required");
  if (!data.description) throw new Error("Description is required");
  if (data.description.length < 10) throw new Error("Description must be at least 10 characters");
  
  if (data.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.contactEmail)) {
    throw new Error("Invalid email format");
  }
}

export async function submitFeedback(data) {
  await validateFeedback(data);
  
  const payload = {
    feedback_type: data.feedbackType,
    description: data.description,
    page_or_workflow: data.pageOrWorkflow || window.location.hash || '#/unknown',
    urgency: data.urgency || 'low',
    contact_email: data.contactEmail || null,
    mode: isDemoMode() ? 'demo' : 'production'
  };

  const result = await providerCreateFeedback(payload);
  
  // Log audit
  await logAudit('feedback_submitted', 'feedback', result.id || 'new', { type: payload.feedback_type });
  
  // Update onboarding state
  try {
    const settings = await getSettings();
    const onboarding = settings.onboardingState || {};
    if (!onboarding.feedbackSubmitted) {
      onboarding.feedbackSubmitted = true;
      await updateSettingsSection('onboardingState', onboarding);
    }
  } catch (e) {
    console.warn("Failed to update onboarding state after feedback submission:", e);
  }
  
  return result;
}
