/**
 * TABS & SEGMENTED CONTROLS - FITNESS WEB
 * Phase 0: Design Foundation
 */

export function setupTabs(containerSelector) {
  const container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;

  if (!container) return;

  const tabButtons = container.querySelectorAll('.tab-btn');
  const tabPanels = container.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab-target');

      // Update buttons
      tabButtons.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      // Update panels
      tabPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('is-active');
          panel.removeAttribute('hidden');
        } else {
          panel.classList.remove('is-active');
          panel.setAttribute('hidden', '');
        }
      });
    });
  });
}

export function setupSegmentedControls() {
  document.querySelectorAll('.segmented-control').forEach(control => {
    const items = control.querySelectorAll('.segmented-control-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(i => {
          i.classList.remove('is-active');
          i.setAttribute('aria-selected', 'false');
        });
        item.classList.add('is-active');
        item.setAttribute('aria-selected', 'true');

        // Dispatch custom change event
        control.dispatchEvent(new CustomEvent('change', {
          detail: { value: item.getAttribute('data-value') || item.textContent.trim() }
        }));
      });
    });
  });
}
