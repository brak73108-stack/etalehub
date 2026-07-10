/**
 * Customer Agent
 * Handles finding customers, updating their history, and managing profiles.
 */

import { getAll, update } from '../../services/data/customers-service.js';
import { create as createAudit } from '../../services/data/audit-service.js';

export async function execute({ action, entities, ctx }) {
  if (action === 'find_customer') {
    const customers = await getAll();
    const nameToFind = entities.customerName.toLowerCase();
    
    // Simple fuzzy match for demo
    const customer = customers.find(c => 
      c.name.toLowerCase().includes(nameToFind) || 
      nameToFind.includes(c.name.toLowerCase().split(' ')[1] || 'xxx')
    );
    
    return { customer };
  }
  
  if (action === 'update_history') {
    const { customer } = ctx;
    
    // Update dates
    const oldDate = customer.lastServiceDate;
    
    customer.lastServiceDate = new Date().toISOString();
    
    // Next service due in 12 months
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    customer.nextServiceDue = next.toISOString();
    
    await update(customer.id, customer);
    
    await createAudit({
      action: 'customer_updated',
      entityType: 'customer',
      entityId: customer.id,
      details: { message: 'Updated last service and next service dates' },
      beforeData: { lastServiceDate: oldDate },
      afterData: { lastServiceDate: customer.lastServiceDate },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Customer history updated',
        details: `Last service date recorded. Next service due: ${next.toLocaleDateString()}`
      }
    };
  }
  
  return { success: false };
}
