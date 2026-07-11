/**
 * EtaleHub Settings View
 * Configuration panel for Business Profile, Beta Limitations, Account/Mode, Service Types, and Defaults.
 */

import { addToast } from '../store.js';
import { isDemoMode, getCurrentBusinessId } from '../services/mode-service.js';
import { getSession, signOut } from '../services/auth-service.js';
import { getSettings, updateSettingsSection, getDefaultSettings } from '../services/data/business-settings-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { getReadableAction, getSourceBadge } from '../utils/audit-helpers.js';
import { supabase } from '../services/supabase-client.js';

export default async function renderSettings() {
  const isDemo = isDemoMode();
  let userEmail = '';
  
  if (!isDemo) {
    try {
      const session = await getSession();
      if (session) userEmail = session.user.email;
    } catch (err) {
      console.error("Error loading profile data in settings:", err);
    }
  }

  // Load Settings
  let settings;
  try {
    settings = await getSettings();
  } catch (err) {
    console.error("Failed to load settings", err);
    settings = { businessProfile: {}, serviceTypes: [], invoiceDefaults: {}, quoteDefaults: {} }; // fallback
  }
  
  const profile = settings.businessProfile || {};
  let serviceTypes = settings.serviceTypes || [];
  
  // Graceful map for old string-based service types
  serviceTypes = serviceTypes.map(st => {
    if (typeof st === 'string') {
      return { id: st.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: st, active: true };
    }
    return st;
  });

  const reminderPreferences = settings.reminderPreferences || {};
  const approvalRules = settings.approvalRules || {};

  // Load audit logs
  let allAudit = [];
  try {
    allAudit = await getAllAuditLogs() || [];
  } catch (e) {
    console.warn("Failed to load audit logs", e);
  }
  
  const recentAudit = allAudit.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);

  // Bind actions globally
  window.handleLogout = async () => {
    try {
      await signOut();
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

  window.switchSettingsTab = (tabId, btnEl) => {
    document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.style.borderBottom = '2px solid transparent';
      btn.style.color = 'var(--text-muted)';
    });
    
    btnEl.style.borderBottom = '2px solid var(--accent-teal)';
    btnEl.style.color = 'var(--text-color)';
  };

  window.handleSaveProfile = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    try {
      const data = {
        businessName: document.getElementById('prof-name').value.trim(),
        tradeType: document.getElementById('prof-trade').value,
        phone: document.getElementById('prof-phone').value.trim(),
        email: document.getElementById('prof-email').value.trim(),
        website: document.getElementById('prof-website').value.trim(),
        address: document.getElementById('prof-address').value.trim(),
        currency: document.getElementById('prof-currency').value,
        timezone: document.getElementById('prof-timezone').value,
      };
      
      // Validation
      if (!data.businessName || !data.tradeType || !data.currency || !data.timezone) {
        throw new Error("Missing required fields");
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error("Invalid email format");
      }
      if (data.website && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(data.website)) {
        throw new Error("Invalid website format");
      }

      await updateSettingsSection('businessProfile', data);
      addToast('Business Profile saved successfully', 'success');
    } catch(err) {
      addToast(err.message || 'Failed to save profile', 'error');
    } finally {
      btn.textContent = 'Save Profile';
      btn.disabled = false;
    }
  };

  // --- SERVICE TYPES LOGIC ---
  window.handleAddServiceType = async () => {
    const input = document.getElementById('new-service-type-name');
    const name = input.value.trim();
    if (!name) return addToast("Service type name required", "error");
    
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (serviceTypes.find(s => s.id === id || s.name.toLowerCase() === name.toLowerCase())) {
      return addToast("Service type already exists", "error");
    }

    serviceTypes.push({ id, name, active: true });
    
    try {
      await updateSettingsSection('serviceTypes', serviceTypes);
      addToast("Service type added", "success");
      input.value = '';
      document.getElementById('service-types-list').innerHTML = renderServiceTypesList(serviceTypes);
    } catch(err) {
      addToast("Failed to save service type", "error");
    }
  };

  window.handleRemoveServiceType = async (id) => {
    if (serviceTypes.length <= 1) {
      return addToast("You must have at least one service type", "error");
    }
    
    serviceTypes = serviceTypes.filter(s => s.id !== id);
    try {
      await updateSettingsSection('serviceTypes', serviceTypes);
      addToast("Service type removed", "success");
      document.getElementById('service-types-list').innerHTML = renderServiceTypesList(serviceTypes);
    } catch(err) {
      addToast("Failed to remove service type", "error");
    }
  };

  window.handleRestoreDefaultServiceTypes = async () => {
    const defaults = getDefaultSettings().serviceTypes;
    serviceTypes = defaults;
    try {
      await updateSettingsSection('serviceTypes', serviceTypes);
      addToast("Default service types restored", "success");
      document.getElementById('service-types-list').innerHTML = renderServiceTypesList(serviceTypes);
    } catch(err) {
      addToast("Failed to restore defaults", "error");
    }
  };

  const renderServiceTypesList = (types) => {
    return types.map(st => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
        <span class="font-medium">${st.name}</span>
        <button class="btn btn-ghost" style="color:var(--accent-danger); padding: 0.25rem 0.5rem; border:none;" onclick="handleRemoveServiceType('${st.id}')">Remove</button>
      </div>
    `).join('');
  };

  // --- DEFAULTS LOGIC ---
  window.handleSaveInvoiceDefaults = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-invoice-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const data = {
        paymentTermsDays: parseInt(document.getElementById('inv-terms').value, 10),
        invoicePrefix: document.getElementById('inv-prefix').value.trim(),
        defaultNotes: document.getElementById('inv-notes').value.trim(),
        paymentInstructions: document.getElementById('inv-instructions').value.trim(),
        requireApprovalBeforeSending: document.getElementById('inv-approval').checked
      };

      if (isNaN(data.paymentTermsDays) || data.paymentTermsDays < 0) throw new Error("Payment terms must be a positive number");
      if (!data.invoicePrefix) throw new Error("Invoice prefix required");
      if (!/^[A-Za-z0-9-]+$/.test(data.invoicePrefix)) throw new Error("Invoice prefix should only contain letters, numbers, and hyphens");

      await updateSettingsSection('invoiceDefaults', data);
      addToast("Invoice defaults saved", "success");
    } catch(err) {
      addToast(err.message, "error");
    } finally {
      btn.textContent = 'Save Invoice Defaults';
      btn.disabled = false;
    }
  };

  window.handleSaveQuoteDefaults = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-quote-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const data = {
        validityDays: parseInt(document.getElementById('quo-validity').value, 10),
        quotePrefix: document.getElementById('quo-prefix').value.trim(),
        defaultNotes: document.getElementById('quo-notes').value.trim(),
        followUpDelayDays: parseInt(document.getElementById('quo-followup').value, 10),
        requireApprovalBeforeSending: document.getElementById('quo-approval').checked
      };

      if (isNaN(data.validityDays) || data.validityDays <= 0) throw new Error("Validity days must be a positive number");
      if (isNaN(data.followUpDelayDays) || data.followUpDelayDays < 0) throw new Error("Follow-up delay must be 0 or a positive number");
      if (!data.quotePrefix) throw new Error("Quote prefix required");
      if (!/^[A-Za-z0-9-]+$/.test(data.quotePrefix)) throw new Error("Quote prefix should only contain letters, numbers, and hyphens");

      await updateSettingsSection('quoteDefaults', data);
      addToast("Quote defaults saved", "success");
    } catch(err) {
      addToast(err.message, "error");
    } finally {
      btn.textContent = 'Save Quote Defaults';
      btn.disabled = false;
    }
  };

  // --- REMINDER PREFERENCES LOGIC ---
  window.handleSaveReminderPreferences = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-reminders-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const enabledTypes = [];
      document.querySelectorAll('.rem-type-check:checked').forEach(cb => {
        enabledTypes.push(cb.value);
      });

      if (enabledTypes.length === 0) {
        throw new Error("At least one reminder type must be enabled");
      }

      const data = {
        annualServiceMonths: parseInt(document.getElementById('rem-annual').value, 10),
        quoteFollowUpDays: parseInt(document.getElementById('rem-quote').value, 10),
        paymentFollowUpDays: parseInt(document.getElementById('rem-payment').value, 10),
        jobFollowUpDays: parseInt(document.getElementById('rem-job').value, 10),
        enabledReminderTypes: enabledTypes
      };

      if (isNaN(data.annualServiceMonths) || data.annualServiceMonths <= 0) throw new Error("Annual service months must be greater than 0");
      if (isNaN(data.quoteFollowUpDays) || data.quoteFollowUpDays < 0) throw new Error("Quote follow-up delay must be 0 or a positive number");
      if (isNaN(data.paymentFollowUpDays) || data.paymentFollowUpDays < 0) throw new Error("Payment follow-up delay must be 0 or a positive number");
      if (isNaN(data.jobFollowUpDays) || data.jobFollowUpDays < 0) throw new Error("Job follow-up delay must be 0 or a positive number");

      await updateSettingsSection('reminderPreferences', data);
      addToast("Reminder preferences saved", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      btn.textContent = 'Save Reminder Preferences';
      btn.disabled = false;
    }
  };
  
  window.handleRestoreDefaultReminders = async () => {
    try {
      const defaults = getDefaultSettings().reminderPreferences;
      await updateSettingsSection('reminderPreferences', defaults);
      addToast("Default reminder preferences restored", "success");
      // Hard refresh just to cleanly reset checkboxes without manual DOM work here
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      addToast("Failed to restore defaults", "error");
    }
  };

  // --- APPROVAL RULES LOGIC ---
  window.handleSaveApprovalRules = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-approvals-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const data = {
        // Locked safety rules forced to true
        requireApprovalForCustomerMessages: true,
        requireApprovalForPaymentReminders: true,
        requireApprovalForBulkActions: true,
        requireApprovalForHighRiskAI: true,
        
        // Configurable
        requireApprovalForInvoiceDrafts: document.getElementById('ar-invoice').checked,
        requireApprovalForQuoteDrafts: document.getElementById('ar-quote').checked,
      };

      await updateSettingsSection('approvalRules', data);
      addToast("Approval rules saved", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      btn.textContent = 'Save Approval Rules';
      btn.disabled = false;
    }
  };

  const tradeOptions = [
    'Plumbing & Heating',
    'Plumbing',
    'Heating Engineer',
    'HVAC',
    'Gas Engineer',
    'Electrical',
    'General Property Maintenance',
    'Other'
  ].map(opt => `<option value="${opt}" ${profile.tradeType === opt ? 'selected' : ''}>${opt}</option>`).join('');

  return `
    <div class="view-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1 class="view-title">Workspace Settings</h1>
        <p class="view-subtitle">Configure your business profile and Beta preferences.</p>
      </div>
      <div>
        <span class="badge badge-${isDemo ? 'warning' : 'success'}" style="font-size: 1rem; padding: 0.5rem 1rem;">
          ${isDemo ? 'DEMO MODE' : 'PRODUCTION MODE'}
        </span>
      </div>
    </div>
    
    <!-- Tab Navigation -->
    <div style="display:flex; gap: 1.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 2rem;">
      <button class="tab-btn" onclick="switchSettingsTab('tab-profile', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid var(--accent-teal); color: var(--text-color);">Business Profile</button>
      <button class="tab-btn" onclick="switchSettingsTab('tab-services', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid transparent; color: var(--text-muted);">Service Types</button>
      <button class="tab-btn" onclick="switchSettingsTab('tab-defaults', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid transparent; color: var(--text-muted);">Invoice & Quote Defaults</button>
      <button class="tab-btn" onclick="switchSettingsTab('tab-reminders', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid transparent; color: var(--text-muted);">Reminder Preferences</button>
      <button class="tab-btn" onclick="switchSettingsTab('tab-approvals', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid transparent; color: var(--text-muted);">Approval Rules</button>
      <button class="tab-btn" onclick="switchSettingsTab('tab-account', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid transparent; color: var(--text-muted);">Account & Mode</button>
      <button class="tab-btn" onclick="switchSettingsTab('tab-limitations', this)" style="background:none; border:none; padding: 1rem 0; cursor:pointer; font-size:1rem; font-weight:500; border-bottom: 2px solid transparent; color: var(--text-muted);">Beta Limitations</button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr; gap: 2rem; max-width: 900px; margin-bottom: 2rem;">
      
      <!-- BUSINESS PROFILE TAB -->
      <div id="tab-profile" class="tab-pane card" style="display:block;">
        <h3 style="margin-top:0; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">Business Profile</h3>
        <form id="settings-profile-form" onsubmit="handleSaveProfile(event)">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Business Name *</label>
              <input type="text" id="prof-name" class="command-input" value="${profile.businessName || ''}" style="width:100%;" required placeholder="e.g. EtaleHub Plumbing" />
            </div>
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Trade Type *</label>
              <select id="prof-trade" class="command-input" style="width:100%;" required>
                <option value="">Select a trade...</option>
                ${tradeOptions}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Phone Number</label>
              <input type="tel" id="prof-phone" class="command-input" value="${profile.phone || ''}" style="width:100%;" placeholder="e.g. 07700 900123" />
            </div>
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Email Address</label>
              <input type="email" id="prof-email" class="command-input" value="${profile.email || ''}" style="width:100%;" placeholder="e.g. info@business.com" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Website</label>
              <input type="text" id="prof-website" class="command-input" value="${profile.website || ''}" style="width:100%;" placeholder="e.g. www.business.com" />
            </div>
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Address</label>
              <input type="text" id="prof-address" class="command-input" value="${profile.address || ''}" style="width:100%;" placeholder="Registered office address" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Currency *</label>
              <select id="prof-currency" class="command-input" style="width:100%;" required>
                <option value="GBP" ${profile.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                <option value="USD" ${profile.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${profile.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
              </select>
            </div>
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Timezone *</label>
              <select id="prof-timezone" class="command-input" style="width:100%;" required>
                <option value="Europe/London" ${profile.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London</option>
                <option value="America/New_York" ${profile.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York</option>
              </select>
            </div>
          </div>

          <div style="display:flex; gap: 1rem;">
            <button type="submit" id="save-profile-btn" class="btn btn-primary">Save Profile</button>
            <button type="button" class="btn btn-ghost" onclick="window.location.reload()">Cancel</button>
          </div>
        </form>
      </div>

      <!-- SERVICE TYPES TAB -->
      <div id="tab-services" class="tab-pane card" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem;">
          <h3 style="margin:0;">Service Types</h3>
          <button class="btn btn-ghost" style="font-size: 0.9rem;" onclick="handleRestoreDefaultServiceTypes()">Restore Defaults</button>
        </div>
        <p class="text-muted mb-3">Define the types of jobs you perform. These appear in job creation forms and help AI categorise requests.</p>
        
        <div id="service-types-list" style="margin-bottom: 1.5rem; border: 1px solid var(--border-color); border-radius: 4px; border-bottom: none;">
          ${renderServiceTypesList(serviceTypes)}
        </div>

        <div style="display:flex; gap: 1rem; align-items:flex-end;">
          <div style="flex:1;">
            <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Add New Service Type</label>
            <input type="text" id="new-service-type-name" class="command-input" style="width:100%;" placeholder="e.g. Underfloor heating repair" />
          </div>
          <button type="button" class="btn btn-primary" onclick="handleAddServiceType()">Add</button>
        </div>
      </div>

      <!-- DEFAULTS TAB -->
      <div id="tab-defaults" class="tab-pane" style="display:none; display:flex; flex-direction:column; gap:2rem;">
        
        <div class="card" style="border-left: 4px solid var(--accent-teal);">
          <h3 style="margin-top:0; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">Invoice Defaults</h3>
          <form onsubmit="handleSaveInvoiceDefaults(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Payment Terms (Days) *</label>
                <input type="number" id="inv-terms" class="command-input" style="width:100%;" value="${invoiceDefaults.paymentTermsDays !== undefined ? invoiceDefaults.paymentTermsDays : 14}" required min="0" />
              </div>
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Invoice Prefix *</label>
                <input type="text" id="inv-prefix" class="command-input" style="width:100%;" value="${invoiceDefaults.invoicePrefix || 'INV'}" required pattern="[A-Za-z0-9-]+" title="Letters, numbers, and hyphens only" />
              </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Default Invoice Notes</label>
              <textarea id="inv-notes" class="command-input" style="width:100%; min-height: 80px; resize:vertical;">${invoiceDefaults.defaultNotes || ''}</textarea>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Payment Instructions</label>
              <textarea id="inv-instructions" class="command-input" style="width:100%; min-height: 80px; resize:vertical;">${invoiceDefaults.paymentInstructions || ''}</textarea>
            </div>

            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-elevated); border-radius: 8px;">
              <label style="display:flex; align-items:center; gap: 0.75rem; cursor:pointer;">
                <input type="checkbox" id="inv-approval" ${invoiceDefaults.requireApprovalBeforeSending !== false ? 'checked' : ''} style="width: 18px; height: 18px;" />
                <span class="font-medium">Require approval before sending invoices</span>
              </label>
              <p class="text-sm text-muted mt-2" style="margin-bottom:0;"><em>External sending is still disabled in beta. These defaults prepare drafts and future workflows only.</em></p>
            </div>

            <button type="submit" id="save-invoice-btn" class="btn btn-primary">Save Invoice Defaults</button>
          </form>
        </div>

        <div class="card" style="border-left: 4px solid var(--accent-purple);">
          <h3 style="margin-top:0; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">Quote Defaults</h3>
          <form onsubmit="handleSaveQuoteDefaults(event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Quote Validity (Days) *</label>
                <input type="number" id="quo-validity" class="command-input" style="width:100%;" value="${quoteDefaults.validityDays !== undefined ? quoteDefaults.validityDays : 30}" required min="1" />
              </div>
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Quote Prefix *</label>
                <input type="text" id="quo-prefix" class="command-input" style="width:100%;" value="${quoteDefaults.quotePrefix || 'QUO'}" required pattern="[A-Za-z0-9-]+" title="Letters, numbers, and hyphens only" />
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
              <div style="grid-column: span 2;">
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Default Quote Notes</label>
                <textarea id="quo-notes" class="command-input" style="width:100%; min-height: 80px; resize:vertical;">${quoteDefaults.defaultNotes || ''}</textarea>
              </div>
              <div>
                <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Follow-up Delay (Days) *</label>
                <input type="number" id="quo-followup" class="command-input" style="width:100%;" value="${quoteDefaults.followUpDelayDays !== undefined ? quoteDefaults.followUpDelayDays : 7}" required min="0" />
              </div>
            </div>

            <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-elevated); border-radius: 8px;">
              <label style="display:flex; align-items:center; gap: 0.75rem; cursor:pointer;">
                <input type="checkbox" id="quo-approval" ${quoteDefaults.requireApprovalBeforeSending !== false ? 'checked' : ''} style="width: 18px; height: 18px;" />
                <span class="font-medium">Require approval before sending quotes</span>
              </label>
              <p class="text-sm text-muted mt-2" style="margin-bottom:0;"><em>External sending is still disabled in beta. These defaults prepare drafts and future workflows only.</em></p>
            </div>

            <button type="submit" id="save-quote-btn" class="btn btn-primary">Save Quote Defaults</button>
          </form>
        </div>
      </div>

      <!-- REMINDER PREFERENCES TAB -->
      <div id="tab-reminders" class="tab-pane card" style="display:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem;">
          <h3 style="margin:0;">Reminder Preferences</h3>
          <button class="btn btn-ghost" style="font-size: 0.9rem;" onclick="handleRestoreDefaultReminders()">Restore Defaults</button>
        </div>
        <p class="text-muted mb-3">Configure default follow-up timings and reminder types. These control when EtaleHub drafts follow-ups for your approval.</p>
        
        <form onsubmit="handleSaveReminderPreferences(event)">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Annual Service (Months) *</label>
              <input type="number" id="rem-annual" class="command-input" style="width:100%;" value="${reminderPreferences.annualServiceMonths !== undefined ? reminderPreferences.annualServiceMonths : 12}" required min="1" />
            </div>
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Quote Follow-up Delay (Days) *</label>
              <input type="number" id="rem-quote" class="command-input" style="width:100%;" value="${reminderPreferences.quoteFollowUpDays !== undefined ? reminderPreferences.quoteFollowUpDays : 7}" required min="0" />
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Payment Follow-up Delay (Days) *</label>
              <input type="number" id="rem-payment" class="command-input" style="width:100%;" value="${reminderPreferences.paymentFollowUpDays !== undefined ? reminderPreferences.paymentFollowUpDays : 7}" required min="0" />
            </div>
            <div>
              <label class="font-medium" style="display:block; margin-bottom: 0.5rem;">Job Follow-up Delay (Days) *</label>
              <input type="number" id="rem-job" class="command-input" style="width:100%;" value="${reminderPreferences.jobFollowUpDays !== undefined ? reminderPreferences.jobFollowUpDays : 1}" required min="0" />
            </div>
          </div>

          <h4 style="margin-top:0; margin-bottom:1rem;">Enabled Reminder Types</h4>
          <p class="text-sm text-muted mb-3">Select which types of reminders EtaleHub is allowed to draft.</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            ${[
              { id: 'annual_service', label: 'Annual service' },
              { id: 'payment', label: 'Payment follow-up' },
              { id: 'quote_follow_up', label: 'Quote follow-up' },
              { id: 'customer_follow_up', label: 'Customer follow-up' },
              { id: 'job_follow_up', label: 'Job follow-up' },
              { id: 'custom', label: 'Custom reminder' }
            ].map(type => {
              const isChecked = (reminderPreferences.enabledReminderTypes || []).includes(type.id);
              return `
                <label style="display:flex; align-items:center; gap: 0.75rem; cursor:pointer;">
                  <input type="checkbox" class="rem-type-check" value="${type.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px;" />
                  <span>${type.label}</span>
                </label>
              `;
            }).join('')}
          </div>

          <button type="submit" id="save-reminders-btn" class="btn btn-primary">Save Reminder Preferences</button>
        </form>
      </div>

      <!-- APPROVAL RULES TAB -->
      <div id="tab-approvals" class="tab-pane card" style="display:none;">
        <h3 style="margin-top:0; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">Approval Rules</h3>
        <p class="text-muted mb-4">Control which actions require your manual approval before execution.</p>
        
        <div style="background: var(--bg-elevated); padding: 1rem; border-radius: 8px; border-left: 4px solid var(--accent-warning); margin-bottom: 2rem;">
          <strong>Beta Safety Lock:</strong> Approval preferences control internal draft review only. EtaleHub does not send real emails, SMS, invoices, quotes, or payment reminders during beta.
        </div>

        <form onsubmit="handleSaveApprovalRules(event)">
          
          <h4 style="margin-bottom: 1rem; color: var(--text-muted);">Configurable Rules</h4>
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
            <label style="display:flex; align-items:center; gap: 0.75rem; cursor:pointer;">
              <input type="checkbox" id="ar-invoice" ${approvalRules.requireApprovalForInvoiceDrafts !== false ? 'checked' : ''} style="width: 18px; height: 18px;" />
              <span class="font-medium">Require approval for invoice drafts</span>
            </label>
            <label style="display:flex; align-items:center; gap: 0.75rem; cursor:pointer;">
              <input type="checkbox" id="ar-quote" ${approvalRules.requireApprovalForQuoteDrafts !== false ? 'checked' : ''} style="width: 18px; height: 18px;" />
              <span class="font-medium">Require approval for quote drafts</span>
            </label>
          </div>

          <h4 style="margin-bottom: 1rem; color: var(--text-muted);">Locked Safety Rules</h4>
          <p class="text-sm text-muted mb-3">These rules cannot be disabled during the beta period.</p>
          
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
            <label style="display:flex; align-items:flex-start; gap: 0.75rem; cursor:not-allowed; opacity: 0.7;">
              <input type="checkbox" checked disabled style="width: 18px; height: 18px; margin-top:3px;" />
              <div>
                <span class="font-medium" style="display:block;">Require approval for customer messages</span>
                <span class="text-sm text-muted">External sending is disabled, and this approval rule remains mandatory.</span>
              </div>
            </label>
            
            <label style="display:flex; align-items:flex-start; gap: 0.75rem; cursor:not-allowed; opacity: 0.7;">
              <input type="checkbox" checked disabled style="width: 18px; height: 18px; margin-top:3px;" />
              <div>
                <span class="font-medium" style="display:block;">Require approval for payment reminders</span>
                <span class="text-sm text-muted">Locked during beta for customer safety.</span>
              </div>
            </label>
            
            <label style="display:flex; align-items:flex-start; gap: 0.75rem; cursor:not-allowed; opacity: 0.7;">
              <input type="checkbox" checked disabled style="width: 18px; height: 18px; margin-top:3px;" />
              <div>
                <span class="font-medium" style="display:block;">Require approval for bulk actions</span>
                <span class="text-sm text-muted">Locked during beta for customer safety.</span>
              </div>
            </label>
            
            <label style="display:flex; align-items:flex-start; gap: 0.75rem; cursor:not-allowed; opacity: 0.7;">
              <input type="checkbox" checked disabled style="width: 18px; height: 18px; margin-top:3px;" />
              <div>
                <span class="font-medium" style="display:block;">Require approval for high-risk AI actions</span>
                <span class="text-sm text-muted">Locked during beta for customer safety.</span>
              </div>
            </label>
          </div>

          <button type="submit" id="save-approvals-btn" class="btn btn-primary">Save Approval Rules</button>
        </form>
      </div>

      <!-- ACCOUNT & MODE TAB -->
      <div id="tab-account" class="tab-pane" style="display:none; display:flex; flex-direction:column; gap:2rem;">
        
        <div class="card" style="border-left: 4px solid var(--accent-${isDemo ? 'warning' : 'success'});">
          <h3 style="margin-top:0; margin-bottom:1rem;">Account Information</h3>
          ${isDemo ? `
            <p class="text-muted mb-3">You are currently in local Demo Mode. No data is synced to the cloud.</p>
            <div style="display:flex; gap: 1rem;">
              <button class="btn btn-primary" onclick="window.location.hash='#/login'">Log In to Cloud</button>
              <button class="btn btn-ghost" onclick="window.location.hash='#/signup'">Sign Up</button>
            </div>
          ` : `
            <div style="margin-bottom: 1.5rem;">
              <div class="text-sm text-muted mb-1">Connected Workspace</div>
              <div class="font-medium" style="font-size:1.1rem;">${profile.businessName || 'EtaleHub Cloud Workspace'}</div>
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

        <div class="card" style="border: 1px solid var(--accent-danger);">
          <h3 style="margin-top:0; margin-bottom:1rem; color: var(--accent-danger); display:flex; align-items:center; gap:0.5rem;">
            ⚠️ Demo Data Controls
          </h3>
          <p class="text-muted" style="margin-bottom: 1.5rem;">Reset the local database to its original demo state. This will wipe all local IndexedDB records and recreate the original seeded data. <strong style="color:white;">This does NOT affect production cloud data.</strong></p>
          <button class="btn btn-danger" onclick="window.resetEtaleHubDatabase()" style="width: 100%; justify-content:center; padding: 0.75rem;">Reset local demo database only</button>
        </div>

      </div>

      <!-- BETA LIMITATIONS TAB -->
      <div id="tab-limitations" class="tab-pane" style="display:none;">
        <div class="card" style="border-top: 4px solid var(--accent-purple);">
          <h3 style="margin-top:0; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; color: var(--accent-purple);">
            🛡️ Known Beta Limitations
          </h3>
          
          <p style="margin-bottom: 1.5rem; line-height: 1.5;" class="text-muted">
            EtaleHub is currently in controlled beta. To protect your business and customers, external sending and payment processing are disabled while workflows are being tested.
          </p>

          <div style="display:flex; flex-direction:column; gap: 1rem; background: var(--bg-elevated); padding: 1.5rem; border-radius: 8px;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span>Real <strong>email sending</strong> is disabled.</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span>Real <strong>SMS sending</strong> is disabled.</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span><strong>Stripe/payment processing</strong> is disabled.</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span>Accounting integrations are not connected.</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span>Approval queue is internal only for now.</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span>AI prepares and drafts actions, but does not directly send customer messages.</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="color:var(--text-muted)">—</span> <span>External customer communication remains disabled until a later phase.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
    
    <!-- Full Width Audit Log -->
    <div class="card" style="padding: 0; overflow:hidden; max-width: 1200px; margin-bottom: 3rem;">
      <div style="padding: 1.5rem 1.5rem 1rem 1.5rem; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">
        <h3 style="margin: 0;">Workspace Audit Trail</h3>
        <p class="text-muted text-sm mt-1" style="margin-top:0.25rem;">Recent activity across all records (last 30 actions). Full historical log available via data export.</p>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Source</th>
            <th>Action</th>
            <th>Record Type</th>
            <th>Record ID</th>
          </tr>
        </thead>
        <tbody>
          ${recentAudit.length > 0 ? recentAudit.map(a => `
            <tr class="table-row">
              <td class="text-muted">${new Date(a.timestamp).toLocaleString()}</td>
              <td>${getSourceBadge(a.source)}</td>
              <td class="font-medium">${getReadableAction(a.action)}</td>
              <td>${(a.entityType || '').toUpperCase()}</td>
              <td class="text-muted">#${a.entityId || 'N/A'}</td>
            </tr>
          `).join('') : '<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No audit logs found.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

