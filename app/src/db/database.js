/**
 * EtaleHub — IndexedDB Database Manager
 *
 * Handles database creation, versioning, object-store setup, and
 * connection pooling.  Uses the raw IndexedDB API wrapped in Promises
 * so no third-party library (e.g. idb) is required.
 *
 * @module db/database
 */

const DB_NAME = 'etalehub';
const DB_VERSION = 3;

/** @type {IDBDatabase|null} */
let dbInstance = null;

/**
 * Store definitions used during the `onupgradeneeded` migration.
 * Each entry describes a store name, its key-path and whether
 * auto-increment is enabled, plus the indexes to create.
 *
 * @type {Array<{
 *   name: string,
 *   options: IDBObjectStoreParameters,
 *   indexes: Array<{name: string, keyPath: string, options?: IDBIndexParameters}>
 * }>}
 */
const STORE_DEFINITIONS = [
  {
    name: 'customers',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'name', keyPath: 'name', options: { unique: false } },
      { name: 'email', keyPath: 'email', options: { unique: false } },
      { name: 'phone', keyPath: 'phone', options: { unique: false } },
      { name: 'customerStatus', keyPath: 'customerStatus', options: { unique: false } },
      { name: 'lastServiceDate', keyPath: 'lastServiceDate', options: { unique: false } },
    ],
  },
  {
    name: 'jobs',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'scheduledDate', keyPath: 'scheduledDate', options: { unique: false } },
      { name: 'completedDate', keyPath: 'completedDate', options: { unique: false } },
      { name: 'jobType', keyPath: 'jobType', options: { unique: false } },
    ],
  },
  {
    name: 'invoices',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'invoiceNumber', keyPath: 'invoiceNumber', options: { unique: true } },
      { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
      { name: 'jobId', keyPath: 'jobId', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'dueDate', keyPath: 'dueDate', options: { unique: false } },
    ],
  },
  {
    name: 'quotes',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'quoteNumber', keyPath: 'quoteNumber', options: { unique: true } },
      { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
    ],
  },
  {
    name: 'reminders',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'customerId', keyPath: 'customerId', options: { unique: false } },
      { name: 'jobId', keyPath: 'jobId', options: { unique: false } },
      { name: 'type', keyPath: 'type', options: { unique: false } },
      { name: 'scheduledDate', keyPath: 'scheduledDate', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
    ],
  },
  {
    name: 'approvals',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'actionType', keyPath: 'actionType', options: { unique: false } },
      { name: 'entityType', keyPath: 'entityType', options: { unique: false } },
      { name: 'status', keyPath: 'status', options: { unique: false } },
      { name: 'riskLevel', keyPath: 'riskLevel', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    ],
  },
  {
    name: 'auditLog',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'action', keyPath: 'action', options: { unique: false } },
      { name: 'entityType', keyPath: 'entityType', options: { unique: false } },
      { name: 'entityId', keyPath: 'entityId', options: { unique: false } },
      { name: 'source', keyPath: 'source', options: { unique: false } },
      { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
    ],
  },
  {
    name: 'aiActions',
    options: { keyPath: 'id', autoIncrement: true },
    indexes: [
      { name: 'interpretedIntent', keyPath: 'interpretedIntent', options: { unique: false } },
      { name: 'riskLevel', keyPath: 'riskLevel', options: { unique: false } },
      { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    ],
  },
  {
    name: 'settings',
    options: { keyPath: 'section' },
    indexes: [],
  },
];

/**
 * Run the version-1 migration: create every object store and its indexes.
 *
 * @param {IDBDatabase} db - The database instance provided by `onupgradeneeded`.
 */
function migrateV1(db) {
  for (const storeDef of STORE_DEFINITIONS) {
    if (storeDef.name === 'settings') continue; // Handled in v2
    const store = db.createObjectStore(storeDef.name, storeDef.options);
    for (const idx of storeDef.indexes) {
      store.createIndex(idx.name, idx.keyPath, idx.options);
    }
  }
}

/**
 * Run the version-2 migration: add settings store.
 *
 * @param {IDBDatabase} db
 */
function migrateV2(db) {
  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'section' });
  }
}

/**
 * Run the version-3 migration: add beta_feedback store.
 *
 * @param {IDBDatabase} db
 */
function migrateV3(db) {
  if (!db.objectStoreNames.contains('beta_feedback')) {
    const store = db.createObjectStore('beta_feedback', { keyPath: 'id', autoIncrement: true });
    store.createIndex('feedback_type', 'feedback_type', { unique: false });
    store.createIndex('status', 'status', { unique: false });
  }
}

/**
 * Open (or create) the EtaleHub IndexedDB database and apply any
 * outstanding migrations.
 *
 * The returned `IDBDatabase` instance is cached so that subsequent
 * calls re-use the same connection.
 *
 * @returns {Promise<IDBDatabase>} A promise that resolves with the open database.
 */
export async function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = /** @type {IDBOpenDBRequest} */ (event.target).result;
      const oldVersion = event.oldVersion;

      // Version 0 → 1: initial schema
      if (oldVersion < 1) {
        migrateV1(db);
      }

      // Version 1 → 2: settings store
      if (oldVersion < 2) {
        migrateV2(db);
      }

      // Version 2 → 3: beta_feedback store
      if (oldVersion < 3) {
        migrateV3(db);
      }
    };

    request.onsuccess = async (event) => {
      dbInstance = /** @type {IDBOpenDBRequest} */ (event.target).result;

      // If the browser closes the connection behind our back, clear the cache.
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      // Run the seeder (it checks if it's already seeded)
      try {
        const { seedDatabase } = await import('./seed.js');
        await seedDatabase();
      } catch (e) {
        console.warn('[EtaleHub DB] Failed to run seeder:', e);
      }

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[EtaleHub DB] Failed to open database:', event.target.error);
      reject(event.target.error);
    };

    request.onblocked = () => {
      console.warn('[EtaleHub DB] Database open blocked — close other tabs using this app.');
    };
  });
}

/**
 * Return the cached database connection, opening it first if necessary.
 *
 * This is the primary entry-point used by all CRUD modules.
 *
 * @returns {Promise<IDBDatabase>}
 */
export async function getDB() {
  if (dbInstance) {
    return dbInstance;
  }
  return initDatabase();
}

/**
 * Close the database connection and clear the cached instance.
 * Useful for tests or when the user logs out.
 */
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Completely delete the EtaleHub database.
 * Primarily useful during development or for a "reset all data" feature.
 *
 * @returns {Promise<void>}
 */
export async function deleteDatabase() {
  closeDatabase();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
    request.onblocked = () => {
      console.warn('[EtaleHub DB] Delete blocked — close other tabs.');
    };
  });
}
