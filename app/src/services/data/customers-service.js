import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getCustomers(); }
export async function getById(id) { return getProvider().getCustomerById(id); }
export async function getByName(name) { return getProvider().getCustomerByName(name); }
export async function create(data) { return getProvider().createCustomer(data); }
export async function update(id, data) { return getProvider().updateCustomer(id, data); }
