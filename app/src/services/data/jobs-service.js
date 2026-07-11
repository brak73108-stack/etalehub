import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getJobs(); }
export async function getById(id) { return getProvider().getJobById(id); }
export async function getByCustomerId(id) { return getProvider().getJobsByCustomerId(id); }
export async function create(data) {
  const result = await getProvider().createJob(data);
  await logAudit('Created job', 'job', result.id, result);
  return result;
}

export async function update(id, data) {
  const result = await getProvider().updateJob(id, data);
  await logAudit('Updated job', 'job', id, data);
  return result;
}

export async function cancel(id) {
  const result = await getProvider().updateJob(id, { status: 'cancelled' });
  await logAudit('Cancelled job', 'job', id, { status: 'cancelled' });
  return result;
}

export async function markComplete(id, finalPrice) {
  const updateData = { status: 'completed', completedDate: new Date().toISOString() };
  if (finalPrice !== undefined) updateData.finalPrice = finalPrice;
  const result = await getProvider().updateJob(id, updateData);
  await logAudit('Completed job', 'job', id, updateData);
  return result;
}

export async function markInProgress(id) {
  const result = await getProvider().updateJob(id, { status: 'in_progress' });
  await logAudit('Started job', 'job', id, { status: 'in_progress' });
  return result;
}

async function logAudit(action, entityType, entityId, details) {
  try {
    const { create: createAudit } = await import('./audit-service.js');
    await createAudit({ action, entityType, entityId, details, source: 'manual' });
  } catch(e) { console.warn('Failed to log audit:', e); }
}
export async function getToday() {
  const all = (await getAll()) || [];
  const todayStr = new Date().toISOString().split('T')[0];
  return all.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr));
}
