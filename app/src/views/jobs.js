/**
 * EtaleHub Jobs View
 * Displays active and past jobs, list, forms, and detailed profile.
 */

import { getAll as getAllJobs, getById as getJobById, update as updateJob, create as createJob, cancel as cancelJob, markComplete, markInProgress } from '../services/data/jobs-service.js';
import { getById as getCustomerById, getAll as getAllCustomers } from '../services/data/customers-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getAll as getAllReminders } from '../services/data/reminders-service.js';
import { isDemoMode } from '../services/mode-service.js';
import { renderAuditTimelineHtml } from '../utils/audit-helpers.js';

let currentJobs = [];
let allCustomers = [];
let customerMap = {};
let activeFilter = 'all';

export default async function renderJobs() {
  currentJobs = await getAllJobs() || [];
  allCustomers = await getAllCustomers() || [];
  customerMap = allCustomers.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  
  // Sort by newest first
  currentJobs = currentJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = currentJobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr)).length;
  const bookedCount = currentJobs.filter(j => j.status === 'booked').length;
  const completeCount = currentJobs.filter(j => j.status === 'completed').length;
  const unpaidCount = currentJobs.filter(j => j.status === 'completed' && j.paymentStatus === 'unpaid').length;
  const followUpCount = currentJobs.filter(j => j.followUpRequired).length;
  
  window.filterJobs = (filterType) => {
    activeFilter = filterType;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.getElementById(`filter-${filterType}`).classList.add('active');
    applyFilters();
  };

  function applyFilters() {
    let filtered = currentJobs;
    const today = new Date().toISOString().split('T')[0];
    
    if (activeFilter === 'today') filtered = currentJobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(today));
    if (activeFilter === 'booked') filtered = currentJobs.filter(j => j.status === 'booked');
    if (activeFilter === 'in_progress') filtered = currentJobs.filter(j => j.status === 'in_progress');
    if (activeFilter === 'complete') filtered = currentJobs.filter(j => j.status === 'completed');
    if (activeFilter === 'cancelled') filtered = currentJobs.filter(j => j.status === 'cancelled');
    if (activeFilter === 'unpaid') filtered = currentJobs.filter(j => j.status === 'completed' && j.paymentStatus === 'unpaid');
    if (activeFilter === 'followup') filtered = currentJobs.filter(j => j.followUpRequired);
    
    const searchVal = document.getElementById('jobSearch')?.value.toLowerCase() || '';
    if (searchVal) {
      filtered = filtered.filter(j => 
        (j.title || '').toLowerCase().includes(searchVal) ||
        (customerMap[j.customerId]?.name || '').toLowerCase().includes(searchVal)
      );
    }
    
    renderJobRows(filtered);
  }
  
  window.doSearch = () => {
    applyFilters();
  };

  window.showJobModal = (id = null) => {
    const modal = document.getElementById('jobModalForm');
    const form = document.getElementById('jobForm');
    form.reset();
    document.getElementById('jobError').style.display = 'none';

    // Populate customer select
    const custSelect = document.getElementById('jobCustomerId');
    custSelect.innerHTML = '<option value="">-- Select Customer --</option>' + 
      allCustomers.map(c => `<option value="${c.id}">${c.name} (${c.address ? c.address.split(',')[0] : 'No address'})</option>`).join('');

    if (id) {
      const job = currentJobs.find(j => j.id === id);
      if (job) {
        document.getElementById('jobId').value = job.id;
        document.getElementById('jobCustomerId').value = job.customerId || '';
        document.getElementById('jobTitle').value = job.title || '';
        document.getElementById('jobType').value = job.jobType || '';
        
        if (job.scheduledDate) {
           const d = new Date(job.scheduledDate);
           document.getElementById('jobDate').value = d.toISOString().split('T')[0];
           document.getElementById('jobTime').value = d.toISOString().split('T')[1].substring(0,5);
        }
        
        document.getElementById('jobStatus').value = job.status || 'booked';
        document.getElementById('jobNotes').value = job.serviceHistoryNote || job.notes?.join('\n') || '';
        document.getElementById('jobFinalPrice').value = job.finalPrice || '';
        document.getElementById('jobPaymentStatus').value = job.paymentStatus || 'unpaid';
        
        document.getElementById('jobModalTitle').innerText = 'Edit Job';
      }
    } else {
      document.getElementById('jobId').value = '';
      document.getElementById('jobStatus').value = 'booked';
      document.getElementById('jobPaymentStatus').value = 'unpaid';
      document.getElementById('jobModalTitle').innerText = 'Add New Job';
    }
    modal.style.display = 'flex';
  };

  window.closeJobModal = () => {
    document.getElementById('jobModalForm').style.display = 'none';
  };

  window.saveJob = async () => {
    const id = document.getElementById('jobId').value;
    const customerId = document.getElementById('jobCustomerId').value;
    const title = document.getElementById('jobTitle').value.trim();
    const jobType = document.getElementById('jobType').value;
    const dateVal = document.getElementById('jobDate').value;
    const timeVal = document.getElementById('jobTime').value;
    const status = document.getElementById('jobStatus').value;
    const notesStr = document.getElementById('jobNotes').value.trim();
    const finalPriceVal = document.getElementById('jobFinalPrice').value;
    const paymentStatus = document.getElementById('jobPaymentStatus').value;
    
    const errorEl = document.getElementById('jobError');

    // Validation
    if (!customerId) { errorEl.innerText = "Customer is required."; errorEl.style.display = 'block'; return; }
    if (!title) { errorEl.innerText = "Job title is required."; errorEl.style.display = 'block'; return; }
    if (!jobType) { errorEl.innerText = "Job type is required."; errorEl.style.display = 'block'; return; }
    if (!dateVal) { errorEl.innerText = "Scheduled date is required."; errorEl.style.display = 'block'; return; }
    
    let parsedPrice = undefined;
    if (finalPriceVal) {
      parsedPrice = parseFloat(finalPriceVal);
      if (isNaN(parsedPrice)) {
        errorEl.innerText = "Final price must be a valid number."; 
        errorEl.style.display = 'block'; 
        return;
      }
    }

    errorEl.style.display = 'none';
    const btn = document.getElementById('saveJobBtn');
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
      const isoDate = new Date(`${dateVal}T${timeVal || '09:00'}:00`).toISOString();
      const payload = { 
        customerId: Number(customerId), 
        title, 
        jobType, 
        scheduledDate: isoDate, 
        status, 
        serviceHistoryNote: notesStr,
        paymentStatus 
      };
      if (parsedPrice !== undefined) {
         payload.finalPrice = parsedPrice;
      }

      if (id) {
        await updateJob(Number(id), payload);
      } else {
        await createJob(payload);
      }
      
      // Refresh list
      currentJobs = await getAllJobs() || [];
      applyFilters();
      window.closeJobModal();
    } catch (e) {
      console.error(e);
      errorEl.innerText = "An error occurred while saving. Please try again.";
      errorEl.style.display = 'block';
    } finally {
      btn.innerText = 'Save Job';
      btn.disabled = false;
    }
  };

  window.promptMarkInProgress = async (id, event) => {
    event.stopPropagation();
    try {
      await markInProgress(id);
      currentJobs = await getAllJobs() || [];
      applyFilters();
    } catch (e) { console.error(e); alert('Failed to update job status.'); }
  };

  window.promptMarkComplete = async (id, event) => {
    event.stopPropagation();
    try {
      // In a real app we might pop a modal to ask for final price here.
      await markComplete(id);
      currentJobs = await getAllJobs() || [];
      applyFilters();
    } catch (e) { console.error(e); alert('Failed to mark job complete.'); }
  };

  window.promptCancelJob = async (id, event) => {
    event.stopPropagation();
    if (confirm(`Are you sure you want to cancel this job? It will not be deleted, but it will be marked as cancelled.`)) {
       try {
         await cancelJob(id);
         currentJobs = await getAllJobs() || [];
         applyFilters();
       } catch (e) { console.error(e); alert('Failed to cancel job.'); }
    }
  };

  window.viewJobDetails = async (id) => {
    const job = await getJobById(Number(id));
    if (!job) return;
    
    const cust = customerMap[job.customerId] || { name: 'Unknown Customer', address: 'Address not available' };
    
    const allAudit = await getAllAuditLogs() || [];
    const auditLogs = allAudit.filter(log => log && log.entityType === 'job' && log.entityId === job.id);
    
    const allInvoices = await getAllInvoices() || [];
    const linkedInvoice = allInvoices.find(i => i.jobId === job.id);
    
    const allReminders = await getAllReminders() || [];
    const linkedReminder = allReminders.find(r => r.jobId === job.id);
    
    const isAiUpdated = auditLogs.some(log => log.source === 'ai');
    
    const recentAuditLogs = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    const auditHtml = renderAuditTimelineHtml(recentAuditLogs);

    const modalHtml = `
      <div id="jobDetailModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px);">
        <div class="card" style="width: 650px; max-height: 90vh; overflow-y: auto; background: var(--bg-elevated); padding: 2rem; border-top: 4px solid var(--accent-${job.status==='completed'?'success':'warning'}); box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <div>
              <div style="display:flex; align-items:center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <h2 style="margin:0; font-size: 1.5rem;">${job.title || 'Untitled Job'}</h2>
                ${isAiUpdated ? '<span class="badge badge-info" title="This record was updated by EtaleHub AI">🤖 AI Updated</span>' : ''}
              </div>
              <p class="text-muted m-0">${(job.jobType || 'General').replace('_', ' ')}</p>
            </div>
            <div style="display:flex; gap:0.5rem;">
               <button onclick="document.getElementById('jobDetailModal').remove(); window.showJobModal(${job.id});" class="btn btn-ghost" style="padding: 0.25rem 0.5rem;">Edit</button>
               <button onclick="document.getElementById('jobDetailModal').remove()" class="btn btn-ghost" style="font-size:1.2rem; padding: 0.25rem 0.5rem;">✕</button>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: var(--bg-primary); padding: 1.5rem; border-radius: 8px;">
            <div>
              <div class="text-sm text-muted mb-1">Customer</div>
              <div class="font-medium mb-3"><a href="#/customers/${cust.id}" class="text-accent" onclick="document.getElementById('jobDetailModal').remove()">${cust.name}</a></div>
              
              <div class="text-sm text-muted mb-1">Address</div>
              <div class="font-medium mb-3">${cust.address || 'No address provided'}</div>
              
              <div class="text-sm text-muted mb-1">Status</div>
              <div class="font-medium"><span class="badge badge-${job.status === 'completed' ? 'success' : (job.status === 'cancelled' ? 'danger' : 'warning')}">${(job.status || 'pending').toUpperCase()}</span></div>
            </div>
            <div>
              <div class="text-sm text-muted mb-1">Schedule</div>
              <div class="font-medium mb-3">${job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'}) : 'Not scheduled'}</div>
              
              <div class="text-sm text-muted mb-1">Completed</div>
              <div class="font-medium mb-3 ${job.completedDate ? 'text-success' : 'text-muted'}">${job.completedDate ? new Date(job.completedDate).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'}) : 'Pending'}</div>
              
              <div class="text-sm text-muted mb-1">Final Price & Payment</div>
              <div class="font-medium" style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size: 1.1rem;">${job.finalPrice ? `£${job.finalPrice}` : 'TBD'}</span>
                <span class="badge badge-${job.paymentStatus === 'paid' ? 'success' : 'default'}">${(job.paymentStatus || 'unpaid').toUpperCase()}</span>
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
            <div>
              <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color:var(--text-muted);">Linked Invoice</h4>
              ${linkedInvoice ? `
                <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 4px; border: 1px solid var(--border-color);">
                  <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;">
                    <span class="font-medium">${linkedInvoice.invoiceNumber || 'Draft'}</span>
                    <span class="badge badge-${linkedInvoice.status === 'paid' ? 'success' : (linkedInvoice.status === 'void' ? 'default' : 'warning')}">${linkedInvoice.status.toUpperCase()}</span>
                  </div>
                  <div class="text-muted text-sm">Total: £${linkedInvoice.total || 0}</div>
                </div>
              ` : '<div class="text-muted text-sm" style="padding: 0.75rem; background: var(--bg-primary); border-radius: 4px;">No invoice linked yet</div>'}
            </div>
            <div>
              <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color:var(--text-muted);">Linked Reminder</h4>
              ${linkedReminder ? `
                <div style="padding: 0.75rem; background: var(--bg-primary); border-radius: 4px; border: 1px solid var(--border-color);">
                  <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;">
                    <span class="font-medium">${(linkedReminder.reminderType || linkedReminder.type || 'Reminder').replace('_', ' ')}</span>
                    <span class="badge badge-${linkedReminder.status === 'pending' ? 'warning' : 'success'}">${linkedReminder.status.toUpperCase()}</span>
                  </div>
                  <div class="text-muted text-sm">${new Date(linkedReminder.scheduledDate).toLocaleDateString()}</div>
                </div>
              ` : '<div class="text-muted text-sm" style="padding: 0.75rem; background: var(--bg-primary); border-radius: 4px;">No reminder linked yet</div>'}
            </div>
          </div>
          
          ${job.serviceHistoryNote ? `
            <div style="border-left: 4px solid var(--accent-teal); padding: 1rem; background: var(--bg-primary); border-radius: 0 8px 8px 0; margin-bottom: 2rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color:var(--accent-teal);">Service History Note</h4>
              <p style="margin:0; line-height: 1.5; white-space: pre-line;">${job.serviceHistoryNote}</p>
            </div>
          ` : ''}
          
          <h4 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Recent Activity</h4>
          <div style="margin-bottom: 2rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
            ${auditHtml || '<div class="text-muted" style="text-align:center; padding: 2rem;">No audit activity yet</div>'}
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };
  
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Jobs</h1>
        <p class="view-subtitle">Track active work, completed service history, and AI updates.</p>
      </div>
      <button class="btn btn-primary" onclick="window.showJobModal()">+ Add Job</button>
    </div>
    
    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-bottom: 2rem;">
      <div class="card stat-card" style="cursor:pointer;" onclick="filterJobs('today')">
        <div class="stat-label">Today</div>
        <div class="stat-value text-accent">${todayCount}</div>
      </div>
      <div class="card stat-card" style="cursor:pointer;" onclick="filterJobs('booked')">
        <div class="stat-label">Booked</div>
        <div class="stat-value">${bookedCount}</div>
      </div>
      <div class="card stat-card" style="cursor:pointer;" onclick="filterJobs('complete')">
        <div class="stat-label">Complete</div>
        <div class="stat-value text-success">${completeCount}</div>
      </div>
      <div class="card stat-card" style="cursor:pointer; border-left: 3px solid var(--accent-warning);" onclick="filterJobs('unpaid')">
        <div class="stat-label">Done but Unpaid</div>
        <div class="stat-value text-warning">${unpaidCount}</div>
      </div>
      <div class="card stat-card" style="cursor:pointer;" onclick="filterJobs('followup')">
        <div class="stat-label">Needs Follow-up</div>
        <div class="stat-value">${followUpCount}</div>
      </div>
    </div>
    
    <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display:flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
        <button id="filter-all" class="filter-chip active" onclick="filterJobs('all')">All Jobs</button>
        <button id="filter-today" class="filter-chip" onclick="filterJobs('today')">Today</button>
        <button id="filter-booked" class="filter-chip" onclick="filterJobs('booked')">Booked</button>
        <button id="filter-in_progress" class="filter-chip" onclick="filterJobs('in_progress')">In Progress</button>
        <button id="filter-complete" class="filter-chip" onclick="filterJobs('complete')">Complete</button>
        <button id="filter-cancelled" class="filter-chip" onclick="filterJobs('cancelled')">Cancelled</button>
        <button id="filter-unpaid" class="filter-chip" onclick="filterJobs('unpaid')">Unpaid</button>
        <button id="filter-followup" class="filter-chip" onclick="filterJobs('followup')">Needs Follow-up</button>
      </div>
      <div>
        <input type="text" id="jobSearch" class="command-input" placeholder="Search jobs..." onkeyup="doSearch()" style="width: 250px; padding: 0.5rem 1rem; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 8px; color: white;">
      </div>
    </div>
    
    <div class="card" style="padding: 0; overflow: hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Job Details</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Price & Payment</th>
            <th>Dates</th>
            <th style="text-align: right; padding-right: 1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody id="jobsTableBody">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Job Modal -->
    <div id="jobModalForm" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div class="card" style="width: 100%; max-width: 600px; margin: 1rem; max-height: 90vh; overflow-y: auto;">
        <h2 id="jobModalTitle" style="margin-bottom: 1.5rem;">Add New Job</h2>
        <div id="jobError" class="text-danger" style="display:none; margin-bottom: 1rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;"></div>
        
        <form id="jobForm" onsubmit="event.preventDefault(); saveJob();">
          <input type="hidden" id="jobId" />
          
          <div style="margin-bottom: 1rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Customer *</label>
            <select id="jobCustomerId" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
              <!-- Populated dynamically -->
            </select>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Job Title *</label>
            <input type="text" id="jobTitle" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;" placeholder="e.g. Annual Boiler Service">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Job Type *</label>
              <select id="jobType" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
                <option value="service">Service</option>
                <option value="repair">Repair</option>
                <option value="installation">Installation</option>
                <option value="quote">Quote</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div>
               <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Status</label>
               <select id="jobStatus" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
                  <option value="booked">Booked</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
               </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Scheduled Date *</label>
              <input type="date" id="jobDate" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
            </div>
            <div>
              <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Scheduled Time</label>
              <input type="time" id="jobTime" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Final Price (£)</label>
              <input type="number" step="0.01" id="jobFinalPrice" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;" placeholder="e.g. 150.00">
            </div>
            <div>
               <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Payment Status</label>
               <select id="jobPaymentStatus" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
               </select>
            </div>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Notes</label>
            <textarea id="jobNotes" rows="3" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white; resize: vertical;" placeholder="Add job details..."></textarea>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-ghost" onclick="closeJobModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveJobBtn">Save Job</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderJobRows(jobs) {
  const tbody = document.getElementById('jobsTableBody');
  if (!tbody) return;
  
  const statusColors = {
    'enquiry': 'default',
    'quoted': 'info',
    'booked': 'warning',
    'in_progress': 'accent',
    'completed': 'success',
    'cancelled': 'danger'
  };

  tbody.innerHTML = jobs.map(j => {
    const cust = customerMap[j.customerId] || { name: 'Unknown Customer', address: '' };
    return `
      <tr class="table-row" style="transition: background 0.2s;">
        <td style="padding-left: 1.5rem; cursor:pointer;" onclick="viewJobDetails(${j.id})">
          <div class="font-medium" style="font-size: 1.05rem; margin-bottom: 0.25rem;">${j.title || 'Untitled Job'}</div>
          <div class="text-muted text-sm" style="display:flex; align-items:center; gap:0.5rem;">
            ${(j.jobType || 'General').replace('_', ' ')}
            ${j.followUpRequired ? '<span class="badge badge-warning" style="font-size:0.7rem; padding:0.1rem 0.4rem;">Follow-up due</span>' : ''}
          </div>
        </td>
        <td style="cursor:pointer;" onclick="viewJobDetails(${j.id})">
          <span class="text-accent font-medium">${cust.name}</span>
          <div class="text-muted text-sm mt-1">${cust.address ? cust.address.split(',')[0] : ''}</div>
        </td>
        <td style="cursor:pointer;" onclick="viewJobDetails(${j.id})">
          <span class="badge badge-${statusColors[j.status] || 'default'}">${(j.status || 'pending').replace('_', ' ').toUpperCase()}</span>
        </td>
        <td style="cursor:pointer;" onclick="viewJobDetails(${j.id})">
          <div class="font-medium" style="font-size:1.1rem; margin-bottom:0.25rem;">${j.finalPrice ? `£${j.finalPrice}` : 'TBD'}</div>
          ${j.status === 'completed' ? `<span class="badge badge-${j.paymentStatus === 'paid' ? 'success' : 'default'}">${(j.paymentStatus || 'unpaid').toUpperCase()}</span>` : '<span class="text-muted text-sm">-</span>'}
        </td>
        <td style="cursor:pointer;" onclick="viewJobDetails(${j.id})">
          <div class="text-sm" style="margin-bottom:0.25rem;"><span class="text-muted">Sch:</span> ${j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</div>
          ${j.completedDate ? `<div class="text-sm text-success"><span class="text-muted">Done:</span> ${new Date(j.completedDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>` : ''}
        </td>
        <td style="text-align: right; padding-right: 1.5rem;">
           <button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="showJobModal(${j.id})">Edit</button>
           ${j.status === 'booked' ? `<button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkInProgress(${j.id}, event)">Start</button>` : ''}
           ${['booked', 'in_progress'].includes(j.status) ? `<button class="btn btn-ghost text-success" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkComplete(${j.id}, event)">Complete</button>` : ''}
           ${['booked', 'in_progress'].includes(j.status) ? `<button class="btn btn-ghost text-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptCancelJob(${j.id}, event)">Cancel</button>` : ''}
        </td>
      </tr>
    `;
  }).join('') || `
    <tr>
      <td colspan="6" class="text-center" style="padding: 4rem 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <h3 class="text-muted">No jobs yet.</h3>
        <p class="text-muted">Create your first job or ask EtaleHub to help.</p>
        <button class="btn btn-primary mt-3" onclick="window.showJobModal()">Add Job</button>
      </td>
    </tr>
  `;
}

export function initJobsView() {
  window.filterJobs(activeFilter);
}
