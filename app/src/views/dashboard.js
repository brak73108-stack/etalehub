/**
 * EtaleHub Dashboard View
 * The main daily command centre with morning briefing and priority actions.
 */

import { isDemoMode } from '../services/mode-service.js';
import { getAll as getAllJobs } from '../services/data/jobs-service.js';
import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getPending as getPendingApprovals } from '../services/data/approvals-service.js';
import { getAll as getAllReminders } from '../services/data/reminders-service.js';
import { getAll as getAllAiActions } from '../services/data/ai-actions-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { getReadableAction, getSourceBadge } from '../utils/audit-helpers.js';

export default async function renderDashboard() {
  const jobs = await getAllJobs() || [];
  const invoices = await getAllInvoices() || [];
  const approvals = await getPendingApprovals() || [];
  const allAudit = await getAllAuditLogs() || [];
  
  const recentAudit = allAudit.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
  
  // reminders-service.js getAll maps to db.getAll() which we then need to filter if we only want 'due'
  const allReminders = await getAllReminders() || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const reminders = allReminders.filter(r => r.scheduledDate && r.scheduledDate.startsWith(todayStr) && r.status === 'pending');
  
  const aiActionsAll = await getAllAiActions() || [];
  const aiActions = aiActionsAll.slice(0, 5); // getRecent(5)
  
  const todayJobs = jobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr));
  const expectedRevenue = todayJobs.reduce((sum, j) => sum + (j.finalPrice || 0), 0) || (isDemoMode() ? 540 : 0); 
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  
  const aiCompletedJobs = jobs.filter(j => j.status === 'complete' && j.serviceHistoryNote && j.serviceHistoryNote.includes('AI workflow'));
  const paidThisMonth = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  
  const suggestedCommand = "I finished Mrs Smith’s boiler service. She paid £180 by card. Book her annual service.";

  const demoBanner = `
    <div style="background: rgba(20, 184, 166, 0.1); border: 1px solid var(--accent-teal); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
      <span style="font-size: 1.25rem;">ℹ️</span>
      <div style="font-size: 0.9rem; color: var(--text-color);">
        <strong>Demo mode:</strong> sample local data. No real messages, invoices, or payments are sent.
      </div>
    </div>
  `;

  const prodBanner = `
    <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent-info); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
      <span style="font-size: 1.25rem;">☁️</span>
      <div style="font-size: 0.9rem; color: var(--text-color);">
        <strong>Production mode:</strong> cloud workspace active. Real data is stored securely in Supabase. External emails, SMS, and payments are still disabled.
      </div>
    </div>
  `;

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Today's Admin</h1>
        <p class="view-subtitle">${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
    
    ${isDemoMode() ? demoBanner : prodBanner}
    
    <!-- Morning Briefing Card -->
    <div class="card" style="background: linear-gradient(135deg, var(--bg-elevated) 0%, #1a202c 100%); border-left: 4px solid var(--accent-teal); margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem;">
        <span>☀️</span> Good morning.
      </h2>
      <p style="font-size: 1.1rem; color: var(--text-muted); line-height: 1.6;">
        You have <strong class="text-accent">${todayJobs.length} jobs</strong> today, 
        <strong class="text-success">£${expectedRevenue}</strong> expected revenue, 
        <strong class="text-danger">${overdueInvoices.length} overdue invoices</strong>, 
        and <strong class="text-warning">${approvals.length} AI approvals waiting</strong>.
      </p>
      
      <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-primary); border-radius: 8px; border: 1px dashed var(--accent-teal);">
        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Try asking EtaleHub:</div>
        <div style="display:flex; flex-wrap: wrap; gap: 1rem; align-items:center;">
          <code style="background: transparent; color: white; padding: 0; font-size: 1rem;">"${suggestedCommand}"</code>
          ${isDemoMode() ? `<button class="btn btn-primary btn-sm" onclick="window.runMrsSmithDemo && window.runMrsSmithDemo()">▶ Run Mrs Smith demo</button>` : ''}
        </div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
      <!-- Priority Actions -->
      <div class="card">
        <h3 style="margin-bottom: 1rem; display:flex; align-items:center; gap:0.5rem;">
          <span style="color:var(--accent-danger)">⚡</span> Priority Actions
        </h3>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${approvals.length > 0 ? `
            <div class="priority-item" onclick="window.location.hash='#/command'" style="display:flex; justify-content:space-between; padding:1rem; background:var(--bg-primary); border-radius:8px; cursor:pointer; border: 1px solid var(--accent-warning);">
              <div>
                <span class="badge badge-warning" style="margin-bottom:0.25rem;">Needs approval</span>
                <div class="font-medium">${approvals.length} AI actions waiting for you</div>
              </div>
              <span>→</span>
            </div>
          ` : ''}
          
          ${overdueInvoices.length > 0 ? `
            <div class="priority-item" onclick="window.location.hash='#/money'" style="display:flex; justify-content:space-between; padding:1rem; background:var(--bg-primary); border-radius:8px; cursor:pointer;">
              <div>
                <span class="badge badge-danger" style="margin-bottom:0.25rem;">Money waiting</span>
                <div class="font-medium">${overdueInvoices.length} invoices are overdue</div>
              </div>
              <span>→</span>
            </div>
          ` : ''}
          
          ${reminders.length > 0 ? `
            <div class="priority-item" onclick="window.location.hash='#/calendar'" style="display:flex; justify-content:space-between; padding:1rem; background:var(--bg-primary); border-radius:8px; cursor:pointer;">
              <div>
                <span class="badge badge-info" style="margin-bottom:0.25rem;">Follow-up due</span>
                <div class="font-medium">${reminders.length} service reminders need attention</div>
              </div>
              <span>→</span>
            </div>
          ` : ''}
          
          ${approvals.length === 0 && overdueInvoices.length === 0 && reminders.length === 0 ? `
            <div class="empty-state" style="padding: 2rem; background: transparent; text-align: center;">
              <span style="font-size: 2rem; margin-bottom: 0.5rem; display:block;">🎉</span>
              <div>All caught up! No priority actions.</div>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- AI Office Manager Summary -->
      <div class="card" style="border: 1px solid var(--accent-teal);">
        <h3 style="margin-bottom: 1rem; color: var(--accent-teal); display:flex; align-items:center; gap:0.5rem;">
          🤖 EtaleHub has your admin covered.
        </h3>
        <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.75rem;">
          <li style="display:flex; justify-content:space-between;"><span class="text-muted">Jobs completed by AI</span> <strong class="text-accent">${aiCompletedJobs.length}</strong></li>
          <li style="display:flex; justify-content:space-between;"><span class="text-muted">Approvals waiting</span> <strong class="text-warning">${approvals.length}</strong></li>
        </ul>
        <hr style="border:0; border-top: 1px solid var(--border-color); margin: 1rem 0;" />
        <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;" class="text-muted">Recent AI Activity</h4>
        <div style="font-size: 0.85rem; display:flex; flex-direction:column; gap:0.5rem;">
          ${aiActions.length > 0 ? aiActions.map(a => `
            <div style="padding-left:0.5rem; border-left:2px solid var(--accent-teal);">
              <div class="text-muted">${new Date(a.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              <div>Interpreted: <span class="font-medium">${a.interpretedIntent}</span></div>
            </div>
          `).join('') : '<div class="text-muted">No recent activity</div>'}
        </div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
      <!-- Today's Schedule -->
      <div class="card">
        <h3 style="margin-bottom: 1rem;">Today's Schedule</h3>
        <table class="data-table">
          <thead>
            <tr><th>Job Details</th><th>Customer</th><th>Status</th><th>Value</th></tr>
          </thead>
          <tbody>
            ${todayJobs.map(j => `
              <tr onclick="window.location.hash='#/jobs'" style="cursor:pointer;" class="table-row">
                <td>
                  <div class="font-medium">${j.title}</div>
                  <div class="text-muted text-sm">${j.jobType ? j.jobType.replace('_', ' ') : 'General'}</div>
                </td>
                <td><span class="text-accent">Customer ID: ${j.customerId || 'N/A'}</span></td>
                <td><span class="badge badge-${j.status === 'complete' ? 'success' : 'warning'}">${j.status || 'pending'}</span></td>
                <td>£${j.finalPrice || 'TBD'}</td>
              </tr>
            `).join('') || `<tr><td colspan="4" class="text-muted text-center" style="padding: 2rem;">No jobs yet. Add your first customer or ask EtaleHub to create one.</td></tr>`}
          </tbody>
        </table>
      </div>
      
      <!-- Recent Activity -->
      <div class="card" style="overflow: hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
          <h3 style="margin:0;">Recent Activity</h3>
          <a href="#/settings" class="text-accent text-sm" style="text-decoration:none;">View all →</a>
        </div>
        <div style="display:flex; flex-direction:column; gap: 0.75rem;">
          ${recentAudit.length > 0 ? recentAudit.map(a => `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
              <div>
                <div class="font-medium">${getReadableAction(a.action)}</div>
                <div class="text-sm text-muted">${a.entityType.toUpperCase()} • ID: ${a.entityId || 'N/A'}</div>
              </div>
              <div style="text-align:right;">
                <div class="text-sm" style="margin-bottom:0.25rem;">${getSourceBadge(a.source)}</div>
                <div class="text-xs text-muted">${new Date(a.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
          `).join('') : '<div class="text-muted text-center" style="padding: 1rem;">No activity recorded yet.</div>'}
        </div>
      </div>
    </div>
  `;
}

