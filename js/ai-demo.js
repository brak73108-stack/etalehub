/* ============================================
   EtaleHub AI Demo
   Interactive command simulation
   ============================================ */

const AI_RESPONSES = {
  'boiler_service': {
    trigger: ['boiler', 'mrs smith', 'service', '£180', 'annual'],
    summary: "I've processed Mrs Smith's boiler service. Here's what I've done:",
    actions: [
      { icon: '👤', text: 'Customer found: Mrs Smith', detail: 'Existing customer — 3 previous jobs', status: 'complete' },
      { icon: '🔧', text: 'Job marked complete', detail: 'Boiler service — completed today', status: 'complete' },
      { icon: '💳', text: '£180 payment recorded', detail: 'Card payment — processed', status: 'complete' },
      { icon: '🧾', text: 'Receipt created', detail: 'Invoice #EH-0047 — ready to send', status: 'complete' },
      { icon: '📅', text: 'Annual service reminder set', detail: 'Reminder scheduled for ' + getNextYearDate(), status: 'complete' },
      { icon: '📊', text: 'Customer history updated', detail: 'Lifetime value: £720', status: 'complete' }
    ],
    approval: {
      text: 'Send receipt to Mrs Smith via email?',
      risk: 'Medium'
    }
  },

  'quote_radiators': {
    trigger: ['quote', 'radiator', 'replacing', 'two'],
    summary: "I've drafted a quote for radiator replacement. Here's the breakdown:",
    actions: [
      { icon: '📝', text: 'Quote drafted', detail: 'Quote #Q-0023 — 2x radiator replacement', status: 'complete' },
      { icon: '🔩', text: 'Parts estimated', detail: '2x Type 22 radiators, valves, fittings — £340', status: 'complete' },
      { icon: '⏱️', text: 'Labour estimated', detail: '4–5 hours — £280', status: 'complete' },
      { icon: '💰', text: 'Total: £620 + VAT', detail: 'Based on similar recent jobs', status: 'complete' },
      { icon: '📋', text: 'Follow-up reminder created', detail: 'Check in after 3 days if no response', status: 'complete' }
    ],
    approval: {
      text: 'Review and send this quote to the customer?',
      risk: 'Medium'
    }
  },

  'unpaid_invoices': {
    trigger: ['who', 'owes', 'money', 'unpaid', 'outstanding'],
    summary: "Here's your outstanding payment summary:",
    actions: [
      { icon: '🔴', text: 'Ahmed Khan — £450', detail: 'Invoice #EH-0039 — 14 days overdue', status: 'overdue' },
      { icon: '🟡', text: 'Sarah Brown — £280', detail: 'Invoice #EH-0044 — due in 3 days', status: 'pending' },
      { icon: '🟡', text: 'John Williams — £1,200', detail: 'Invoice #EH-0041 — due in 7 days', status: 'pending' },
      { icon: '📊', text: 'Total outstanding: £1,930', detail: '£450 overdue, £1,480 not yet due', status: 'info' }
    ],
    approval: {
      text: 'Send a polite payment reminder to Ahmed Khan?',
      risk: 'Medium'
    }
  },

  'book_friday': {
    trigger: ['book', 'john', 'friday', 'morning'],
    summary: "I've checked your calendar and prepared the booking:",
    actions: [
      { icon: '👤', text: 'Customer: John Williams', detail: 'Found in your customer records', status: 'complete' },
      { icon: '📅', text: 'Friday morning available', detail: '9:00 AM — 12:00 PM slot is free', status: 'complete' },
      { icon: '🔧', text: 'Booking prepared', detail: 'Pending job type — please confirm service', status: 'pending' },
      { icon: '📍', text: 'Address confirmed', detail: '14 Oak Lane, Bristol BS3 4QR', status: 'complete' }
    ],
    approval: {
      text: 'Confirm booking and send appointment confirmation to John?',
      risk: 'Medium'
    }
  },

  'payment_reminder': {
    trigger: ['send', 'payment', 'reminder', 'ahmed', 'polite'],
    summary: "I've drafted a payment reminder for Ahmed Khan:",
    actions: [
      { icon: '👤', text: 'Customer: Ahmed Khan', detail: 'Invoice #EH-0039 — £450 — 14 days overdue', status: 'complete' },
      { icon: '✉️', text: 'Reminder message drafted', detail: '"Hi Ahmed, just a friendly reminder that invoice #EH-0039 for £450 is outstanding..."', status: 'complete' },
      { icon: '📱', text: 'Preferred contact: SMS', detail: 'Based on customer communication preferences', status: 'complete' },
      { icon: '🔁', text: 'Follow-up scheduled', detail: 'If no response, remind again in 5 days', status: 'complete' }
    ],
    approval: {
      text: 'Send this payment reminder to Ahmed via SMS?',
      risk: 'Medium'
    }
  }
};

// Fallback response for unrecognized commands
const FALLBACK_RESPONSE = {
  summary: "I understood your request. Here's what I can do:",
  actions: [
    { icon: '🤔', text: 'Analysing your request', detail: 'Identifying intent and entities', status: 'complete' },
    { icon: '💡', text: 'Suggested action identified', detail: 'I need a bit more detail to proceed', status: 'pending' }
  ],
  approval: null,
  clarification: "Could you provide a bit more detail? For example:\n• Customer name\n• Service type\n• Amount\n• What you'd like me to do"
};

function getNextYearDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function matchCommand(input) {
  const lower = input.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [key, response] of Object.entries(AI_RESPONSES)) {
    const score = response.trigger.filter(word => lower.includes(word)).length;
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = response;
    }
  }

  return bestMatch || FALLBACK_RESPONSE;
}

/* ---------- Demo Page Initialization ---------- */
function initAIDemo() {
  const input = document.getElementById('demo-input');
  const sendBtn = document.getElementById('demo-send');
  const messagesContainer = document.getElementById('demo-messages');
  const suggestionsContainer = document.getElementById('demo-suggestions');

  if (!input || !sendBtn || !messagesContainer) return;

  function processCommand(text) {
    if (!text.trim()) return;

    // Hide suggestions
    if (suggestionsContainer) {
      suggestionsContainer.style.display = 'none';
    }

    // Add user message
    addUserMessage(messagesContainer, text);

    // Clear input
    input.value = '';

    // Show typing indicator
    const typingEl = addTypingIndicator(messagesContainer);

    // Process after delay
    setTimeout(() => {
      typingEl.remove();
      const response = matchCommand(text);
      addAIResponse(messagesContainer, response);
    }, 1500);
  }

  // Send on button click
  sendBtn.addEventListener('click', () => {
    processCommand(input.value);
  });

  // Send on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      processCommand(input.value);
    }
  });

  // Suggestion clicks
  if (suggestionsContainer) {
    suggestionsContainer.querySelectorAll('.demo-chat__suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-command');
        input.value = text;
        processCommand(text);
      });
    });
  }
}

function addUserMessage(container, text) {
  const msg = document.createElement('div');
  msg.className = 'hero-demo__message slide-in-up';
  msg.innerHTML = `
    <div class="hero-demo__avatar hero-demo__avatar--user">You</div>
    <div class="hero-demo__bubble hero-demo__bubble--user">${escapeHTML(text)}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator(container) {
  const typing = document.createElement('div');
  typing.className = 'hero-demo__message slide-in-up';
  typing.innerHTML = `
    <div class="hero-demo__avatar hero-demo__avatar--ai">AI</div>
    <div class="hero-demo__bubble hero-demo__bubble--ai">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
  return typing;
}

function addAIResponse(container, response) {
  const responseEl = document.createElement('div');
  responseEl.className = 'demo-response slide-in-up';

  let actionsHTML = '';
  response.actions.forEach((action, i) => {
    const statusClass = action.status === 'complete' ? 'hero-demo__action-status--done' :
                        action.status === 'overdue' ? '' : 'hero-demo__action-status--pending';
    const statusText = action.status === 'complete' ? '✓ Done' :
                       action.status === 'overdue' ? '⚠ Overdue' :
                       action.status === 'info' ? '📊' : '⏳ Pending';
    const statusColor = action.status === 'overdue' ? 'style="color: var(--red-400)"' : '';

    actionsHTML += `
      <div class="hero-demo__action" style="animation-delay: ${i * 150}ms; opacity: 0; animation: slideInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${300 + i * 150}ms forwards;">
        <span class="hero-demo__action-icon">${action.icon}</span>
        <div style="flex: 1; min-width: 0;">
          <div class="hero-demo__action-text">${action.text}</div>
          <div style="font-size: 11px; color: var(--slate-400); margin-top: 2px;">${action.detail}</div>
        </div>
        <span class="hero-demo__action-status ${statusClass}" ${statusColor}>${statusText}</span>
      </div>
    `;
  });

  let approvalHTML = '';
  if (response.approval) {
    approvalHTML = `
      <div class="hero-demo__action" style="border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); animation: slideInUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${300 + response.actions.length * 150}ms forwards; opacity: 0;">
        <span class="hero-demo__action-icon">⚡</span>
        <div style="flex: 1;">
          <div class="hero-demo__action-text">${response.approval.text}</div>
          <div style="font-size: 11px; color: var(--amber-400); margin-top: 2px;">Approval required — ${response.approval.risk} risk</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm" style="background: var(--green-500); color: white; padding: 4px 12px; font-size: 12px;" onclick="this.textContent='✓ Approved'; this.style.opacity='0.7'; this.disabled=true;">Approve</button>
          <button class="btn btn-sm" style="background: transparent; color: var(--slate-400); border: 1px solid var(--border-dark); padding: 4px 12px; font-size: 12px;">Edit</button>
        </div>
      </div>
    `;
  }

  let clarificationHTML = '';
  if (response.clarification) {
    clarificationHTML = `<div style="font-size: 13px; color: var(--slate-400); padding: var(--space-3); white-space: pre-line;">${response.clarification}</div>`;
  }

  responseEl.innerHTML = `
    <div class="demo-response__header">
      <div class="hero-demo__avatar hero-demo__avatar--ai" style="width: 28px; height: 28px; font-size: 10px;">AI</div>
      <span class="demo-response__label">EtaleHub AI</span>
      <div class="pulse-dot" style="margin-left: 4px;"></div>
    </div>
    <div class="demo-response__summary" style="color: var(--text-on-dark);">${response.summary}</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${actionsHTML}
      ${approvalHTML}
    </div>
    ${clarificationHTML}
  `;

  container.appendChild(responseEl);
  container.scrollTop = container.scrollHeight;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Inline Demo (Homepage) ---------- */
function initInlineDemo() {
  const input = document.getElementById('inline-demo-input');
  const sendBtn = document.getElementById('inline-demo-send');
  const output = document.getElementById('inline-demo-output');
  const suggestions = document.querySelectorAll('.inline-demo-suggestion');

  if (!input || !output) return;

  function runInlineDemo(text) {
    if (!text.trim()) return;
    input.value = text;

    // Clear output
    output.innerHTML = '<div class="typing-dots" style="padding: 20px; display: flex; justify-content: center;"><span></span><span></span><span></span></div>';

    setTimeout(() => {
      const response = matchCommand(text);
      let html = `<div style="font-size: 13px; color: var(--text-on-dark); margin-bottom: 12px; font-weight: 500;">${response.summary}</div>`;

      response.actions.forEach((action, i) => {
        const statusClass = action.status === 'complete' ? 'hero-demo__action-status--done' : 'hero-demo__action-status--pending';
        const statusText = action.status === 'complete' ? '✓' : '⏳';
        html += `
          <div class="action-card action-card-dark visible" style="animation: slideInUp 0.3s ease ${i * 100}ms both; margin-bottom: 6px; padding: 10px 14px;">
            <span style="font-size: 16px;">${action.icon}</span>
            <div style="flex: 1; min-width: 0;">
              <div class="action-card__title" style="color: var(--text-on-dark); font-size: 13px;">${action.text}</div>
            </div>
            <span class="${statusClass}" style="font-size: 12px;">${statusText}</span>
          </div>
        `;
      });

      output.innerHTML = html;
    }, 1200);
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => runInlineDemo(input.value));
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runInlineDemo(input.value);
    });
  }

  suggestions.forEach(btn => {
    btn.addEventListener('click', () => {
      runInlineDemo(btn.getAttribute('data-command'));
    });
  });
}

// Auto-init based on page
document.addEventListener('DOMContentLoaded', () => {
  initAIDemo();
  initInlineDemo();
});
