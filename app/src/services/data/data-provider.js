import { isDemoMode } from '../mode-service.js';
import * as indexeddbProvider from './indexeddb-provider.js';
import * as supabaseProvider from './supabase-provider.js';

export function getProvider() {
  if (isDemoMode()) {
    return indexeddbProvider;
  } else {
    return supabaseProvider;
  }
}
