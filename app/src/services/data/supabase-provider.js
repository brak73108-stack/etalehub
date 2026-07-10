import { supabase } from '../supabase-client.js';
import { getCurrentBusinessId } from '../mode-service.js';

// --- HELPERS: snake_case <-> camelCase ---
function toCamel(s) {
  return s.replace(/_([a-z])/g, (m, w) => w.toUpperCase());
}

function toSnake(s) {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function keysToCamel(o) {
  if (o === Object(o) && !Array.isArray(o) && typeof o !== 'function') {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toCamel(k)] = keysToCamel(o[k]);
    });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => keysToCamel(i));
  }
  return o;
}

function keysToSnake(o) {
  if (o === Object(o) && !Array.isArray(o) && typeof o !== 'function') {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toSnake(k)] = keysToSnake(o[k]);
    });
    return n;
  } else if (Array.isArray(o)) {
    return o.map((i) => keysToSnake(i));
  }
  return o;
}

// Add business_id to all outbound payloads
function prepareData(data) {
  const business_id = getCurrentBusinessId();
  if (!business_id) throw new Error("No active business context for Supabase provider");
  const snakeData = keysToSnake(data);
  return { ...snakeData, business_id };
}

// Ensure returned data matches existing IndexedDB shapes (camelCase)
function parseData(data) {
  if (!data) return null;
  return keysToCamel(data);
}


// --- CUSTOMERS ---
export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*').eq('business_id', getCurrentBusinessId());
  if (error) throw error;
  return parseData(data);
}

export async function getCustomerById(id) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return parseData(data);
}

export async function getCustomerByName(name) {
  // Simple ilike search for Phase 3
  const { data, error } = await supabase.from('customers')
    .select('*')
    .eq('business_id', getCurrentBusinessId())
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw error;
  }
  return parseData(data);
}

export async function createCustomer(data) {
  const { data: result, error } = await supabase.from('customers').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function updateCustomer(id, data) {
  const { data: result, error } = await supabase.from('customers').update(keysToSnake(data)).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- JOBS ---
export async function getJobs() {
  const { data, error } = await supabase.from('jobs').select('*').eq('business_id', getCurrentBusinessId()).order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function getJobById(id) {
  const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (error) throw error;
  return parseData(data);
}

export async function getJobsByCustomerId(id) {
  const { data, error } = await supabase.from('jobs').select('*').eq('customer_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function createJob(data) {
  const { data: result, error } = await supabase.from('jobs').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function updateJob(id, data) {
  const { data: result, error } = await supabase.from('jobs').update(keysToSnake(data)).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- INVOICES ---
export async function getInvoices() {
  const { data, error } = await supabase.from('invoices').select('*').eq('business_id', getCurrentBusinessId()).order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function getInvoiceById(id) {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (error) throw error;
  return parseData(data);
}

export async function getNextInvoiceNumber() {
  // Simple implementation for Phase 3: just count and add 1
  const { count, error } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('business_id', getCurrentBusinessId());
  if (error) throw error;
  return `EH-${String((count || 0) + 1).padStart(4, '0')}`;
}

export async function createInvoice(data) {
  const { data: result, error } = await supabase.from('invoices').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function updateInvoice(id, data) {
  const { data: result, error } = await supabase.from('invoices').update(keysToSnake(data)).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- QUOTES ---
export async function getQuotes() {
  const { data, error } = await supabase.from('quotes').select('*').eq('business_id', getCurrentBusinessId()).order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function getQuoteById(id) {
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (error) throw error;
  return parseData(data);
}

export async function createQuote(data) {
  const { data: result, error } = await supabase.from('quotes').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function updateQuote(id, data) {
  const { data: result, error } = await supabase.from('quotes').update(keysToSnake(data)).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- REMINDERS ---
export async function getReminders() {
  const { data, error } = await supabase.from('reminders').select('*').eq('business_id', getCurrentBusinessId()).order('scheduled_date', { ascending: true });
  if (error) throw error;
  return parseData(data);
}

export async function getReminderById(id) {
  const { data, error } = await supabase.from('reminders').select('*').eq('id', id).single();
  if (error) throw error;
  return parseData(data);
}

export async function createReminder(data) {
  const { data: result, error } = await supabase.from('reminders').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function updateReminder(id, data) {
  const { data: result, error } = await supabase.from('reminders').update(keysToSnake(data)).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- APPROVALS ---
export async function getApprovals() {
  const { data, error } = await supabase.from('approvals').select('*').eq('business_id', getCurrentBusinessId()).order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function getPendingApprovals() {
  const { data, error } = await supabase.from('approvals').select('*').eq('business_id', getCurrentBusinessId()).eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function getApprovalById(id) {
  const { data, error } = await supabase.from('approvals').select('*').eq('id', id).single();
  if (error) throw error;
  return parseData(data);
}

export async function createApproval(data) {
  const { data: result, error } = await supabase.from('approvals').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function approveApproval(id) {
  const { data: result, error } = await supabase.from('approvals').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

export async function rejectApproval(id) {
  const { data: result, error } = await supabase.from('approvals').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- AUDIT ---
export async function getAuditLogs() {
  const { data, error } = await supabase.from('audit_logs').select('*').eq('business_id', getCurrentBusinessId()).order('timestamp', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function createAuditLog(data) {
  const { data: result, error } = await supabase.from('audit_logs').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}

// --- AI ACTIONS ---
export async function getAiActions() {
  const { data, error } = await supabase.from('ai_actions').select('*').eq('business_id', getCurrentBusinessId()).order('created_at', { ascending: false });
  if (error) throw error;
  return parseData(data);
}

export async function createAiAction(data) {
  const { data: result, error } = await supabase.from('ai_actions').insert(prepareData(data)).select().single();
  if (error) throw error;
  return parseData(result);
}
