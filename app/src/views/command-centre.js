/**
 * EtaleHub Command Centre
 * The AI conversational interface for executing business admin.
 */

import { parseCommand } from '../ai/command-parser.js';
import { routeCommand } from '../ai/agent-router.js';
import { approve as approveAction, reject as rejectAction } from '../services/data/approvals-service.js';
import { addToast } from '../store.js';

let isProcessing = false;

export default async function renderCommandCentre() {
  window.handleCommandSubmit = async () => {
    if (isProcessing) return;
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    isProcessing = true;
    document.getElementById('chatSubmitBtn').disabled = true;
    
    appendMessage(text, 'user');
    appendLoading();
    
    try {
      const parsed = await parseCommand(text);
      const result = await routeCommand(parsed);
      
      removeLoading();
      
      if (!result) {
        appendMessage('I did not understand that command. Try "I finished Mrs Smith\'s boiler service. She paid £180 by card. Book her annual service."', 'ai', true);
        return;
      }
      
      // Render standard action cards
      if (result.executed && result.executed.length > 0) {
        result.executed.forEach(action => {
          if (action.actionCard) {
            appendActionCard(action.actionCard, 'success');
          }
        });
      }
      
      // Render warnings
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warn => {
          if (warn.actionCard) {
            appendActionCard(warn.actionCard, 'warning');
          }
        });
      }
      
      // Render approvals
      if (result.needsApproval && result.needsApproval.length > 0) {
        result.needsApproval.forEach(approval => {
          if (approval.approvalCard) {
            appendApprovalCard(approval.approvalCard);
          }
        });
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

  window.handleApproval = async (id, action) => {
    try {
      const card = document.getElementById(`approval-card-${id}`);
      if (!card) return;
      
      if (action === 'approve') {
        await approveAction(id);
        card.innerHTML = `<div class="badge badge-success" style="margin-bottom:0.5rem;">Approved in demo mode — no external email or SMS was sent.</div><div class="font-medium text-success">✓ Action Approved</div>`;
        addToast('Action approved successfully', 'success');
      } else {
        await rejectAction(id);
        card.innerHTML = `<div class="font-medium text-danger">✕ Action Dismissed</div>`;
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to update approval', 'error');
    }
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
  }, 50);

  return `
    <div style="display: flex; flex-direction: column; height: 100%;">
      <div class="view-header" style="flex-shrink: 0;">
        <div>
          <h1 class="view-title">Ask EtaleHub</h1>
          <p class="view-subtitle">Describe what happened. EtaleHub will update the admin safely.</p>
        </div>
      </div>
      
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
  `;
}

function appendMessage(text, sender, isError = false) {
  const history = document.getElementById('chatHistory');
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

function appendApprovalCard(card) {
  const history = document.getElementById('chatHistory');
  const div = document.createElement('div');
  div.id = `approval-card-${card.dbId || Math.floor(Math.random()*1000)}`;
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
        🛡️ Approval needed: ${card.actionType.replace('_', ' ')}
      </div>
      <span class="badge badge-warning">Needs approval</span>
    </div>
    
    <div class="text-sm" style="color:var(--text-color); margin-top: 0.5rem;">
      <strong>Action:</strong> ${card.proposedAction.detail}
    </div>
    
    <div style="background: var(--bg-elevated); padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem; font-family: monospace; font-size: 0.9rem; border-left: 2px solid var(--text-muted);">
      ${card.messagePreview}
    </div>
    
    <div style="margin-top:0.5rem; color: var(--accent-danger); font-size: 0.85rem; display:flex; align-items:center; gap:0.25rem;">
      <span>🔒</span> No external message will be sent in this demo. Review and approve first.
    </div>
    
    <div style="display:flex; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn btn-success" onclick="handleApproval(${card.dbId}, 'approve')">Approve & Send</button>
      <button class="btn btn-ghost" onclick="handleApproval(${card.dbId}, 'reject')">Dismiss</button>
    </div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}
