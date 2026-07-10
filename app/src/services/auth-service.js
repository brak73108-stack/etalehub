import { supabase } from './supabase-client.js';
import { initMode } from './mode-service.js';

// Setup auth state listener
if (supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] State changed:', event);
    await initMode();
    // Dispatch a custom event so the UI can react to auth changes
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { event, session } }));
  });
}

export async function signUp(email, password, fullName) {
  if (!supabase) throw new Error("Supabase is not configured");
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });
  
  if (error) throw error;
  
  // Create profile automatically
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: email,
        full_name: fullName
      });
      
    if (profileError) throw profileError;
  }
  
  return data;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase is not configured");
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.hash = '#/dashboard';
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function createBusiness(name, industry) {
  if (!supabase) throw new Error("Supabase is not configured");
  
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  
  // Create the business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert({
      name,
      industry: industry || 'plumbing_heating',
      owner_id: session.user.id
    })
    .select()
    .single();
    
  if (businessError) throw businessError;
  
  // Create membership
  const { error: membershipError } = await supabase
    .from('business_users')
    .insert({
      business_id: business.id,
      profile_id: session.user.id,
      role: 'owner',
      status: 'active'
    });
    
  if (membershipError) throw membershipError;
  
  // Create settings
  await supabase
    .from('business_settings')
    .insert({ business_id: business.id });
    
  // Refresh mode to pick up new business_id
  await initMode();
  
  return business;
}
