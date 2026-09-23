/**
 * MODAL COMPONENT CONTROLLER - FITNESS WEB
 * Phase 0: Design Foundation
 */

export class Modal {
  constructor(modalElement, backdropElement) {
    this.modal = typeof modalElement === 'string' ? document.querySelector(modalElement) : modalElement;
    this.backdrop = typeof backdropElement === 'string' ? document.querySelector(backdropElement) : backdropElement;
    this.isOpen = false;
    this.previousActiveElement = null;

    this.init();
  }

  init() {
    if (!this.modal || !this.backdrop) return;

    // Close buttons
    const closeBtns = this.modal.querySelectorAll('[data-modal-close]');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // Backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (this.isOpen && e.target === this.backdrop) {
        this.close();
      }
    });

    // ESC key listener
    document.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.close();
      }
    });
  }

  open() {
    if (!this.modal || !this.backdrop) return;
    this.previousActiveElement = document.activeElement;
    this.isOpen = true;

    this.backdrop.classList.add('is-active');
    this.modal.classList.add('is-active');
    this.modal.setAttribute('aria-hidden', 'false');

    // Focus the first focusable element inside modal
    const focusable = this.modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      focusable.focus();
    }
  }

  close() {
    if (!this.modal || !this.backdrop || !this.isOpen) return;
    this.isOpen = false;

    this.modal.classList.remove('is-active');
    this.backdrop.classList.remove('is-active');
    this.modal.setAttribute('aria-hidden', 'true');

    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }
}
