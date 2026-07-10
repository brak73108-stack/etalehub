/**
 * EtaleHub Jobs View
 * Polished view for active and past jobs, highlighting AI-updated status and history.
 */

import { getAll as getAllJobs, getById as getJobById, update as updateJob } from '../db/jobs.js';
import { getById as getCustomerById, getAll as getAllCustomers } from '../db/customers.js';
import { getByEntity as getAuditLogs } from '../db/audit.js';

let currentJobs = [];
let customerMap = {};

export default async function renderJobs() {
  const jobs = await getAllJobs();
  const customers = await getAllCustomers();
  customerMap = customers.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
  
  // Sort by newest first
  currentJobs = jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = currentJobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr)).length;
  const bookedCount = currentJobs.filter(j => j.status === 'booked').length;
  const completeCount = currentJobs.filter(j => j.status === 'complete').length;
  const unpaidCount = currentJobs.filter(j => j.status === 'complete' && j.paymentStatus === 'unpaid').length;
  const followUpCount = currentJobs.filter(j => j.followUpRequired).length;
  
  window.viewJobDetails = async (id) => {
    const job = await getJobById(Number(id));
    const cust = customerMap[job.customerId];
    const auditLogs = await getAuditLogs('job', job.id);
    
    const isAiUpdated = auditLogs.some(log => log.source === 'ai');
    
    const auditHtml = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => `
      <div class="audit-item" style="font-size: 0.85rem; padding: 0.75rem; border-left: 3px solid var(--accent-${log.source==='ai'?'teal':'purple'}); margin-bottom: 0.5rem; background: var(--bg-primary); border-radius: 0 4px 4px 0;">
        <div style="display:flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <strong style="color:var(--accent-${log.source==='ai'?'teal':'purple'})">${log.source === 'ai' ? '🤖 Done by AI' : '👤 User Action'}</strong>
          <span class="text-muted">${new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="color:var(--text-color)">${log.details.message}</div>
      </div>
    `).join('');

    const modalHtml = `
      <div id="jobModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px);">
        <div class="card" style="width: 650px; max-height: 90vh; overflow-y: auto; background: var(--bg-elevated); padding: 2rem; border-top: 4px solid var(--accent-${job.status==='complete'?'success':'warning'}); box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <div style="display:flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
            <div>
              <div style="display:flex; align-items:center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <h2 style="margin:0; font-size: 1.5rem;">${job.title}</h2>
                ${isAiUpdated ? '<span class="badge badge-info" title="This record was updated by the AI Office Manager">🤖 AI Updated</span>' : ''}
              </div>
              <p class="text-muted m-0">${job.jobType.replace('_', ' ')}</p>
            </div>
            <button onclick="document.getElementById('jobModal').remove()" class="btn btn-ghost" style="font-size:1.2rem; padding: 0.25rem 0.5rem;">✕</button>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: var(--bg-primary); padding: 1.5rem; border-radius: 8px;">
            <div>
              <div class="text-sm text-muted mb-1">Customer</div>
              <div class="font-medium mb-3"><a href="#/customers/${cust.id}" class="text-accent" onclick="document.getElementById('jobModal').remove()">${cust.name}</a></div>
              
              <div class="text-sm text-muted mb-1">Address</div>
              <div class="font-medium mb-3">${cust.address}</div>
              
              <div class="text-sm text-muted mb-1">Status</div>
              <div class="font-medium"><span class="badge badge-${job.status === 'complete' ? 'success' : 'warning'}">${job.status.toUpperCase()}</span></div>
            </div>
            <div>
              <div class="text-sm text-muted mb-1">Schedule</div>
              <div class="font-medium mb-3">${job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'}) : 'Not scheduled'}</div>
              
              <div class="text-sm text-muted mb-1">Completed</div>
              <div class="font-medium mb-3 ${job.completedDate ? 'text-success' : 'text-muted'}">${job.completedDate ? new Date(job.completedDate).toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'}) : 'Pending'}</div>
              
              <div class="text-sm text-muted mb-1">Final Price & Payment</div>
              <div class="font-medium" style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size: 1.1rem;">${job.finalPrice ? `£${job.finalPrice}` : 'TBD'}</span>
                <span class="badge badge-${job.paymentStatus === 'paid' ? 'success' : 'default'}">${job.paymentStatus.toUpperCase()}</span>
              </div>
            </div>
          </div>
          
          ${job.serviceHistoryNote ? `
            <div style="border-left: 4px solid var(--accent-teal); padding: 1rem; background: var(--bg-primary); border-radius: 0 8px 8px 0; margin-bottom: 2rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color:var(--accent-teal);">Service History Note</h4>
              <p style="margin:0; line-height: 1.5;">${job.serviceHistoryNote}</p>
            </div>
          ` : ''}
          
          <h4 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Audit Trail</h4>
          <div style="margin-bottom: 2rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
            ${auditHtml || '<div class="text-muted" style="text-align:center; padding: 2rem;">No audit logs</div>'}
          </div>
          
          <div style="display:flex; gap: 0.75rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
            <button class="btn btn-primary" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Mark job ${job.id} as complete', 100); document.getElementById('jobModal').remove()">Mark Complete via AI</button>
            <button class="btn btn-ghost" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Draft invoice for job ${job.id}', 100); document.getElementById('jobModal').remove()">Draft Invoice</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };
  
  window.filterJobs = (filterType) => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.getElementById(`filter-${filterType}`).classList.add('active');
    
    let filtered = currentJobs;
    const today = new Date().toISOString().split('T')[0];
    
    if (filterType === 'today') filtered = currentJobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(today));
    if (filterType === 'booked') filtered = currentJobs.filter(j => j.status === 'booked');
    if (filterType === 'complete') filtered = currentJobs.filter(j => j.status === 'complete');
    if (filterType === 'unpaid') filtered = currentJobs.filter(j => j.status === 'complete' && j.paymentStatus === 'unpaid');
    if (filterType === 'followup') filtered = currentJobs.filter(j => j.followUpRequired);
    
    renderJobRows(filtered);
  };

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Jobs</h1>
        <p class="view-subtitle">Track active work, completed service history, and AI updates.</p>
      </div>
      <button class="btn btn-primary" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Book a new job for ', 100);">+ Book Job via AI</button>
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
    
    <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div style="display:flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem;">
        <button id="filter-all" class="filter-chip active" onclick="filterJobs('all')">All Jobs</button>
        <button id="filter-today" class="filter-chip" onclick="filterJobs('today')">Today</button>
        <button id="filter-booked" class="filter-chip" onclick="filterJobs('booked')">Booked</button>
        <button id="filter-complete" class="filter-chip" onclick="filterJobs('complete')">Complete</button>
        <button id="filter-unpaid" class="filter-chip" onclick="filterJobs('unpaid')">Unpaid</button>
        <button id="filter-followup" class="filter-chip" onclick="filterJobs('followup')">Needs Follow-up</button>
      </div>
      <div>
        <input type="text" class="command-input" placeholder="Search jobs..." style="width: 250px; padding: 0.5rem 1rem; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 8px;">
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
          </tr>
        </thead>
        <tbody id="jobsTableBody">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
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
    'in_progress': 'warning',
    'complete': 'success'
  };

  tbody.innerHTML = jobs.map(j => {
    const cust = customerMap[j.customerId];
    return `
      <tr class="table-row" onclick="viewJobDetails(${j.id})" style="cursor:pointer; transition: background 0.2s;">
        <td style="padding-left: 1.5rem;">
          <div class="font-medium" style="font-size: 1.05rem; margin-bottom: 0.25rem;">${j.title}</div>
          <div class="text-muted text-sm" style="display:flex; align-items:center; gap:0.5rem;">
            ${j.jobType.replace('_', ' ')}
            ${j.followUpRequired ? '<span class="badge badge-warning" style="font-size:0.7rem; padding:0.1rem 0.4rem;">Follow-up due</span>' : ''}
          </div>
        </td>
        <td>
          <span class="text-accent font-medium">${cust ? cust.name : 'Unknown'}</span>
          <div class="text-muted text-sm mt-1">${cust ? cust.address.split(',')[0] : ''}</div>
        </td>
        <td>
          <span class="badge badge-${statusColors[j.status] || 'default'}">${j.status.toUpperCase()}</span>
        </td>
        <td>
          <div class="font-medium" style="font-size:1.1rem; margin-bottom:0.25rem;">${j.finalPrice ? `£${j.finalPrice}` : 'TBD'}</div>
          ${j.status === 'complete' ? `<span class="badge badge-${j.paymentStatus === 'paid' ? 'success' : 'default'}">${j.paymentStatus.toUpperCase()}</span>` : '<span class="text-muted text-sm">-</span>'}
        </td>
        <td>
          <div class="text-sm" style="margin-bottom:0.25rem;"><span class="text-muted">Sch:</span> ${j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</div>
          ${j.completedDate ? `<div class="text-sm text-success"><span class="text-muted">Done:</span> ${new Date(j.completedDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>` : ''}
        </td>
      </tr>
    `;
  }).join('') || `
    <tr>
      <td colspan="5" class="text-center" style="padding: 4rem 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
        <h3 class="text-muted">No jobs found</h3>
        <p class="text-muted">Try asking EtaleHub to create one.</p>
        <button class="btn btn-ghost mt-2" onclick="window.location.hash='#/command'">Go to Ask EtaleHub</button>
      </td>
    </tr>
  `;
}

export function initJobsView() {
  renderJobRows(currentJobs);
}
