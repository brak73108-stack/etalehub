/**
 * EtaleHub Settings View
 * Configuration panel demonstrating AI behaviour toggles and safety rules.
 */

import { addToast } from '../store.js';

export default async function renderSettings() {
  // Bind the reset button globally so it can be clicked
  window.resetEtaleHubDatabase = async () => {
    if (confirm('⚠️ DANGER: Are you sure you want to completely clear the EtaleHub demo database?\n\nAll customers, jobs, and history will be wiped. The page will reload and re-seed the original demo data.')) {
      const { deleteDatabase } = await import('../db/database.js');
      try {
        await deleteDatabase();
        alert('Database cleared. Reloading app to re-seed demo data.');
        window.location.reload();
      } catch (err) {
        addToast('Failed to reset database', 'error');
      }
    }
  };
  
  window.toggleSetting = (el) => {
    // Visual toggle only for Phase 2 UI demonstration
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
        
        <div class="card" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Business Profile</h3>
          <div style="padding: 1.5rem;">
            <div style="margin-bottom: 1rem;">
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Business Name</label>
              <input type="text" class="command-input" value="Demo Plumbing & Heating Ltd" style="width:100%;" />
            </div>
            <div style="margin-bottom: 1rem;">
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Default Currency</label>
              <select class="command-input" style="width:100%;">
                <option>GBP (£)</option>
              </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Working Hours</label>
                <input type="text" class="command-input" value="Mon-Fri, 08:00 - 18:00" style="width:100%;" />
              </div>
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem; color:var(--text-muted);">Message Tone</label>
                <select class="command-input" style="width:100%;">
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
            ℹ️ Phase 2 Prototype Status
          </h3>
          <div style="padding: 1.5rem; display:flex; flex-direction:column; gap: 1.5rem;">
            
            <div>
              <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Working in Phase 2:</h4>
              <div style="display:flex; flex-direction:column; gap: 0.25rem;">
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Local customer records</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Local job records</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Local invoices & reminders</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> AI command parsing</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Agent workflow</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Approval cards & audit logs</div>
                <div style="display:flex; align-items:center; gap:0.5rem;"><span style="color:var(--accent-green)">✓</span> Demo database reset</div>
              </div>
            </div>

            <div>
              <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem;">Not active yet:</h4>
              <div style="display:flex; flex-direction:column; gap: 0.25rem;">
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real email or SMS sending</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real payment collection</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real authentication</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Cloud database sync</div>
                <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted)"><span>—</span> Real LLM API</div>
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
            <p class="text-muted" style="margin-bottom: 1.5rem;">Reset the application data to its original demo state. This will wipe all current records and recreate the original seeded data on next load.</p>
            <button class="btn btn-danger" onclick="window.resetEtaleHubDatabase()" style="width: 100%; justify-content:center; padding: 0.75rem;">Reset Demo Database</button>
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
            ${createToggle('setting-draft-mode', 'Draft Only Mode', 'EtaleHub will only suggest actions in the Command Centre and will not execute anything without explicit approval.', false)}
            ${createToggle('setting-safe-actions', 'Allow safe auto-actions', 'EtaleHub can automatically update local database records (like marking a job complete) when instructed.', true)}
            ${createToggle('setting-auto-annual', 'Auto-create annual service reminders', 'Automatically schedule a 12-month reminder when a boiler service is marked complete.', true)}
            ${createToggle('setting-auto-payment', 'Auto-record payments', 'Automatically create paid invoices when you explicitly state the customer paid.', true)}
            ${createToggle('setting-ask-message', 'Always ask before sending messages', 'Enforce the approval queue for all outgoing customer emails and SMS.', true)}
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
