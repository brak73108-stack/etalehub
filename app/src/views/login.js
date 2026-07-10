import { signIn } from '../services/auth-service.js';
import { initMode, getCurrentBusinessId } from '../services/mode-service.js';

export default async function renderLogin() {
  return `
    <div class="auth-container" style="display:flex; justify-content:center; align-items:center; height:80vh;">
      <div class="auth-box fade-in card" style="width: 100%; max-width: 400px; padding: 2rem;">
        <div class="auth-header text-center" style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--accent-teal);">Welcome back</h2>
          <p class="text-muted">Sign in to your EtaleHub workspace</p>
        </div>
        
        <form id="loginForm" class="auth-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div id="authError" class="badge badge-danger" style="display: none; padding: 0.75rem; width:100%; box-sizing:border-box;"></div>
          
          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="email" class="text-sm font-medium">Email</label>
            <input type="email" id="email" required placeholder="you@example.com" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>
          
          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="password" class="text-sm font-medium">Password</label>
            <input type="password" id="password" required placeholder="••••••••" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>
          
          <button type="submit" id="loginBtn" class="btn btn-primary" style="margin-top: 1rem; padding: 0.75rem;">Sign In</button>
        </form>
        
        <div class="auth-footer text-center" style="margin-top: 2rem; display:flex; flex-direction:column; gap:0.5rem; font-size: 0.9rem;">
          <p class="text-muted">Don't have an account? <a href="#/signup" style="color: var(--accent-teal);">Sign up</a></p>
          <p><a href="#/dashboard" style="color: var(--text-color); text-decoration: underline;">Continue in Demo Mode</a></p>
        </div>
      </div>
    </div>
  `;
}

export function initLogin() {
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('authError');
  const btn = document.getElementById('loginBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = 'Signing in...';

    try {
      await signIn(email, password);
      await initMode();
      if (getCurrentBusinessId()) {
        window.location.hash = '#/dashboard';
      } else {
        window.location.hash = '#/onboarding';
      }
    } catch (err) {
      errorDiv.textContent = err.message || 'Failed to sign in';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
    }
  });
}
