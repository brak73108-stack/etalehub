import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getAuditLogs(); }
export async function create(data) { return getProvider().createAuditLog(data); }
