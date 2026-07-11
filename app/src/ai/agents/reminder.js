/**
 * Reminder Agent
 * Manages future follow-ups and annual service reminders.
 */

import { create } from '../../services/data/reminders-service.js';
import { create as createAudit } from '../../services/data/audit-service.js';

export async function execute({ action, ctx }) {
  if (action === 'annual_service') {
    const { customer, entities, job } = ctx;
    
    const offsetMonths = entities.reminderOffset || 12;
    const scheduledDate = new Date();
    scheduledDate.setMonth(scheduledDate.getMonth() + offsetMonths);
    
    // Duplicate Protection: Check if an annual reminder already exists for roughly this time
    const { getByCustomerId } = await import('../../services/data/reminders-service.js');
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
  if (action === 'create_reminder') {
    const { customer, entities } = ctx;
    
    // We expect date to be provided. If not, trigger clarification.
    if (!entities.date) {
      return {
        success: true,
        actionCard: {
          title: 'Clarification Needed',
          details: 'When would you like to be reminded? Please provide a date.',
          safe: true,
          clarificationRequired: true,
          missingFields: ['date']
        }
      };
    }
    
    const scheduledDate = new Date(entities.date);
    
    const reminder = {
      customerId: customer ? customer.id : null,
      jobId: null,
      type: 'custom',
      reminderType: 'Custom Follow-up',
      message: entities.notes || (customer ? `Follow up with ${customer.name}` : 'Follow up'),
      scheduledDate: scheduledDate.toISOString(),
      status: 'pending',
      recurrence: 'none',
      createdByAI: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const id = await create(reminder);
    
    await createAudit({
      action: 'reminder_created',
      entityType: 'reminder',
      entityId: id,
      details: { message: `Created reminder for ${scheduledDate.toLocaleDateString()}` },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Reminder Created',
        details: `Set for ${scheduledDate.toLocaleDateString()}: ${reminder.message}`,
        safe: true
      }
    };
  }

  if (['complete_reminder', 'dismiss_reminder'].includes(action)) {
    const reminderId = entities.selectedOptionId || entities.reminderId;
    if (!reminderId) return { success: false };
    
    const { getById, update } = await import('../../services/data/reminders-service.js');
    const reminder = await getById(reminderId);
    if (!reminder) return { success: false };
    
    const newStatus = action === 'complete_reminder' ? 'completed' : 'dismissed';
    const oldStatus = reminder.status;
    reminder.status = newStatus;
    
    await update(reminder.id, reminder);
    
    await createAudit({
      action: `reminder_${newStatus}`,
      entityType: 'reminder',
      entityId: reminder.id,
      details: { message: `Marked reminder as ${newStatus}` },
      beforeData: { status: oldStatus },
      afterData: { status: newStatus },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: `Reminder ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        details: `The reminder has been marked as ${newStatus}.`,
        safe: true
      }
    };
  }
  
  return { success: false };
}
