/**
 * CLIENT-SIDE ROUTER - KINETIX
 * Phase 1: Core Information Architecture
 */

import { renderHome } from './views/home.js';
import { renderWorkouts } from './views/workouts.js';
import { renderWorkoutDetail } from './views/workout-detail.js';
import { renderPlans } from './views/plans.js';
import { renderProgress } from './views/progress.js';
import { renderProfile } from './views/profile.js';
import { renderExerciseLibrary } from './views/exercise-library.js';
import { renderWorkoutPlayer } from './views/workout-player.js';
import { renderOnboarding } from './views/onboarding.js';
import { hasCompletedOnboarding } from './state/profile.js';

export class Router {
  constructor(appContainer) {
    this.container = typeof appContainer === 'string'
      ? document.querySelector(appContainer)
      : appContainer;

    this.topBarTitle = document.querySelector('#top-bar-title-text');
    this.topBarBackBtn = document.querySelector('#top-bar-back-btn');

    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());

    if (this.topBarBackBtn) {
      this.topBarBackBtn.addEventListener('click', () => {
        const hash = window.location.hash;
        if (hash.startsWith('#player/')) {
          const wid = hash.replace('#player/', '');
          window.location.hash = `#workout/${wid}`;
        } else if (hash.startsWith('#workout/') || hash === '#exercises') {
          window.location.hash = '#workouts';
        } else {
          window.history.back();
        }
      });
    }

    // First visit: if onboarding not completed, route directly to onboarding
    if (!hasCompletedOnboarding() && !window.location.hash.startsWith('#onboarding')) {
      window.location.hash = '#onboarding';
      return;
    }

    // Default route if empty
    if (!window.location.hash) {
      window.location.hash = '#home';
    } else {
      this.handleRoute();
    }
  }

  handleRoute() {
    const rawHash = window.location.hash.slice(1) || 'home';
    const [route, param] = rawHash.split('/');

    // Enforce onboarding for first-time users
    if (!hasCompletedOnboarding() && route !== 'onboarding') {
      window.location.hash = '#onboarding';
      return;
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Toggle onboarding shell mode (hides bottom nav & top bar)
    if (route === 'onboarding') {
      document.body.classList.add('is-onboarding');
    } else {
      document.body.classList.remove('is-onboarding');
    }

    // Update active indicators
    this.updateActiveNav(route);
    this.updateTopBar(route, param);

    // Route dispatching
    switch (route) {
      case 'onboarding':
        renderOnboarding(this.container, param === 'edit' ? 'edit' : 'new');
        break;
      case 'home':
        renderHome(this.container);
        break;
      case 'workouts':
        renderWorkouts(this.container);
        break;
      case 'workout':
        renderWorkoutDetail(this.container, param);
        break;
      case 'plans':
        renderPlans(this.container);
        break;
      case 'progress':
        renderProgress(this.container);
        break;
      case 'profile':
        renderProfile(this.container);
        break;
      case 'exercises':
        renderExerciseLibrary(this.container);
        break;
      case 'player':
        renderWorkoutPlayer(this.container, param);
        break;
      default:
        window.location.hash = '#home';
        break;
    }
  }

  updateActiveNav(route) {
    const navTargets = ['home', 'workouts', 'plans', 'progress', 'profile'];
    const activeKey = navTargets.includes(route) ? route : (route === 'workout' || route === 'exercises' || route === 'player' ? 'workouts' : 'home');

    // Mobile Bottom Nav items
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      const target = href.replace('#', '');
      const isActive = target === activeKey;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Desktop Sidebar items
    document.querySelectorAll('.desktop-nav-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      const target = href.replace('#', '');
      const isActive = target === activeKey;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  updateTopBar(route, param) {
    if (!this.topBarTitle) return;

    const isSubView = route === 'workout' || route === 'player' || route === 'exercises';

    if (this.topBarBackBtn) {
      this.topBarBackBtn.classList.toggle('top-bar-back-hidden', !isSubView);
      this.topBarBackBtn.setAttribute('aria-label', isSubView ? 'Go back' : '');
    }

    if (route === 'home') {
      this.topBarTitle.innerHTML = `<span class="top-bar-brand-title">KINETIX</span>`;
    } else if (route === 'workouts') {
      this.topBarTitle.textContent = 'Workouts';
    } else if (route === 'workout') {
      this.topBarTitle.textContent = 'Workout Overview';
    } else if (route === 'plans') {
      this.topBarTitle.textContent = 'Weekly Plan';
    } else if (route === 'progress') {
      this.topBarTitle.textContent = 'Progress & Stats';
    } else if (route === 'profile') {
      this.topBarTitle.textContent = 'Profile & Settings';
    } else if (route === 'exercises') {
      this.topBarTitle.textContent = 'Exercise Library';
    } else if (route === 'player') {
      this.topBarTitle.textContent = 'Session In Progress';
    }
  }
}
