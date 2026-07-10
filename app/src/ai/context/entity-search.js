import * as customersService from '../../services/data/customers-service.js';
import * as jobsService from '../../services/data/jobs-service.js';
import * as invoicesService from '../../services/data/invoices-service.js';
import * as quotesService from '../../services/data/quotes-service.js';
import * as remindersService from '../../services/data/reminders-service.js';

/**
 * Perform safe, limited searches across the service layer for context building.
 * Ensures we never return whole tables or unrelated data.
 */

const LIMIT = 5;

// Basic text tokenization for fuzzy matching
const tokenize = (text) => text.toLowerCase().split(/\s+/).filter(t => t.length > 2);

export async function searchCustomers(inputText) {
  const tokens = tokenize(inputText);
  if (tokens.length === 0) return [];

  // Get all customers (or via a search if the service supports it)
  // For safety and compatibility with current proxy, we get all and filter in memory up to LIMIT.
  // Note: If the DB gets huge, we should add a dedicated `search(query)` to the service layer.
  const customers = await customersService.getAll();
  
  const matches = customers.filter(c => {
    const searchString = `${c.name} ${c.address} ${c.email} ${c.phone}`.toLowerCase();
    return tokens.some(token => searchString.includes(token));
  });

  return matches.slice(0, LIMIT);
}

export async function getJobsForCustomers(customerIds) {
  if (!customerIds || customerIds.length === 0) return [];
  const allJobs = [];
  for (const cid of customerIds) {
    const jobs = await jobsService.getByCustomerId(cid);
    allJobs.push(...jobs);
  }
  // Sort by most recently scheduled
  allJobs.sort((a, b) => new Date(b.scheduledDate || 0) - new Date(a.scheduledDate || 0));
  return allJobs.slice(0, LIMIT);
}

export async function getTodayJobs() {
  // Use local date for "today" matching, or use service layer `getToday`
  if (typeof jobsService.getToday === 'function') {
    return await jobsService.getToday();
  }
  const jobs = await jobsService.getAll();
  const todayStr = new Date().toISOString().split('T')[0];
  return jobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr)).slice(0, LIMIT);
}

export async function getOverdueInvoices() {
  if (typeof invoicesService.getOverdue === 'function') {
    const overdue = await invoicesService.getOverdue();
    return overdue.slice(0, LIMIT);
  }
  const invoices = await invoicesService.getAll();
  const now = new Date();
  return invoices.filter(i => i.status !== 'paid' && new Date(i.dueDate) < now).slice(0, LIMIT);
}

export async function getOpenQuotes() {
  const quotes = await quotesService.getAll();
  return quotes.filter(q => q.status === 'draft' || q.status === 'sent').slice(0, LIMIT);
}

export async function getUpcomingReminders() {
  if (typeof remindersService.getUpcoming === 'function') {
     const upcoming = await remindersService.getUpcoming(7); // next 7 days
     return upcoming.slice(0, LIMIT);
  }
  const reminders = await remindersService.getAll();
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return reminders.filter(r => r.status === 'pending' && new Date(r.scheduledDate) <= nextWeek).slice(0, LIMIT);
}

export async function getInvoicesForJobs(jobIds) {
  if (!jobIds || jobIds.length === 0) return [];
  const invoices = await invoicesService.getAll();
  return invoices.filter(i => jobIds.includes(i.jobId)).slice(0, LIMIT);
}
