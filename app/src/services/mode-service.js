import { supabase } from './supabase-client.js';

let currentMode = 'demo';
let currentBusinessId = null;

// Initialize the mode based on session
export async function initMode() {
  if (!supabase) {
    currentMode = 'demo';
    return;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentMode = 'production';
    // Fetch the user's business membership to set currentBusinessId
    const { data: membership } = await supabase
      .from('business_users')
      .select('business_id')
      .eq('profile_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .single();
      
    if (membership) {
      currentBusinessId = membership.business_id;
    } else {
      currentBusinessId = null; // Requires onboarding
    }
  } else {
    currentMode = 'demo';
    currentBusinessId = null;
  }
}

export function getMode() {
  return currentMode;
}

export function isDemoMode() {
  return currentMode === 'demo';
}

export function getCurrentBusinessId() {
  return currentBusinessId;
}

export function setProductionMode(businessId) {
  currentMode = 'production';
  currentBusinessId = businessId;
}

export function setDemoMode() {
  currentMode = 'demo';
  currentBusinessId = null;
}
