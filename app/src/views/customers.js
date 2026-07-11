/**
 * EtaleHub Customers View
 * Displays customer list, search, filters, forms, and detailed profile.
 */

import { getAll as getAllCustomers, getById as getCustomerById, create as createCustomer, update as updateCustomer, archive as archiveCustomer } from '../services/data/customers-service.js';
import { getByCustomerId as getJobsForCustomer } from '../services/data/jobs-service.js';
import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getAll as getAllReminders } from '../services/data/reminders-service.js';
import { getAll as getAllQuotes } from '../services/data/quotes-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { isDemoMode } from '../services/mode-service.js';
import { renderAuditTimelineHtml } from '../utils/audit-helpers.js';

let activeFilter = 'active'; // 'all', 'active', 'archived'
let searchQuery = '';

export default async function renderCustomers() {
  currentCustomers = await getAllCustomers() || [];
  
  // Expose global methods for UI interaction
  window.filterCustomers = () => {
    searchQuery = document.getElementById('customerSearch').value.toLowerCase();
    applyFilters();
  };
  
  window.setCustomerFilter = (filter) => {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active', 'btn-primary'));
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.add('btn-ghost'));
    
    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) {
       activeBtn.classList.remove('btn-ghost');
       activeBtn.classList.add('active', 'btn-primary');
    }
    applyFilters();
  };

  window.showCustomerModal = (id = null) => {
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    form.reset();
    document.getElementById('customerError').style.display = 'none';

    if (id) {
      const customer = currentCustomers.find(c => c.id === id);
      if (customer) {
        document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name || '';
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerNotes').value = customer.notes || '';
        document.getElementById('customerStatus').value = customer.customerStatus || 'active';
        document.getElementById('customerModalTitle').innerText = 'Edit Customer';
      }
    } else {
      document.getElementById('customerId').value = '';
      document.getElementById('customerStatus').value = 'active';
      document.getElementById('customerModalTitle').innerText = 'Add New Customer';
    }
    modal.style.display = 'flex';
  };

  window.closeCustomerModal = () => {
    document.getElementById('customerModal').style.display = 'none';
  };

  window.saveCustomer = async () => {
    const id = document.getElementById('customerId').value;
    const name = document.getElementById('customerName').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const notes = document.getElementById('customerNotes').value.trim();
    const status = document.getElementById('customerStatus').value;
    const errorEl = document.getElementById('customerError');

    // Validation
    if (!name) { errorEl.innerText = "Name is required."; errorEl.style.display = 'block'; return; }
    if (!address) { errorEl.innerText = "Address/Property is required."; errorEl.style.display = 'block'; return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorEl.innerText = "Invalid email format."; errorEl.style.display = 'block'; return; }

    errorEl.style.display = 'none';
    const btn = document.getElementById('saveCustomerBtn');
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
      const payload = { name, address, phone, email, notes, customerStatus: status };
      if (id) {
        await updateCustomer(Number(id), payload);
      } else {
        await createCustomer(payload);
      }
      
      // Refresh list
      currentCustomers = await getAllCustomers() || [];
      applyFilters();
      window.closeCustomerModal();
    } catch (e) {
      console.error(e);
      errorEl.innerText = "An error occurred while saving. Please try again.";
      errorEl.style.display = 'block';
    } finally {
      btn.innerText = 'Save Customer';
      btn.disabled = false;
    }
  };

  window.promptArchiveCustomer = async (id, event) => {
    event.stopPropagation();
    const customer = currentCustomers.find(c => c.id === id);
    if (!customer) return;
    
    if (confirm(`Are you sure you want to archive ${customer.name}? They will be hidden from the active list, but their service history will remain intact.`)) {
       try {
         await archiveCustomer(id);
         currentCustomers = await getAllCustomers() || [];
         applyFilters();
       } catch (e) {
         alert('Failed to archive customer.');
         console.error(e);
       }
    }
  };
  
  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Customers</h1>
        <p class="view-subtitle">Manage your clients and their service history.</p>
      </div>
      <button class="btn btn-primary" onclick="window.showCustomerModal()">+ Add Customer</button>
    </div>
    
    <div style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
      <div style="display: flex; gap: 0.5rem;">
        <button id="filter-active" class="btn btn-primary filter-btn active" onclick="setCustomerFilter('active')">Active</button>
        <button id="filter-archived" class="btn btn-ghost filter-btn" onclick="setCustomerFilter('archived')">Archived</button>
        <button id="filter-all" class="btn btn-ghost filter-btn" onclick="setCustomerFilter('all')">All</button>
      </div>
      <input type="text" id="customerSearch" class="command-input" placeholder="Search by name, address, or phone..." onkeyup="filterCustomers()" style="width: 100%; max-width: 400px; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-elevated); color: white;">
    </div>
    
    <div class="card" style="padding: 0; overflow: hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Customer</th>
            <th>Contact Details</th>
            <th>Status</th>
            <th>Service Dates</th>
            <th style="text-align: right; padding-right: 1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody id="customersTableBody">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Customer Modal -->
    <div id="customerModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div class="card" style="width: 100%; max-width: 500px; margin: 1rem;">
        <h2 id="customerModalTitle" style="margin-bottom: 1.5rem;">Add New Customer</h2>
        <div id="customerError" class="text-danger" style="display:none; margin-bottom: 1rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;"></div>
        
        <form id="customerForm" onsubmit="event.preventDefault(); saveCustomer();">
          <input type="hidden" id="customerId" />
          
          <div style="margin-bottom: 1rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Customer Name *</label>
            <input type="text" id="customerName" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;" placeholder="e.g. Jane Brown">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Address / Property *</label>
            <input type="text" id="customerAddress" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;" placeholder="e.g. 12 High Street, Bristol">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Phone Number</label>
              <input type="text" id="customerPhone" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;" placeholder="Optional">
            </div>
            <div>
              <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Email Address</label>
              <input type="email" id="customerEmail" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;" placeholder="Optional">
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Status</label>
            <select id="customerStatus" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display:block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">Internal Notes</label>
            <textarea id="customerNotes" rows="3" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white; resize: vertical;" placeholder="Add specific requirements, gate codes, etc."></textarea>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-ghost" onclick="closeCustomerModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveCustomerBtn">Save Customer</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function initCustomersView() {
  applyFilters();
}

function applyFilters() {
  let filtered = currentCustomers;

  // Status Filter
  if (activeFilter === 'active') {
    filtered = filtered.filter(c => !c.customerStatus || c.customerStatus !== 'archived');
  } else if (activeFilter === 'archived') {
    filtered = filtered.filter(c => c.customerStatus === 'archived');
  }

  // Text Filter
  if (searchQuery) {
    filtered = filtered.filter(c => 
      (c.name || '').toLowerCase().includes(searchQuery) || 
      (c.address || '').toLowerCase().includes(searchQuery) || 
      (c.phone || '').includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(searchQuery)
    );
  }
  
  renderCustomerRows(filtered);
}

function renderCustomerRows(customers) {
  const tbody = document.getElementById('customersTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = customers.map(c => `
    <tr class="table-row" style="transition: background 0.2s;">
      <td style="padding-left: 1.5rem; cursor:pointer;" onclick="window.location.hash = '#/customers/${c.id}'">
        <div class="font-medium" style="font-size: 1.05rem; margin-bottom: 0.25rem;">${c.name}</div>
        <div class="text-muted text-sm">${c.address ? c.address.split(',')[0] : ''}</div>
      </td>
      <td style="cursor:pointer;" onclick="window.location.hash = '#/customers/${c.id}'">
        <div style="margin-bottom: 0.25rem;">${c.phone || '-'}</div>
        <div class="text-muted text-sm">${c.email || '-'}</div>
      </td>
      <td style="cursor:pointer;" onclick="window.location.hash = '#/customers/${c.id}'">
        <span class="badge badge-${c.customerStatus === 'archived' ? 'danger' : (c.customerStatus === 'active' ? 'success' : 'default')}">${(c.customerStatus || 'active').toUpperCase()}</span>
      </td>
      <td style="cursor:pointer;" onclick="window.location.hash = '#/customers/${c.id}'">
        <div class="text-sm" style="margin-bottom: 0.25rem;"><span class="text-muted">Last:</span> ${c.lastServiceDate ? new Date(c.lastServiceDate).toLocaleDateString() : 'None'}</div>
        <div class="text-sm"><span class="text-muted">Due:</span> <span class="font-medium ${c.nextServiceDue && new Date(c.nextServiceDue) < new Date() ? 'text-danger' : ''}">${c.nextServiceDue ? new Date(c.nextServiceDue).toLocaleDateString() : 'N/A'}</span></div>
      </td>
      <td style="text-align: right; padding-right: 1.5rem;">
        <button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; margin-right: 0.25rem;" onclick="showCustomerModal(${c.id})">Edit</button>
        ${c.customerStatus !== 'archived' ? 
           `<button class="btn btn-ghost text-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptArchiveCustomer(${c.id}, event)">Archive</button>` : 
           `<span class="text-muted" style="font-size: 0.85rem; padding: 0.25rem 0.5rem;">Archived</span>`
        }
      </td>
    </tr>
  `).join('') || `
    <tr>
      <td colspan="5" class="text-center" style="padding: 4rem 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
        <h3 class="text-muted">No customers found</h3>
        <p class="text-muted">Add a new customer or adjust your filters.</p>
        <button class="btn btn-primary mt-3" onclick="window.showCustomerModal()">Add Customer</button>
      </td>
    </tr>
  `;
}

export async function renderCustomerDetail(id) {
  const customer = await getCustomerById(Number(id));
  if (!customer) return `<div class="empty-state">Customer not found</div>`;
  
  const jobs = await getJobsForCustomer(customer.id) || [];
  
  const allInvoices = await getAllInvoices() || [];
  const invoices = allInvoices.filter(i => i.customerId === customer.id);
  
  const allQuotes = await getAllQuotes() || [];
  const quotes = allQuotes.filter(q => q.customerId === customer.id);

  const allReminders = await getAllReminders() || [];
  const reminders = allReminders.filter(r => r.customerId === customer.id);
  
  const allAuditLogs = await getAllAuditLogs() || [];
  // Defensive filter to not crash if audit logging is misaligned
  const auditLogs = allAuditLogs.filter(log => log && log.entityType === 'customer' && log.entityId === customer.id);
  
  const jobRows = jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(j => `
    <tr class="table-row">
      <td><div class="font-medium">${j.title || j.jobType || 'Untitled Job'}</div></td>
      <td><span class="badge badge-${j.status === 'completed' ? 'success' : (j.status === 'cancelled' ? 'danger' : 'warning')}">${(j.status || 'pending').replace('_', ' ').toUpperCase()}</span></td>
      <td>${j.completedDate ? new Date(j.completedDate).toLocaleDateString() : (j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString() : 'Unscheduled')}</td>
      <td><div class="font-medium">£${j.finalPrice || 0}</div></td>
    </tr>
  `).join('');
  
  const invoiceRows = invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(i => `
    <tr class="table-row">
      <td><div class="font-medium">${i.invoiceNumber || 'Draft'}</div></td>
      <td><div class="font-medium">£${i.total || i.amount || 0}</div></td>
      <td><span class="badge badge-${i.status === 'paid' ? 'success' : (i.status === 'void' ? 'default' : 'danger')}">${(i.status || 'pending').toUpperCase()}</span></td>
      <td>${i.paidDate ? new Date(i.paidDate).toLocaleDateString() : '-'}</td>
    </tr>
  `).join('');

  const quoteRows = quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(q => `
    <tr class="table-row">
      <td><div class="font-medium">${q.quoteNumber || 'Draft'}</div></td>
      <td><div class="font-medium">£${q.total || q.amount || 0}</div></td>
      <td><span class="badge badge-${q.status === 'accepted' ? 'success' : (q.status === 'rejected' ? 'danger' : 'warning')}">${(q.status || 'draft').toUpperCase()}</span></td>
      <td>${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '-'}</td>
    </tr>
  `).join('');
  
  const reminderRows = reminders.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(r => `
    <tr class="table-row">
      <td>
        <div class="font-medium">${(r.reminderType || r.type || 'Reminder').replace('_', ' ')}</div>
        <div class="text-muted text-sm">${r.message || ''}</div>
      </td>
      <td>${r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString(undefined, {month:'short', year:'numeric'}) : '-'}</td>
      <td><span class="badge badge-${r.status === 'pending' ? 'warning' : (r.status === 'dismissed' ? 'default' : 'success')}">${(r.status || 'pending').toUpperCase()}</span></td>
    </tr>
  `).join('');

  // Limit audit timeline to 10 most recent entries
  const recentAuditLogs = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
  const auditHtml = renderAuditTimelineHtml(recentAuditLogs);

  return `
    <div class="view-header">
      <div>
        <a href="#/customers" class="text-muted hover:text-accent" style="text-decoration:none; margin-bottom:0.75rem; display:inline-block; font-size: 0.9rem;">← Back to Customers</a>
        <h1 class="view-title" style="margin-bottom: 0.25rem;">
           ${customer.name} 
           <span class="badge badge-${customer.customerStatus === 'archived' ? 'danger' : 'success'}" style="font-size: 0.8rem; vertical-align: middle;">${(customer.customerStatus || 'active').toUpperCase()}</span>
        </h1>
        <p class="view-subtitle" style="display:flex; align-items:center; gap:0.5rem;">
          <span style="color:var(--accent-teal)">📍</span> ${customer.address || 'No address provided'}
        </p>
      </div>
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-ghost" onclick="window.location.hash='#/customers'; setTimeout(() => window.showCustomerModal(${customer.id}), 100);">Edit Profile</button>
      </div>
    </div>
    
    <div class="customer-grid" style="display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem;">
      <div class="customer-main">
        
        <div class="card mb-4" style="padding: 0; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 1.5rem 1.5rem 1rem 1.5rem; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">
             <h3 style="margin:0;">Job History</h3>
             <button class="btn btn-ghost text-sm disabled" disabled title="Job creation coming in Step 3">Add Job</button>
          </div>
          <table class="data-table" style="margin:0;">
            <thead style="background: var(--bg-primary);">
              <tr><th style="padding-left:1.5rem;">Title</th><th>Status</th><th>Date</th><th>Final Price</th></tr>
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

        <div class="card mb-4" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Quote History</h3>
          <table class="data-table" style="margin:0;">
            <thead style="background: var(--bg-primary);">
              <tr><th style="padding-left:1.5rem;">Quote</th><th>Total</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>${quoteRows || '<tr><td colspan="4" class="text-center text-muted" style="padding: 2rem;">No quotes on record</td></tr>'}</tbody>
          </table>
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden;">
          <h3 style="padding: 1.5rem 1.5rem 1rem 1.5rem; margin: 0; border-bottom: 1px solid var(--border-color); background: var(--bg-primary);">Reminders</h3>
          <table class="data-table" style="margin:0;">
            <thead style="background: var(--bg-primary);">
              <tr><th style="padding-left:1.5rem;">Type</th><th>Scheduled</th><th>Status</th></tr>
            </thead>
            <tbody>${reminderRows || '<tr><td colspan="3" class="text-center text-muted" style="padding: 2rem;">No reminders on record</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      
      <div class="customer-sidebar">
        <!-- Contact Card -->
        <div class="card mb-4">
          <h3 style="margin-bottom: 1rem;">Contact & Profile</h3>
          <div style="display:flex; flex-direction:column; gap: 0.75rem; margin-bottom: 1.5rem;">
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="color:var(--text-muted)">📧</span>
              ${customer.email ? `<a href="mailto:${customer.email}" class="text-accent" style="text-decoration:none;">${customer.email}</a>` : '<span class="text-muted">No email</span>'}
            </div>
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="color:var(--text-muted)">📱</span>
              <span>${customer.phone || 'No phone'}</span>
            </div>
          </div>
          <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div class="text-sm text-muted mb-1">Customer Notes</div>
            <div style="line-height: 1.5;">${customer.notes || '<span class="text-muted text-sm">No special notes added.</span>'}</div>
          </div>
        </div>
        
        <!-- EtaleHub AI Intel -->
        <div class="card mb-4" style="background: linear-gradient(135deg, rgba(45, 212, 191, 0.05) 0%, rgba(26, 32, 44, 0.5) 100%); border: 1px solid var(--border-color);">
          <h3 style="margin-bottom: 1.5rem; color: var(--text-muted); display:flex; align-items:center; gap:0.5rem; font-size: 0.95rem;">
             🤖 AI Extracted Intel
          </h3>
          <div style="display:flex; flex-direction:column; gap: 1rem;">
             <div>
               <div class="text-sm text-muted mb-1">Equipment on site</div>
               <div class="font-medium">${(customer.equipmentList && customer.equipmentList.length > 0) ? customer.equipmentList.map(e => `• ${e}`).join('<br>') : 'None recorded'}</div>
             </div>
             <div>
               <div class="text-sm text-muted mb-1">Preferred Contact</div>
               <div class="font-medium" style="text-transform: capitalize;">${customer.preferredContact || 'Unknown'}</div>
             </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card">
          <h3 style="margin-bottom: 0.5rem;">Recent Activity</h3>
          <p class="text-muted text-sm mb-3">Recent actions logged for this customer.</p>
          <div class="audit-timeline" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 500px; overflow-y: auto; padding-right: 0.5rem;">
            ${auditHtml || '<div class="text-muted text-center" style="padding:2rem;">No recent activity</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}
