/**
 * Reminder Agent
 * Manages future follow-ups and annual service reminders.
 */

import { create } from '../../db/reminders.js';
import { create as createAudit } from '../../db/audit.js';

export async function execute({ action, ctx }) {
  if (action === 'annual_service') {
    const { customer, entities, job } = ctx;
    
    const offsetMonths = entities.reminderOffset || 12;
    const scheduledDate = new Date();
    scheduledDate.setMonth(scheduledDate.getMonth() + offsetMonths);
    
    // Duplicate Protection: Check if an annual reminder already exists for roughly this time
    const { getByCustomerId } = await import('../../db/reminders.js');
    const existingReminders = await getByCustomerId(customer.id);
    const duplicate = existingReminders.find(r => 
      r.type === 'annual_service' && 
      new Date(r.scheduledDate).getFullYear() === scheduledDate.getFullYear() &&
      new Date(r.scheduledDate).getMonth() === scheduledDate.getMonth()
    );
    
    if (duplicate) {
      return {
        success: true,
        actionCard: { title: 'Reminder already exists', details: `An annual service reminder is already set for ${new Date(duplicate.scheduledDate).toLocaleDateString()}.` }
      };
    }
    
    const reminder = {
      customerId: customer.id,
      jobId: job ? job.id : null,
      type: 'annual_service',
      reminderType: 'Annual Service Due',
      message: `Book annual service for ${customer.name}`,
      scheduledDate: scheduledDate.toISOString(),
      status: 'pending',
      recurrence: 'annual',
      createdByAI: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const id = await create(reminder);
    
    await createAudit({
      action: 'reminder_created',
      entityType: 'reminder',
      entityId: id,
      details: { message: `Created annual service reminder for ${scheduledDate.toLocaleDateString()}` },
      beforeData: null,
      afterData: reminder,
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Annual reminder created',
        details: `Set for ${scheduledDate.toLocaleDateString()}`
      }
    };
  }
  
  return { success: false };
}
