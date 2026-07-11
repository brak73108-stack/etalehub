/**
 * EtaleHub Money View
 * Manages invoices, quotes, and payment records.
 */

import { getAll as getAllInvoices, create as createInvoice, update as updateInvoice, markSent as markInvoiceSent, markPaid as markInvoicePaid, voidInvoice } from '../services/data/invoices-service.js';
import { getAll as getAllQuotes, create as createQuote, update as updateQuote, markSent as markQuoteSent, markAccepted as markQuoteAccepted, markRejected as markQuoteRejected, expireQuote } from '../services/data/quotes-service.js';
import { getAll as getAllCustomers } from '../services/data/customers-service.js';
import { getAll as getAllJobs } from '../services/data/jobs-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { isDemoMode } from '../services/mode-service.js';
import { renderAuditTimelineHtml } from '../utils/audit-helpers.js';

let currentInvoices = [];
let currentQuotes = [];
let allCustomers = [];
let allJobs = [];
let customerMap = {};
let jobMap = {};

export default async function renderMoney() {
  currentInvoices = await getAllInvoices() || [];
  currentQuotes = await getAllQuotes() || [];
  allCustomers = await getAllCustomers() || [];
  allJobs = await getAllJobs() || [];
  
  customerMap = allCustomers.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  jobMap = allJobs.reduce((acc, j) => { acc[j.id] = j; return acc; }, {});
  
  // Sort newest first
  currentInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  currentQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Calculate Summaries Safely
  let outstanding = 0;
  let overdue = 0;
  let paidThisMonth = 0;
  let draftCount = 0;
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  currentInvoices.forEach(inv => {
    const amount = Number(inv.total || inv.amount || 0) || 0;
    if (inv.status === 'sent') outstanding += amount;
    if (inv.status === 'overdue') { outstanding += amount; overdue += amount; }
    if (inv.status === 'paid' && inv.paidDate && new Date(inv.paidDate) >= monthStart) paidThisMonth += amount;
    if (inv.status === 'draft') draftCount++;
  });

  // Global Tab Switcher
  window.switchMoneyTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.style.color = 'var(--text-muted)';
      b.style.borderBottom = 'none';
    });
    
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.color = 'white';
      activeBtn.style.borderBottom = '2px solid var(--accent-teal)';
    }
    
    document.getElementById('money-invoices').style.display = tab === 'invoices' ? 'block' : 'none';
    document.getElementById('money-quotes').style.display = tab === 'quotes' ? 'block' : 'none';
    document.getElementById('money-payments').style.display = tab === 'payments' ? 'block' : 'none';
  };

  // ---------------------------------------------------------
  // INVOICE MODALS AND ACTIONS
  // ---------------------------------------------------------
  window.showInvoiceModal = (id = null) => {
    const modal = document.getElementById('invoiceModalForm');
    const form = document.getElementById('invoiceForm');
    form.reset();
    document.getElementById('invoiceError').style.display = 'none';

    // Populate customer select
    const custSelect = document.getElementById('invoiceCustomerId');
    custSelect.innerHTML = '<option value="">-- Select Customer --</option>' + 
      allCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // Populate job select
    const jobSelect = document.getElementById('invoiceJobId');
    jobSelect.innerHTML = '<option value="">-- No Linked Job --</option>' + 
      allJobs.map(j => `<option value="${j.id}" data-customer="${j.customerId}">${j.title || j.jobType} (${new Date(j.scheduledDate).toLocaleDateString()})</option>`).join('');

    if (id) {
      const inv = currentInvoices.find(i => i.id === id);
      if (inv) {
        document.getElementById('invoiceId').value = inv.id;
        document.getElementById('invoiceNumber').value = inv.invoiceNumber || '';
        document.getElementById('invoiceCustomerId').value = inv.customerId || '';
        document.getElementById('invoiceJobId').value = inv.jobId || '';
        document.getElementById('invoiceAmount').value = inv.total || inv.amount || '';
        
        if (inv.dueDate) {
           document.getElementById('invoiceDueDate').value = new Date(inv.dueDate).toISOString().split('T')[0];
        }
        
        document.getElementById('invoiceStatus').value = inv.status || 'draft';
        document.getElementById('invoiceNotes').value = inv.notes || '';
        document.getElementById('invoiceModalTitle').innerText = 'Edit Invoice Draft';
      }
    } else {
      document.getElementById('invoiceId').value = '';
      document.getElementById('invoiceStatus').value = 'draft';
      document.getElementById('invoiceNumber').value = `INV-${new Date().toISOString().split('T')[0].replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`;
      document.getElementById('invoiceModalTitle').innerText = 'Create Invoice Draft';
    }
    modal.style.display = 'flex';
  };

  window.closeInvoiceModal = () => document.getElementById('invoiceModalForm').style.display = 'none';

  window.saveInvoice = async () => {
    const id = document.getElementById('invoiceId').value;
    const invNumber = document.getElementById('invoiceNumber').value.trim();
    const customerId = document.getElementById('invoiceCustomerId').value;
    const jobId = document.getElementById('invoiceJobId').value;
    const amountVal = document.getElementById('invoiceAmount').value;
    const dueDate = document.getElementById('invoiceDueDate').value;
    const status = document.getElementById('invoiceStatus').value;
    const notes = document.getElementById('invoiceNotes').value.trim();
    const errorEl = document.getElementById('invoiceError');

    if (!customerId) { errorEl.innerText = "Customer is required."; errorEl.style.display = 'block'; return; }
    if (!amountVal || isNaN(parseFloat(amountVal)) || parseFloat(amountVal) < 0) { errorEl.innerText = "Valid positive amount is required."; errorEl.style.display = 'block'; return; }
    if (!dueDate) { errorEl.innerText = "Due date is required."; errorEl.style.display = 'block'; return; }

    // Job matching validation
    if (jobId) {
      const job = allJobs.find(j => j.id === Number(jobId));
      if (job && job.customerId !== Number(customerId)) {
        errorEl.innerText = "The selected job does not belong to the selected customer."; 
        errorEl.style.display = 'block'; 
        return;
      }
    }

    errorEl.style.display = 'none';
    const btn = document.getElementById('saveInvoiceBtn');
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
      const payload = { 
        invoiceNumber: invNumber || `INV-${new Date().getTime()}`,
        customerId: Number(customerId), 
        jobId: jobId ? Number(jobId) : null,
        total: parseFloat(amountVal),
        amount: parseFloat(amountVal),
        dueDate: new Date(dueDate).toISOString(),
        status, 
        notes
      };

      if (id) await updateInvoice(Number(id), payload);
      else await createInvoice(payload);
      
      currentInvoices = await getAllInvoices() || [];
      renderMoneyData();
      closeInvoiceModal();
    } catch (e) {
      errorEl.innerText = "Error saving invoice."; errorEl.style.display = 'block';
    } finally {
      btn.innerText = 'Save Invoice'; btn.disabled = false;
    }
  };

  window.promptMarkInvoiceSent = async (id, event) => {
    event.stopPropagation();
    try { await markInvoiceSent(id); currentInvoices = await getAllInvoices() || []; renderMoneyData(); } 
    catch(e) { alert('Error marking sent'); }
  };

  window.promptMarkInvoicePaid = async (id, event) => {
    event.stopPropagation();
    const method = prompt("Enter payment method (e.g., Bank Transfer, Card, Cash):", "Bank Transfer");
    if (method !== null) {
      try { 
        await updateInvoice(id, { paymentMethod: method });
        await markInvoicePaid(id); 
        currentInvoices = await getAllInvoices() || []; 
        renderMoneyData(); 
      } catch(e) { alert('Error marking paid'); }
    }
  };

  window.promptVoidInvoice = async (id, event) => {
    event.stopPropagation();
    if(confirm("Are you sure you want to void this invoice?")) {
      try { await voidInvoice(id); currentInvoices = await getAllInvoices() || []; renderMoneyData(); } 
      catch(e) { alert('Error voiding invoice'); }
    }
  };

  window.viewInvoiceDetail = async (id) => {
    const inv = currentInvoices.find(i => i.id === id);
    if (!inv) return;
    
    const custName = customerMap[inv.customerId] || 'Unknown';
    const jobTitle = jobMap[inv.jobId]?.title || 'No linked job';
    
    const allAudit = await getAllAuditLogs() || [];
    const auditLogs = allAudit.filter(log => log && log.entityType === 'invoice' && log.entityId === inv.id);
    
    const recentAuditLogs = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    const auditHtml = renderAuditTimelineHtml(recentAuditLogs);

    const modalHtml = `
      <div id="moneyDetailModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="card" style="width: 500px; max-height: 90vh; overflow-y: auto;">
          <div style="display:flex; justify-content: space-between; margin-bottom: 1rem;">
            <h2>${inv.invoiceNumber}</h2>
            <button onclick="document.getElementById('moneyDetailModal').remove()" class="btn btn-ghost">✕</button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px;">
            <div><div class="text-sm text-muted">Customer</div><div class="font-medium">${custName}</div></div>
            <div><div class="text-sm text-muted">Job</div><div class="font-medium">${jobTitle}</div></div>
            <div><div class="text-sm text-muted">Amount</div><div class="font-medium" style="font-size:1.2rem;">£${(inv.total || inv.amount || 0).toFixed(2)}</div></div>
            <div><div class="text-sm text-muted">Status</div><span class="badge badge-${inv.status==='paid'?'success':inv.status==='void'?'default':'warning'}">${inv.status.toUpperCase()}</span></div>
            <div><div class="text-sm text-muted">Due Date</div><div>${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</div></div>
            <div><div class="text-sm text-muted">Paid Date</div><div>${inv.paidDate ? new Date(inv.paidDate).toLocaleDateString() : '-'}</div></div>
          </div>
          <div style="margin-bottom: 1rem;"><strong>Notes:</strong> <span class="text-muted">${inv.notes || 'None'}</span></div>
          <h4>Recent Activity</h4>
          <div style="max-height:200px; overflow-y:auto;">${auditHtml || '<div class="text-muted">No activity</div>'}</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  // ---------------------------------------------------------
  // QUOTE MODALS AND ACTIONS
  // ---------------------------------------------------------
  window.showQuoteModal = (id = null) => {
    const modal = document.getElementById('quoteModalForm');
    const form = document.getElementById('quoteForm');
    form.reset();
    document.getElementById('quoteError').style.display = 'none';

    const custSelect = document.getElementById('quoteCustomerId');
    custSelect.innerHTML = '<option value="">-- Select Customer --</option>' + 
      allCustomers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (id) {
      const q = currentQuotes.find(i => i.id === id);
      if (q) {
        document.getElementById('quoteId').value = q.id;
        document.getElementById('quoteNumber').value = q.quoteNumber || '';
        document.getElementById('quoteCustomerId').value = q.customerId || '';
        document.getElementById('quoteAmount').value = q.total || q.amount || '';
        if (q.followUpDate) document.getElementById('quoteFollowUpDate').value = new Date(q.followUpDate).toISOString().split('T')[0];
        document.getElementById('quoteStatus').value = q.status || 'draft';
        document.getElementById('quoteNotes').value = q.notes || '';
        document.getElementById('quoteModalTitle').innerText = 'Edit Quote Draft';
      }
    } else {
      document.getElementById('quoteId').value = '';
      document.getElementById('quoteStatus').value = 'draft';
      document.getElementById('quoteNumber').value = `QUO-${new Date().toISOString().split('T')[0].replace(/-/g,'')}-${Math.floor(Math.random()*1000)}`;
      document.getElementById('quoteModalTitle').innerText = 'Create Quote Draft';
    }
    modal.style.display = 'flex';
  };

  window.closeQuoteModal = () => document.getElementById('quoteModalForm').style.display = 'none';

  window.saveQuote = async () => {
    const id = document.getElementById('quoteId').value;
    const quoteNumber = document.getElementById('quoteNumber').value.trim();
    const customerId = document.getElementById('quoteCustomerId').value;
    const amountVal = document.getElementById('quoteAmount').value;
    const followUpDate = document.getElementById('quoteFollowUpDate').value;
    const status = document.getElementById('quoteStatus').value;
    const notes = document.getElementById('quoteNotes').value.trim();
    const errorEl = document.getElementById('quoteError');

    if (!customerId) { errorEl.innerText = "Customer is required."; errorEl.style.display = 'block'; return; }
    if (!amountVal || isNaN(parseFloat(amountVal)) || parseFloat(amountVal) < 0) { errorEl.innerText = "Valid positive amount is required."; errorEl.style.display = 'block'; return; }

    errorEl.style.display = 'none';
    const btn = document.getElementById('saveQuoteBtn');
    btn.innerText = 'Saving...'; btn.disabled = true;

    try {
      const payload = { 
        quoteNumber: quoteNumber || `QUO-${new Date().getTime()}`,
        customerId: Number(customerId), 
        total: parseFloat(amountVal),
        amount: parseFloat(amountVal),
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        status, notes
      };
      if (id) await updateQuote(Number(id), payload); else await createQuote(payload);
      currentQuotes = await getAllQuotes() || [];
      renderMoneyData();
      closeQuoteModal();
    } catch (e) {
      errorEl.innerText = "Error saving quote."; errorEl.style.display = 'block';
    } finally {
      btn.innerText = 'Save Quote'; btn.disabled = false;
    }
  };

  window.promptMarkQuoteSent = async (id, event) => { event.stopPropagation(); try { await markQuoteSent(id); currentQuotes = await getAllQuotes() || []; renderMoneyData(); } catch(e) { alert('Error'); } };
  window.promptMarkQuoteAccepted = async (id, event) => { event.stopPropagation(); try { await markQuoteAccepted(id); currentQuotes = await getAllQuotes() || []; renderMoneyData(); } catch(e) { alert('Error'); } };
  window.promptMarkQuoteRejected = async (id, event) => { event.stopPropagation(); try { await markQuoteRejected(id); currentQuotes = await getAllQuotes() || []; renderMoneyData(); } catch(e) { alert('Error'); } };
  window.promptExpireQuote = async (id, event) => { event.stopPropagation(); if(confirm("Expire this quote?")) { try { await expireQuote(id); currentQuotes = await getAllQuotes() || []; renderMoneyData(); } catch(e) { alert('Error'); } } };

  window.viewQuoteDetail = async (id) => {
    const q = currentQuotes.find(i => i.id === id);
    if (!q) return;
    const custName = customerMap[q.customerId] || 'Unknown';
    const allAudit = await getAllAuditLogs() || [];
    const auditLogs = allAudit.filter(log => log && log.entityType === 'quote' && log.entityId === q.id);
    const recentAuditLogs = auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    const auditHtml = renderAuditTimelineHtml(recentAuditLogs);

    const modalHtml = `
      <div id="moneyDetailModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="card" style="width: 500px; max-height: 90vh; overflow-y: auto;">
          <div style="display:flex; justify-content: space-between; margin-bottom: 1rem;">
            <h2>${q.quoteNumber}</h2>
            <button onclick="document.getElementById('moneyDetailModal').remove()" class="btn btn-ghost">✕</button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px;">
            <div><div class="text-sm text-muted">Customer</div><div class="font-medium">${custName}</div></div>
            <div><div class="text-sm text-muted">Amount</div><div class="font-medium" style="font-size:1.2rem;">£${(q.total || q.amount || 0).toFixed(2)}</div></div>
            <div><div class="text-sm text-muted">Status</div><span class="badge badge-${q.status==='accepted'?'success':q.status==='rejected'?'danger':'warning'}">${q.status.toUpperCase()}</span></div>
            <div><div class="text-sm text-muted">Follow-up Date</div><div>${q.followUpDate ? new Date(q.followUpDate).toLocaleDateString() : '-'}</div></div>
          </div>
          <div style="margin-bottom: 1rem;"><strong>Notes:</strong> <span class="text-muted">${q.notes || 'None'}</span></div>
          <h4>Recent Activity</h4>
          <div style="max-height:200px; overflow-y:auto;">${auditHtml || '<div class="text-muted">No activity</div>'}</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Money</h1>
        <p class="view-subtitle">Manage drafts, invoices, quotes, and payment records safely.</p>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2.5rem;">
      <div class="card stat-card" style="border-top: 4px solid var(--accent-success);">
        <div class="stat-label">Paid This Month</div>
        <div class="stat-value text-success">£${paidThisMonth.toFixed(2)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Outstanding</div>
        <div class="stat-value">£${outstanding.toFixed(2)}</div>
      </div>
      <div class="card stat-card" style="${overdue > 0 ? 'border-top: 4px solid var(--accent-danger);' : ''}">
        <div class="stat-label">Overdue</div>
        <div class="stat-value ${overdue > 0 ? 'text-danger' : ''}">£${overdue.toFixed(2)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">Draft Invoices</div>
        <div class="stat-value">${draftCount}</div>
      </div>
    </div>
    
    <!-- Tabs -->
    <div style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
      <div style="display: flex; gap: 2rem;">
        <button id="tab-invoices" class="tab-btn active" onclick="switchMoneyTab('invoices')" style="background:none; border:none; color:white; border-bottom: 2px solid var(--accent-teal); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Invoices</button>
        <button id="tab-quotes" class="tab-btn" onclick="switchMoneyTab('quotes')" style="background:none; border:none; color:var(--text-muted); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Quotes</button>
        <button id="tab-payments" class="tab-btn" onclick="switchMoneyTab('payments')" style="background:none; border:none; color:var(--text-muted); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Payments</button>
      </div>
      <div style="display: flex; gap: 0.5rem; padding-bottom: 0.5rem;">
        <button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.9rem;" onclick="showInvoiceModal()">+ Draft Invoice</button>
        <button class="btn btn-ghost" style="padding: 0.25rem 0.75rem; font-size: 0.9rem;" onclick="showQuoteModal()">+ Draft Quote</button>
      </div>
    </div>
    
    <!-- INVOICES TAB -->
    <div id="money-invoices" class="card" style="padding: 0; overflow:hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Invoice</th>
            <th>Customer & Job</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Due Date</th>
            <th style="text-align: right; padding-right: 1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody id="invoicesTableBody"></tbody>
      </table>
    </div>
    
    <!-- QUOTES TAB -->
    <div id="money-quotes" class="card" style="display:none; padding: 0; overflow:hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Quote</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Follow Up</th>
            <th style="text-align: right; padding-right: 1.5rem;">Actions</th>
          </tr>
        </thead>
        <tbody id="quotesTableBody"></tbody>
      </table>
    </div>
    
    <!-- PAYMENTS TAB -->
    <div id="money-payments" class="card" style="display:none; padding: 0; overflow:hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Date Paid</th>
            <th>Invoice Ref</th>
            <th>Customer</th>
            <th>Method</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody id="paymentsTableBody"></tbody>
      </table>
    </div>

    <!-- INVOICE MODAL -->
    <div id="invoiceModalForm" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div class="card" style="width: 100%; max-width: 500px; margin: 1rem;">
        <h2 id="invoiceModalTitle" style="margin-bottom: 1.5rem;">Create Invoice Draft</h2>
        <div id="invoiceError" class="text-danger" style="display:none; margin-bottom: 1rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;"></div>
        <form id="invoiceForm" onsubmit="event.preventDefault(); saveInvoice();">
          <input type="hidden" id="invoiceId" />
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Invoice Number</label><input type="text" id="invoiceNumber" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></div>
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Status</label><select id="invoiceStatus" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="void">Void</option></select></div>
          </div>
          <div style="margin-bottom: 1rem;"><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Customer *</label><select id="invoiceCustomerId" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select></div>
          <div style="margin-bottom: 1rem;"><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Linked Job (Optional)</label><select id="invoiceJobId" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Amount (£) *</label><input type="number" step="0.01" id="invoiceAmount" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></div>
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Due Date *</label><input type="date" id="invoiceDueDate" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></div>
          </div>
          <div style="margin-bottom: 1.5rem;"><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Notes</label><textarea id="invoiceNotes" rows="2" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white; resize: vertical;"></textarea></div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem;"><button type="button" class="btn btn-ghost" onclick="closeInvoiceModal()">Cancel</button><button type="submit" class="btn btn-primary" id="saveInvoiceBtn">Save</button></div>
        </form>
      </div>
    </div>

    <!-- QUOTE MODAL -->
    <div id="quoteModalForm" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div class="card" style="width: 100%; max-width: 500px; margin: 1rem;">
        <h2 id="quoteModalTitle" style="margin-bottom: 1.5rem;">Create Quote Draft</h2>
        <div id="quoteError" class="text-danger" style="display:none; margin-bottom: 1rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;"></div>
        <form id="quoteForm" onsubmit="event.preventDefault(); saveQuote();">
          <input type="hidden" id="quoteId" />
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Quote Number</label><input type="text" id="quoteNumber" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></div>
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Status</label><select id="quoteStatus" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></div>
          </div>
          <div style="margin-bottom: 1rem;"><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Customer *</label><select id="quoteCustomerId" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></select></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Amount (£) *</label><input type="number" step="0.01" id="quoteAmount" required style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></div>
            <div><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Follow-up Date</label><input type="date" id="quoteFollowUpDate" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white;"></div>
          </div>
          <div style="margin-bottom: 1.5rem;"><label style="display:block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">Notes</label><textarea id="quoteNotes" rows="2" style="width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-body); color: white; resize: vertical;"></textarea></div>
          <div style="display: flex; justify-content: flex-end; gap: 1rem;"><button type="button" class="btn btn-ghost" onclick="closeQuoteModal()">Cancel</button><button type="submit" class="btn btn-primary" id="saveQuoteBtn">Save</button></div>
        </form>
      </div>
    </div>
  `;
}

function renderMoneyData() {
  const invStatusColors = { 'draft': 'default', 'sent': 'info', 'paid': 'success', 'overdue': 'danger', 'void': 'default' };
  
  const invRows = currentInvoices.map(inv => `
    <tr class="table-row" style="transition: background 0.2s;">
      <td style="padding-left: 1.5rem; cursor:pointer;" onclick="viewInvoiceDetail(${inv.id})">
        <div class="font-medium" style="font-size: 1.1rem; margin-bottom: 0.25rem;">${inv.invoiceNumber || 'Draft'}</div>
      </td>
      <td style="cursor:pointer;" onclick="viewInvoiceDetail(${inv.id})">
         <span class="text-accent font-medium">${customerMap[inv.customerId] || 'Unknown'}</span>
         <div class="text-sm text-muted">${jobMap[inv.jobId]?.title || 'No linked job'}</div>
      </td>
      <td style="cursor:pointer;" onclick="viewInvoiceDetail(${inv.id})"><div class="font-medium" style="font-size: 1.1rem;">£${(inv.total || inv.amount || 0).toFixed(2)}</div></td>
      <td style="cursor:pointer;" onclick="viewInvoiceDetail(${inv.id})"><span class="badge badge-${invStatusColors[inv.status || 'draft'] || 'default'}">${(inv.status || 'draft').toUpperCase()}</span></td>
      <td style="cursor:pointer;" onclick="viewInvoiceDetail(${inv.id})">
        <div class="text-sm">${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</div>
      </td>
      <td style="text-align: right; padding-right: 1.5rem;">
         <button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="showInvoiceModal(${inv.id})">Edit</button>
         ${['draft'].includes(inv.status) ? `<button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkInvoiceSent(${inv.id}, event)">Mark Sent</button>` : ''}
         ${['draft', 'sent', 'overdue'].includes(inv.status) ? `<button class="btn btn-ghost text-success" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkInvoicePaid(${inv.id}, event)">Mark Paid</button>` : ''}
         ${!['void', 'paid'].includes(inv.status) ? `<button class="btn btn-ghost text-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptVoidInvoice(${inv.id}, event)">Void</button>` : ''}
      </td>
    </tr>
  `).join('');
  document.getElementById('invoicesTableBody').innerHTML = invRows || `<tr><td colspan="6" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">🧾</div><h3 class="text-muted">No invoices yet.</h3><p class="text-muted">Create your first invoice draft or ask the Command Centre.</p></td></tr>`;

  const quoteRows = currentQuotes.map(q => `
    <tr class="table-row" style="transition: background 0.2s;">
      <td style="padding-left: 1.5rem; cursor:pointer;" onclick="viewQuoteDetail(${q.id})"><span class="font-medium" style="font-size: 1.1rem;">${q.quoteNumber || 'Draft'}</span></td>
      <td style="cursor:pointer;" onclick="viewQuoteDetail(${q.id})"><span class="text-accent font-medium">${customerMap[q.customerId] || 'Unknown'}</span></td>
      <td style="cursor:pointer;" onclick="viewQuoteDetail(${q.id})"><div class="font-medium" style="font-size: 1.1rem;">£${(q.total || q.amount || 0).toFixed(2)}</div></td>
      <td style="cursor:pointer;" onclick="viewQuoteDetail(${q.id})"><span class="badge badge-${q.status === 'accepted' ? 'success' : (q.status === 'sent' ? 'info' : (q.status === 'rejected' || q.status === 'expired' ? 'danger' : 'default'))}">${(q.status || 'draft').toUpperCase()}</span></td>
      <td style="cursor:pointer;" onclick="viewQuoteDetail(${q.id})">${q.followUpDate ? new Date(q.followUpDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</td>
      <td style="text-align: right; padding-right: 1.5rem;">
         <button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="showQuoteModal(${q.id})">Edit</button>
         ${['draft'].includes(q.status) ? `<button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkQuoteSent(${q.id}, event)">Mark Sent</button>` : ''}
         ${['draft', 'sent'].includes(q.status) ? `<button class="btn btn-ghost text-success" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkQuoteAccepted(${q.id}, event)">Accept</button>` : ''}
         ${['draft', 'sent'].includes(q.status) ? `<button class="btn btn-ghost text-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptMarkQuoteRejected(${q.id}, event)">Reject</button>` : ''}
         ${['draft', 'sent'].includes(q.status) ? `<button class="btn btn-ghost text-muted" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="promptExpireQuote(${q.id}, event)">Expire</button>` : ''}
      </td>
    </tr>
  `).join('');
  document.getElementById('quotesTableBody').innerHTML = quoteRows || `<tr><td colspan="6" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">📝</div><h3 class="text-muted">No quotes yet.</h3><p class="text-muted">Create your first quote draft or ask the Command Centre.</p></td></tr>`;

  const payments = currentInvoices.filter(i => i.status === 'paid' && i.paidDate)
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));
  
  const paymentRows = payments.map(p => `
    <tr class="table-row" style="transition: background 0.2s;" onclick="viewInvoiceDetail(${p.id})">
      <td style="padding-left: 1.5rem; cursor:pointer;">
        <div class="font-medium">${new Date(p.paidDate).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}</div>
      </td>
      <td style="cursor:pointer;"><span class="text-muted">${p.invoiceNumber || 'Unknown'}</span></td>
      <td style="cursor:pointer;"><span class="text-accent font-medium">${customerMap[p.customerId] || 'Unknown'}</span></td>
      <td style="cursor:pointer;"><span class="badge badge-default" style="text-transform: capitalize;">${p.paymentMethod || 'Unknown'}</span></td>
      <td style="cursor:pointer;"><div class="font-medium text-success" style="font-size: 1.25rem;">£${(p.total || p.amount || 0).toFixed(2)}</div></td>
    </tr>
  `).join('');
  document.getElementById('paymentsTableBody').innerHTML = paymentRows || `<tr><td colspan="5" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">💳</div><h3 class="text-muted">No payments recorded yet.</h3></td></tr>`;
}

export function initMoneyView() {
  renderMoneyData();
}
