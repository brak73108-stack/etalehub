import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getQuotes(); }
export async function getById(id) { return getProvider().getQuoteById(id); }
export async function create(data) {
  const result = await getProvider().createQuote(data);
  await logAudit('Created quote', 'quote', result.id, result);
  return result;
}

export async function update(id, data) {
  const result = await getProvider().updateQuote(id, data);
  await logAudit('Updated quote', 'quote', id, data);
  return result;
}

export async function expireQuote(id) {
  const result = await getProvider().updateQuote(id, { status: 'expired' });
  await logAudit('Expired quote', 'quote', id, { status: 'expired' });
  return result;
}

export async function markSent(id) {
  const result = await getProvider().updateQuote(id, { status: 'sent' });
  await logAudit('Sent quote', 'quote', id, { status: 'sent' });
  return result;
}

export async function markAccepted(id) {
  const result = await getProvider().updateQuote(id, { status: 'accepted' });
  await logAudit('Quote accepted', 'quote', id, { status: 'accepted' });
  return result;
}

export async function markRejected(id) {
  const result = await getProvider().updateQuote(id, { status: 'rejected' });
  await logAudit('Quote rejected', 'quote', id, { status: 'rejected' });
  return result;
}

async function logAudit(action, entityType, entityId, details) {
  try {
    const { create: createAudit } = await import('./audit-service.js');
    await createAudit({ action, entityType, entityId, details, source: 'manual' });
  } catch(e) { console.warn('Failed to log audit:', e); }
}
