/**
 * EtaleHub Settings View
 * Configuration panel demonstrating AI behaviour toggles and safety rules.
 */

import { addToast } from '../store.js';
import { isDemoMode, getCurrentBusinessId } from '../services/mode-service.js';
import { getSession, signOut } from '../services/auth-service.js';
import { supabase } from '../services/supabase-client.js';

export default async function renderSettings() {
  const isDemo = isDemoMode();
  let userEmail = '';
  let businessName = '';
  
  if (!isDemo) {
    try {
      const session = await getSession();
      if (session) userEmail = session.user.email;
      
      const bId = getCurrentBusinessId();
      if (bId && supabase) {
        const { data } = await supabase.from('businesses').select('name').eq('id', bId).single();
        if (data) businessName = data.name;
      }
    } catch (err) {
      console.error("Error loading profile data in settings:", err);
    }
  }

  // Bind actions globally
  window.handleLogout = async () => {
    try {
      await signOut();
      // Wait a moment then reload to clear state and return to demo/login
      setTimeout(() => window.location.reload(), 100);
    } catch (err) {
      addToast('Failed to log out', 'error');
    }
  };

  window.resetEtaleHubDatabase = async () => {
    if (confirm('⚠️ DANGER: Are you sure you want to completely clear the EtaleHub local demo database?\n\nThis will NOT affect cloud data, but will wipe the local IndexedDB. The page will reload and re-seed the original demo data.')) {
      const { deleteDatabase } = await import('../db/database.js');
      try {
        await deleteDatabase();
        alert('Local database cleared. Reloading app to re-seed demo data.');
        window.location.reload();
      } catch (err) {
        addToast('Failed to reset database', 'error');
      }
    }
  };
  
  window.toggleSetting = (el) => {
    // Visual toggle only for UI demonstration
    const btn = el.querySelector('.toggle-btn');
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      btn.style.background = 'var(--text-muted)';
      btn.style.justifyContent = 'flex-start';
    } else {
      btn.classList.add('active');
      btn.style.background = 'var(--accent-teal)';
      btn.style.justifyContent = 'flex-end';
    }
    addToast('Setting saved locally', 'info');
  };

  const createToggle = (id, label, description, isActive = true) => `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding: 1rem 0; border-bottom: 1px solid var(--border-color);">
      <div style="padding-right: 2rem;">
        <div class="font-medium" style="margin-bottom: 0.25rem;">${label}</div>
        <div class="text-sm text-muted">${description}</div>
      </div>
      <div onclick="toggleSetting(this)" style="cursor:pointer; display:flex; align-items:center; height: 100%;">
        <div class="toggle-btn ${isActive ? 'active' : ''}" style="width: 44px; height: 24px; background: var(--${isActive ? 'accent-teal' : 'text-muted'}); border-radius: 12px; display:flex; align-items:center; padding: 2px; justify-content: ${isActive ? 'flex-end' : 'flex-start'}; transition: all 0.2s;">
          <div style="width: 20px; height: 20px; background: white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Settings</h1>
        <p class="view-subtitle">Manage your EtaleHub account, AI preferences, and safety rules.</p>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1200px;">
      
      <!-- Left Column -->
      <div style="display:flex; flex-direction:column; gap: 2rem;">
        
        <div class="card" style="padding: 0; overflow:hidden; border-top: 4px solid var(--accent-${isDemo ? 'warning' : 'success'});">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); display:flex; justify-content:space-between; align-items:center;">
            Account & Mode
            <span class="badge badge-${isDemo ? 'warning' : 'success'}">${isDemo ? 'DEMO MODE' : 'PRODUCTION MODE'}</span>
          </h3>
          <div style="padding: 1.5rem;">
            ${isDemo ? `
              <p class="text-muted mb-3">You are currently in local Demo Mode. No data is synced to the cloud.</p>
              <div style="display:flex; gap: 1rem;">
                <button class="btn btn-primary" onclick="window.location.hash='#/login'">Log In to Cloud</button>
                <button class="btn btn-ghost" onclick="window.location.hash='#/signup'">Sign Up</button>
              </div>
            ` : `
              <div style="margin-bottom: 1.5rem;">
                <div class="text-sm text-muted mb-1">Connected Workspace</div>
                <div class="font-medium" style="font-size:1.1rem;">${businessName || 'EtaleHub Cloud Workspace'}</div>
              </div>
              <div style="margin-bottom: 1.5rem;">
                <div class="text-sm text-muted mb-1">Logged in as</div>
                <div class="font-medium">${userEmail}</div>
              </div>
              <div>
                <button class="btn btn-ghost" onclick="handleLogout()" style="color: var(--accent-danger); border-color: var(--accent-danger);">Log Out</button>
              </div>
            `}
          </div>
        </div>

        <div class="card" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Business Profile</h3>
          <div style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;">
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Business Name</label>
              <input type="text" class="command-input" value="${businessName || (isDemo ? 'Demo Plumbing & Heating Ltd' : 'My Business')}" style="width:100%;" disabled />
            </div>
            <div style="margin-bottom: 1rem;">
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Default Currency</label>
              <select class="command-input" style="width:100%;" disabled>
                <option>GBP (£)</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Working Hours</label>
                <input type="text" class="command-input" value="Mon-Fri, 08:00 - 18:00" style="width:100%;" disabled />
              </div>
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Message Tone</label>
                <select class="command-input" style="width:100%;" disabled>
                  <option>Professional & Friendly</option>
                  <option>Formal</option>
                  <option>Casual</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden; border-top: 4px solid var(--accent-purple);">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); display:flex; align-items:center; gap: 0.5rem; color: var(--accent-purple);">
            ℹ️ Phase 3 Status
          </h3>
          <div style="padding: 1.5rem; display:flex; flex-direction:column; gap: 1.5rem;">
            
            <div>
              <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Live now:</h4>
              <div style="display:flex; flex-direction:column; gap: 0.25rem;">
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Authentication</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Supabase cloud database</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Business workspace model</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Tenant-aware service layer</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Demo mode preserved</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Approval safety preserved</div>
              </div>
            </div>

            <div>
              <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Still disabled:</h4>
              <div style="display:flex; flex-direction:column; gap: 0.25rem;">
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real email sending</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real SMS sending</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real payments</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real LLM API</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Stripe billing</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Accounting integration</div>
              </div>
            </div>
            
          </div>
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden; border: 1px solid var(--accent-danger);">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: rgba(220, 38, 38, 0.1); color: var(--accent-danger); display:flex; align-items:center; gap:0.5rem;">
            ⚠️ Demo Data Controls
          </h3>
          <div style="padding: 1.5rem;">
            <p class="text-muted" style="margin-bottom: 1.5rem;">Reset the local database to its original demo state. This will wipe all local IndexedDB records and recreate the original seeded data. <strong style="color:white;">This does NOT affect production cloud data.</strong></p>
            <button class="btn btn-danger" onclick="window.resetEtaleHubDatabase()" style="width: 100%; justify-content:center; padding: 0.75rem;">Reset local demo database only</button>
          </div>
        </div>
        
      </div>
      
      <!-- Right Column -->
      <div style="display:flex; flex-direction:column; gap: 2rem;">
        
        <div class="card" style="padding: 0; overflow:hidden; border-top: 4px solid var(--accent-teal);">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); display:flex; align-items:center; gap: 0.5rem;">
            🤖 AI Behaviour
          </h3>
          <div style="padding: 0 1.5rem;">
            ${createToggle('setting-draft-mode', 'Draft only for customer messages', 'EtaleHub will only suggest customer-facing actions and will not execute anything without explicit approval.', true)}
            ${createToggle('setting-safe-actions', 'Safe internal actions can be automated', 'EtaleHub can automatically update database records (like marking a job complete) when instructed.', true)}
            ${createToggle('setting-llm-write', 'LLM does not directly write to DB', 'Workflow execution is deterministic. The LLM only maps intents; the system executes standard DB functions.', true)}
            ${createToggle('setting-auto-annual', 'Auto-create annual service reminders', 'Automatically schedule a 12-month reminder when a boiler service is marked complete.', true)}
            ${createToggle('setting-auto-payment', 'Auto-record payments', 'Automatically create paid invoices when you explicitly state the customer paid.', true)}
          </div>
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden; border-top: 4px solid var(--accent-warning);">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary); display:flex; align-items:center; gap: 0.5rem; color: var(--accent-warning);">
            🛡️ Approval Rules
          </h3>
          <div style="padding: 1.5rem; display:flex; flex-direction:column; gap: 1rem;">
            <p class="text-muted" style="margin-bottom: 0.5rem; font-size: 0.95rem;">These rules dictate which AI actions require your explicit consent before proceeding.</p>
            
            <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 8px;">
              <span>🔒</span> <span class="font-medium">Sending receipt requires approval</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 8px;">
              <span>🔒</span> <span class="font-medium">Sending invoice requires approval</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 8px;">
              <span>🔒</span> <span class="font-medium">Sending quote requires approval</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 8px;">
              <span>🔒</span> <span class="font-medium">Sending payment reminder requires approval</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 8px;">
              <span>🔒</span> <span class="font-medium">Bulk messaging requires approval</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 8px;">
              <span>🔒</span> <span class="font-medium">Deleting records requires approval</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `;
}
