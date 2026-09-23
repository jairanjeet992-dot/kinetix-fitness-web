/**
 * MAIN ENTRY SCRIPT - KINETIX
 * Phase 1: Core Information Architecture
 *
 * Initializes the Single-Page Application Shell and Router.
 */

import { Router } from './router.js';
import { ToastManager } from './components/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Global Toast Manager
  const toastManager = new ToastManager('#toast-container');
  window.showToast = (opts) => toastManager.show(opts);

  // Initialize Router mounted to the main app view container
  const router = new Router('#app-view');
  window.appRouter = router;

  // Global settings: sync reduced-motion if user prefers
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
  }

  console.log('Kinetix SPA Initialized: Phase 1 Core Information Architecture Active.');
});
