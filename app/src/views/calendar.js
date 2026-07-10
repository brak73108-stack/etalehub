/**
 * EtaleHub Calendar & Reminders View
 * Displays future reminders and AI-scheduled follow-ups in a polished layout.
 */

import { getAll as getAllReminders } from '../db/reminders.js';
import { getAll as getAllJobs } from '../db/jobs.js';
import { getAll as getAllCustomers } from '../db/customers.js';

export default async function renderCalendar() {
  const reminders = await getAllReminders();
  const jobs = await getAllJobs();
  const customers = await getAllCustomers();
  
  const customerMap = customers.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const todayJobs = jobs.filter(j => j.scheduledDate && j.scheduledDate.startsWith(todayStr) && j.status !== 'complete')
                        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
                        
  const upcomingJobs = jobs.filter(j => j.scheduledDate && j.scheduledDate > todayStr && j.status !== 'complete')
                           .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  
  const activeReminders = reminders.filter(r => r.status === 'pending')
                                   .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  const reminderCards = activeReminders.map(r => {
    const isPast = new Date(r.scheduledDate) < now;
    const isAnnual = r.type === 'annual_service';
    const isPayment = r.type === 'payment';
    
    let icon = '📅';
    if (isAnnual) icon = '🔧';
    if (isPayment) icon = '💰';
    
    return `
      <div class="card" style="margin-bottom: 1rem; border-left: 4px solid var(--accent-${isPast ? 'danger' : 'warning'}); display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; gap: 1.5rem; align-items:center;">
          <div style="font-size: 2rem; width: 40px; text-align:center;">${icon}</div>
          <div>
            <div style="display:flex; align-items:center; gap: 0.75rem; margin-bottom: 0.25rem;">
              <h3 style="margin: 0; font-size: 1.1rem;">${r.reminderType}</h3>
              ${r.createdByAI ? '<span class="badge badge-info" title="Scheduled automatically by EtaleHub">🤖 AI Created</span>' : ''}
              ${isPast ? '<span class="badge badge-danger">Overdue</span>' : ''}
            </div>
            <div class="text-muted text-sm mb-1">${r.message}</div>
            <div class="font-medium text-accent">
              <a href="#/customers/${r.customerId}" style="text-decoration:none; color:inherit;">${customerMap[r.customerId] || 'Unknown Customer'}</a>
            </div>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="text-sm text-muted mb-1">Scheduled for</div>
          <div class="font-medium ${isPast ? 'text-danger' : ''}" style="font-size: 1.1rem;">${new Date(r.scheduledDate).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric', year:'numeric'})}</div>
        </div>
      </div>
    `;
  }).join('');
  
  const todayJobRows = todayJobs.map(j => `
    <div style="padding: 1rem; background: var(--bg-primary); border-radius: 8px; margin-bottom: 0.5rem; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div class="font-medium" style="margin-bottom: 0.25rem;">${j.title}</div>
        <div class="text-muted text-sm"><a href="#/customers/${j.customerId}" class="text-accent">${customerMap[j.customerId]}</a></div>
      </div>
      <div><span class="badge badge-warning">${j.status.toUpperCase()}</span></div>
    </div>
  `).join('');
  
  const upcomingJobRows = upcomingJobs.map(j => `
    <div style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div class="font-medium" style="margin-bottom: 0.25rem;">${j.title}</div>
        <div class="text-muted text-sm"><a href="#/customers/${j.customerId}" class="text-accent">${customerMap[j.customerId]}</a></div>
      </div>
      <div style="text-align:right;">
        <div class="text-sm">${new Date(j.scheduledDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="view-header">
      <div>
        <h1 class="view-title">Reminders & Schedule</h1>
        <p class="view-subtitle">Your AI-managed timeline of annual services, jobs, and follow-ups.</p>
      </div>
      <button class="btn btn-primary" onclick="window.location.hash='#/command'; setTimeout(() => document.getElementById('commandInput').value='Set a reminder to ', 100);">+ Add Reminder</button>
    </div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem;">
      <div class="calendar-main">
        <h3 style="margin-bottom: 1.5rem; color: var(--text-color);">Active Reminders</h3>
        
        ${activeReminders.length > 0 ? reminderCards : `
          <div class="card" style="text-align: center; padding: 4rem 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🗓️</div>
            <h3 class="text-muted">No pending reminders</h3>
            <p class="text-muted">EtaleHub will automatically create reminders when you complete jobs.</p>
          </div>
        `}
      </div>
      
      <div class="calendar-sidebar">
        <div class="card mb-4">
          <h3 style="margin-bottom: 1rem;">Today's Jobs</h3>
          ${todayJobs.length > 0 ? todayJobRows : '<div class="text-muted text-sm">No jobs scheduled for today.</div>'}
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden;">
          <h3 style="margin: 0; padding: 1.5rem 1.5rem 1rem 1.5rem; background: var(--bg-primary); border-bottom: 1px solid var(--border-color);">Upcoming Jobs</h3>
          <div style="max-height: 400px; overflow-y: auto;">
            ${upcomingJobs.length > 0 ? upcomingJobRows : '<div class="text-muted text-sm" style="padding: 1.5rem;">No upcoming jobs scheduled.</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}
