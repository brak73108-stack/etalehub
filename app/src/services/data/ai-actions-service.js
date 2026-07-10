import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getAiActions(); }
export async function create(data) { return getProvider().createAiAction(data); }
