/**
 * EtaleHub — AI Action Log
 *
 * Records every natural-language interaction processed by the AI
 * assistant, including the interpreted intent, extracted entities,
 * proposed and executed actions, confidence scores, and risk levels.
 *
 * @module db/ai-actions
 */

import { getDB } from './database.js';

const STORE_NAME = 'aiActions';

/**
 * Retrieve every AI action record.
 *
 * @returns {Promise<Array<Object>>} All AI action objects.
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
 * Retrieve the most recent AI action entries, ordered by `createdAt`
 * descending.
 *
 * @param {number} [limit=20] - Maximum number of records to return.
 * @returns {Promise<Array<Object>>} The most recent AI action records.
 */
export async function getRecent(limit = 20) {
  const allActions = await getAll();

  return allActions
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limit);
}

/**
 * Create a new AI action log entry.
 *
 * The `createdAt` timestamp is set automatically if not provided.
 *
 * @param {Object} actionData - AI action fields (excluding `id`).
 * @param {string} actionData.inputText - The raw user input.
 * @param {string} actionData.interpretedIntent - What the AI understood.
 * @param {Object} [actionData.extractedEntities] - Entities pulled from input.
 * @param {Array<Object>} [actionData.proposedActions] - Actions the AI proposed.
 * @param {Array<Object>} [actionData.executedActions] - Actions actually executed.
 * @param {number} [actionData.confidenceScore] - 0–1 confidence level.
 * @param {string} [actionData.riskLevel] - Risk classification string.
 * @returns {Promise<number>} The auto-generated AI action ID.
 */
export async function create(actionData) {
  const db = await getDB();

  const record = {
    inputText: '',
    interpretedIntent: '',
    extractedEntities: {},
    proposedActions: [],
    executedActions: [],
    confidenceScore: 0,
    riskLevel: 'low',
    createdAt: new Date().toISOString(),
    ...actionData,
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
