/**
 * EtaleHub — Reminder CRUD Operations
 *
 * Provides create, read, update, delete, and query functionality
 * for the `reminders` object store.  Includes helpers for finding
 * due and upcoming reminders.
 *
 * @module db/reminders
 */

import { getDB } from './database.js';

const STORE_NAME = 'reminders';

/**
 * Retrieve every reminder record.
 *
 * @returns {Promise<Array<Object>>} All reminder objects.
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
 * Retrieve a single reminder by primary key.
 *
 * @param {number} id - Reminder ID.
 * @returns {Promise<Object|undefined>} The reminder, or `undefined` if not found.
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
 * Retrieve all reminders for a given customer.
 *
 * @param {number} customerId - The customer's ID.
 * @returns {Promise<Array<Object>>} Matching reminder records.
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
 * Retrieve all reminders with a specific status.
 *
 * @param {string} status - One of: 'pending', 'sent', 'dismissed', 'completed'.
 * @returns {Promise<Array<Object>>} Matching reminder records.
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
 * Retrieve all reminders that are due today or overdue (pending
 * reminders whose `scheduledDate` is today or earlier).
 *
 * @returns {Promise<Array<Object>>} Due and overdue reminder records.
 */
export async function getDue() {
  const allReminders = await getAll();
  const todayStr = new Date().toISOString().slice(0, 10);

  return allReminders.filter((r) => {
    if (r.status !== 'pending') return false;
    if (!r.scheduledDate) return false;
    return r.scheduledDate.slice(0, 10) <= todayStr;
  });
}

/**
 * Retrieve pending reminders scheduled within the next N days.
 *
 * @param {number} [days=7] - Number of days to look ahead.
 * @returns {Promise<Array<Object>>} Upcoming reminder records.
 */
export async function getUpcoming(days = 7) {
  const allReminders = await getAll();
  const todayStr = new Date().toISOString().slice(0, 10);

  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureStr = future.toISOString().slice(0, 10);

  return allReminders.filter((r) => {
    if (r.status !== 'pending') return false;
    if (!r.scheduledDate) return false;
    const sd = r.scheduledDate.slice(0, 10);
    return sd >= todayStr && sd <= futureStr;
  });
}

/**
 * Create a new reminder record.
 *
 * Automatically sets `createdAt` and `updatedAt` timestamps and
 * applies sensible defaults for omitted fields.
 *
 * @param {Object} reminderData - Reminder fields (excluding `id`).
 * @returns {Promise<number>} The auto-generated reminder ID.
 */
export async function create(reminderData) {
  const db = await getDB();
  const now = new Date().toISOString();

  const record = {
    customerId: 0,
    jobId: 0,
    type: 'custom',
    reminderType: '',
    message: '',
    scheduledDate: '',
    status: 'pending',
    recurrence: 'none',
    createdByAI: false,
    createdAt: now,
    updatedAt: now,
    ...reminderData,
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
 * Update an existing reminder record (partial update supported).
 *
 * @param {number} id - Reminder ID to update.
 * @param {Object} updates - Fields to merge into the existing record.
 * @returns {Promise<Object>} The updated reminder record.
 * @throws {Error} If the reminder does not exist.
 */
export async function update(id, updates) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Reminder with id ${id} not found`);
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
 * Delete a reminder by primary key.
 *
 * @param {number} id - Reminder ID to delete.
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

export { remove as delete };
