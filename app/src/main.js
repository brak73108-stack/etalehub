/**
 * EtaleHub SaaS App Entry Point
 */

import { initRouter, registerRoute, navigate } from './router.js';
import { renderAppShell, initAppShell, updateTopbarTitle, updateSidebarActive } from './components/app-shell.js';

// Views
import renderDashboard from './views/dashboard.js';
import renderCommandCentre from './views/command-centre.js';

// Setup App Shell
document.getElementById('app').innerHTML = renderAppShell();
initAppShell();

// Register Routes
registerRoute('/dashboard', async () => {
  const html = await renderDashboard();
  updateTopbarTitle('/dashboard');
  updateSidebarActive('/dashboard');
  return html;
});

registerRoute('/command', async () => {
  const html = await renderCommandCentre();
  updateTopbarTitle('/command');
  updateSidebarActive('/command');
  return html;
});

import renderJobs, { initJobsView } from './views/jobs.js';
import renderCustomers, { renderCustomerDetail, initCustomersView } from './views/customers.js';
import renderMoney, { initMoneyView } from './views/money.js';
import renderCalendar from './views/calendar.js';
import renderSettings from './views/settings.js';

registerRoute('/jobs', async () => {
  const html = await renderJobs();
  updateTopbarTitle('/jobs');
  updateSidebarActive('/jobs');
  setTimeout(initJobsView, 0);
  return html;
});

registerRoute('/customers', async () => {
  updateTopbarTitle('/customers');
  updateSidebarActive('/customers');
  
  // Basic routing check for detail view
  const hash = window.location.hash;
  const parts = hash.split('/');
  if (parts.length > 2 && parts[2]) {
    return await renderCustomerDetail(parts[2]);
  }
  
  const html = await renderCustomers();
  setTimeout(initCustomersView, 0);
  return html;
});

registerRoute('/money', async () => {
  const html = await renderMoney();
  updateTopbarTitle('/money');
  updateSidebarActive('/money');
  setTimeout(initMoneyView, 0);
  return html;
});

registerRoute('/calendar', async () => {
  updateTopbarTitle('/calendar');
  updateSidebarActive('/calendar');
  return await renderCalendar();
});

registerRoute('/settings', async () => {
  updateTopbarTitle('/settings');
  updateSidebarActive('/settings');
  return await renderSettings();
});

// Init Database
import { initDatabase } from './db/database.js';
initDatabase().then(() => {
  console.log('[App] Database initialized');
  // Re-render current route to fetch data if needed
  const evt = new HashChangeEvent("hashchange", { newURL: window.location.href, oldURL: window.location.href });
  window.dispatchEvent(evt);
}).catch(err => {
  console.error('[App] Database initialization failed:', err);
});

// Start Router
initRouter();
