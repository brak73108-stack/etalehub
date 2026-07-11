export function getReadableAction(action) {
  const map = {
    'create_customer': 'Customer created',
    'update_customer': 'Customer updated',
    'archive_customer': 'Customer archived',
    'create_job': 'Job created',
    'mark_job_complete': 'Job completed',
    'cancel_job': 'Job cancelled',
    'create_invoice': 'Invoice draft created',
    'mark_invoice_paid': 'Invoice marked paid',
    'void_invoice': 'Invoice voided',
    'create_quote': 'Quote draft created',
    'mark_quote_accepted': 'Quote accepted',
    'create_reminder': 'Reminder created',
    'complete_reminder': 'Reminder completed',
    'dismiss_reminder': 'Reminder dismissed',
    'approve_approval': 'Approval approved',
    'reject_approval': 'Approval rejected',
    'create_approval': 'AI action required approval',
    'generate_ai_action': 'AI action generated'
  };
  return map[action] || (action ? action.replace(/_/g, ' ') : 'Activity recorded');
}

export function getSourceBadge(source) {
  if (source === 'ai') return `<span style="color:var(--accent-teal); font-weight:bold;">🤖 EtaleHub AI</span>`;
  if (source === 'manual' || source === 'user') return `<span style="color:var(--accent-purple); font-weight:bold;">👤 User Action</span>`;
  if (source === 'system') return `<span style="color:var(--text-muted); font-weight:bold;">⚙️ System</span>`;
  return `<span class="text-muted">Activity</span>`;
}

export function renderAuditTimelineHtml(auditLogs) {
  if (!auditLogs || auditLogs.length === 0) {
    return '<div class="text-muted" style="padding: 1rem 0;">No activity recorded yet.</div>';
  }
  
  return auditLogs.map(log => `
    <div style="font-size: 0.85rem; padding: 0.75rem; border-left: 3px solid var(--accent-purple); margin-bottom: 0.5rem; background: var(--bg-primary);">
      <div style="display:flex; justify-content: space-between;">
        ${getSourceBadge(log.source)}
        <span class="text-muted">${new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style="margin-top: 0.25rem;">
        <span class="font-medium">${getReadableAction(log.action)}</span>
        ${log.entityId ? `<span class="text-muted ml-2">#${log.entityId}</span>` : ''}
      </div>
    </div>
  `).join('');
}
