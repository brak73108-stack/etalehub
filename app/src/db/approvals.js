/**
 * EtaleHub — Approval Queue CRUD Operations
 *
 * Manages the human-in-the-loop approval queue used by the AI
 * trust-chain system.  High-risk AI actions land here for manual
 * review before being executed.
 *
 * @module db/approvals
 */

import { getDB } from './database.js';

const STORE_NAME = 'approvals';

/**
 * Retrieve every approval record.
 *
 * @returns {Promise<Array<Object>>} All approval objects.
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
 * Retrieve a single approval by primary key.
 *
 * @param {number} id - Approval ID.
 * @returns {Promise<Object|undefined>} The approval, or `undefined` if not found.
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
 * Retrieve all approvals that are still pending review.
 *
 * @returns {Promise<Array<Object>>} Pending approval records.
 */
export async function getPending() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a new approval record.
 *
 * Automatically sets `createdAt` and defaults `status` to `'pending'`.
 *
 * @param {Object} approvalData - Approval fields (excluding `id`).
 * @returns {Promise<number>} The auto-generated approval ID.
 */
export async function create(approvalData) {
  const db = await getDB();
  const now = new Date().toISOString();

  const record = {
    actionType: '',
    entityType: '',
    entityId: 0,
    proposedAction: {},
    riskLevel: 'low',
    status: 'pending',
    createdAt: now,
    approvedAt: '',
    rejectedAt: '',
    ...approvalData,
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
 * Approve a pending approval request.
 *
 * Sets `status` to `'approved'` and records the `approvedAt` timestamp.
 *
 * @param {number} id - Approval ID to approve.
 * @returns {Promise<Object>} The updated approval record.
 * @throws {Error} If the approval does not exist or is not pending.
 */
export async function approve(id) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Approval with id ${id} not found`);
  }
  if (existing.status !== 'pending') {
    throw new Error(`Approval ${id} is already ${existing.status}`);
  }

  const updated = {
    ...existing,
    status: 'approved',
    approvedAt: new Date().toISOString(),
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
 * Reject a pending approval request.
 *
 * Sets `status` to `'rejected'` and records the `rejectedAt` timestamp.
 *
 * @param {number} id - Approval ID to reject.
 * @returns {Promise<Object>} The updated approval record.
 * @throws {Error} If the approval does not exist or is not pending.
 */
export async function reject(id) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Approval with id ${id} not found`);
  }
  if (existing.status !== 'pending') {
    throw new Error(`Approval ${id} is already ${existing.status}`);
  }

  const updated = {
    ...existing,
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
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
 * Count the total number of pending approvals.
 *
 * @returns {Promise<number>} The number of pending approval records.
 */
export async function getCount() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
