import { create as createInvoice, getNextInvoiceNumber, update as updateInvoice, getById as getInvoiceById } from '../../services/data/invoices-service.js';
import { create as createQuote, getById as getQuoteById, update as updateQuote } from '../../services/data/quotes-service.js';
import { create as createAudit } from '../../services/data/audit-service.js';
import { getSettings } from '../../services/data/business-settings-service.js';

export async function execute({ action, ctx }) {
  const { customer, entities, job } = ctx;
  const settings = await getSettings();

  if (action === 'create_invoice_draft') {
    if (!customer) return { success: false };
    
    // Fallback amount if missing, but validator should force it
    const amount = entities.amount || 0;
    const invNum = await getNextInvoiceNumber();
    const defaults = settings.invoiceDefaults || {};
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (defaults.paymentTermsDays || 14));

    const invoice = {
      invoiceNumber: invNum,
      customerId: customer.id,
      jobId: job ? job.id : null,
      lineItems: [{ description: 'Service provided', amount }],
      subtotal: amount,
      taxRate: 0,
      taxAmount: 0,
      total: amount,
      status: 'draft',
      dueDate: dueDate.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const id = await createInvoice(invoice);
    
    await createAudit({
      action: 'invoice_draft_created',
      entityType: 'invoice',
      entityId: id,
      details: { message: `Created invoice draft ${invNum} for £${amount}` },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    let approvalCard = null;
    if (defaults.requireApprovalBeforeSending !== false) {
       approvalCard = {
         actionType: 'send_invoice',
         entityType: 'invoice',
         entityId: id,
         proposedAction: { description: 'Send invoice', detail: `Email ${invNum} to ${customer.name}` },
         messagePreview: `Hi ${customer.name.split(' ')[0]}, your invoice for £${amount} is attached.`,
         riskLevel: 'medium',
         status: 'pending'
       };
    }
    
    return {
      success: true,
      actionCard: { title: 'Invoice Draft Created', details: `Created draft ${invNum} for £${amount}.`, safe: true },
      approvalCard
    };
  }

  if (action === 'mark_invoice_paid') {
    const invId = entities.selectedOptionId || entities.invoiceId;
    if (!invId) return { success: false };
    
    const invoice = await getInvoiceById(invId);
    if (!invoice) return { success: false };
    
    const paymentMethod = entities.paymentMethod || 'unknown';
    const oldStatus = invoice.status;
    invoice.status = 'paid';
    invoice.paymentMethod = paymentMethod;
    invoice.paidDate = new Date().toISOString();
    
    await updateInvoice(invoice.id, invoice);
    
    await createAudit({
      action: 'invoice_marked_paid',
      entityType: 'invoice',
      entityId: invoice.id,
      details: { message: `Marked ${invoice.invoiceNumber} paid via ${paymentMethod}` },
      beforeData: { status: oldStatus },
      afterData: { status: 'paid' },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: { title: 'Invoice Paid', details: `${invoice.invoiceNumber} marked paid by ${paymentMethod}.`, safe: true }
    };
  }

  if (action === 'record_payment') {
    if (!customer) return { success: false };
    
    const amount = entities.amount || 0;
    
    // Duplicate Protection
    const { getByCustomerId } = await import('../../services/data/invoices-service.js');
    const existingInvoices = await getByCustomerId(customer.id);
    const duplicate = existingInvoices.find(i => (job && i.jobId === job.id) && i.status === 'paid' && i.total === amount);
    
    if (duplicate) {
      return {
        success: true,
        actionCard: { title: 'Payment already recorded', details: `A receipt for £${amount} already exists for this job.`, safe: true }
      };
    }
    
    const invNum = await getNextInvoiceNumber();
    const invoice = {
      invoiceNumber: invNum,
      customerId: customer.id,
      jobId: job ? job.id : null,
      lineItems: [{ description: 'Payment for service', amount }],
      subtotal: amount,
      taxRate: 0,
      taxAmount: 0,
      total: amount,
      status: 'paid',
      paymentMethod: entities.paymentMethod || 'unknown',
      paidDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const id = await createInvoice(invoice);
    
    await createAudit({
      action: 'payment_recorded',
      entityType: 'invoice',
      entityId: id,
      details: { message: `Recorded payment of £${amount} via ${invoice.paymentMethod}` },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    const approvalCard = {
      actionType: 'send_receipt',
      entityType: 'invoice',
      entityId: id,
      proposedAction: { description: 'Send receipt for payment', detail: `Email receipt for £${amount}` },
      messagePreview: `Hi ${customer.name.split(' ')[0]}, thank you for your payment of £${amount}. Your receipt is attached.`,
      riskLevel: 'medium',
      status: 'pending'
    };
    
    return {
      success: true,
      actionCard: { title: 'Payment recorded', details: `£${amount} by ${invoice.paymentMethod}. Draft receipt created.`, safe: true },
      approvalCard
    };
  }

  if (action === 'create_quote_draft') {
    if (!customer) return { success: false };
    
    const amount = entities.amount || 0;
    const defaults = settings.quoteDefaults || {};
    
    const prefix = defaults.quotePrefix || 'QUO';
    // Simplified quote number generation for demo
    const quoteNum = `${prefix}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;
    
    const validDays = defaults.validityDays || 30;
    const followUpDays = defaults.followUpDelayDays || 7;
    
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + followUpDays);
    
    const quote = {
      quoteNumber: quoteNum,
      customerId: customer.id,
      lineItems: [{ description: entities.notes || 'Service quote', amount }],
      total: amount,
      status: 'draft',
      followUpDate: followUpDate.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const id = await createQuote(quote);
    
    await createAudit({
      action: 'quote_draft_created',
      entityType: 'quote',
      entityId: id,
      details: { message: `Created quote draft ${quoteNum} for £${amount}` },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    let approvalCard = null;
    if (defaults.requireApprovalBeforeSending !== false) {
       approvalCard = {
         actionType: 'send_quote',
         entityType: 'quote',
         entityId: id,
         proposedAction: { description: 'Send quote', detail: `Email quote ${quoteNum} to ${customer.name}` },
         messagePreview: `Hi ${customer.name.split(' ')[0]}, your quote for £${amount} is attached.`,
         riskLevel: 'medium',
         status: 'pending'
       };
    }
    
    return {
      success: true,
      actionCard: { title: 'Quote Draft Created', details: `Created quote ${quoteNum} for £${amount}.`, safe: true },
      approvalCard
    };
  }

  if (['mark_quote_accepted', 'mark_quote_rejected', 'expire_quote'].includes(action)) {
    const quoteId = entities.selectedOptionId || entities.quoteId;
    if (!quoteId) return { success: false };
    
    const quote = await getQuoteById(quoteId);
    if (!quote) return { success: false };
    
    let newStatus = 'expired';
    if (action === 'mark_quote_accepted') newStatus = 'accepted';
    if (action === 'mark_quote_rejected') newStatus = 'rejected';
    
    const oldStatus = quote.status;
    quote.status = newStatus;
    
    await updateQuote(quote.id, quote);
    
    await createAudit({
      action: 'quote_status_updated',
      entityType: 'quote',
      entityId: quote.id,
      details: { message: `Updated quote status to ${newStatus}` },
      beforeData: { status: oldStatus },
      afterData: { status: newStatus },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: { title: 'Quote Status Updated', details: `Quote ${quote.quoteNumber} marked as ${newStatus}.`, safe: true }
    };
  }
  
  return { success: false };
}
