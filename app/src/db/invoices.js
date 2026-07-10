/**
 * EtaleHub — Invoice CRUD Operations
 *
 * Provides create, read, update, delete, and financial-reporting
 * functionality for the `invoices` object store.
 *
 * @module db/invoices
 */

import { getDB } from './database.js';

const STORE_NAME = 'invoices';

/**
 * Retrieve every invoice record.
 *
 * @returns {Promise<Array<Object>>} All invoice objects.
 */
export async function getAll() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve a single invoice by primary key.
 *
 * @param {number} id - Invoice ID.
 * @returns {Promise<Object|undefined>} The invoice, or `undefined` if not found.
 */
export async function getById(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all invoices for a given customer.
 *
 * @param {number} customerId - The customer's ID.
 * @returns {Promise<Array<Object>>} Matching invoice records.
 */
export async function getByCustomerId(customerId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('customerId');
    const request = index.getAll(customerId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all invoices with a specific status.
 *
 * @param {string} status - One of: 'draft', 'sent', 'paid', 'overdue'.
 * @returns {Promise<Array<Object>>} Matching invoice records.
 */
export async function getByStatus(status) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a new invoice record.
 *
 * Automatically sets `createdAt` and `updatedAt` timestamps and
 * applies sensible defaults for omitted fields.
 *
 * @param {Object} invoiceData - Invoice fields (excluding `id`).
 * @returns {Promise<number>} The auto-generated invoice ID.
 */
export async function create(invoiceData) {
  const db = await getDB();
  const now = new Date().toISOString();

  const record = {
    invoiceNumber: '',
    customerId: 0,
    jobId: 0,
    lineItems: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    status: 'draft',
    paymentMethod: '',
    paidDate: '',
    dueDate: '',
    createdAt: now,
    updatedAt: now,
    ...invoiceData,
  };

  delete record.id;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing invoice record (partial update supported).
 *
 * @param {number} id - Invoice ID to update.
 * @param {Object} updates - Fields to merge into the existing record.
 * @returns {Promise<Object>} The updated invoice record.
 * @throws {Error} If the invoice does not exist.
 */
export async function update(id, updates) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Invoice with id ${id} not found`);
  }

  const updated = {
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = () => resolve(updated);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an invoice by primary key.
 *
 * @param {number} id - Invoice ID to delete.
 * @returns {Promise<void>}
 */
export async function remove(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all overdue invoices.
 *
 * An invoice is considered overdue when its status is 'sent' (not yet
 * paid) and its `dueDate` is in the past, OR if it already has the
 * 'overdue' status explicitly set.
 *
 * @returns {Promise<Array<Object>>} Overdue invoice records.
 */
export async function getOverdue() {
  const allInvoices = await getAll();
  const todayStr = new Date().toISOString().slice(0, 10);

  return allInvoices.filter((inv) => {
    if (inv.status === 'overdue') return true;
    if (inv.status === 'sent' && inv.dueDate && inv.dueDate.slice(0, 10) < todayStr) {
      return true;
    }
    return false;
  });
}

/**
 * Determine the next sequential invoice number.
 *
 * Scans all existing invoices, finds the highest numeric suffix, and
 * returns the next value formatted as `EH-XXXX`.
 *
 * @returns {Promise<string>} The next invoice number (e.g. `'EH-0011'`).
 */
export async function getNextInvoiceNumber() {
  const allInvoices = await getAll();

  let maxNum = 0;
  for (const inv of allInvoices) {
    const match = inv.invoiceNumber && inv.invoiceNumber.match(/EH-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const next = maxNum + 1;
  return `EH-${String(next).padStart(4, '0')}`;
}

/**
 * Calculate the total outstanding amount across all unpaid invoices
 * (status is 'sent' or 'overdue').
 *
 * @returns {Promise<number>} Total outstanding in GBP (£).
 */
export async function getTotalOutstanding() {
  const allInvoices = await getAll();

  return allInvoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
}

/**
 * Calculate total revenue for the current ISO week (Mon–Sun).
 *
 * Revenue = sum of `total` for invoices with status `'paid'` whose
 * `paidDate` falls within the current week.
 *
 * @returns {Promise<number>} Revenue in GBP (£) for this week.
 */
export async function getRevenueThisWeek() {
  const now = new Date();
  // JavaScript: getDay() returns 0 (Sun) – 6 (Sat).  We want ISO week (Mon = 1).
  const dayOfWeek = now.getDay() || 7; // convert Sunday 0 → 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const monStr = monday.toISOString().slice(0, 10);
  const sunStr = sunday.toISOString().slice(0, 10);

  const allInvoices = await getAll();

  return allInvoices
    .filter((inv) => {
      if (inv.status !== 'paid' || !inv.paidDate) return false;
      const pd = inv.paidDate.slice(0, 10);
      return pd >= monStr && pd <= sunStr;
    })
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
}

/**
 * Calculate total revenue for the current calendar month.
 *
 * Revenue = sum of `total` for invoices with status `'paid'` whose
 * `paidDate` falls within the current month.
 *
 * @returns {Promise<number>} Revenue in GBP (£) for this month.
 */
export async function getRevenueThisMonth() {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'

  const allInvoices = await getAll();

  return allInvoices
    .filter((inv) => {
      if (inv.status !== 'paid' || !inv.paidDate) return false;
      return inv.paidDate.slice(0, 7) === yearMonth;
    })
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
}

export { remove as delete };
