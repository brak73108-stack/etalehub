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

// Proxied Settings Methods
export async function getAllSettings() {
  return getProvider().getAllSettings();
}

export async function getSettingSection(section) {
  return getProvider().getSettingSection(section);
}

export async function updateSettingSection(section, data) {
  return getProvider().updateSettingSection(section, data);
}

export async function getBusinessSettingsRow() {
  return getProvider().getBusinessSettingsRow();
}

export async function updateBusinessSettingsRow(updates) {
  return getProvider().updateBusinessSettingsRow(updates);
}

// --- FEEDBACK ---
export async function createFeedback(data) {
  return getProvider().createFeedback(data);
}
