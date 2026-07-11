/**
 * EtaleHub Command Centre & Approval Queue
 * The AI conversational interface and the queue of pending actions.
 */

import { parseCommand } from '../ai/command-parser.js';
import { routeCommand } from '../ai/agent-router.js';
import { getAll as getAllApprovals, approve as approveAction, reject as rejectAction } from '../services/data/approvals-service.js';
import { getAll as getAllAuditLogs } from '../services/data/audit-service.js';
import { getAll as getAllCustomers } from '../services/data/customers-service.js';
import { getAll as getAllJobs } from '../services/data/jobs-service.js';
import { getAll as getAllInvoices } from '../services/data/invoices-service.js';
import { getAll as getAllQuotes } from '../services/data/quotes-service.js';
import { getAll as getAllReminders } from '../services/data/reminders-service.js';
import { addToast } from '../store.js';
import { renderAuditTimelineHtml } from '../utils/audit-helpers.js';

let isProcessing = false;
let currentApprovals = [];
let allCustomers = [];
let allJobs = [];
let allInvoices = [];
let allQuotes = [];
let allReminders = [];

let customerMap = {};
let jobMap = {};
let activeTab = 'chat';
let activeFilter = 'pending';
let pendingClarification = null;

export default async function renderCommandCentre() {
  await loadData();

  window.cancelClarification = () => {
    pendingClarification = null;
    appendMessage('No problem — I cancelled that pending action.', 'ai');
    sessionStorage.removeItem('etalehub_pending_clarification');
  };

  window.handleClarificationOption = (value, field) => {
    document.getElementById('chatInput').value = value;
    window.handleCommandSubmit();
  };

  window.handleCommandSubmit = async () => {
    if (isProcessing) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    isProcessing = true;
    document.getElementById('chatSubmitBtn').disabled = true;
    
    appendMessage(text, 'user');
    
    if (text.toLowerCase() === 'cancel' || text.toLowerCase() === 'nevermind') {
      if (pendingClarification) {
         window.cancelClarification();
         isProcessing = false;
         document.getElementById('chatSubmitBtn').disabled = false;
         document.getElementById('chatInput').focus();
         return;
      }
    }
    
    appendLoading();
    
    try {
      let commandPayload = text;
      if (pendingClarification) {
         // Merge text as the clarification answer
         commandPayload = {
            isClarification: true,
            originalCommand: pendingClarification.originalCommand,
            intent: pendingClarification.intent,
            entities: pendingClarification.entities,
            answer: text
         };
      }

      const parsed = await parseCommand(commandPayload);
      
      if (parsed.intent && parsed.intent.includes('clarification_required')) {
         // Update pending state
         pendingClarification = {
             id: 'clarification_' + Date.now(),
             originalCommand: pendingClarification ? pendingClarification.originalCommand : text,
             intent: parsed.originalIntent || parsed.intent,
             entities: parsed.entities,
             missingInformation: parsed.missingInformation,
             expiresAt: Date.now() + 15 * 60 * 1000 // 15 mins
         };
         sessionStorage.setItem('etalehub_pending_clarification', JSON.stringify(pendingClarification));
         
         removeLoading();
         appendClarificationCard({
             missing: parsed.missingInformation,
             options: parsed.options || []
         });
         isProcessing = false;
         document.getElementById('chatSubmitBtn').disabled = false;
         document.getElementById('chatInput').focus();
         return;
      }

      // If we get here, validation passed or failed definitively. Clear state.
      pendingClarification = null;
      sessionStorage.removeItem('etalehub_pending_clarification');

      const result = await routeCommand(parsed);
      
      removeLoading();
      
      if (!result) {
        appendMessage('I did not understand that command. Try "I finished Mrs Smith\'s boiler service. She paid £180 by card. Book her annual service."', 'ai', true);
        return;
      }
      
      // Render standard action cards
      if (result.executed && result.executed.length > 0) {
        result.executed.forEach(action => {
          if (action.actionCard) appendActionCard(action.actionCard, 'success');
        });
      }
      
      // Render warnings
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warn => {
          if (warn.actionCard) appendActionCard(warn.actionCard, 'warning');
        });
      }
      
      // Render approvals
      if (result.needsApproval && result.needsApproval.length > 0) {
        result.needsApproval.forEach(approval => {
          if (approval.approvalCard) appendApprovalCardChat(approval.approvalCard);
        });
        // refresh data in background so the queue tab gets the new items
        await loadData();
      }
      
      if ((!result.executed || result.executed.length === 0) && (!result.needsApproval || result.needsApproval.length === 0) && (!result.warnings || result.warnings.length === 0)) {
         appendMessage('Command processed, but no actions were required.', 'ai');
      }
      
    } catch (e) {
      console.error(e);
      removeLoading();
      appendMessage('An error occurred processing that command.', 'ai', true);
    } finally {
      isProcessing = false;
      document.getElementById('chatSubmitBtn').disabled = false;
      document.getElementById('chatInput').focus();
    }
  };

  window.handleSuggestedCommand = (cmd) => {
    document.getElementById('chatInput').value = cmd;
    window.handleCommandSubmit();
  };

  window.switchCommandTab = (tab) => {
    activeTab = tab;
    document.getElementById('tab-chat').classList.toggle('active', tab === 'chat');
    document.getElementById('tab-queue').classList.toggle('active', tab === 'queue');
    
    document.getElementById('tab-chat').style.borderBottom = tab === 'chat' ? '2px solid var(--accent-teal)' : 'none';
    document.getElementById('tab-queue').style.borderBottom = tab === 'queue' ? '2px solid var(--accent-teal)' : 'none';
    
    document.getElementById('tab-chat').style.color = tab === 'chat' ? 'white' : 'var(--text-muted)';
    document.getElementById('tab-queue').style.color = tab === 'queue' ? 'white' : 'var(--text-muted)';

    document.getElementById('cc-chat').style.display = tab === 'chat' ? 'flex' : 'none';
    document.getElementById('cc-queue').style.display = tab === 'queue' ? 'block' : 'none';
    
    if(tab === 'queue') renderQueueRows();
  };

  window.filterQueue = (filter) => {
    activeFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.getElementById(`filter-${filter}`).classList.add('active');
    renderQueueRows();
  };

  window.handleApprovalQueueAction = async (id, action, event) => {
    if(event) event.stopPropagation();
    try {
      if (action === 'approve') {
        await approveAction(id);
        addToast('Approved internally. External sending is still disabled.', 'success');
      } else if (action === 'reject') {
        await rejectAction(id);
        addToast('Action dismissed.', 'success');
      }
      await loadData();
      if(document.getElementById('approvalDetailModal')) document.getElementById('approvalDetailModal').remove();
      renderQueueRows();
    } catch (e) {
      console.error(e);
      addToast('Failed to update approval', 'error');
    }
  };

  window.viewApprovalDetail = async (id) => {
    const a = currentApprovals.find(x => x.id === id);
    if (!a) return;
    
    const custName = a.customerId ? (customerMap[a.customerId] || 'Unknown Customer') : 'None';
    const jTitle = a.jobId ? (jobMap[a.jobId]?.title || 'Unknown Job') : 'None';
    
    const allAudit = await getAllAuditLogs() || [];
    const auditLogs = allAudit.filter(log => log && log.entityType === 'approval' && log.entityId === a.id);
    const recentAuditLogs = auditLogs.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp)).slice(0, 10);
    const auditHtml = renderAuditTimelineHtml(recentAuditLogs);

    const statusBadgeMap = { 'pending': 'warning', 'approved': 'success', 'rejected': 'danger', 'completed': 'default' };

    const modalHtml = `
      <div id="approvalDetailModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div class="card" style="width: 600px; max-height: 90vh; overflow-y: auto; border-top: 4px solid var(--accent-warning);">
          <div style="display:flex; justify-content: space-between; align-items:flex-start; margin-bottom: 1rem;">
            <div>
              <h2 style="margin-bottom:0.25rem;">${(a.actionType||'Action').replace(/_/g, ' ')}</h2>
              <span class="badge badge-${statusBadgeMap[a.status] || 'default'}">${(a.status||'pending').toUpperCase()}</span>
            </div>
            <button onclick="document.getElementById('approvalDetailModal').remove()" class="btn btn-ghost">✕</button>
          </div>
          
          <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
             <div class="text-sm text-muted mb-1">Proposed Action</div>
             <p style="margin: 0; font-size: 1.05rem; line-height: 1.4;">${a.details || a.messagePreview || 'Action requires review'}</p>
          </div>

          <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid var(--accent-danger); padding: 0.75rem; border-radius: 0 4px 4px 0; margin-bottom: 1.5rem;">
             <div class="text-sm text-danger font-medium mb-1">Draft only — not sent.</div>
             <div class="text-sm text-muted">Approved for future sending layer. No real message will be sent in Phase 5A.</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div><div class="text-sm text-muted">Risk Level</div><div class="font-medium text-${a.riskLevel==='high'?'danger':a.riskLevel==='medium'?'warning':'success'}">${(a.riskLevel||'low').toUpperCase()}</div></div>
            <div><div class="text-sm text-muted">Created</div><div class="font-medium">${new Date(a.createdAt).toLocaleString()}</div></div>
            <div><div class="text-sm text-muted">Customer</div><div class="font-medium">${custName}</div></div>
            <div><div class="text-sm text-muted">Linked Job</div><div class="font-medium">${jTitle}</div></div>
          </div>

          ${a.status === 'pending' ? `
            <div style="display:flex; gap: 1rem; margin-bottom: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <button class="btn btn-success" style="flex:1;" onclick="handleApprovalQueueAction(${a.id}, 'approve')">Approve internally</button>
              <button class="btn btn-danger" style="flex:1; background: var(--bg-elevated); border: 1px solid var(--accent-danger);" onclick="handleApprovalQueueAction(${a.id}, 'reject')">Reject</button>
            </div>
          ` : ''}

          <h4>Recent Activity</h4>
          <div style="max-height:200px; overflow-y:auto;">${auditHtml || '<div class="text-muted">No activity</div>'}</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };

  setTimeout(() => {
    const pendingCommand = localStorage.getItem('etalehub_pending_demo_command');
    if (pendingCommand) {
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = pendingCommand;
        input.focus();
        localStorage.removeItem('etalehub_pending_demo_command');
      }
    }

    try {
      const storedClarification = sessionStorage.getItem('etalehub_pending_clarification');
      if (storedClarification) {
         const parsed = JSON.parse(storedClarification);
         if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            sessionStorage.removeItem('etalehub_pending_clarification');
         } else {
            pendingClarification = parsed;
            appendClarificationCard({
               missing: pendingClarification.missingInformation || ['Waiting for your answer...'],
               options: pendingClarification.options || []
            });
         }
      }
    } catch (e) {
      console.warn('Could not parse pending clarification', e);
      sessionStorage.removeItem('etalehub_pending_clarification');
    }

    renderQueueRows();
  }, 50);

  return `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <div class="view-header" style="flex-shrink: 0;">
        <div>
          <h1 class="view-title">Ask EtaleHub</h1>
          <p class="view-subtitle">Your AI command centre and safety approval queue.</p>
        </div>
      </div>
      
      <!-- Tabs -->
      <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 2rem; flex-shrink: 0;">
        <button id="tab-chat" class="tab-btn active" onclick="switchCommandTab('chat')" style="background:none; border:none; color:white; border-bottom: 2px solid var(--accent-teal); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Chat Interface</button>
        <button id="tab-queue" class="tab-btn" onclick="switchCommandTab('queue')" style="background:none; border:none; color:var(--text-muted); padding-bottom:0.75rem; cursor:pointer; font-size: 1.1rem; font-weight:500;">Approval Queue</button>
      </div>

      <!-- CHAT INTERFACE -->
      <div id="cc-chat" style="display: flex; flex-direction: column; flex-grow: 1; overflow: hidden;">
        <!-- Demo Banner -->
        <div style="background: rgba(20, 184, 166, 0.1); border: 1px solid var(--accent-teal); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;">
          <span style="font-size: 1.25rem;">ℹ️</span>
          <div style="font-size: 0.9rem; color: var(--text-color);">
            <strong>Demo mode:</strong> EtaleHub is running locally with sample plumbing/heating data. No real messages, invoices, or payments are sent.
          </div>
        </div>
        
        <div id="chatHistory" style="flex-grow: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-elevated); margin-bottom: 1rem;">
          
          <div class="chat-message ai-message" style="align-self: flex-start; max-width: 80%;">
            <div style="font-size: 0.9rem; margin-bottom: 1rem;">I'm your AI Office Manager. What would you like me to do?</div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <button class="btn btn-primary btn-sm" onclick="window.runMrsSmithDemo && window.runMrsSmithDemo()">▶ Run Mrs Smith demo</button>
              <button class="btn btn-ghost" style="font-size: 0.8rem; border: 1px dashed var(--border-color);" onclick="handleSuggestedCommand('Who owes me money?')">"Who owes me money?"</button>
              <button class="btn btn-ghost" style="font-size: 0.8rem; border: 1px dashed var(--border-color);" onclick="handleSuggestedCommand('What jobs do I have today?')">"What jobs do I have today?"</button>
              <button class="btn btn-ghost" style="font-size: 0.8rem; border: 1px dashed var(--border-color);" onclick="handleSuggestedCommand('Draft a quote for replacing two radiators.')">"Draft a quote for replacing two radiators."</button>
            </div>
          </div>

        </div>
        
        <div style="flex-shrink: 0; display: flex; gap: 0.5rem;">
          <input type="text" id="chatInput" class="command-input" placeholder="Type a command here..." onkeypress="if(event.key === 'Enter') handleCommandSubmit()" style="flex-grow: 1;">
          <button id="chatSubmitBtn" class="btn btn-primary" onclick="handleCommandSubmit()">Send</button>
        </div>
      </div>

      <!-- APPROVAL QUEUE -->
      <div id="cc-queue" style="display: none; flex-grow: 1; overflow-y: auto;">
        <div style="display:flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 1rem; margin-bottom: 1rem;">
          <button id="filter-pending" class="filter-chip active" onclick="filterQueue('pending')">Pending</button>
          <button id="filter-approved" class="filter-chip" onclick="filterQueue('approved')">Approved</button>
          <button id="filter-rejected" class="filter-chip" onclick="filterQueue('rejected')">Rejected</button>
          <button id="filter-high_risk" class="filter-chip" onclick="filterQueue('high_risk')">High Risk</button>
          <button id="filter-all" class="filter-chip" onclick="filterQueue('all')">All</button>
        </div>
        
        <div class="card" style="padding: 0; overflow:hidden;">
          <table class="data-table" style="margin: 0;">
            <thead style="background: var(--bg-primary);">
              <tr>
                <th style="padding-left: 1.5rem;">Action</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Customer / Context</th>
                <th style="text-align: right; padding-right: 1.5rem;">Quick Actions</th>
              </tr>
            </thead>
            <tbody id="queueTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function loadData() {
  currentApprovals = await getAllApprovals() || [];
  allCustomers = await getAllCustomers() || [];
  allJobs = await getAllJobs() || [];
  allInvoices = await getAllInvoices() || [];
  allQuotes = await getAllQuotes() || [];
  allReminders = await getAllReminders() || [];

  customerMap = allCustomers.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  jobMap = allJobs.reduce((acc, j) => { acc[j.id] = j; return acc; }, {});
  
  // sort newest first
  currentApprovals.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderQueueRows() {
  const tbody = document.getElementById('queueTableBody');
  if(!tbody) return;

  let filtered = currentApprovals;
  if(activeFilter === 'pending') filtered = currentApprovals.filter(a => a.status === 'pending');
  if(activeFilter === 'approved') filtered = currentApprovals.filter(a => a.status === 'approved');
  if(activeFilter === 'rejected') filtered = currentApprovals.filter(a => a.status === 'rejected');
  if(activeFilter === 'high_risk') filtered = currentApprovals.filter(a => a.riskLevel === 'high' && a.status === 'pending');

  if(filtered.length === 0) {
    if(activeFilter === 'pending') {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 3rem;"><div style="font-size: 2.5rem; margin-bottom: 1rem;">🛡️</div><h3 class="text-muted">No approvals waiting.</h3><p class="text-muted">AI-drafted actions will appear here for review.</p></td></tr>`;
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 3rem;"><h3 class="text-muted">No approvals found.</h3></td></tr>`;
    }
    return;
  }

  const statusMap = { 'pending': 'warning', 'approved': 'success', 'rejected': 'danger', 'completed': 'default' };

  tbody.innerHTML = filtered.map(a => `
    <tr class="table-row" style="cursor:pointer;" onclick="viewApprovalDetail(${a.id})">
      <td style="padding-left: 1.5rem;">
        <div class="font-medium mb-1">${(a.actionType||'Action').replace(/_/g, ' ')}</div>
        <div class="text-muted text-sm" style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.details || a.messagePreview || '-'}</div>
      </td>
      <td><span class="text-${a.riskLevel==='high'?'danger':a.riskLevel==='medium'?'warning':'success'} font-medium">${(a.riskLevel||'low').toUpperCase()}</span></td>
      <td><span class="badge badge-${statusMap[a.status] || 'default'}">${(a.status||'pending').toUpperCase()}</span></td>
      <td>
        <div class="font-medium text-accent text-sm mb-1">${a.customerId ? customerMap[a.customerId] || 'Unknown Customer' : 'Internal'}</div>
        <div class="text-muted text-sm">${new Date(a.createdAt).toLocaleDateString()}</div>
      </td>
      <td style="text-align: right; padding-right: 1.5rem;">
        ${a.status === 'pending' ? `
          <button class="btn btn-ghost text-success" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="handleApprovalQueueAction(${a.id}, 'approve', event)">Approve</button>
          <button class="btn btn-ghost text-danger" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="handleApprovalQueueAction(${a.id}, 'reject', event)">Reject</button>
        ` : `
          <button class="btn btn-ghost" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" onclick="viewApprovalDetail(${a.id})">View Detail</button>
        `}
      </td>
    </tr>
  `).join('');
}


// These functions are exclusively for the CHAT tab rendering inline cards
function appendMessage(text, sender, isError = false) {
  const history = document.getElementById('chatHistory');
  if(!history) return;
  const div = document.createElement('div');
  const isAi = sender === 'ai';
  div.className = `chat-message ${isAi ? 'ai-message' : 'user-message'}`;
  div.style.alignSelf = isAi ? 'flex-start' : 'flex-end';
  div.style.maxWidth = '80%';
  div.style.padding = '0.75rem 1rem';
  div.style.borderRadius = '8px';
  div.style.background = isAi ? 'var(--bg-primary)' : 'var(--accent-teal)';
  div.style.color = isAi ? 'var(--text-color)' : 'white';
  if (isError) div.style.color = 'var(--accent-danger)';
  div.innerText = text;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function appendLoading() {
  const history = document.getElementById('chatHistory');
  if(!history) return;
  const div = document.createElement('div');
  div.id = 'chatLoadingIndicator';
  div.className = 'chat-message ai-message';
  div.style.alignSelf = 'flex-start';
  div.style.background = 'transparent';
  div.style.color = 'var(--text-muted)';
  div.innerHTML = `<em>EtaleHub is updating your workspace...</em>`;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById('chatLoadingIndicator');
  if (loading) loading.remove();
}

function appendActionCard(card, type = 'success') {
  const history = document.getElementById('chatHistory');
  if(!history) return;
  const div = document.createElement('div');
  div.style.alignSelf = 'flex-start';
  div.style.maxWidth = '80%';
  div.style.padding = '1rem';
  div.style.borderRadius = '8px';
  div.style.background = 'var(--bg-primary)';
  div.style.borderLeft = `4px solid var(--accent-${type === 'warning' ? 'warning' : 'success'})`;
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '0.5rem';
  
  const icon = type === 'warning' ? '⚠️' : '✓';
  const badgeLabel = type === 'warning' ? 'Warning' : 'Done by AI';
  const badgeClass = type === 'warning' ? 'warning' : 'success';
  
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:0.5rem; font-weight:bold; color:var(--accent-${type === 'warning' ? 'warning' : 'success'})">
        ${icon} ${card.title}
      </div>
      <span class="badge badge-${badgeClass}">${badgeLabel}</span>
    </div>
    <div style="color:var(--text-color);">${card.details}</div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function appendClarificationCard(card) {
  const history = document.getElementById('chatHistory');
  if(!history) return;
  const div = document.createElement('div');
  div.style.alignSelf = 'flex-start';
  div.style.maxWidth = '80%';
  div.style.padding = '1rem';
  div.style.borderRadius = '8px';
  div.style.background = 'var(--bg-primary)';
  div.style.borderLeft = '4px solid #3b82f6';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '0.75rem';
  
  const title = "I need a little more information before I can do that.";
  const missingText = (card.missing || []).join(' ');

  let optionsHtml = '';
  if (card.options && card.options.length > 0) {
     optionsHtml = `<div style="display:flex; flex-direction:column; gap:0.5rem;">` + 
       card.options.map(opt => `
         <button class="btn btn-ghost" style="border: 1px solid var(--border-color); justify-content: flex-start; text-align: left;" onclick="handleClarificationOption('${opt.id}', 'selectedOptionId')">
           ${opt.label}
         </button>
       `).join('') +
     `</div>`;
  }

  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-weight:bold; color:#3b82f6; display:flex; align-items:center; gap:0.5rem;">
        ℹ️ Clarification Needed
      </div>
    </div>
    
    <div class="text-sm" style="color:var(--text-color);">
      ${title}
    </div>
    
    ${missingText ? `<div class="text-sm font-medium" style="color:var(--text-color);">${missingText}</div>` : ''}
    
    ${optionsHtml}
    
    <div style="display:flex; gap: 0.5rem; margin-top: 0.5rem;">
      <button class="btn btn-ghost text-muted btn-sm" onclick="cancelClarification()">Cancel</button>
    </div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function appendApprovalCardChat(card) {
  const history = document.getElementById('chatHistory');
  if(!history) return;
  const div = document.createElement('div');
  const dbId = card.dbId || Math.floor(Math.random()*1000);
  div.id = `chat-approval-card-${dbId}`;
  div.style.alignSelf = 'flex-start';
  div.style.maxWidth = '80%';
  div.style.padding = '1rem';
  div.style.borderRadius = '8px';
  div.style.background = 'var(--bg-primary)';
  div.style.border = '1px solid var(--accent-warning)';
  div.style.borderLeft = '4px solid var(--accent-warning)';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '0.5rem';
  
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-weight:bold; color:var(--accent-warning); display:flex; align-items:center; gap:0.5rem;">
        🛡️ Approval needed: ${card.actionType.replace(/_/g, ' ')}
      </div>
      <span class="badge badge-warning">Needs approval</span>
    </div>
    
    <div class="text-sm" style="color:var(--text-color); margin-top: 0.5rem;">
      <strong>Action:</strong> ${card.proposedAction?.detail || card.details || 'Review requested'}
    </div>
    
    <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem; font-family: monospace; font-size: 0.9rem; border-left: 2px solid var(--text-muted);">
      ${card.messagePreview || 'No external message'}
    </div>
    
    <div style="margin-top:0.5rem; color: var(--accent-danger); font-size: 0.85rem; display:flex; align-items:center; gap:0.25rem;">
      <span>🔒</span> No external message will be sent. Review and approve first.
    </div>
    
    <div style="display:flex; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn btn-success" onclick="
         handleApprovalQueueAction(${dbId}, 'approve');
         const parent = document.getElementById('chat-approval-card-${dbId}');
         if(parent) parent.innerHTML = '<div class=\\'badge badge-success\\' style=\\'margin-bottom:0.5rem;\\'>Approved internally</div><div class=\\'font-medium text-success\\'>✓ Action Approved</div>';
      ">Approve internally</button>
      <button class="btn btn-ghost" onclick="
         handleApprovalQueueAction(${dbId}, 'reject');
         const parent = document.getElementById('chat-approval-card-${dbId}');
         if(parent) parent.innerHTML = '<div class=\\'font-medium text-danger\\'>✕ Action Dismissed</div>';
      ">Dismiss</button>
    </div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}
