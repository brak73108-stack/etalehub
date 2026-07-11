/**
 * EtaleHub Calendar & Reminders View
 * Manages schedules, upcoming jobs, and internal follow-up reminders.
 */

import { getAll as getAllReminders, create as createReminder, update as updateReminder, markComplete as completeReminder, dismiss as dismissReminder } from '../services/data/reminders-service.js';
import { getAll as getAllJobs } from '../services/data/jobs-service.js';
import { getAll as getAllCustomers } from '../services/data/customers-service.js';
import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getAll as getAllQuotes } from '../services/data/quotes-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { isDemoMode } from '../services/mode-service.js';
import { renderAuditTimelineHtml } from '../utils/audit-helpers.js';

let currentReminders = [];
let allJobs = [];
let allCustomers = [];
let allInvoices = [];
let allQuotes = [];

let customerMap = {};
let jobMap = {};
let invoiceMap = {};
let quoteMap = {};

export default async function renderCalendar() {
  currentReminders = await getAllReminders() || [];
  allJobs = await getAllJobs() || [];
  allCustomers = await getAllCustomers() || [];
  allInvoices = await getAllInvoices() || [];
  allQuotes = await getAllQuotes() || [];
  
  customerMap = allCustomers.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  jobMap = allJobs.reduce((acc, j) => { acc[j.id] = j; return acc; }, {});
  invoiceMap = allInvoices.reduce((acc, i) => { acc[i.id] = i; return acc; }, {});
  quoteMap = allQuotes.reduce((acc, q) => { acc[q.id] = q; return acc; }, {});
  
  // Modals & Actions
  window.showReminderModal = (id = null) => {
    const modal = document.getElementById('reminderModalForm');
    const form = document.getElementById('reminderForm');
    form.reset();
    document.getElementById('reminderError').style.display = 'none';

    populateCustomerDropdown();
    filterEntityDropdowns(''); // initialize empty/full lists

    if (id) {
      const r = currentReminders.find(x => x.id === id);
      if (r) {
        document.getElementById('reminderId').value = r.id;
        document.getElementById('reminderType').value = r.type || 'custom';
        document.getElementById('reminderMessage').value = r.message || '';
        document.getElementById('reminderCustomerId').value = r.customerId || '';
        filterEntityDropdowns(r.customerId || '');
        
        document.getElementById('reminderJobId').value = r.jobId || '';
        document.getElementById('reminderInvoiceId').value = r.invoiceId || '';
        document.getElementById('reminderQuoteId').value = r.quoteId || '';
        document.getElementById('reminderStatus').value = r.status || 'pending';
        
        if (r.scheduledDate) {
           document.getElementById('reminderDate').value = new Date(r.scheduledDate).toISOString().split('T')[0];
        }
        document.getElementById('reminderModalTitle').innerText = 'Edit Reminder';
      }
    } else {
      document.getElementById('reminderId').value = '';
      document.getElementById('reminderStatus').value = 'pending';
      document.getElementById('reminderType').value = 'custom';
      document.getElementById('reminderDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('reminderModalTitle').innerText = 'Create Reminder';
    }
    modal.style.display = 'flex';
  };

  window.closeReminderModal = () => document.getElementById('reminderModalForm').style.display = 'none';

  window.onCustomerChange = () => {
    const cid = document.getElementById('reminderCustomerId').value;
    filterEntityDropdowns(cid);
  };

  function populateCustomerDropdown() {
    const select = document.getElementById('reminderCustomerId');
    if(!select) return;
    select.innerHTML = '<option value="">-- No Customer (Internal) --</option>' + 
      allCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  function filterEntityDropdowns(customerId) {
    const jSelect = document.getElementById('reminderJobId');
    const iSelect = document.getElementById('reminderInvoiceId');
    const qSelect = document.getElementById('reminderQuoteId');
    
    if(!jSelect || !iSelect || !qSelect) return;

    let fJobs = allJobs;
    let fInvs = allInvoices;
    let fQuotes = allQuotes;

    if (customerId) {
      const cid = Number(customerId);
      fJobs = allJobs.filter(j => j.customerId === cid);
      fInvs = allInvoices.filter(i => i.customerId === cid);
      fQuotes = allQuotes.filter(q => q.customerId === cid);
    }

    jSelect.innerHTML = '<option value="">-- Optional Job --</option>' + 
      fJobs.map(x => `<option value="${x.id}">${x.title || x.jobType} (${new Date(x.scheduledDate || x.createdAt).toLocaleDateString()})</option>`).join('');
    
    iSelect.innerHTML = '<option value="">-- Optional Invoice --</option>' + 
      fInvs.map(x => `<option value="${x.id}">${x.invoiceNumber} (£${x.total || x.amount})</option>`).join('');
      
    qSelect.innerHTML = '<option value="">-- Optional Quote --</option>' + 
      fQuotes.map(x => `<option value="${x.id}">${x.quoteNumber} (£${x.total || x.amount})</option>`).join('');
  }

  window.saveReminder = async () => {
    const id = document.getElementById('reminderId').value;
    const type = document.getElementById('reminderType').value;
    const message = document.getElementById('reminderMessage').value.trim();
    const dateVal = document.getElementById('reminderDate').value;
    const status = document.getElementById('reminderStatus').value;
    
    const customerId = document.getElementById('reminderCustomerId').value;
    const jobId = document.getElementById('reminderJobId').value;
    const invoiceId = document.getElementById('reminderInvoiceId').value;
    const quoteId = document.getElementById('reminderQuoteId').value;

    const errorEl = document.getElementById('reminderError');

    if (!type) { errorEl.innerText = "Type is required."; errorEl.style.display = 'block'; return; }
    if (!message) { errorEl.innerText = "Message/Summary is required."; errorEl.style.display = 'block'; return; }
    if (!dateVal) { errorEl.innerText = "Scheduled date is required."; errorEl.style.display = 'block'; return; }

    errorEl.style.display = 'none';
    const btn = document.getElementById('saveReminderBtn');
    btn.innerText = 'Saving...'; btn.disabled = true;

    try {
      const payload = { 
        type, 
        message, 
        scheduledDate: new Date(dateVal).toISOString(), 
        status,
        customerId: customerId ? Number(customerId) : null,
        jobId: jobId ? Number(jobId) : null,
        invoiceId: invoiceId ? Number(invoiceId) : null,
        quoteId: quoteId ? Number(quoteId) : null
      };

      if (id) await updateReminder(Number(id), payload);
      else await createReminder(payload);
      
      currentReminders = await getAllReminders() || [];
      renderCalendarData();
      closeReminderModal();
    } catch (e) {
      errorEl.innerText = "Error saving reminder."; errorEl.style.display = 'block';
    } finally {
      btn.innerText = 'Save Reminder'; btn.disabled = false;
    }
  };

  window.promptCompleteReminder = async (id, event) => {
    event.stopPropagation();
    try { await completeReminder(id); currentReminders = await getAllReminders() || []; renderCalendarData(); } 
    catch(e) { alert('Error completing reminder'); }
  };

  window.promptDismissReminder = async (id, event) => {
    event.stopPropagation();
    if(confirm("Are you sure you want to dismiss this reminder?")) {
      try { await dismissReminder(id); currentReminders = await getAllReminders() || []; renderCalendarData(); } 
      catch(e) { alert('Error dismissing reminder'); }
    }
  };

  window.viewReminderDetail = async (id) => {
    const r = currentReminders.find(x => x.id === id);
    if (!r) return;
    
    const custName = r.customerId ? customerMap[r.customerId] : 'Internal / No Customer';
    const jTitle = r.jobId ? (jobMap[r.jobId]?.title || 'Unknown Job') : 'None';
    const iNum = r.invoiceId ? (invoiceMap[r.invoiceId]?.invoiceNumber || 'Unknown Invoice') : 'None';
    const qNum = r.quoteId ? (quoteMap[r.quoteId]?.quoteNumber || 'Unknown Quote') : 'None';
    
    const allAudit = await getAllAuditLogs() || [];
    const auditLogs = allAudit.filter(log => log && log.entityType === 'reminder' && log.entityId === r.id);
    const recentAuditLogs = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    const auditHtml = renderAuditTimelineHtml(recentAuditLogs);

    const statusBadgeMap = { 'pending': 'warning', 'completed': 'success', 'dismissed': 'default' };

    const modalHtml = `
      <div id="calendarDetailModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="card" style="width: 500px; max-height: 90vh; overflow-y: auto;">
          <div style="display:flex; justify-content: space-between; margin-bottom: 1rem;">
            <h2>${(r.reminderType || r.type || 'Reminder').replace(/_/g, ' ')}</h2>
            <button onclick="document.getElementById('calendarDetailModal').remove()" class="btn btn-ghost">✕</button>
          </div>
          
          <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
             <p style="margin: 0; font-size: 1.1rem; line-height: 1.4;">${r.message}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div><div class="text-sm text-muted">Status</div><span class="badge badge-${statusBadgeMap[r.status] || 'default'}">${r.status.toUpperCase()}</span></div>
            <div><div class="text-sm text-muted">Date</div><div class="font-medium">${new Date(r.scheduledDate).toLocaleDateString()}</div></div>
            <div><div class="text-sm text-muted">Customer</div><div class="font-medium">${custName}</div></div>
            <div><div class="text-sm text-muted">Source</div><div class="font-medium">${r.createdByAI ? '🤖 AI Generated' : '👤 Manual'}</div></div>
          </div>
          
          <div style="margin-bottom: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div class="text-sm text-muted mb-1">Linked Entities</div>
            <div style="display:flex; gap: 1rem; flex-wrap: wrap;">
               ${r.jobId ? `<span class="badge badge-default">Job: ${jTitle}</span>` : ''}
               ${r.invoiceId ? `<span class="badge badge-default">Inv: ${iNum}</span>` : ''}
               ${r.quoteId ? `<span class="badge badge-default">Quote: ${qNum}</span>` : ''}
               ${!r.jobId && !r.invoiceId && !r.quoteId ? '<span class="text-muted text-sm">None</span>' : ''}
            </div>
          </div>

          <h4>Recent Activity</h4>
          <div style="max-height:200px; overflow-y:auto;">${auditHtml || '<div class="text-muted">No activity</div>'}</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Reminders & Schedule</h1>
        <p class="view-subtitle">Your timeline of jobs and internal follow-ups.</p>
      </div>
      <div>
        <button class="btn btn-primary" onclick="showReminderModal()">+ Create Reminder</button>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;" id="calendarContainer">
      <!-- Rendered by renderCalendarData() -->
    </div>

    <!-- REMINDER MODAL -->
    <div id="reminderModalForm" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div class="card" style="width: 100%; max-width: 550px; margin: 1rem; max-height: 90vh; overflow-y: auto;">
        <h2 id="reminderModalTitle" style="margin-bottom: 1.5rem;">Create Reminder</h2>
        <div id="reminderError" class="text-danger" style="display:none; margin-bottom: 1rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;"></div>
        <form id="reminderForm" onsubmit="event.preventDefault(); saveReminder();">
          <input type="hidden" id="reminderId" />
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
               <label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Type *</label>
               <select id="reminderType" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
                  <option value="annual_service">Annual Service</option>
                  <option value="payment">Payment Follow-up</option>
                  <option value="quote_follow_up">Quote Follow-up</option>
                  <option value="customer_follow_up">Customer Follow-up</option>
                  <option value="job_follow_up">Job Follow-up</option>
                  <option value="custom">Custom</option>
               </select>
            </div>
            <div>
               <label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Status</label>
               <select id="reminderStatus" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="dismissed">Dismissed</option>
               </select>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
               <label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Scheduled Date *</label>
               <input type="date" id="reminderDate" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
            </div>
            <div>
               <label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Customer</label>
               <select id="reminderCustomerId" onchange="onCustomerChange()" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select>
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
             <label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Message / Summary *</label>
             <textarea id="reminderMessage" required rows="2" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white; resize: vertical;"></textarea>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-bottom: 1.5rem;">
             <label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Linked Entities (Optional)</label>
             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.5rem;">
                <select id="reminderJobId" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select>
                <select id="reminderInvoiceId" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select>
             </div>
             <select id="reminderQuoteId" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
             <div class="text-sm text-muted" style="align-self:center; margin-right:auto;">External sending disabled</div>
             <button type="button" class="btn btn-ghost" onclick="closeReminderModal()">Cancel</button>
             <button type="submit" class="btn btn-primary" id="saveReminderBtn">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderCalendarData() {
  const container = document.getElementById('calendarContainer');
  if(!container) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const todayJobs = allJobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr) && j.status !== 'cancelled')
                           .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
                           
  const upcomingJobs = allJobs.filter(j => j.scheduledDate && j.scheduledDate > todayStr && j.status !== 'cancelled' && j.status !== 'completed')
                              .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  
  const activeReminders = currentReminders.filter(r => r.status === 'pending')
                                          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  const isCompletelyEmpty = activeReminders.length === 0 && todayJobs.length === 0 && upcomingJobs.length === 0;

  if (isCompletelyEmpty) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 6rem 2rem;" class="card">
        <div style="font-size: 4rem; margin-bottom: 1rem;">✨</div>
        <h2 class="text-muted" style="margin-bottom: 0.5rem;">Your calendar is clear.</h2>
        <p class="text-muted">No jobs or reminders scheduled yet.</p>
      </div>
    `;
    return;
  }

  const reminderCards = activeReminders.map(r => {
    const rDate = r.scheduledDate ? new Date(r.scheduledDate) : new Date();
    const isPast = rDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const iconMap = {
      'annual_service': '🔧',
      'payment': '💰',
      'quote_follow_up': '📝',
      'job_follow_up': '📅',
      'customer_follow_up': '👤',
      'custom': '📌'
    };
    const icon = iconMap[r.type] || '📌';
    const typeLabel = (r.reminderType || r.type || 'Reminder').replace(/_/g, ' ');

    return `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--accent-${isPast ? 'danger' : 'warning'}); transition: background 0.2s; cursor:pointer;" onclick="viewReminderDetail(${r.id})">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap: 1rem;">
            <div style="font-size: 2rem; width: 40px; text-align:center; padding-top:0.25rem;">${icon}</div>
            <div>
              <div style="display:flex; align-items:center; gap: 0.75rem; margin-bottom: 0.25rem;">
                <h3 style="margin: 0; font-size: 1.1rem; text-transform: capitalize;">${typeLabel}</h3>
                ${r.createdByAI ? '<span class="badge badge-info" title="Created by AI">🤖 AI</span>' : ''}
                ${isPast ? '<span class="badge badge-danger">Overdue</span>' : ''}
              </div>
              <div class="text-muted text-sm mb-2" style="max-width: 400px; line-height: 1.4;">${r.message || ''}</div>
              ${r.customerId ? `<div class="font-medium text-accent text-sm">${customerMap[r.customerId] || 'Unknown Customer'}</div>` : '<div class="text-muted text-sm">Internal Reminder</div>'}
            </div>
          </div>
          <div style="text-align: right;">
            <div class="text-sm text-muted mb-1">Scheduled Date</div>
            <div class="font-medium ${isPast ? 'text-danger' : ''} mb-3" style="font-size: 1.05rem;">${rDate.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric', year:'numeric'})}</div>
            
            <div style="display:flex; gap: 0.5rem; justify-content: flex-end;">
               <button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="event.stopPropagation(); showReminderModal(${r.id})">Edit</button>
               <button class="btn btn-ghost text-success" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptCompleteReminder(${r.id}, event)">Done</button>
               <button class="btn btn-ghost text-muted" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptDismissReminder(${r.id}, event)">Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const todayJobRows = todayJobs.map(j => `
    <div style="padding: 1rem; background: var(--bg-primary); border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
         <div class="font-medium">${j.title || 'Untitled Job'}</div>
         <div><span class="badge badge-${j.status==='completed'?'success':j.status==='in_progress'?'accent':'warning'}">${(j.status || 'pending').toUpperCase()}</span></div>
      </div>
      <div class="text-muted text-sm mb-1">${(j.jobType||'').replace('_',' ')}</div>
      <div class="text-accent text-sm">${customerMap[j.customerId] || 'Unknown Customer'}</div>
      ${j.finalPrice ? `<div class="text-success text-sm mt-1">Value: £${j.finalPrice}</div>` : ''}
    </div>
  `).join('');

  const upcomingJobRows = upcomingJobs.map(j => `
    <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div class="font-medium text-sm" style="margin-bottom: 0.1rem;">${j.title || 'Untitled Job'}</div>
        <div class="text-accent" style="font-size:0.8rem;">${customerMap[j.customerId] || 'Unknown'}</div>
      </div>
      <div style="text-align:right;">
        <div class="text-sm font-medium">${j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</div>
        <div class="text-muted" style="font-size:0.75rem;">${(j.status||'').toUpperCase()}</div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="calendar-main">
      <h3 style="margin-bottom: 1.5rem; color: var(--text-color);">Active Reminders</h3>
      ${activeReminders.length > 0 ? reminderCards : `
        <div class="card" style="text-align: center; padding: 4rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🗓️</div>
          <h3 class="text-muted">No reminders yet.</h3>
          <p class="text-muted">Create your first reminder or ask the Command Centre.</p>
        </div>
      `}
    </div>
    
    <div class="calendar-sidebar">
      <div class="card mb-4">
        <h3 style="margin-bottom: 1rem;">Today's Jobs</h3>
        ${todayJobs.length > 0 ? todayJobRows : '<div class="text-muted text-sm" style="padding: 1rem; background: var(--bg-primary); border-radius: 8px;">No jobs scheduled for today.</div>'}
      </div>
      
      <div class="card" style="padding: 0; overflow:hidden;">
        <h3 style="margin: 0; padding: 1.5rem 1.5rem 1rem 1.5rem; background: var(--bg-primary); border-bottom: 1px solid var(--border-color);">Upcoming Jobs</h3>
        <div style="max-height: 400px; overflow-y: auto;">
          ${upcomingJobs.length > 0 ? upcomingJobRows : '<div class="text-muted text-sm" style="padding: 1.5rem;">No upcoming jobs.</div>'}
        </div>
      </div>
    </div>
  `;
}

export function initCalendarView() {
  renderCalendarData();
}
