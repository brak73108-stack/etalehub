/**
 * Invoicing Agent
 * Handles money, receipts, and invoices.
 */

import { create, getNextInvoiceNumber } from '../../db/invoices.js';
import { create as createAudit } from '../../db/audit.js';

export async function execute({ action, ctx }) {
  if (action === 'record_payment') {
    const { customer, entities, job } = ctx;
    
    // Duplicate Protection: Check if this job already has a paid invoice
    if (job) {
      const { getByCustomerId } = await import('../../db/invoices.js');
      const existingInvoices = await getByCustomerId(customer.id);
      const duplicate = existingInvoices.find(i => i.jobId === job.id && i.status === 'paid' && i.total === entities.amount);
      if (duplicate) {
        return {
          success: true,
          actionCard: { title: 'Payment already recorded', details: `A receipt for £${entities.amount} already exists for this job.` }
        };
      }
    }
    
    // Create an invoice marked as paid (or a receipt)
    const invNum = await getNextInvoiceNumber();
    
    const invoice = {
      invoiceNumber: invNum,
      customerId: customer.id,
      jobId: job ? job.id : null,
      lineItems: [{ description: 'Payment for service', amount: entities.amount }],
      subtotal: entities.amount,
      taxRate: 0,
      taxAmount: 0,
      total: entities.amount,
      status: 'paid', // Immediately paid
      paymentMethod: entities.paymentMethod || 'unknown',
      paidDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const id = await create(invoice);
    
    await createAudit({
      action: 'payment_recorded',
      entityType: 'invoice',
      entityId: id,
      details: { message: `Recorded payment of £${entities.amount} via ${entities.paymentMethod}` },
      beforeData: null,
      afterData: invoice,
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    // We always require approval to actually *send* the receipt to the customer
    const approvalCard = {
      actionType: 'send_receipt',
      entityType: 'invoice',
      entityId: id,
      proposedAction: {
        description: 'Send receipt for payment',
        detail: `Email Mrs Smith a receipt for £${entities.amount} paid by ${entities.paymentMethod}`
      },
      messagePreview: `Hi ${customer.name.split(' ')[0]}, thank you for your payment of £${entities.amount} for today's service. Your receipt is attached.`,
      riskLevel: 'medium',
      status: 'pending'
    };
    
    return {
      success: true,
      actionCard: {
        title: 'Payment recorded',
        details: `£${entities.amount} by ${entities.paymentMethod}. Draft receipt created.`
      },
      approvalCard
    };
  }
  
  return { success: false };
}
