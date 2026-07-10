/**
 * EtaleHub — Audit Log Operations
 *
 * Provides append-only logging of all significant actions performed
 * within the application, whether by a human user or the AI assistant.
 * Supports filtering by entity, source, and recency.
 *
 * @module db/audit
 */

import { getDB } from './database.js';

const STORE_NAME = 'auditLog';

/**
 * Retrieve every audit-log entry.
 *
 * @returns {Promise<Array<Object>>} All audit-log records.
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
 * Retrieve the most recent audit-log entries, ordered by `timestamp`
 * descending.
 *
 * @param {number} [limit=20] - Maximum number of records to return.
 * @returns {Promise<Array<Object>>} The most recent audit entries.
 */
export async function getRecent(limit = 20) {
  const allEntries = await getAll();

  return allEntries
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, limit);
}

/**
 * Create a new audit-log entry.
 *
 * The `timestamp` is set automatically if not provided.
 *
 * @param {Object} logData - Audit fields (excluding `id`).
 * @param {string} logData.action - What happened (e.g. 'create_job').
 * @param {string} logData.entityType - The entity type affected (e.g. 'job').
 * @param {number} [logData.entityId] - The ID of the affected entity.
 * @param {Object} [logData.details] - Additional context.
 * @param {Object} [logData.beforeData] - Snapshot before the change.
 * @param {Object} [logData.afterData] - Snapshot after the change.
 * @param {string} [logData.source='user'] - 'user' or 'ai'.
 * @param {string} [logData.riskLevel='safe'] - Risk classification.
 * @param {string} [logData.approvalStatus='auto'] - Approval status.
 * @returns {Promise<number>} The auto-generated log entry ID.
 */
export async function create(logData) {
  const db = await getDB();

  const record = {
    action: '',
    entityType: '',
    entityId: 0,
    details: {},
    beforeData: null,
    afterData: null,
    source: 'user',
    riskLevel: 'safe',
    approvalStatus: 'auto',
    timestamp: new Date().toISOString(),
    ...logData,
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
 * Retrieve audit-log entries for a specific entity.
 *
 * @param {string} entityType - The entity type (e.g. 'customer', 'job').
 * @param {number} entityId - The entity's ID.
 * @returns {Promise<Array<Object>>} Matching audit-log records.
 */
export async function getByEntity(entityType, entityId) {
  const db = await getDB();

  // We filter on two fields, so we query by one index and filter the other
  // in memory (IndexedDB doesn't support compound queries without a
  // compound index).
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('entityType');
    const request = index.getAll(entityType);

    request.onsuccess = () => {
      const results = request.result.filter((entry) => entry.entityId === entityId);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve audit-log entries by source ('user' or 'ai').
 *
 * @param {string} source - The source to filter on.
 * @returns {Promise<Array<Object>>} Matching audit-log records.
 */
export async function getBySource(source) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('source');
    const request = index.getAll(source);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
