import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getInvoices(); }
export async function getById(id) { return getProvider().getInvoiceById(id); }
export async function getByCustomerId(id) { const all = await getAll() || []; return all.filter(i => i.customerId === id); }
export async function getNextInvoiceNumber() { return getProvider().getNextInvoiceNumber(); }
export async function create(data) { return getProvider().createInvoice(data); }
export async function update(id, data) { return getProvider().updateInvoice(id, data); }
