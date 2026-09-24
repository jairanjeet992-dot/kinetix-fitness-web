/**
 * MAIN ENTRY SCRIPT - KINETIX
 * Phase 1: Core Information Architecture
 *
 * Initializes the Single-Page Application Shell and Router.
 */

import { Router } from './router.js';
import { ToastManager } from './components/toast.js';
import { getProfile } from './state/profile.js';

function syncShellProfile() {
  const profile = getProfile() || {};
  const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : 'Athlete';
  const initials = name.split(/\\s+/).map(part => part[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'A';

  const nameEl = document.querySelector('#desktop-user-name');
  const avatarEl = document.querySelector('#desktop-user-avatar');
  const statusEl = document.querySelector('#desktop-user-status');

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = initials;
  if (statusEl) statusEl.textContent = profile.fitnessLevel
    ? `${String(profile.fitnessLevel).charAt(0).toUpperCase()}${String(profile.fitnessLevel).slice(1)} Athlete`
    : 'Kinetix Athlete';
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Global Toast Manager
  const toastManager = new ToastManager('#toast-container');
  window.showToast = (opts) => toastManager.show(opts);

  // Initialize Router mounted to the main app view container
  const router = new Router('#app-view');
  window.appRouter = router;
  syncShellProfile();

  // Global settings: sync reduced-motion if user prefers
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
  }

  console.log('Kinetix SPA Initialized: Phase 1 Core Information Architecture Active.');
});
