/**
 * Scheduling Agent
 * Handles jobs, appointments, and service records.
 */

import { getByCustomerId, update } from '../../db/jobs.js';
import { create as createAudit } from '../../db/audit.js';

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
  
  return { success: false };
}
