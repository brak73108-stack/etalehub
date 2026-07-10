/**
 * EtaleHub — Job CRUD Operations
 *
 * Provides create, read, update, delete, and query functionality
 * for the `jobs` object store.
 *
 * @module db/jobs
 */

import { getDB } from './database.js';

const STORE_NAME = 'jobs';

/**
 * Retrieve every job record.
 *
 * @returns {Promise<Array<Object>>} All job objects.
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
 * Retrieve a single job by primary key.
 *
 * @param {number} id - Job ID.
 * @returns {Promise<Object|undefined>} The job, or `undefined` if not found.
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
 * Retrieve all jobs for a given customer.
 *
 * @param {number} customerId - The customer's ID.
 * @returns {Promise<Array<Object>>} Matching job records.
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
 * Retrieve all jobs with a specific status.
 *
 * @param {string} status - One of: 'enquiry', 'quoted', 'booked', 'in_progress', 'complete'.
 * @returns {Promise<Array<Object>>} Matching job records.
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
 * Create a new job record.
 *
 * Automatically sets `createdAt` and `updatedAt` timestamps and
 * applies sensible defaults for omitted fields.
 *
 * @param {Object} jobData - Job fields (excluding `id`).
 * @returns {Promise<number>} The auto-generated job ID.
 */
export async function create(jobData) {
  const db = await getDB();
  const now = new Date().toISOString();

  const record = {
    customerId: 0,
    title: '',
    description: '',
    status: 'enquiry',
    scheduledDate: '',
    completedDate: '',
    jobType: 'service',
    notes: [],
    finalPrice: 0,
    paymentStatus: 'unpaid',
    paymentMethod: '',
    followUpRequired: false,
    serviceHistoryNote: '',
    createdAt: now,
    updatedAt: now,
    ...jobData,
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
 * Update an existing job record (partial update supported).
 *
 * @param {number} id - Job ID to update.
 * @param {Object} updates - Fields to merge into the existing record.
 * @returns {Promise<Object>} The updated job record.
 * @throws {Error} If the job does not exist.
 */
export async function update(id, updates) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Job with id ${id} not found`);
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
 * Delete a job by primary key.
 *
 * @param {number} id - Job ID to delete.
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
 * Retrieve all jobs scheduled for today (UTC date comparison).
 *
 * @returns {Promise<Array<Object>>} Jobs whose `scheduledDate` matches today.
 */
export async function getToday() {
  const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const allJobs = await getAll();

  return allJobs.filter((job) => {
    if (!job.scheduledDate) return false;
    return job.scheduledDate.slice(0, 10) === todayStr;
  });
}

/**
 * Retrieve the most recent jobs, ordered by `createdAt` descending.
 *
 * @param {number} [limit=10] - Maximum number of records to return.
 * @returns {Promise<Array<Object>>} The most recent job records.
 */
export async function getRecent(limit = 10) {
  const allJobs = await getAll();

  return allJobs
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limit);
}

export { remove as delete };
