/**
 * EtaleHub — Quote CRUD Operations
 *
 * Provides create, read, update, delete, and query functionality
 * for the `quotes` object store.
 *
 * @module db/quotes
 */

import { getDB } from './database.js';

const STORE_NAME = 'quotes';

/**
 * Retrieve every quote record.
 *
 * @returns {Promise<Array<Object>>} All quote objects.
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
 * Retrieve a single quote by primary key.
 *
 * @param {number} id - Quote ID.
 * @returns {Promise<Object|undefined>} The quote, or `undefined` if not found.
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
 * Retrieve all quotes for a given customer.
 *
 * @param {number} customerId - The customer's ID.
 * @returns {Promise<Array<Object>>} Matching quote records.
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
 * Retrieve all quotes with a specific status.
 *
 * @param {string} status - One of: 'draft', 'sent', 'accepted', 'rejected', 'expired'.
 * @returns {Promise<Array<Object>>} Matching quote records.
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
 * Create a new quote record.
 *
 * Automatically sets `createdAt` and `updatedAt` timestamps and
 * applies sensible defaults for omitted fields.
 *
 * @param {Object} quoteData - Quote fields (excluding `id`).
 * @returns {Promise<number>} The auto-generated quote ID.
 */
export async function create(quoteData) {
  const db = await getDB();
  const now = new Date().toISOString();

  const record = {
    quoteNumber: '',
    customerId: 0,
    lineItems: [],
    total: 0,
    status: 'draft',
    followUpDate: '',
    createdAt: now,
    updatedAt: now,
    ...quoteData,
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
 * Update an existing quote record (partial update supported).
 *
 * @param {number} id - Quote ID to update.
 * @param {Object} updates - Fields to merge into the existing record.
 * @returns {Promise<Object>} The updated quote record.
 * @throws {Error} If the quote does not exist.
 */
export async function update(id, updates) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Quote with id ${id} not found`);
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
 * Delete a quote by primary key.
 *
 * @param {number} id - Quote ID to delete.
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
