/**
 * EtaleHub SPA Router
 * Hash-based client-side routing for the SaaS dashboard.
 * Routes: #/dashboard, #/command, #/jobs, #/customers, #/money, #/calendar, #/settings
 */

const routes = {};
let currentRoute = null;
let currentView = null;
const routeChangeCallbacks = [];

/**
 * Register a route with its view render function
 * @param {string} path - Route path (e.g. '/dashboard')
 * @param {Function} renderFn - Async function that returns HTML string or renders to container
 */
export function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

/**
 * Navigate to a route programmatically
 * @param {string} path - Route path
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Get current route path
 * @returns {string}
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Listen for route changes
 * @param {Function} callback - Called with (newRoute, oldRoute)
 */
export function onRouteChange(callback) {
  routeChangeCallbacks.push(callback);
}

/**
 * Parse the current hash into a route path and params
 * @returns {{ path: string, params: URLSearchParams }}
 */
function parseHash() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  return { path, params };
}

/**
 * Handle route changes — renders the matching view
 */
async function handleRouteChange() {
  const { path, params } = parseHash();
  const oldRoute = currentRoute;
  currentRoute = path;

  // Find matching route
  const renderFn = routes[path];
  const container = document.getElementById('app-content');

  if (!container) return;

  if (renderFn) {
    // Fade out current content
    container.classList.add('view-exit');

    await new Promise(r => setTimeout(r, 150));

    try {
      // Clean up previous view
      if (currentView && typeof currentView.destroy === 'function') {
        currentView.destroy();
      }

      // Render new view
      const result = await renderFn(params);

      if (typeof result === 'string') {
        container.innerHTML = result;
      } else if (result && typeof result.mount === 'function') {
        container.innerHTML = '';
        currentView = result;
        await result.mount(container);
      }
    } catch (err) {
      console.error(`[Router] Error rendering ${path}:`, err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p class="text-muted">Could not load this page. Please try again.</p>
        </div>
      `;
    }

    // Fade in new content
    container.classList.remove('view-exit');
    container.classList.add('view-enter');
    requestAnimationFrame(() => {
      container.classList.remove('view-enter');
    });
  } else {
    // 404 — redirect to dashboard
    navigate('/dashboard');
    return;
  }

  // Notify listeners
  routeChangeCallbacks.forEach(cb => cb(currentRoute, oldRoute));
}

/**
 * Initialize the router
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);

  // Handle initial load
  if (!window.location.hash) {
    window.location.hash = '/dashboard';
  } else {
    handleRouteChange();
  }
}
