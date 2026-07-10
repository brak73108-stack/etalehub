import { getProvider } from './data-provider.js';

export async function getAll() { return getProvider().getQuotes(); }
export async function getById(id) { return getProvider().getQuoteById(id); }
export async function create(data) { return getProvider().createQuote(data); }
export async function update(id, data) { return getProvider().updateQuote(id, data); }
