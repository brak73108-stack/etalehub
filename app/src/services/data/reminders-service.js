import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getReminders(); }
export async function getById(id) { return getProvider().getReminderById(id); }
export async function getByCustomerId(id) { const all = await getAll() || []; return all.filter(r => r.customerId === id); }
export async function create(data) {
  const result = await getProvider().createReminder(data);
  await logAudit('Created reminder', 'reminder', result.id, result);
  return result;
}

export async function update(id, data) {
  const result = await getProvider().updateReminder(id, data);
  await logAudit('Updated reminder', 'reminder', id, data);
  return result;
}

export async function markComplete(id) {
  const result = await getProvider().updateReminder(id, { status: 'completed' });
  await logAudit('Completed reminder', 'reminder', id, { status: 'completed' });
  return result;
}

export async function dismiss(id) {
  const result = await getProvider().updateReminder(id, { status: 'dismissed' });
  await logAudit('Dismissed reminder', 'reminder', id, { status: 'dismissed' });
  return result;
}

async function logAudit(action, entityType, entityId, details) {
  try {
    const { create: createAudit } = await import('./audit-service.js');
    await createAudit({ action, entityType, entityId, details, source: 'manual' });
  } catch(e) { console.warn('Failed to log audit:', e); }
}

export async function getUpcoming(days = 7) {
  const all = (await getAll()) || [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return all.filter(r => r.status === 'pending' && new Date(r.scheduledDate) <= nextWeek);
}
