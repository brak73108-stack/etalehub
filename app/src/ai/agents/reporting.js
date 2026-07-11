import { getAll as getAllJobs } from '../../services/data/jobs-service.js';
import { getAll as getAllInvoices } from '../../services/data/invoices-service.js';
import { getAll as getAllQuotes } from '../../services/data/quotes-service.js';
import { getAll as getAllReminders } from '../../services/data/reminders-service.js';
import { getAll as getAllCustomers } from '../../services/data/customers-service.js';
import { getAll as getAllApprovals } from '../../services/data/approvals-service.js';

export async function execute(request) {
  const { action, ctx } = request;

  switch (action) {
    case 'show_today_jobs':
      return await handleShowTodayJobs();
    case 'check_overdue_invoices':
      return await handleCheckOverdueInvoices();
    case 'show_unpaid_invoices':
      return await handleShowUnpaidInvoices();
    case 'show_quote_followups':
      return await handleShowQuoteFollowups();
    case 'show_incomplete_jobs':
      return await handleShowIncompleteJobs();
    case 'show_due_reminders':
      return await handleShowDueReminders();
    case 'what_needs_attention':
      return await handleWhatNeedsAttention();
    case 'summarize_customer':
      return await handleSummarizeCustomer(ctx);
    case 'ask_business_question':
      return await handleAskBusinessQuestion();
    default:
      return { success: false };
  }
}

function getCustomerName(customers, id) {
  const c = customers.find(c => c.id === id);
  return c ? c.name : 'Unknown';
}

function safeDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString();
}

async function handleShowTodayJobs() {
  const jobs = await getAllJobs() || [];
  const customers = await getAllCustomers() || [];
  const todayStr = new Date().toISOString().split('T')[0];
  
  const todayJobs = jobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr));
  
  if (todayJobs.length === 0) {
    return {
      success: true,
      actionCard: {
        title: "Today's Jobs",
        details: "No jobs scheduled for today.",
        safe: true
      }
    };
  }

  const items = todayJobs.slice(0, 5).map(j => `
    <div style="border: 1px solid var(--border-color); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${j.title}</strong> (${(j.status||'').toUpperCase()})<br/>
      Customer: ${getCustomerName(customers, j.customerId)}<br/>
      Time: ${new Date(j.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
    </div>
  `).join('');

  const more = todayJobs.length > 5 ? `<div class="text-muted text-sm">and ${todayJobs.length - 5} more...</div>` : '';

  return {
    success: true,
    actionCard: {
      title: "Today's Jobs",
      details: items + more,
      safe: true
    }
  };
}

async function handleCheckOverdueInvoices() {
  const invoices = await getAllInvoices() || [];
  const customers = await getAllCustomers() || [];
  const now = new Date();
  
  const overdue = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'draft' && inv.dueDate && new Date(inv.dueDate) < now);
  
  if (overdue.length === 0) {
    return {
      success: true,
      actionCard: { title: "Overdue Invoices", details: "No overdue invoices found.", safe: true }
    };
  }

  const items = overdue.slice(0, 5).map(inv => `
    <div style="border: 1px solid var(--border-color); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px; border-left: 3px solid var(--accent-danger);">
      <strong>${inv.invoiceNumber}</strong> - £${inv.total}<br/>
      Customer: ${getCustomerName(customers, inv.customerId)}<br/>
      Due: ${safeDate(inv.dueDate)}
    </div>
  `).join('');

  const more = overdue.length > 5 ? `<div class="text-muted text-sm">and ${overdue.length - 5} more...</div>` : '';

  return {
    success: true,
    actionCard: { title: "Overdue Invoices", details: items + more, safe: true }
  };
}

async function handleShowUnpaidInvoices() {
  const invoices = await getAllInvoices() || [];
  const customers = await getAllCustomers() || [];
  
  const unpaid = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
  
  if (unpaid.length === 0) {
    return {
      success: true,
      actionCard: { title: "Unpaid Invoices", details: "No unpaid invoices found.", safe: true }
    };
  }

  const items = unpaid.slice(0, 5).map(inv => `
    <div style="border: 1px solid var(--border-color); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${inv.invoiceNumber}</strong> - £${inv.total} (${(inv.status||'').toUpperCase()})<br/>
      Customer: ${getCustomerName(customers, inv.customerId)}<br/>
      Due: ${safeDate(inv.dueDate)}
    </div>
  `).join('');

  const more = unpaid.length > 5 ? `<div class="text-muted text-sm">and ${unpaid.length - 5} more...</div>` : '';

  return {
    success: true,
    actionCard: { title: "Unpaid Invoices", details: items + more, safe: true }
  };
}

async function handleShowQuoteFollowups() {
  const quotes = await getAllQuotes() || [];
  const customers = await getAllCustomers() || [];
  const now = new Date();
  
  const due = quotes.filter(q => q.status === 'sent' && q.followUpDate && new Date(q.followUpDate) <= now);
  
  if (due.length === 0) {
    return {
      success: true,
      actionCard: { title: "Quote Follow-ups", details: "No quote follow-ups due.", safe: true }
    };
  }

  const items = due.slice(0, 5).map(q => `
    <div style="border: 1px solid var(--border-color); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${q.quoteNumber}</strong> - £${q.total}<br/>
      Customer: ${getCustomerName(customers, q.customerId)}<br/>
      Follow-up: ${safeDate(q.followUpDate)}
    </div>
  `).join('');

  const more = due.length > 5 ? `<div class="text-muted text-sm">and ${due.length - 5} more...</div>` : '';

  return {
    success: true,
    actionCard: { title: "Quote Follow-ups", details: items + more, safe: true }
  };
}

async function handleShowIncompleteJobs() {
  const jobs = await getAllJobs() || [];
  const customers = await getAllCustomers() || [];
  
  const incomplete = jobs.filter(j => j.status !== 'complete' && j.status !== 'cancelled');
  
  if (incomplete.length === 0) {
    return {
      success: true,
      actionCard: { title: "Incomplete Jobs", details: "No incomplete jobs found.", safe: true }
    };
  }

  const items = incomplete.slice(0, 5).map(j => `
    <div style="border: 1px solid var(--border-color); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${j.title}</strong> (${(j.status||'').toUpperCase()})<br/>
      Customer: ${getCustomerName(customers, j.customerId)}<br/>
      Scheduled: ${safeDate(j.scheduledDate)}
    </div>
  `).join('');

  const more = incomplete.length > 5 ? `<div class="text-muted text-sm">and ${incomplete.length - 5} more...</div>` : '';

  return {
    success: true,
    actionCard: { title: "Incomplete Jobs", details: items + more, safe: true }
  };
}

async function handleShowDueReminders() {
  const reminders = await getAllReminders() || [];
  const customers = await getAllCustomers() || [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const due = reminders.filter(r => r.status === 'pending' && r.scheduledDate && new Date(r.scheduledDate) <= nextWeek);
  
  if (due.length === 0) {
    return {
      success: true,
      actionCard: { title: "Due Reminders", details: "No reminders due this week.", safe: true }
    };
  }

  const items = due.slice(0, 5).map(r => `
    <div style="border: 1px solid var(--border-color); padding: 0.5rem; margin-bottom: 0.5rem; border-radius: 4px;">
      <strong>${(r.type || 'Reminder').replace(/_/g, ' ')}</strong><br/>
      Customer: ${getCustomerName(customers, r.customerId)}<br/>
      Due: ${safeDate(r.scheduledDate)}
    </div>
  `).join('');

  const more = due.length > 5 ? `<div class="text-muted text-sm">and ${due.length - 5} more...</div>` : '';

  return {
    success: true,
    actionCard: { title: "Due Reminders", details: items + more, safe: true }
  };
}

async function handleWhatNeedsAttention() {
  const jobs = await getAllJobs() || [];
  const invoices = await getAllInvoices() || [];
  const reminders = await getAllReminders() || [];
  const approvals = await getAllApprovals() || [];
  
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayJobs = jobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr)).length;
  const overdueInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'draft' && inv.dueDate && new Date(inv.dueDate) < now).length;
  const dueReminders = reminders.filter(r => r.status === 'pending' && r.scheduledDate && new Date(r.scheduledDate) <= nextWeek).length;
  const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
  
  if (todayJobs === 0 && overdueInvoices === 0 && dueReminders === 0 && pendingApprovals === 0) {
    return {
      success: true,
      actionCard: { title: "Attention Summary", details: "Nothing urgent needs attention right now.", safe: true }
    };
  }

  let details = '<ul style="padding-left: 1rem; margin-top: 0.5rem; margin-bottom: 0;">';
  if (todayJobs > 0) details += `<li><strong>${todayJobs}</strong> jobs scheduled for today</li>`;
  if (overdueInvoices > 0) details += `<li style="color: var(--accent-danger);"><strong>${overdueInvoices}</strong> invoices are overdue</li>`;
  if (dueReminders > 0) details += `<li><strong>${dueReminders}</strong> reminders due this week</li>`;
  if (pendingApprovals > 0) details += `<li style="color: var(--accent-warning);"><strong>${pendingApprovals}</strong> actions pending approval</li>`;
  details += '</ul>';

  return {
    success: true,
    actionCard: { title: "Attention Summary", details, safe: true }
  };
}

async function handleSummarizeCustomer(ctx) {
  const cust = ctx.customer;
  if (!cust) {
    return {
      success: true,
      actionCard: { title: "Customer Summary", details: "I couldn't find that customer. Please specify their name.", safe: true }
    };
  }

  const jobs = await getAllJobs() || [];
  const invoices = await getAllInvoices() || [];
  
  const cJobs = jobs.filter(j => j.customerId === cust.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const cInvoices = invoices.filter(i => i.customerId === cust.id && i.status !== 'paid' && i.status !== 'draft');

  let details = `
    <div style="margin-bottom: 0.5rem;">
      <strong>${cust.name}</strong><br/>
      <span class="text-muted text-sm">${cust.address || 'No address on file'}</span><br/>
      <span class="text-muted text-sm">${cust.email || ''} ${cust.phone ? ' | ' + cust.phone : ''}</span>
    </div>
  `;

  if (cJobs.length > 0) {
     const lastJob = cJobs[0];
     details += `
       <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-elevated); border-radius: 4px;">
         <strong>Recent Job:</strong> ${lastJob.title} (${(lastJob.status||'').toUpperCase()})<br/>
         <span class="text-muted text-sm">Scheduled: ${safeDate(lastJob.scheduledDate)}</span>
       </div>
     `;
  } else {
     details += `<div class="text-muted text-sm mt-2">No jobs on record.</div>`;
  }

  if (cInvoices.length > 0) {
     const totalOwed = cInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
     details += `
       <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px; border-left: 2px solid var(--accent-danger);">
         <strong>Unpaid Balance:</strong> £${totalOwed.toFixed(2)} across ${cInvoices.length} invoice(s).
       </div>
     `;
  }

  return {
    success: true,
    actionCard: { title: `Customer Summary`, details, safe: true }
  };
}

async function handleAskBusinessQuestion() {
  return {
    success: true,
    actionCard: { 
      title: "Business Question", 
      details: "I can answer questions about your jobs, invoices, and quotes. Try asking 'What jobs are on today?' or 'Who owes me money?'", 
      safe: true 
    }
  };
}
