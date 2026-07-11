/**
 * EtaleHub App Shell Component
 * Main layout: sidebar + topbar + content area + floating command
 */

import { getState, setState, subscribe } from '../store.js';
import { getCurrentRoute } from '../router.js';

/** Route-to-title mapping */
const routeTitles = {
  '/dashboard': 'Today',
  '/command': 'Ask EtaleHub',
  '/jobs': 'Jobs',
  '/customers': 'Customers',
  '/money': 'Money',
  '/calendar': 'Calendar',
  '/settings': 'Settings'
};

/**
 * Render the app shell layout
 * @returns {string} HTML string
 */
export function renderAppShell() {
  const user = getState('user');
  const route = getCurrentRoute() || '/dashboard';
  const title = routeTitles[route] || 'EtaleHub';

  return `
    <div class="app-shell">
      <!-- Sidebar Backdrop (mobile) -->
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

      <!-- Sidebar -->
      <aside class="app-sidebar" id="appSidebar">
        <div class="sidebar-logo">
          <svg class="sidebar-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="var(--accent-blue)"/>
            <path d="M8 10h16M8 16h12M8 22h8" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="24" cy="22" r="4" fill="var(--accent-teal)"/>
            <path d="M22.5 22l1 1 2-2" stroke="var(--accent-blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="sidebar-logo-text">EtaleHub</span>
        </div>

        <nav class="sidebar-nav">
          <a href="#/dashboard" class="sidebar-nav-item ${route === '/dashboard' ? 'active' : ''}" data-route="/dashboard">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Today</span>
          </a>
          <a href="#/command" class="sidebar-nav-item ${route === '/command' ? 'active' : ''}" data-route="/command">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>Ask EtaleHub</span>
            <span class="sidebar-badge sidebar-badge-teal" title="AI Command Centre">AI</span>
          </a>

          <div class="sidebar-divider"></div>

          <a href="#/jobs" class="sidebar-nav-item ${route === '/jobs' ? 'active' : ''}" data-route="/jobs">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
            <span>Jobs</span>
          </a>
          <a href="#/customers" class="sidebar-nav-item ${route === '/customers' ? 'active' : ''}" data-route="/customers">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span>Customers</span>
          </a>
          <a href="#/money" class="sidebar-nav-item ${route === '/money' ? 'active' : ''}" data-route="/money">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span>Money</span>
          </a>
          <a href="#/calendar" class="sidebar-nav-item ${route === '/calendar' ? 'active' : ''}" data-route="/calendar">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Calendar</span>
          </a>

          <div class="sidebar-divider"></div>

          <a href="#/settings" class="sidebar-nav-item ${route === '/settings' ? 'active' : ''}" data-route="/settings">
            <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            <span>Settings</span>
          </a>
        </nav>

        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${user.name.split(' ').map(n => n[0]).join('')}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.name}</div>
            <div class="sidebar-user-role">${user.businessName}</div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="app-main">
        <!-- Top Bar -->
        <header class="app-topbar" id="appTopbar">
          <button class="topbar-hamburger" id="hamburgerBtn" aria-label="Toggle menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 class="topbar-title" id="topbarTitle">${title}</h1>
          <div class="topbar-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.openFeedbackModal && window.openFeedbackModal()" style="display:flex; align-items:center; gap:0.5rem; margin-right: 0.5rem;">
              <span>💬</span> Beta Feedback
            </button>
            <button class="topbar-btn topbar-command-shortcut" id="commandShortcutBtn" title="Ask EtaleHub (Ctrl+K)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span class="shortcut-hint">Ctrl+K</span>
            </button>
            <button class="topbar-btn topbar-notifications" id="notificationsBtn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span class="notification-dot" id="notificationDot" style="display:none;"></span>
            </button>
          </div>
        </header>

        <!-- Page Content -->
        <main class="app-content" id="app-content">
          <!-- Views render here -->
        </main>
      </div>

      <!-- Floating Command Input -->
      <div class="floating-command" id="floatingCommand">
        <div class="floating-command-inner">
          <svg class="floating-command-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <input type="text" class="floating-command-input" id="floatingCommandInput" placeholder="Ask EtaleHub anything..." autocomplete="off" />
          <button class="floating-command-send" id="floatingCommandSend" title="Send" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toastContainer"></div>
    </div>
  `;
}

/**
 * Initialize app shell interactions
 */
export function initAppShell() {
  // Hamburger menu toggle
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      backdrop.classList.toggle('visible', isOpen);
      setState('ui.sidebarOpen', isOpen);
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('visible');
      setState('ui.sidebarOpen', false);
    });
  }

  // Floating command input
  const floatingInput = document.getElementById('floatingCommandInput');
  const floatingSend = document.getElementById('floatingCommandSend');

  if (floatingInput) {
    floatingInput.addEventListener('input', () => {
      floatingSend.disabled = !floatingInput.value.trim();
    });

    floatingInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && floatingInput.value.trim()) {
        handleFloatingCommand(floatingInput.value.trim());
        floatingInput.value = '';
        floatingSend.disabled = true;
      }
    });
  }

  if (floatingSend) {
    floatingSend.addEventListener('click', () => {
      if (floatingInput && floatingInput.value.trim()) {
        handleFloatingCommand(floatingInput.value.trim());
        floatingInput.value = '';
        floatingSend.disabled = true;
      }
    });
  }

  // Ctrl+K shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (floatingInput) {
        floatingInput.focus();
      }
    }
  });

  // Command shortcut button
  const cmdShortcut = document.getElementById('commandShortcutBtn');
  if (cmdShortcut) {
    cmdShortcut.addEventListener('click', () => {
      if (floatingInput) floatingInput.focus();
    });
  }

  // Toast subscriber
  subscribe('ui.toasts', renderToasts);

  // Hide floating command on command centre page
  updateFloatingCommandVisibility();
}

/**
 * Handle command from floating input — navigate to command centre and process
 */
async function handleFloatingCommand(text) {
  const { navigate } = await import('../router.js');
  const { addMessage } = await import('../store.js');

  // Add user message
  addMessage('user', text);

  // Navigate to command centre
  navigate('/command');

  // Process command (delayed to allow view to render)
  setTimeout(async () => {
    try {
      const { processCommand } = await import('../views/command-centre.js');
      processCommand(text);
    } catch (e) {
      console.error('[AppShell] Error processing command:', e);
    }
  }, 300);
}

/**
 * Update the topbar title based on current route
 */
export function updateTopbarTitle(route) {
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) {
    titleEl.textContent = routeTitles[route] || 'EtaleHub';
  }
}

/**
 * Update sidebar active state
 */
export function updateSidebarActive(route) {
  const items = document.querySelectorAll('.sidebar-nav-item');
  items.forEach(item => {
    const itemRoute = item.getAttribute('data-route');
    item.classList.toggle('active', itemRoute === route);
  });

  // Close mobile sidebar
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');

  updateFloatingCommandVisibility();
}

/**
 * Hide floating command on Command Centre view
 */
function updateFloatingCommandVisibility() {
  const floating = document.getElementById('floatingCommand');
  const route = getCurrentRoute();
  if (floating) {
    floating.style.display = route === '/command' ? 'none' : '';
  }
}

/**
 * Render toast notifications
 */
function renderToasts(toasts) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  container.innerHTML = toasts.map(t => `
    <div class="toast toast-${t.type}" data-toast-id="${t.id}">
      <span class="toast-icon">${t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span class="toast-message">${t.message}</span>
      <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    </div>
  `).join('');
}

/**
 * Show notification dot
 */
export function showNotificationDot(show = true) {
  const dot = document.getElementById('notificationDot');
  if (dot) dot.style.display = show ? '' : 'none';
}
