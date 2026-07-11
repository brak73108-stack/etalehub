import { submitFeedback } from '../services/data/feedback-service.js';

let isInitialized = false;

export function initFeedbackModal() {
  if (isInitialized) return;
  
  const modalHtml = `
    <div id="feedback-modal" class="modal-backdrop" style="display: none; align-items: center; justify-content: center; z-index: 10000;">
      <div class="modal-content" style="max-width: 500px; width: 100%;">
        <div class="modal-header">
          <h2 style="font-size: 1.5rem; margin: 0; display:flex; align-items:center; gap:0.5rem;">
            <span>💬</span> Beta Feedback
          </h2>
          <button type="button" class="btn btn-secondary" onclick="closeFeedbackModal()" style="border:none; background:transparent; font-size:1.5rem; padding:0;">&times;</button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
            Help us improve EtaleHub. Please do not include passwords, API keys, payment card details, or sensitive customer information.
          </p>
          <div id="feedback-error" class="alert alert-danger" style="display:none; margin-bottom: 1rem;"></div>
          <div id="feedback-success" class="alert alert-success" style="display:none; margin-bottom: 1rem;">Feedback submitted successfully! Thank you.</div>
          
          <form id="feedback-form" onsubmit="handleFeedbackSubmit(event)">
            <div class="form-group">
              <label>Feedback Type <span class="text-danger">*</span></label>
              <select id="feedback-type" class="form-control" required>
                <option value="">Select an option...</option>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="confusing_workflow">Confusing Workflow</option>
                <option value="missing_workflow">Missing Workflow</option>
                <option value="praise">Praise</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Description <span class="text-danger">*</span></label>
              <textarea id="feedback-description" class="form-control" rows="4" placeholder="What happened? What did you expect?" required minlength="10"></textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label>Urgency (Optional)</label>
                <select id="feedback-urgency" class="form-control">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div class="form-group">
                <label>Contact Email (Optional)</label>
                <input type="email" id="feedback-email" class="form-control" placeholder="For follow-up">
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeFeedbackModal()">Cancel</button>
          <button type="submit" form="feedback-form" class="btn btn-primary" id="feedback-submit-btn">Submit Feedback</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  window.openFeedbackModal = () => {
    document.getElementById('feedback-error').style.display = 'none';
    document.getElementById('feedback-success').style.display = 'none';
    document.getElementById('feedback-form').style.display = 'block';
    document.getElementById('feedback-submit-btn').style.display = 'inline-block';
    document.getElementById('feedback-form').reset();
    document.getElementById('feedback-modal').style.display = 'flex';
  };
  
  window.closeFeedbackModal = () => {
    document.getElementById('feedback-modal').style.display = 'none';
  };
  
  window.handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('feedback-submit-btn');
    const err = document.getElementById('feedback-error');
    const suc = document.getElementById('feedback-success');
    const form = document.getElementById('feedback-form');
    
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    err.style.display = 'none';
    
    const data = {
      feedbackType: document.getElementById('feedback-type').value,
      description: document.getElementById('feedback-description').value,
      urgency: document.getElementById('feedback-urgency').value,
      contactEmail: document.getElementById('feedback-email').value,
      pageOrWorkflow: window.location.hash || '#/'
    };
    
    try {
      await submitFeedback(data);
      form.style.display = 'none';
      btn.style.display = 'none';
      suc.style.display = 'block';
      setTimeout(() => {
        closeFeedbackModal();
        // Trigger a re-render if we are on dashboard so checklist updates
        if (window.location.hash === '#/' || window.location.hash === '#/dashboard' || window.location.hash === '') {
           window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      }, 2000);
    } catch (error) {
      err.textContent = error.message;
      err.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Submit Feedback';
    }
  };
  
  isInitialized = true;
}
