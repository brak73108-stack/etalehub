import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getAuditLogs(); }
export async function create(data) { return getProvider().createAuditLog(data); }

export async function logAudit(action, entityType, entityId, details) {
  try {
    await create({
      action,
      entityType,
      entityId,
      details,
      source: 'manual', // or maybe 'system' for settings
      riskLevel: 'low',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Failed to log audit:', e);
  }
}
