/**
 * BOTTOM SHEET COMPONENT CONTROLLER - FITNESS WEB
 * Phase 0: Design Foundation
 */

export class BottomSheet {
  constructor(sheetElement, backdropElement) {
    this.sheet = typeof sheetElement === 'string' ? document.querySelector(sheetElement) : sheetElement;
    this.backdrop = typeof backdropElement === 'string' ? document.querySelector(backdropElement) : backdropElement;
    this.isOpen = false;
    this.init();
  }

  init() {
    if (!this.sheet || !this.backdrop) return;

    const closeBtns = this.sheet.querySelectorAll('[data-sheet-close]');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    this.backdrop.addEventListener('click', () => {
      if (this.isOpen) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.close();
      }
    });
  }

  open() {
    if (!this.sheet || !this.backdrop) return;
    this.isOpen = true;
    this.backdrop.classList.add('is-active');
    this.sheet.classList.add('is-active');
    this.sheet.setAttribute('aria-hidden', 'false');
  }

  close() {
    if (!this.sheet || !this.backdrop || !this.isOpen) return;
    this.isOpen = false;
    this.sheet.classList.remove('is-active');
    this.backdrop.classList.remove('is-active');
    this.sheet.setAttribute('aria-hidden', 'true');
  }
}
