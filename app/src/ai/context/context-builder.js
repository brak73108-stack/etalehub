import * as search from './entity-search.js';
import * as sanitizer from './context-sanitizer.js';
import { getCurrentBusinessId, isDemoMode } from '../../services/mode-service.js';
import { getSettings } from '../../services/data/business-settings-service.js';

/**
 * Infer command type to reduce the amount of context loaded
 */
function inferCommandHint(text) {
  const t = text.toLowerCase();
  
  const hints = [];
  if (t.match(/paid|payment|card|cash|bank transfer|invoice/)) hints.push('payment');
  if (t.match(/create customer|add customer|new customer|address|phone/)) hints.push('customer');
  if (t.match(/job|boiler|service|repair|completed|booked|schedule/)) hints.push('job');
  if (t.match(/remind|follow up|call|annual service|next week|next friday/)) hints.push('reminder');
  if (t.match(/quote|estimate|follow up quote/)) hints.push('quote');
  if (t.match(/today|overdue|who owes|what jobs|show me/)) hints.push('reporting');

  return hints.length > 0 ? hints.join('_') : 'general';
}

/**
 * Builds a dynamic, limited context payload for the LLM.
 * 
 * @param {string} commandText - the raw natural language input
 * @returns {Promise<Object>}
 */
export async function buildLLMContext(commandText) {
  const mode = isDemoMode() ? 'demo' : 'production';
  const businessId = getCurrentBusinessId();
  
  const commandTypeHint = inferCommandHint(commandText);
  
  // Base structure
  const context = {
    mode,
    businessId,
    commandTypeHint,
    businessSettings: null,
    matchingCustomers: [],
    matchingJobs: [],
    relevantInvoices: [],
    relevantReminders: [],
    relevantQuotes: [],
    todayJobs: [],
    approvalRules: { default: 'high_risk_requires_approval', customer_messaging: 'always_requires_approval' },
    limits: {
      maxCustomers: 5,
      maxJobs: 5,
      maxInvoices: 5,
      maxReminders: 5,
      maxQuotes: 5
    }
  };

  // Skip deep search in demo mode because local-pattern-provider doesn't use it anyway.
  if (mode === 'demo') {
     return context;
  }

  try {
    // 0. Load Settings
    try {
      const rawSettings = await getSettings();
      context.businessSettings = sanitizer.sanitizeBusinessSettings(rawSettings);
    } catch (e) {
      console.warn('[ContextBuilder] Failed to load business settings, using default safe context', e);
    }

    // 1. Search Customers
    const customers = await search.searchCustomers(commandText);
    context.matchingCustomers = sanitizer.sanitizeArray(customers, sanitizer.sanitizeCustomer);

    const customerIds = customers.map(c => c.id);

    // 2. Load Jobs
    if (commandTypeHint.includes('job') || commandTypeHint.includes('payment') || commandTypeHint.includes('reminder') || commandTypeHint === 'general') {
      const jobs = await search.getJobsForCustomers(customerIds);
      context.matchingJobs = sanitizer.sanitizeArray(jobs, sanitizer.sanitizeJob);
    }

    // 3. Load Invoices
    if (commandTypeHint.includes('payment') || commandTypeHint.includes('reporting')) {
      if (commandText.toLowerCase().includes('overdue')) {
        const overdue = await search.getOverdueInvoices();
        context.relevantInvoices = sanitizer.sanitizeArray(overdue, sanitizer.sanitizeInvoice);
      } else {
        const jobIds = context.matchingJobs.map(j => j.id);
        const invoices = await search.getInvoicesForJobs(jobIds);
        context.relevantInvoices = sanitizer.sanitizeArray(invoices, sanitizer.sanitizeInvoice);
      }
    }

    // 4. Load Quotes
    if (commandTypeHint.includes('quote') || commandTypeHint.includes('reporting')) {
      const quotes = await search.getOpenQuotes();
      context.relevantQuotes = sanitizer.sanitizeArray(quotes, sanitizer.sanitizeQuote);
    }

    // 5. Load Reminders
    if (commandTypeHint.includes('reminder') || commandTypeHint.includes('reporting')) {
      const reminders = await search.getUpcomingReminders();
      context.relevantReminders = sanitizer.sanitizeArray(reminders, sanitizer.sanitizeReminder);
    }

    // 6. Today's Jobs
    if (commandTypeHint.includes('reporting') || commandText.toLowerCase().includes('today')) {
      const today = await search.getTodayJobs();
      context.todayJobs = sanitizer.sanitizeArray(today, sanitizer.sanitizeJob);
    }

  } catch (err) {
    console.warn('[ContextBuilder] Non-fatal error building context:', err);
  }

  return context;
}
