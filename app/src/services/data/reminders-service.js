import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getReminders(); }
export async function getById(id) { return getProvider().getReminderById(id); }
export async function getByCustomerId(id) { const all = await getAll() || []; return all.filter(r => r.customerId === id); }
export async function create(data) { return getProvider().createReminder(data); }
export async function update(id, data) { return getProvider().updateReminder(id, data); }

export async function getUpcoming(days = 7) {
  const all = (await getAll()) || [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return all.filter(r => r.status === 'pending' && new Date(r.scheduledDate) <= nextWeek);
}
