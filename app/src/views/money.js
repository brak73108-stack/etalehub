/**
 * EtaleHub Money View
 * Polished financial dashboard showing AI-recorded payments and invoices.
 */

import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getAll as getAllQuotes } from '../services/data/quotes-service.js';
import { getAll as getAllCustomers } from '../services/data/customers-service.js';
import { isDemoMode } from '../services/mode-service.js';

let currentInvoices = [];
let currentQuotes = [];
let customerMap = {};

export default async function renderMoney() {
  currentInvoices = await getAllInvoices() || [];
  currentQuotes = await getAllQuotes() || [];
  const customers = await getAllCustomers() || [];
  customerMap = customers.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  
  // Sort newest first
  currentInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  currentQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Calculate Summaries
  let outstanding = 0;
  let overdue = 0;
  let paidThisMonth = 0;
  let draftCount = 0;
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  currentInvoices.forEach(inv => {
    if (inv.status === 'sent') outstanding += (inv.total || 0);
    if (inv.status === 'overdue') { outstanding += (inv.total || 0); overdue += (inv.total || 0); }
    if (inv.status === 'paid' && inv.paidDate && new Date(inv.paidDate) >= monthStart) paidThisMonth += (inv.total || 0);
    if (inv.status === 'draft') draftCount++;
  });
  
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
    
    const invEl = document.getElementById('money-invoices');
    const quoteEl = document.getElementById('money-quotes');
    const payEl = document.getElementById('money-payments');
    
    if(invEl) invEl.style.display = tab === 'invoices' ? 'block' : 'none';
    if(quoteEl) quoteEl.style.display = tab === 'quotes' ? 'block' : 'none';
    if(payEl) payEl.style.display = tab === 'payments' ? 'block' : 'none';
  };

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Money</h1>
        <p class="view-subtitle">Manage invoices, quotes, and payments recorded by EtaleHub.</p>
      </div>
      <div style="display:flex; gap: 0.75rem;">
        ${isDemoMode() ? `
          <button class="btn btn-ghost" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Draft a quote for ', 100);">Draft Quote</button>
          <button class="btn btn-primary" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Record a payment for ', 100);">Record Payment</button>
        ` : `
          <span class="text-muted text-sm mt-2">Quick actions coming soon for production workspaces.</span>
        `}
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
    <div style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 2rem;">
      <button id="tab-invoices" class="tab-btn active" onclick="switchMoneyTab('invoices')" style="background:none; border:none; color:white; border-bottom: 2px solid var(--accent-teal); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Invoices</button>
      <button id="tab-quotes" class="tab-btn" onclick="switchMoneyTab('quotes')" style="background:none; border:none; color:var(--text-muted); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Quotes</button>
      <button id="tab-payments" class="tab-btn" onclick="switchMoneyTab('payments')" style="background:none; border:none; color:var(--text-muted); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Payments</button>
    </div>
    
    <!-- INVOICES TAB -->
    <div id="money-invoices" class="card" style="padding: 0; overflow:hidden;">
      <table class="data-table" style="margin: 0;">
        <thead style="background: var(--bg-primary);">
          <tr>
            <th style="padding-left: 1.5rem;">Invoice</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Dates</th>
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
          </tr>
        </thead>
        <tbody id="quotesTableBody"></tbody>
      </table>
    </div>
    
    <!-- PAYMENTS TAB -->
    <div id="money-payments" class="card" style="display:none; padding: 0; overflow:hidden;">
      <div style="padding: 1.5rem 1.5rem 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background: var(--bg-primary);">
        <h3 style="margin: 0;">Payment History</h3>
      </div>
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
  `;
}

export function initMoneyView() {
  const invStatusColors = { 'draft': 'default', 'sent': 'info', 'paid': 'success', 'overdue': 'danger' };
  
  const invRows = currentInvoices.map(inv => `
    <tr class="table-row" onclick="window.location.hash='#/customers/${inv.customerId}'" style="cursor:pointer; transition: background 0.2s;">
      <td style="padding-left: 1.5rem;">
        <div class="font-medium" style="font-size: 1.1rem; margin-bottom: 0.25rem;">${inv.invoiceNumber || 'Draft'}</div>
        ${inv.status === 'paid' ? '<span class="badge badge-info" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;" title="Payment was recorded by AI">🤖 AI Recorded</span>' : ''}
      </td>
      <td><span class="text-accent font-medium">${customerMap[inv.customerId] || 'Unknown'}</span></td>
      <td><div class="font-medium" style="font-size: 1.1rem;">£${(inv.total || 0).toFixed(2)}</div></td>
      <td><span class="badge badge-${invStatusColors[inv.status || 'draft'] || 'default'}">${(inv.status || 'draft').toUpperCase()}</span></td>
      <td>
        <div class="text-sm" style="margin-bottom:0.25rem;"><span class="text-muted">Due:</span> ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</div>
        ${inv.paidDate ? `<div class="text-sm text-success"><span class="text-muted">Paid:</span> ${new Date(inv.paidDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>` : ''}
      </td>
    </tr>
  `).join('');
  document.getElementById('invoicesTableBody').innerHTML = invRows || `<tr><td colspan="5" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">🧾</div><h3 class="text-muted">No invoices yet.</h3></td></tr>`;

  const quoteRows = currentQuotes.map(q => `
    <tr class="table-row" onclick="window.location.hash='#/customers/${q.customerId}'" style="cursor:pointer; transition: background 0.2s;">
      <td style="padding-left: 1.5rem;"><span class="font-medium" style="font-size: 1.1rem;">${q.quoteNumber || 'Draft'}</span></td>
      <td><span class="text-accent font-medium">${customerMap[q.customerId] || 'Unknown'}</span></td>
      <td><div class="font-medium" style="font-size: 1.1rem;">£${(q.total || 0).toFixed(2)}</div></td>
      <td><span class="badge badge-${q.status === 'accepted' ? 'success' : (q.status === 'sent' ? 'info' : 'default')}">${(q.status || 'draft').toUpperCase()}</span></td>
      <td>${q.followUpDate ? new Date(q.followUpDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</td>
    </tr>
  `).join('');
  document.getElementById('quotesTableBody').innerHTML = quoteRows || `<tr><td colspan="5" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">📝</div><h3 class="text-muted">No quotes yet.</h3></td></tr>`;

  const payments = currentInvoices.filter(i => i.status === 'paid' && i.paidDate)
    .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));
  
  const paymentRows = payments.map(p => `
    <tr class="table-row" onclick="window.location.hash='#/customers/${p.customerId}'" style="cursor:pointer; transition: background 0.2s;">
      <td style="padding-left: 1.5rem;">
        <div class="font-medium">${new Date(p.paidDate).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}</div>
        <span class="badge badge-info mt-1" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">🤖 Recorded by AI</span>
      </td>
      <td><span class="text-muted">${p.invoiceNumber || 'Unknown'}</span></td>
      <td><span class="text-accent font-medium">${customerMap[p.customerId] || 'Unknown'}</span></td>
      <td><span class="badge badge-default" style="text-transform: capitalize;">${p.paymentMethod || 'Unknown'}</span></td>
      <td><div class="font-medium text-success" style="font-size: 1.25rem;">£${(p.total || 0).toFixed(2)}</div></td>
    </tr>
  `).join('');
  document.getElementById('paymentsTableBody').innerHTML = paymentRows || `<tr><td colspan="5" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">💳</div><h3 class="text-muted">No payments recorded yet.</h3></td></tr>`;
}
