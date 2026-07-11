/**
 * Scheduling Agent
 * Handles jobs, appointments, and service records.
 */

import { getByCustomerId, update } from '../../services/data/jobs-service.js';
import { create as createAudit } from '../../services/data/audit-service.js';

export async function execute({ action, ctx }) {
  if (action === 'complete_job') {
    const { customer, entities } = ctx;
    
    // Find today's booked job for this customer
    const jobs = await getByCustomerId(customer.id);
    
    // Simplistic logic for Phase 2: find a booked job that matches the service type, or just any booked job
    let targetJob = jobs.find(j => j.status === 'booked' && (!entities.serviceType || j.jobType === entities.serviceType));
    
    if (!targetJob) {
      targetJob = jobs.find(j => j.status === 'booked');
    }
    
    if (!targetJob) {
      // Check if there's an already completed job today to warn about duplicate
      const today = new Date().toISOString().split('T')[0];
      const completedToday = jobs.find(j => j.status === 'complete' && j.completedDate && j.completedDate.startsWith(today));
      
      if (completedToday) {
        return { 
          success: true, 
          job: completedToday,
          actionCard: { title: 'Job already completed', details: 'This job was already marked complete today.' }
        };
      }
      return { success: false, error: 'No booked job found to complete.' };
    }
    
    // Mark as complete
    targetJob.status = 'complete';
    targetJob.completedDate = new Date().toISOString();
    
    if (entities.amount) {
      targetJob.finalPrice = entities.amount;
    }
    
    // If we're completing and paying in one go, the invoicing agent handles payment,
    // but we can mark the job itself as paid if requested
    if (entities.paymentMethod) {
      targetJob.paymentStatus = 'paid';
      targetJob.paymentMethod = entities.paymentMethod;
    }
    
    targetJob.serviceHistoryNote = `Completed by AI workflow on ${new Date().toLocaleDateString()}`;
    
    await update(targetJob.id, targetJob);
    
    await createAudit({
      action: 'job_completed',
      entityType: 'job',
      entityId: targetJob.id,
      details: { message: `Marked job "${targetJob.title}" as complete` },
      beforeData: { status: 'booked' },
      afterData: { status: 'complete', finalPrice: targetJob.finalPrice },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      job: targetJob,
      actionCard: {
        title: 'Job marked complete',
        details: `${targetJob.title} has been completed.`
      }
    };
  }
  
  if (action === 'create_job') {
    const { customer, entities } = ctx;
    if (!customer) return { success: false };
    
    // In a real app we'd ask for clarification if date is missing, 
    // but the validator should have caught it. If not, fallback to today.
    const scheduledDate = entities.date || new Date().toISOString();
    
    const { create } = await import('../../services/data/jobs-service.js');
    
    const newJob = {
      customerId: customer.id,
      title: entities.jobTitle || 'General Service',
      description: entities.notes || 'Created via AI',
      status: 'booked',
      scheduledDate,
      jobType: entities.serviceType || 'service',
      notes: [entities.notes || ''],
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString()
    };
    
    const created = await create(newJob);
    
    await createAudit({
      action: 'job_created',
      entityType: 'job',
      entityId: created.id,
      details: { message: `Booked job: ${created.title}` },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Job Booked',
        details: `Booked **${created.title}** for ${customer.name}.<br/>Scheduled: ${new Date(scheduledDate).toLocaleDateString()}`,
        safe: true
      }
    };
  }

  if (action === 'update_job_status') {
    const { customer, entities } = ctx;
    const { getById } = await import('../../services/data/jobs-service.js');
    
    // We expect the selectedOptionId if ambiguity was resolved
    const jobId = entities.selectedOptionId || entities.jobId;
    if (!jobId) return { success: false };
    
    const job = await getById(jobId);
    if (!job) return { success: false };
    
    const validStatuses = ['booked', 'in_progress', 'complete', 'cancelled'];
    const newStatus = entities.status || 'in_progress';
    
    if (!validStatuses.includes(newStatus)) return { success: false };
    
    const oldStatus = job.status;
    job.status = newStatus;
    
    await update(job.id, job);
    
    await createAudit({
      action: 'job_status_updated',
      entityType: 'job',
      entityId: job.id,
      details: { message: `Updated job status to ${newStatus}` },
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
        title: 'Job Status Updated',
        details: `Marked **${job.title}** as ${newStatus.replace(/_/g, ' ')}.`,
        safe: true
      }
    };
  }

  if (action === 'cancel_job') {
    const { customer, entities } = ctx;
    const { getById } = await import('../../services/data/jobs-service.js');
    
    const jobId = entities.selectedOptionId || entities.jobId;
    let targetJob = null;
    
    if (jobId) {
      targetJob = await getById(jobId);
    } else if (customer) {
      const jobs = await getByCustomerId(customer.id);
      targetJob = jobs.find(j => j.status === 'booked' || j.status === 'in_progress');
    }
    
    if (!targetJob) return { success: false };
    
    const oldStatus = targetJob.status;
    targetJob.status = 'cancelled';
    
    await update(targetJob.id, targetJob);
    
    await createAudit({
      action: 'job_cancelled',
      entityType: 'job',
      entityId: targetJob.id,
      details: { message: `Cancelled job via AI` },
      beforeData: { status: oldStatus },
      afterData: { status: 'cancelled' },
      source: 'ai',
      riskLevel: 'low',
      approvalStatus: 'auto',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      actionCard: {
        title: 'Job Cancelled',
        details: `Cancelled **${targetJob.title}**.`,
        safe: true
      }
    };
  }
  
  return { success: false };
}
