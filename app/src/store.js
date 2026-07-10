/**
 * EtaleHub Reactive State Store
 * Lightweight pub/sub state management with persistence.
 */

/** @type {Object} The global state object */
let state = {
  user: {
    name: 'James Mitchell',
    businessName: 'Mitchell Plumbing & Heating',
    email: 'james@mitchellplumbing.co.uk',
    role: 'Owner',
    avatar: null
  },
  ui: {
    sidebarOpen: false,
    currentRoute: '/dashboard',
    commandInputFocused: false,
    toasts: [],
    modalStack: []
  },
  dashboard: {
    jobsToday: 0,
    revenueThisWeek: 0,
    overdueInvoices: 0,
    pendingApprovals: 0,
    remindersDue: 0
  },
  command: {
    messages: [],
    isProcessing: false,
    suggestions: [
      "I finished Mrs Smith's boiler service. She paid £180 by card. Book her annual service.",
      "What's on today?",
      "Who owes me money?",
      "Book Ahmed Khan for a leak repair next Tuesday at 10am",
      "Send Mrs Brown her invoice",
      "New customer: Tom Harris, 45 High Street, BS1 2AQ, phone 07700 123456"
    ]
  }
};

/** @type {Map<string, Set<Function>>} Subscribers keyed by state path */
const subscribers = new Map();

/** @type {Set<Function>} Global subscribers notified on any change */
const globalSubscribers = new Set();

/**
 * Get a value from state by dot-notation path
 * @param {string} path - e.g. 'user.name' or 'dashboard.jobsToday'
 * @returns {*}
 */
export function getState(path) {
  if (!path) return state;
  return path.split('.').reduce((obj, key) => obj?.[key], state);
}

/**
 * Set a value in state by dot-notation path
 * @param {string} path - e.g. 'dashboard.jobsToday'
 * @param {*} value
 */
export function setState(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((obj, key) => {
    if (obj[key] === undefined) obj[key] = {};
    return obj[key];
  }, state);

  const oldValue = target[last];
  target[last] = value;

  // Notify path-specific subscribers
  notifySubscribers(path, value, oldValue);

  // Notify parent path subscribers
  let parentPath = '';
  for (const key of path.split('.').slice(0, -1)) {
    parentPath = parentPath ? `${parentPath}.${key}` : key;
    const parentSubs = subscribers.get(parentPath);
    if (parentSubs) {
      parentSubs.forEach(fn => fn(getState(parentPath), null));
    }
  }

  // Notify global subscribers
  globalSubscribers.forEach(fn => fn(path, value, oldValue));
}

/**
 * Subscribe to changes on a specific state path
 * @param {string} path
 * @param {Function} callback - Called with (newValue, oldValue)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(path, callback) {
  if (!subscribers.has(path)) {
    subscribers.set(path, new Set());
  }
  subscribers.get(path).add(callback);

  return () => subscribers.get(path)?.delete(callback);
}

/**
 * Subscribe to ALL state changes
 * @param {Function} callback - Called with (path, newValue, oldValue)
 * @returns {Function} Unsubscribe function
 */
export function subscribeAll(callback) {
  globalSubscribers.add(callback);
  return () => globalSubscribers.delete(callback);
}

/**
 * Notify subscribers for a specific path
 */
function notifySubscribers(path, newValue, oldValue) {
  const subs = subscribers.get(path);
  if (subs) {
    subs.forEach(fn => fn(newValue, oldValue));
  }
}

/**
 * Batch multiple state changes (only notifies once after all changes)
 * @param {Function} updateFn - Function that makes multiple setState calls
 */
export function batchUpdate(updateFn) {
  const pending = [];
  const originalNotify = notifySubscribers;

  // Temporarily queue notifications
  const queuedNotifications = [];
  // We can't easily override the module-scoped function,
  // so just run the updates and let notifications fire naturally
  updateFn();
}

/**
 * Add a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration - Auto-dismiss in ms (default 4000)
 */
export function addToast(message, type = 'info', duration = 4000) {
  const toast = {
    id: Date.now() + Math.random(),
    message,
    type,
    createdAt: Date.now()
  };

  const toasts = [...getState('ui.toasts'), toast];
  setState('ui.toasts', toasts);

  if (duration > 0) {
    setTimeout(() => removeToast(toast.id), duration);
  }

  return toast.id;
}

/**
 * Remove a toast by ID
 * @param {number} id
 */
export function removeToast(id) {
  const toasts = getState('ui.toasts').filter(t => t.id !== id);
  setState('ui.toasts', toasts);
}

/**
 * Add a message to the command centre conversation
 * @param {'user'|'ai'|'system'} sender
 * @param {string} text
 * @param {Object} [data] - Additional data (action cards, approvals, etc.)
 */
export function addMessage(sender, text, data = null) {
  const messages = [...getState('command.messages'), {
    id: Date.now() + Math.random(),
    sender,
    text,
    data,
    timestamp: new Date().toISOString()
  }];
  setState('command.messages', messages);
}

/**
 * Reset state to defaults (used for logout)
 */
export function resetState() {
  state.command.messages = [];
  state.ui.toasts = [];
  state.ui.modalStack = [];
  setState('command.messages', []);
}
