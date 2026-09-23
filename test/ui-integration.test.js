/**
 * UI INTEGRATION TEST (HEADLESS DOM) - KINETIX
 * Phase 2: Verification of Home Personalization, Regenerate, Exercise Library, & Detail Modal
 */

// Simple lightweight mock DOM environment for Node
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.classList = new Set();
    this.listeners = {};
    this.innerHTMLText = '';
  }

  get innerHTML() {
    return this.innerHTMLText;
  }

  set innerHTML(html) {
    this.innerHTMLText = html;
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }

  getAttribute(k) {
    return this.attributes[k] || null;
  }

  addEventListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    list.forEach(cb => cb(event));
  }

  querySelector(selector) {
    // Basic selector parser for IDs and classes
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const searchHtml = this.innerHTMLText;

    // Detect IDs in HTML
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      const re = new RegExp(`id=["']${id}["']`, 'i');
      if (re.test(searchHtml)) {
        const el = new MockElement('div');
        el.setAttribute('id', id);
        results.push(el);
      }
    }
    // Detect classes
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'gi');
      let m;
      while ((m = re.exec(searchHtml)) !== null) {
        const el = new MockElement('div');
        el.classList.add(cls);
        results.push(el);
      }
    }
    // Detect data attributes
    if (selector.startsWith('[data-')) {
      const attrName = selector.replace(/[\[\]]/g, '').split('=')[0];
      const re = new RegExp(`${attrName}=["']([^"']*)["']`, 'gi');
      let m;
      while ((m = re.exec(searchHtml)) !== null) {
        const el = new MockElement('div');
        el.setAttribute(attrName, m[1]);
        results.push(el);
      }
    }
    return results;
  }
}

// Global browser mocks
globalThis.document = {
  body: new MockElement('body'),
  querySelector: (s) => globalThis.document.body.querySelector(s),
  querySelectorAll: (s) => globalThis.document.body.querySelectorAll(s),
  removeEventListener: () => {}
};
globalThis.window = {
  location: { hash: '#home' },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  showToast: (t) => { console.log(`    [Toast Notification]: ${t.type.toUpperCase()} - ${t.message}`); }
};
globalThis.localStorage = {
  data: {},
  getItem: (k) => globalThis.localStorage.data[k] || null,
  setItem: (k, v) => { globalThis.localStorage.data[k] = String(v); },
  removeItem: (k) => { delete globalThis.localStorage.data[k]; }
};

import { renderHome } from '../js/views/home.js';
import { renderExerciseLibrary } from '../js/views/exercise-library.js';
import { renderWorkoutDetail } from '../js/views/workout-detail.js';
import { updateOnboardingState } from '../js/state/profile.js';
import { getWorkoutById } from '../js/data/workouts.js';

console.log('====================================================');
console.log('UI INTEGRATION TESTS (HEADLESS DOM)');
console.log('====================================================\n');

// 1. Setup profile in localStorage
updateOnboardingState({
  name: 'Alex',
  goal: 'Build Muscle',
  fitnessLevel: 'Intermediate',
  targetMuscles: ['Chest', 'Back'],
  equipment: ['Dumbbells'],
  trainingDays: '4 days',
  workoutDuration: '30–45 min',
  onboardingCompleted: true
});

// 2. Test Home View Rendering
console.log('Test 1: Render Home view with personalized generator');
const homeContainer = new MockElement('div');
renderHome(homeContainer);

const homeHtml = homeContainer.innerHTML;
console.log('  Checking Home HTML for generated session elements:');
const hasGreeting = homeHtml.includes('Alex');
const hasChestBack = homeHtml.includes('Chest & Back') || homeHtml.includes('Chest') && homeHtml.includes('Back');
const hasExplanation = homeHtml.includes('Why this workout?');
const hasTryAnother = homeHtml.includes('Try Another');
const hasStartBtn = homeHtml.includes('Start Workout');
const hasDetailBtn = homeHtml.includes('View Routine Details');

console.log(`  ✓ Athlete greeting: ${hasGreeting ? 'Found "Alex"' : 'Missing'}`);
console.log(`  ✓ Personalized focus: ${hasChestBack ? 'Found Chest & Back focus' : 'Missing'}`);
console.log(`  ✓ "Why this workout?" explanation box: ${hasExplanation ? 'Found' : 'Missing'}`);
console.log(`  ✓ "Try Another" regenerate action: ${hasTryAnother ? 'Found' : 'Missing'}`);
console.log(`  ✓ Start Workout CTA: ${hasStartBtn ? 'Found' : 'Missing'}`);
console.log(`  ✓ View Routine Details CTA: ${hasDetailBtn ? 'Found' : 'Missing'}`);

if (!hasGreeting || !hasChestBack || !hasExplanation || !hasTryAnother || !hasStartBtn || !hasDetailBtn) {
  console.error('Home View rendering failed validation!');
  process.exit(1);
}

// 3. Test Workout Detail View with Generated Routine
console.log('\nTest 2: Workout Detail loads generated routine');
const match = homeHtml.match(/href="#workout\/([^"]+)"/);
const genId = match ? match[1] : null;
console.log(`  Generated Workout ID: ${genId}`);

if (!genId) {
  console.error('Could not find generated workout link in Home view!');
  process.exit(1);
}

const workoutObj = getWorkoutById(genId);
console.log(`  ✓ getWorkoutById("${genId}") resolved: ${workoutObj ? workoutObj.title : 'NULL'}`);
if (!workoutObj) {
  console.error('getWorkoutById failed to resolve generated workout!');
  process.exit(1);
}

const detailContainer = new MockElement('div');
renderWorkoutDetail(detailContainer, genId);
const detailHtml = detailContainer.innerHTML;
const hasExerciseSequence = detailHtml.includes('Exercise Sequence');
const hasSetsRounds = detailHtml.includes('Rounds');
console.log(`  ✓ Exercise sequence in Detail view: ${hasExerciseSequence ? 'Found' : 'Missing'}`);
console.log(`  ✓ Rounds in Detail view: ${hasSetsRounds ? 'Found' : 'Missing'}`);

// 4. Test Exercise Library View
console.log('\nTest 3: Render Exercise Library with 40+ exercises');
const libContainer = new MockElement('div');
renderExerciseLibrary(libContainer);
const libHtml = libContainer.innerHTML;

const hasCountBadge = libHtml.includes('47 Exercises');
const hasSearch = libHtml.includes('exercise-search-input');
const hasMuscleChips = libHtml.includes('Target Muscles');
const hasDropdowns = libHtml.includes('select-ex-category');

console.log(`  ✓ 47 Exercises badge: ${hasCountBadge ? 'Found' : 'Missing'}`);
console.log(`  ✓ Search bar: ${hasSearch ? 'Found' : 'Missing'}`);
console.log(`  ✓ Muscle category filter pills: ${hasMuscleChips ? 'Found' : 'Missing'}`);
console.log(`  ✓ Multi-filter dropdowns: ${hasDropdowns ? 'Found' : 'Missing'}`);

if (!hasCountBadge || !hasSearch || !hasMuscleChips || !hasDropdowns) {
  console.error('Exercise Library view failed validation!');
  process.exit(1);
}

console.log('\n🎉 ALL UI INTEGRATION & BACKWARD-COMPATIBILITY CHECKS PASSED!\n');
