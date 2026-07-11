import { getDB } from './database.js';

/**
 * @typedef {Object} BetaFeedback
 * @property {number} [id] - Auto-incremented local ID
 * @property {string} feedback_type - 'bug', 'feature_request', 'confusing_workflow', 'missing_workflow', 'praise', 'other'
 * @property {string} [page_or_workflow] - Where this occurred
 * @property {string} description - The user's feedback text
 * @property {string} [urgency] - 'low', 'medium', 'high'
 * @property {string} [contact_email] - User contact email if provided
 * @property {string} mode - 'production' or 'demo'
 * @property {string} status - 'new', 'reviewed', 'resolved'
 * @property {string} created_at - ISO timestamp
 */

/**
 * Get all feedback items from local IndexedDB (Demo Mode).
 * @returns {Promise<BetaFeedback[]>}
 */
export async function getAll() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('beta_feedback', 'readonly');
    const store = tx.objectStore('beta_feedback');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a new feedback item in local IndexedDB.
 * @param {Omit<BetaFeedback, 'id'>} feedbackData
 * @returns {Promise<BetaFeedback>} The newly created feedback with its ID.
 */
export async function create(feedbackData) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('beta_feedback', 'readwrite');
    const store = tx.objectStore('beta_feedback');

    const newFeedback = {
      ...feedbackData,
      status: 'new',
      created_at: new Date().toISOString()
    };

    const request = store.add(newFeedback);

    request.onsuccess = () => {
      newFeedback.id = request.result;
      resolve(newFeedback);
    };

    request.onerror = () => reject(request.error);
  });
}
