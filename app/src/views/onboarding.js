import { createBusiness } from '../services/auth-service.js';

export default async function renderOnboarding() {
  return `
    <div class="auth-container" style="display:flex; justify-content:center; align-items:center; height:80vh;">
      <div class="auth-box fade-in card" style="width: 100%; max-width: 500px; padding: 2rem;">
        <div class="auth-header text-center" style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--accent-teal);">Setup your workspace</h2>
          <p class="text-muted">Tell us about your business to get started</p>
        </div>
        
        <form id="onboardingForm" class="auth-form" style="display:flex; flex-direction:column; gap:1rem;">
          <div id="onboardingError" class="badge badge-danger" style="display: none; padding: 0.75rem; width:100%; box-sizing:border-box;"></div>
          
          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="businessName" class="text-sm font-medium">Business Name</label>
            <input type="text" id="businessName" required placeholder="e.g. Bristol Plumbing Ltd" style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
          </div>
          
          <div class="form-group" style="display:flex; flex-direction:column; gap:0.25rem;">
            <label for="industry" class="text-sm font-medium">Industry</label>
            <select id="industry" required style="padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: white;">
              <option value="plumbing_heating">Plumbing & Heating</option>
              <option value="electrical">Electrical</option>
              <option value="hvac">HVAC</option>
              <option value="other">Other Trade</option>
            </select>
          </div>
          
          <button type="submit" id="onboardingBtn" class="btn btn-primary" style="margin-top: 1rem; padding: 0.75rem;">Create Workspace</button>
        </form>
      </div>
    </div>
  `;
}

export function initOnboarding() {
  const form = document.getElementById('onboardingForm');
  const errorDiv = document.getElementById('onboardingError');
  const btn = document.getElementById('onboardingBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('businessName').value.trim();
    const industry = document.getElementById('industry').value;

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = 'Setting up...';

    try {
      await createBusiness(name, industry);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorDiv.textContent = err.message || 'Failed to create workspace';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Create Workspace';
    }
  });
}
