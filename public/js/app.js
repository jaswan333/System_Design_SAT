/**
 * Application Entry & Navigation Router
 */

document.addEventListener('DOMContentLoaded', () => {
  // Setup Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-tab');

      // Update button active state
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update content active state
      tabContents.forEach(content => {
        if (content.id === targetId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      // Special tab activation hooks
      if (targetId === 'tab-monitor' && window.monitorApp) {
        window.monitorApp.refreshState();
      }
    });
  });

  // Check Backend Health
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const textEl = document.getElementById('api-status-text');
        if (textEl) textEl.textContent = 'v1.0 Online';
      }
    } catch (err) {
      const textEl = document.getElementById('api-status-text');
      if (textEl) textEl.textContent = 'Offline';
    }
  }

  checkHealth();

  // Initialize sub-modules
  if (window.flowApp) window.flowApp.init();
  if (window.apiSandbox) window.apiSandbox.init();
  if (window.monitorApp) window.monitorApp.init();
});
