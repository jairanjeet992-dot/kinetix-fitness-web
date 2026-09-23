/**
 * PROGRESS RING CONTROLLER - FITNESS WEB
 * Phase 0: Design Foundation
 */

export class ProgressRing {
  constructor(element, options = {}) {
    this.container = typeof element === 'string' ? document.querySelector(element) : element;
    if (!this.container) return;

    this.radius = options.radius || 42;
    this.stroke = options.stroke || 6;
    this.color = options.color || 'var(--color-primary)';
    this.trackColor = options.trackColor || 'var(--color-surface-secondary)';
    this.normalizedRadius = this.radius - this.stroke * 2;
    this.circumference = this.normalizedRadius * 2 * Math.PI;

    this.render();
    if (options.progress !== undefined) {
      this.setProgress(options.progress);
    }
  }

  render() {
    const size = this.radius * 2;
    this.container.innerHTML = `
      <svg
        height="${size}"
        width="${size}"
        class="progress-ring"
      >
        <circle
          class="progress-ring-track"
          stroke-width="${this.stroke}"
          r="${this.normalizedRadius}"
          cx="${this.radius}"
          cy="${this.radius}"
        />
        <circle
          class="progress-ring-indicator"
          stroke-width="${this.stroke}"
          stroke-dasharray="${this.circumference} ${this.circumference}"
          style="stroke-dashoffset: ${this.circumference};"
          r="${this.normalizedRadius}"
          cx="${this.radius}"
          cy="${this.radius}"
        />
      </svg>
      <div class="progress-ring-content">
        <span class="progress-ring-value" data-progress-value>0%</span>
        <span class="progress-ring-label" data-progress-label>Complete</span>
      </div>
    `;

    this.circle = this.container.querySelector('.progress-ring-indicator');
    this.valueText = this.container.querySelector('[data-progress-value]');
    this.labelText = this.container.querySelector('[data-progress-label]');
  }

  setProgress(percent, label) {
    if (!this.circle) return;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = this.circumference - (clamped / 100) * this.circumference;
    this.circle.style.strokeDashoffset = offset;
    if (this.valueText) {
      this.valueText.textContent = `${Math.round(clamped)}%`;
    }
    if (label && this.labelText) {
      this.labelText.textContent = label;
    }
  }
}
