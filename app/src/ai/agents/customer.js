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
  
  if (action === 'create_customer') {
    const { create } = await import('../../services/data/customers-service.js');
    
    // We expect the NLP to extract name, address, phone, email etc.
    const newCustomer = {
      name: entities.customerName || 'Unknown Name',
      email: entities.customerEmail || '',
      phone: entities.customerPhone || '',
      address: entities.address || '',
      customerStatus: 'active',
      createdAt: new Date().toISOString()
    };
    
    const created = await create(newCustomer);
    
    await createAudit({
      action: 'customer_created',
      entityType: 'customer',
      entityId: created.id,
      details: { message: `Created customer via AI: ${created.name}` },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Customer Added',
        details: `Created customer **${created.name}**.<br/>Phone: ${created.phone || '-'}<br/>Address: ${created.address || '-'}`,
        safe: true
      }
    };
  }

  if (action === 'update_customer') {
    const { customer } = ctx;
    if (!customer) return { success: false };
    
    const beforeData = { phone: customer.phone, email: customer.email, address: customer.address };
    
    if (entities.customerPhone) customer.phone = entities.customerPhone;
    if (entities.customerEmail) customer.email = entities.customerEmail;
    if (entities.address) customer.address = entities.address;
    
    await update(customer.id, customer);
    
    await createAudit({
      action: 'customer_updated',
      entityType: 'customer',
      entityId: customer.id,
      details: { message: `Updated customer details via AI` },
      beforeData,
      afterData: { phone: customer.phone, email: customer.email, address: customer.address },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Customer Updated',
        details: `Updated details for **${customer.name}**.`,
        safe: true
      }
    };
  }

  if (action === 'archive_customer') {
    const { customer } = ctx;
    if (!customer) return { success: false };
    
    const oldStatus = customer.customerStatus;
    customer.customerStatus = 'archived';
    await update(customer.id, customer);
    
    await createAudit({
      action: 'customer_archived',
      entityType: 'customer',
      entityId: customer.id,
      details: { message: `Archived customer via AI` },
      beforeData: { customerStatus: oldStatus },
      afterData: { customerStatus: 'archived' },
      source: 'ai',
      riskLevel: 'low', // archiving is reversible
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Customer Archived',
        details: `Marked **${customer.name}** as archived. (No records were deleted).`,
        safe: true
      }
    };
  }
  
  return { success: false };
}
