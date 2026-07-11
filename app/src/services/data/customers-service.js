import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getCustomers(); }
export async function getById(id) { return getProvider().getCustomerById(id); }
export async function getByName(name) { return getProvider().getCustomerByName(name); }
export async function create(data) {
  const result = await getProvider().createCustomer(data);
  await logAudit('Created customer', 'customer', result.id, result);
  return result;
}

export async function update(id, data) {
  const result = await getProvider().updateCustomer(id, data);
  await logAudit('Updated customer', 'customer', id, data);
  return result;
}

export async function archive(id) {
  const result = await getProvider().updateCustomer(id, { customerStatus: 'archived' });
  await logAudit('Archived customer', 'customer', id, { customerStatus: 'archived' });
  return result;
}

async function logAudit(action, entityType, entityId, details) {
  try {
    const { create: createAudit } = await import('./audit-service.js');
    await createAudit({ action, entityType, entityId, details, source: 'manual' });
  } catch(e) { console.warn('Failed to log audit:', e); }
}
