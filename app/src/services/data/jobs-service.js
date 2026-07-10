import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getJobs(); }
export async function getById(id) { return getProvider().getJobById(id); }
export async function getByCustomerId(id) { return getProvider().getJobsByCustomerId(id); }
export async function create(data) { return getProvider().createJob(data); }
export async function update(id, data) { return getProvider().updateJob(id, data); }
