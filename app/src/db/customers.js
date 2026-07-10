/**
 * EtaleHub — Customer CRUD Operations
 *
 * Provides create, read, update, delete, and search functionality
 * for the `customers` object store.
 *
 * @module db/customers
 */

import { getDB } from './database.js';

const STORE_NAME = 'customers';

/**
 * Retrieve every customer record.
 *
 * @returns {Promise<Array<Object>>} All customer objects.
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
 * Retrieve a single customer by primary key.
 *
 * @param {number} id - Customer ID.
 * @returns {Promise<Object|undefined>} The customer, or `undefined` if not found.
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
 * Fuzzy-search customers by name (case-insensitive substring match).
 *
 * @param {string} name - The partial name to search for.
 * @returns {Promise<Array<Object>>} Matching customer records.
 */
export async function getByName(name) {
  const allCustomers = await getAll();
  const lowerName = name.toLowerCase();
  return allCustomers.filter((c) => c.name.toLowerCase().includes(lowerName));
}

/**
 * Create a new customer record.
 *
 * Automatically sets `createdAt` and `updatedAt` timestamps and
 * defaults `customerStatus` to `'new'` if not provided.
 *
 * @param {Object} customerData - Customer fields (excluding `id`).
 * @returns {Promise<number>} The auto-generated customer ID.
 */
export async function create(customerData) {
  const db = await getDB();
  const now = new Date().toISOString();

  const record = {
    name: '',
    email: '',
    phone: '',
    address: '',
    propertyNotes: '',
    equipmentList: [],
    preferredContact: 'phone',
    lastServiceDate: '',
    nextServiceDue: '',
    customerStatus: 'new',
    notes: '',
    communicationStyle: '',
    lifetimeValue: 0,
    createdAt: now,
    updatedAt: now,
    ...customerData,
  };

  // Never allow the caller to set the id — let autoIncrement handle it.
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
 * Update an existing customer record (partial update supported).
 *
 * @param {number} id - Customer ID to update.
 * @param {Object} updates - Fields to merge into the existing record.
 * @returns {Promise<Object>} The updated customer record.
 * @throws {Error} If the customer does not exist.
 */
export async function update(id, updates) {
  const db = await getDB();
  const existing = await getById(id);

  if (!existing) {
    throw new Error(`Customer with id ${id} not found`);
  }

  const updated = {
    ...existing,
    ...updates,
    id, // ensure the key is preserved
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
 * Delete a customer by primary key.
 *
 * @param {number} id - Customer ID to delete.
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
 * Search customers across multiple fields (name, email, phone, address,
 * notes) using a case-insensitive substring match.
 *
 * @param {string} query - The search string.
 * @returns {Promise<Array<Object>>} Matching customer records.
 */
export async function search(query) {
  const allCustomers = await getAll();
  const lowerQuery = query.toLowerCase();

  return allCustomers.filter((c) => {
    const searchable = [
      c.name,
      c.email,
      c.phone,
      c.address,
      c.notes,
      c.propertyNotes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(lowerQuery);
  });
}

// Re-export `remove` as `delete` for the public API.
// (`delete` is a reserved word so we use the alias pattern.)
export { remove as delete };
