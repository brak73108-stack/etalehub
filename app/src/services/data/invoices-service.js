import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getInvoices(); }
export async function getById(id) { return getProvider().getInvoiceById(id); }
export async function getByCustomerId(id) { const all = await getAll() || []; return all.filter(i => i.customerId === id); }
export async function getNextInvoiceNumber() { return getProvider().getNextInvoiceNumber(); }
export async function create(data) {
  const result = await getProvider().createInvoice(data);
  await logAudit('Created invoice', 'invoice', result.id, result);
  return result;
}

export async function update(id, data) {
  const result = await getProvider().updateInvoice(id, data);
  await logAudit('Updated invoice', 'invoice', id, data);
  return result;
}

export async function voidInvoice(id) {
  const result = await getProvider().updateInvoice(id, { status: 'void' });
  await logAudit('Voided invoice', 'invoice', id, { status: 'void' });
  return result;
}

export async function markSent(id) {
  const result = await getProvider().updateInvoice(id, { status: 'sent' });
  await logAudit('Sent invoice', 'invoice', id, { status: 'sent' });
  return result;
}

export async function markPaid(id) {
  const result = await getProvider().updateInvoice(id, { status: 'paid', paidDate: new Date().toISOString() });
  await logAudit('Marked invoice as paid', 'invoice', id, { status: 'paid' });
  return result;
}

async function logAudit(action, entityType, entityId, details) {
  try {
    const { create: createAudit } = await import('./audit-service.js');
    await createAudit({ action, entityType, entityId, details, source: 'manual' });
  } catch(e) { console.warn('Failed to log audit:', e); }
}

export async function getOverdue() {
  const all = (await getAll()) || [];
  const now = new Date();
  return all.filter(i => i.status !== 'paid' && new Date(i.dueDate) < now);
}
