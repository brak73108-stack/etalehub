import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getApprovals(); }
export async function getById(id) { return getProvider().getApprovalById(id); }
export async function getPending() { return getProvider().getPendingApprovals(); }
export async function create(data) { return getProvider().createApproval(data); }
export async function approve(id) { return getProvider().approveApproval(id); }
export async function reject(id) { return getProvider().rejectApproval(id); }
