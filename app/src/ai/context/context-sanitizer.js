/**
 * Sanitizes context objects to ensure only minimum required fields 
 * are passed to the LLM. Prevents leaking sensitive data.
 */

export function sanitizeCustomer(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    address: c.address,
    phone: c.phone, // only included because intents might need phone numbers
    email: c.email,
    customerStatus: c.customerStatus,
    lastServiceDate: c.lastServiceDate
  };
}

export function sanitizeJob(j) {
  if (!j) return null;
  return {
    id: j.id,
    customerId: j.customerId,
    title: j.title,
    jobType: j.jobType,
    status: j.status,
    scheduledDate: j.scheduledDate,
    completedDate: j.completedDate,
    finalPrice: j.finalPrice
  };
}

export function sanitizeInvoice(i) {
  if (!i) return null;
  return {
    id: i.id,
    customerId: i.customerId,
    jobId: i.jobId,
    invoiceNumber: i.invoiceNumber,
    amount: i.total || i.amount,
    status: i.status,
    dueDate: i.dueDate,
    paidDate: i.paidDate
  };
}

export function sanitizeQuote(q) {
  if (!q) return null;
  return {
    id: q.id,
    customerId: q.customerId,
    quoteNumber: q.quoteNumber,
    amount: q.total || q.amount,
    status: q.status,
    followUpDate: q.followUpDate
  };
}

export function sanitizeReminder(r) {
  if (!r) return null;
  return {
    id: r.id,
    customerId: r.customerId,
    jobId: r.jobId,
    type: r.type,
    scheduledDate: r.scheduledDate,
    status: r.status,
    messageSummary: r.message ? r.message.substring(0, 50) : ''
  };
}

export function sanitizeArray(arr, sanitizerFn) {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizerFn).filter(Boolean);
}

export function sanitizeBusinessSettings(settings) {
  if (!settings) return null;
  
  const activeServiceTypes = Array.isArray(settings.serviceTypes) 
    ? settings.serviceTypes.filter(s => s.active).map(s => ({ id: s.id, name: s.name })).slice(0, 20)
    : [];

  return {
    businessProfile: {
      businessName: settings.businessProfile?.businessName || '',
      tradeType: settings.businessProfile?.tradeType || '',
      currency: settings.businessProfile?.currency || 'GBP',
      timezone: settings.businessProfile?.timezone || 'Europe/London'
    },
    serviceTypes: activeServiceTypes,
    invoiceDefaults: {
      paymentTermsDays: settings.invoiceDefaults?.paymentTermsDays ?? 14,
      invoicePrefix: settings.invoiceDefaults?.invoicePrefix || 'INV',
      requireApprovalBeforeSending: settings.invoiceDefaults?.requireApprovalBeforeSending ?? true
    },
    quoteDefaults: {
      validityDays: settings.quoteDefaults?.validityDays ?? 30,
      quotePrefix: settings.quoteDefaults?.quotePrefix || 'QUO',
      followUpDelayDays: settings.quoteDefaults?.followUpDelayDays ?? 7,
      requireApprovalBeforeSending: settings.quoteDefaults?.requireApprovalBeforeSending ?? true
    },
    reminderPreferences: {
      annualServiceMonths: settings.reminderPreferences?.annualServiceMonths ?? 12,
      quoteFollowUpDays: settings.reminderPreferences?.quoteFollowUpDays ?? 7,
      paymentFollowUpDays: settings.reminderPreferences?.paymentFollowUpDays ?? 7,
      jobFollowUpDays: settings.reminderPreferences?.jobFollowUpDays ?? 1,
      enabledReminderTypes: Array.isArray(settings.reminderPreferences?.enabledReminderTypes) 
        ? settings.reminderPreferences.enabledReminderTypes 
        : []
    },
    approvalRules: {
      requireApprovalForCustomerMessages: settings.approvalRules?.requireApprovalForCustomerMessages ?? true,
      requireApprovalForInvoiceDrafts: settings.approvalRules?.requireApprovalForInvoiceDrafts ?? true,
      requireApprovalForQuoteDrafts: settings.approvalRules?.requireApprovalForQuoteDrafts ?? true,
      requireApprovalForPaymentReminders: settings.approvalRules?.requireApprovalForPaymentReminders ?? true,
      requireApprovalForBulkActions: settings.approvalRules?.requireApprovalForBulkActions ?? true,
      requireApprovalForHighRiskAI: settings.approvalRules?.requireApprovalForHighRiskAI ?? true
    }
  };
}
