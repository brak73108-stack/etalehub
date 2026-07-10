import * as customersDb from '../../db/customers.js';
import * as jobsDb from '../../db/jobs.js';
import * as invoicesDb from '../../db/invoices.js';
import * as quotesDb from '../../db/quotes.js';
import * as remindersDb from '../../db/reminders.js';
import * as approvalsDb from '../../db/approvals.js';
import * as auditDb from '../../db/audit.js';
import * as aiActionsDb from '../../db/ai-actions.js';

// --- CUSTOMERS ---
export async function getCustomers() { return customersDb.getAll(); }
export async function getCustomerById(id) { return customersDb.getById(id); }
export async function getCustomerByName(name) { return customersDb.getByName(name); }
export async function createCustomer(data) { return customersDb.create(data); }
export async function updateCustomer(id, data) { return customersDb.update(id, data); }

// --- JOBS ---
export async function getJobs() { return jobsDb.getAll(); }
export async function getJobById(id) { return jobsDb.getById(id); }
export async function getJobsByCustomerId(id) { return jobsDb.getByCustomerId(id); }
export async function createJob(data) { return jobsDb.create(data); }
export async function updateJob(id, data) { return jobsDb.update(id, data); }

// --- INVOICES ---
export async function getInvoices() { return invoicesDb.getAll(); }
export async function getInvoiceById(id) { return invoicesDb.getById(id); }
export async function getNextInvoiceNumber() { return invoicesDb.getNextInvoiceNumber(); }
export async function createInvoice(data) { return invoicesDb.create(data); }
export async function updateInvoice(id, data) { return invoicesDb.update(id, data); }

// --- QUOTES ---
export async function getQuotes() { return quotesDb.getAll(); }
export async function getQuoteById(id) { return quotesDb.getById(id); }
export async function createQuote(data) { return quotesDb.create(data); }
export async function updateQuote(id, data) { return quotesDb.update(id, data); }

// --- REMINDERS ---
export async function getReminders() { return remindersDb.getAll(); }
export async function getReminderById(id) { return remindersDb.getById(id); }
export async function createReminder(data) { return remindersDb.create(data); }
export async function updateReminder(id, data) { return remindersDb.update(id, data); }

// --- APPROVALS ---
export async function getApprovals() { return approvalsDb.getAll(); }
export async function getApprovalById(id) { return approvalsDb.getById(id); }
export async function getPendingApprovals() { return approvalsDb.getPending(); }
export async function createApproval(data) { return approvalsDb.create(data); }
export async function approveApproval(id) { return approvalsDb.approve(id); }
export async function rejectApproval(id) { return approvalsDb.reject(id); }

// --- AUDIT ---
export async function getAuditLogs() { return auditDb.getAll(); }
export async function createAuditLog(data) { return auditDb.create(data); }

// --- AI ACTIONS ---
export async function getAiActions() { return aiActionsDb.getAll(); }
export async function createAiAction(data) { return aiActionsDb.create(data); }
