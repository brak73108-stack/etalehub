/**
 * EtaleHub Customers View
 * Displays customer list, search, and detailed profile with AI memory section.
 */

import { getAll as getAllCustomers, getById as getCustomerById } from '../services/data/customers-service.js';
import { getByCustomerId as getJobsForCustomer } from '../services/data/jobs-service.js';
import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getAll as getAllReminders } from '../services/data/reminders-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { isDemoMode } from '../services/mode-service.js';

let currentCustomers = [];

export default async function renderCustomers() {
  currentCustomers = await getAllCustomers() || [];
  
  window.filterCustomers = () => {
    const term = document.getElementById('customerSearch').value.toLowerCase();
    const filtered = currentCustomers.filter(c => 
      (c.name || '').toLowerCase().includes(term) || 
      (c.address || '').toLowerCase().includes(term) || 
      (c.phone || '').includes(term)
    );
    renderCustomerRows(filtered);
  };
  
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Customers</h1>
        <p class="view-subtitle">Manage your clients and their service history.</p>
      </div>
      <button class="btn btn-primary" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Add a new customer named ', 100);">+ Add Customer</button>
    </div>
    
    <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
      <input type="text" id="customerSearch" class="command-input" placeholder="Search by name, address, or phone..." onkeyup="filterCustomers()" style="width: 100%; max-width: 400px; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-elevated); color: white;">
      <div class="text-muted text-sm">${currentCustomers.length} total customers</div>
    </div>
    
    <div class="card" style="padding: 0; overflow: hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Customer</th>
            <th>Contact Details</th>
            <th>Status</th>
            <th>Service Dates</th>
            <th>Lifetime Value</th>
          </tr>
        </thead>
        <tbody id="customersTableBody">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
    </div>
  `;
}

export function initCustomersView() {
  renderCustomerRows(currentCustomers);
}

function renderCustomerRows(customers) {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = customers.map(c => `
    <tr class="table-row" onclick="window.location.hash = '#/customers/${c.id}'" style="cursor:pointer; transition: background 0.2s;">
      <td style="padding-left: 1.5rem;">
        <div class="font-medium" style="font-size: 1.05rem; margin-bottom: 0.25rem;">${c.name}</div>
        <div class="text-muted text-sm">${c.address ? c.address.split(',')[0] : ''}</div>
      </td>
      <td>
        <div style="margin-bottom: 0.25rem;">${c.phone || '-'}</div>
        <div class="text-muted text-sm">${c.email || '-'}</div>
      </td>
      <td>
        <span class="badge badge-${c.customerStatus === 'active' ? 'success' : 'default'}">${(c.customerStatus || 'new').toUpperCase()}</span>
      </td>
      <td>
        <div class="text-sm" style="margin-bottom: 0.25rem;"><span class="text-muted">Last:</span> ${c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'None'}</div>
        <div class="text-sm"><span class="text-muted">Due:</span> <span class="font-medium ${c.nextServiceDue && new Date(c.nextServiceDue) < new Date() ? 'text-danger' : ''}">${c.nextServiceDue ? new Date(c.nextServiceDue).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'N/A'}</span></div>
      </td>
      <td>
        <div class="font-medium" style="font-size: 1.1rem;">£${c.lifetimeValue || 0}</div>
      </td>
    </tr>
  `).join('') || `
    <tr>
      <td colspan="5" class="text-center" style="padding: 4rem 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
        <h3 class="text-muted">No customers yet</h3>
        <p class="text-muted">Add your first customer to get started.</p>
        <button class="btn btn-ghost mt-2" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Add a new customer named ', 100);">Ask EtaleHub</button>
      </td>
    </tr>
  `;
}

export async function renderCustomerDetail(id) {
  const customer = await getCustomerById(Number(id));
  if (!customer) return `<div class="empty-state">Customer not found</div>`;
  
  const jobs = await getJobsForCustomer(customer.id) || [];
  
  // Use client-side filtering for simplicity and compatibility with the proxy layer
  const allInvoices = await getAllInvoices() || [];
  const invoices = allInvoices.filter(i => i.customerId === customer.id);
  
  const allReminders = await getAllReminders() || [];
  const reminders = allReminders.filter(r => r.customerId === customer.id);
  
  const allAuditLogs = await getAllAuditLogs() || [];
  const auditLogs = allAuditLogs.filter(log => log.entityType === 'customer' && log.entityId === customer.id);
  
  const jobRows = jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(j => `
    <tr onclick="window.location.hash='#/jobs'; setTimeout(() => window.viewJobDetails(${j.id}), 100)" style="cursor:pointer; transition: background 0.2s;" class="table-row">
      <td><div class="font-medium">${j.title || 'Untitled Job'}</div></td>
      <td><span class="badge badge-${j.status === 'complete' ? 'success' : 'warning'}">${(j.status || 'pending').replace('_', ' ').toUpperCase()}</span></td>
      <td>${j.completedDate ? new Date(j.completedDate).toLocaleDateString() : '-'}</td>
      <td><span class="text-muted text-sm">${j.serviceHistoryNote || '-'}</span></td>
    </tr>
  `).join('');
  
  const invoiceRows = invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(i => `
    <tr class="table-row">
      <td><div class="font-medium">${i.invoiceNumber || 'Draft'}</div></td>
      <td><div class="font-medium">£${i.total || 0}</div></td>
      <td><span class="badge badge-${i.status === 'paid' ? 'success' : 'danger'}">${(i.status || 'pending').toUpperCase()}</span></td>
      <td>${i.paidDate ? new Date(i.paidDate).toLocaleDateString() : '-'}</td>
    </tr>
  `).join('');
  
  const reminderRows = reminders.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(r => `
    <tr class="table-row">
      <td>
        <div class="font-medium">${(r.reminderType || r.type || 'Reminder').replace('_', ' ')}</div>
        <div class="text-muted text-sm">${r.message || ''}</div>
      </td>
      <td>${new Date(r.scheduledDate).toLocaleDateString(undefined, {month:'short', year:'numeric'})}</td>
      <td><span class="badge badge-${r.status === 'pending' ? 'warning' : 'success'}">${(r.status || 'pending').toUpperCase()}</span></td>
      <td>${r.createdByAI ? '<span class="badge badge-info" title="Done by AI">🤖 AI</span>' : '👤 User'}</td>
    </tr>
  `).join('');

  const auditHtml = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => `
    <div class="audit-item" style="font-size: 0.85rem; padding: 0.75rem; border-left: 3px solid var(--accent-${log.source==='ai'?'teal':'purple'}); margin-bottom: 0.5rem; background: var(--bg-primary); border-radius: 0 4px 4px 0;">
      <div style="display:flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <strong style="color:var(--accent-${log.source==='ai'?'teal':'purple'})">${log.source === 'ai' ? '🤖 EtaleHub' : '👤 User Action'}</strong>
        <span class="text-muted">${new Date(log.timestamp).toLocaleString()}</span>
      </div>
      <div style="color:var(--text-color)">${log.details?.message || log.action || 'Updated customer'}</div>
    </div>
  `).join('');

  return `
    <div class="view-header">
      <div>
        <a href="#/customers" class="text-muted hover:text-accent" style="text-decoration:none; margin-bottom:0.75rem; display:inline-block; font-size: 0.9rem;">← Back to Customers</a>
        <h1 class="view-title" style="margin-bottom: 0.25rem;">${customer.name}</h1>
        <p class="view-subtitle" style="display:flex; align-items:center; gap:0.5rem;">
          <span style="color:var(--accent-teal)">📍</span> ${customer.address || 'No address provided'}
        </p>
      </div>
      ${isDemoMode() ? `
        <button class="btn btn-primary" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Draft an email to ${customer.name} ', 100);">Ask EtaleHub to message</button>
      ` : `
        <button class="btn btn-primary" disabled title="Messaging coming soon">Message</button>
      `}
    </div>
    
    <div class="customer-grid" style="display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem;">
      <div class="customer-main">
        
        <!-- EtaleHub Remembers (AI Memory Section) -->
        <div class="card mb-4" style="background: linear-gradient(135deg, rgba(45, 212, 191, 0.1) 0%, rgba(26, 32, 44, 1) 100%); border: 1px dashed var(--accent-teal);">
          <h3 style="margin-bottom: 1.5rem; color: var(--accent-teal); display:flex; align-items:center; gap:0.5rem;">
            🤖 EtaleHub remembers
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
              <div class="text-sm text-muted mb-1">Preferred Contact</div>
              <div class="font-medium mb-3" style="text-transform: capitalize;">${customer.preferredContact || 'Unknown'}</div>
              
              <div class="text-sm text-muted mb-1">Communication Style</div>
              <div class="font-medium">${customer.communicationStyle || 'Standard'}</div>
            </div>
            <div>
              <div class="text-sm text-muted mb-1">Equipment on site</div>
              <div class="mt-1 mb-3" style="display:flex; flex-direction:column; gap:0.25rem;">
                ${(customer.equipmentList && customer.equipmentList.length > 0) ? customer.equipmentList.map(e => `<div>• ${e}</div>`).join('') : '-'}
              </div>
            </div>
          </div>
          <div style="margin-top: 1rem; border-top: 1px solid rgba(45,212,191,0.2); padding-top: 1rem;">
            <div class="text-sm text-muted mb-1">Customer Notes</div>
            <div style="line-height: 1.5;">${customer.notes || 'No special notes.'}</div>
          </div>
        </div>
        
        <div class="card mb-4" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Job History</h3>
          <table class="data-table" style="margin:0;">
            <thead style="background: var(--bg-primary);">
              <tr><th style="padding-left:1.5rem;">Title</th><th>Status</th><th>Completed</th><th>Service Notes</th></tr>
            </thead>
            <tbody>${jobRows || '<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No jobs on record</td></tr>'}</tbody>
          </table>
        </div>
        
        <div class="card mb-4" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Invoice History</h3>
          <table class="data-table" style="margin:0;">
            <thead style="background: var(--bg-primary);">
              <tr><th style="padding-left:1.5rem;">Invoice</th><th>Total</th><th>Status</th><th>Paid On</th></tr>
            </thead>
            <tbody>${invoiceRows || '<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No invoices on record</td></tr>'}</tbody>
          </table>
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Reminders</h3>
          <table class="data-table" style="margin:0;">
            <thead style="background: var(--bg-primary);">
              <tr><th style="padding-left:1.5rem;">Type</th><th>Scheduled</th><th>Status</th><th>Source</th></tr>
            </thead>
            <tbody>${reminderRows || '<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No reminders on record</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      
      <div class="customer-sidebar">
        <!-- Contact Card -->
        <div class="card mb-4">
          <h3 style="margin-bottom: 1rem;">Contact Info</h3>
          <div style="display:flex; flex-direction:column; gap: 0.75rem;">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="color:var(--text-muted)">📧</span>
              ${customer.email ? `<a href="mailto:${customer.email}" class="text-accent" style="text-decoration:none;">${customer.email}</a>` : '<span class="text-muted">No email</span>'}
            </div>
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="color:var(--text-muted)">📱</span>
              <span>${customer.phone || 'No phone'}</span>
            </div>
          </div>
        </div>
        
        <!-- Service Schedule Card -->
        <div class="card mb-4" style="border-top: 4px solid var(--accent-purple);">
          <h3 style="margin-bottom: 1.5rem;">Service Schedule</h3>
          <div style="display:flex; flex-direction:column; gap: 1.5rem;">
            <div>
              <div class="text-sm text-muted mb-1">Last Service</div>
              <div class="font-medium" style="font-size: 1.25rem;">
                ${customer.lastServiceDate ? new Date(customer.lastServiceDate).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'}) : 'Unknown'}
              </div>
            </div>
            <div>
              <div class="text-sm text-muted mb-1">Next Service Due</div>
              <div class="font-medium ${customer.nextServiceDue && new Date(customer.nextServiceDue) < new Date() ? 'text-danger' : 'text-success'}" style="font-size: 1.25rem;">
                ${customer.nextServiceDue ? new Date(customer.nextServiceDue).toLocaleDateString(undefined, {month:'long', year:'numeric'}) : 'Not set'}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Activity Timeline -->
        <div class="card">
          <h3 style="margin-bottom: 0.5rem;">Recent Activity</h3>
          <p class="text-muted text-sm mb-3">See how EtaleHub has updated this profile.</p>
          <div class="audit-timeline" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
            ${auditHtml || '<div class="text-muted text-center" style="padding:2rem;">No recent activity</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}
