import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getReminders(); }
export async function getById(id) { return getProvider().getReminderById(id); }
export async function getByCustomerId(id) { const all = await getAll() || []; return all.filter(r => r.customerId === id); }
export async function create(data) { return getProvider().createReminder(data); }
export async function update(id, data) { return getProvider().updateReminder(id, data); }
