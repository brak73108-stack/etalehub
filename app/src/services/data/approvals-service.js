import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getApprovals(); }
export async function getById(id) { return getProvider().getApprovalById(id); }
export async function getPending() { return getProvider().getPendingApprovals(); }
export async function create(data) {
  const result = await getProvider().createApproval(data);
  await logAudit('Created approval request', 'approval', result.id, result, 'system');
  return result;
}

export async function update(id, data) {
  const result = await getProvider().updateApproval(id, data);
  await logAudit('Updated approval request', 'approval', id, data, 'manual');
  return result;
}

export async function approve(id) {
  const result = await getProvider().approveApproval(id);
  await logAudit('Approved action', 'approval', id, { status: 'approved' }, 'manual');
  return result;
}

export async function reject(id) {
  const result = await getProvider().rejectApproval(id);
  await logAudit('Rejected action', 'approval', id, { status: 'rejected' }, 'manual');
  return result;
}

async function logAudit(action, entityType, entityId, details, source = 'manual') {
  try {
    const { create: createAudit } = await import('./audit-service.js');
    await createAudit({ action, entityType, entityId, details, source });
  } catch(e) { console.warn('Failed to log audit:', e); }
}
