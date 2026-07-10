import { signUp } from '../services/auth-service.js';

export default async function renderSignup() {
  return `
    <div class="auth-container" style="display:flex; justify-content:center; align-items:center; height:90vh;">
      <div class="auth-box fade-in card" style="width: 100%; max-width: 450px; padding: 2rem;">
        <div class="auth-header text-center" style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--accent-teal);">Create your account</h2>
          <p class="text-muted">Start managing your business with EtaleHub</p>
        </div>
        
        <form id="signupForm" class="auth-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div id="authError" class="badge badge-danger" style="display: none; padding: 0.75rem; width:100%; box-sizing:border-box;"></div>
          
          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="fullName" class="text-sm font-medium">Full Name</label>
            <input type="text" id="fullName" required placeholder="John Doe" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>

          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="email" class="text-sm font-medium">Email</label>
            <input type="email" id="email" required placeholder="you@example.com" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>
          
          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="password" class="text-sm font-medium">Password</label>
            <input type="password" id="password" required minlength="6" placeholder="At least 6 characters" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>

          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="confirmPassword" class="text-sm font-medium">Confirm Password</label>
            <input type="password" id="confirmPassword" required placeholder="Confirm your password" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>
          
          <button type="submit" id="signupBtn" class="btn btn-primary" style="margin-top: 1rem; padding: 0.75rem;">Sign Up</button>
        </form>
        
        <div class="auth-footer text-center" style="margin-top: 2rem; display:flex; flex-direction:column; gap:0.5rem; font-size: 0.9rem;">
          <p class="text-muted">Already have an account? <a href="#/login" style="color: var(--accent-teal);">Sign in</a></p>
          <p><a href="#/dashboard" style="color: var(--text-color); text-decoration: underline;">Continue in Demo Mode</a></p>
        </div>
      </div>
    </div>
  `;
}

export function initSignup() {
  const form = document.getElementById('signupForm');
  const errorDiv = document.getElementById('authError');
  const btn = document.getElementById('signupBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      return;
    }

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = 'Creating account...';

    try {
      await signUp(email, password, fullName);
      window.location.hash = '#/onboarding';
    } catch (err) {
      errorDiv.textContent = err.message || 'Failed to create account';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Sign Up';
    }
  });
}
