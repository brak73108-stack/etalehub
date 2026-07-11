/**
 * EtaleHub SaaS App Entry Point
 */

import { initRouter, registerRoute, navigate } from './router.js';
import { renderAppShell, initAppShell, updateTopbarTitle, updateSidebarActive } from './components/app-shell.js';

// Services
import { initMode, isDemoMode, getCurrentBusinessId } from './services/mode-service.js';
import { getSession } from './services/auth-service.js';
import { initDatabase } from './db/database.js'; // Fallback for Demo Mode
import { initFeedbackModal } from './components/feedback-modal.js';

// Views
import renderDashboard from './views/dashboard.js';
import renderCommandCentre from './views/command-centre.js';
import renderJobs, { initJobsView } from './views/jobs.js';
import renderCustomers, { renderCustomerDetail, initCustomersView } from './views/customers.js';
import renderMoney, { initMoneyView } from './views/money.js';
import renderCalendar from './views/calendar.js';
import renderSettings from './views/settings.js';

// Auth Views
import renderLogin, { initLogin } from './views/login.js';
import renderSignup, { initSignup } from './views/signup.js';
import renderOnboarding, { initOnboarding } from './views/onboarding.js';

// Setup App Shell
document.getElementById('app').innerHTML = renderAppShell();
initAppShell();

// Global Demo Helper
window.runMrsSmithDemo = function() {
  localStorage.setItem('etalehub_pending_demo_command', 'I finished Mrs Smith’s boiler service. She paid £180 by card. Book her annual service.');
  window.location.hash = '#/command';
};

// --- ROUTE GUARDS ---
// This function runs before every route to ensure Auth constraints
async function applyRouteGuard(targetRoute) {
  const session = await getSession();
  const hasBusiness = !!getCurrentBusinessId();
  
  if (targetRoute === '/login' || targetRoute === '/signup') {
    if (session) {
      if (hasBusiness) return '/dashboard';
      else return '/onboarding';
    }
  } else if (targetRoute === '/onboarding') {
    if (!session) return '/login';
    if (hasBusiness) return '/dashboard';
  } else {
    // For all other routes (dashboard, jobs, customers, etc.)
    if (session && !hasBusiness) return '/onboarding';
  }
  
  return targetRoute; // Allowed
}

// Wrapper to apply guards
function guardedRoute(path, renderFn, initFn) {
  registerRoute(path, async () => {
    const finalRoute = await applyRouteGuard(path);
    if (finalRoute !== path) {
      setTimeout(() => { window.location.hash = '#' + finalRoute; }, 0);
      return `<div style="padding: 2rem; text-align: center;">Redirecting...</div>`;
    }
    
    // Auth routes don't use the standard topbar title or sidebar active state 
    // because they are often full screen or overlay, but we'll update them anyway for consistency.
    if (!['/login', '/signup', '/onboarding'].includes(path)) {
      updateTopbarTitle(path);
      updateSidebarActive(path);
    }
    
    const html = await renderFn();
    if (initFn) setTimeout(initFn, 0);
    return html;
  });
}

// --- REGISTER ROUTES ---
guardedRoute('/login', renderLogin, initLogin);
guardedRoute('/signup', renderSignup, initSignup);
guardedRoute('/onboarding', renderOnboarding, initOnboarding);

guardedRoute('/dashboard', renderDashboard);
guardedRoute('/command', renderCommandCentre);
guardedRoute('/jobs', renderJobs, initJobsView);
guardedRoute('/money', renderMoney, initMoneyView);
guardedRoute('/calendar', renderCalendar);
guardedRoute('/settings', renderSettings);

// Customers is a special case due to nested routing (e.g. /customers/123)
registerRoute('/customers', async () => {
  const finalRoute = await applyRouteGuard('/customers');
  if (finalRoute !== '/customers') {
    setTimeout(() => { window.location.hash = '#' + finalRoute; }, 0);
    return `<div>Redirecting...</div>`;
  }
  
  updateTopbarTitle('/customers');
  updateSidebarActive('/customers');
  
  const hash = window.location.hash;
  const parts = hash.split('/');
  if (parts.length > 2 && parts[2]) {
    return await renderCustomerDetail(parts[2]);
  }
  
  const html = await renderCustomers();
  setTimeout(initCustomersView, 0);
  return html;
});


// --- INITIALIZATION SEQUENCE ---
async function bootstrap() {
  try {
    // 1. Init Supabase Auth Session & determine Mode (Demo vs Production)
    await initMode();
    console.log(`[App] Initialized in ${isDemoMode() ? 'DEMO' : 'PRODUCTION'} mode`);
    
    // 2. Init IndexedDB (always required for Demo Mode fallback)
    await initDatabase();
    
    // 3. Start Router
    initRouter();
    
    // 3.5 Init Feedback Modal
    initFeedbackModal();
    
    // 4. Force initial render
    const evt = new HashChangeEvent("hashchange", { newURL: window.location.href, oldURL: window.location.href });
    window.dispatchEvent(evt);
    
  } catch (err) {
    console.error('[App] Bootstrap failed:', err);
    document.getElementById('app').innerHTML = `
      <div style="padding: 2rem; color: #ef4444;">
        <h2>Failed to load EtaleHub</h2>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// Listen for Auth changes to re-evaluate route constraints
window.addEventListener('auth-change', async () => {
  console.log('[App] Auth changed, forcing re-evaluation');
  const evt = new HashChangeEvent("hashchange", { newURL: window.location.href, oldURL: window.location.href });
  window.dispatchEvent(evt);
});

bootstrap();
