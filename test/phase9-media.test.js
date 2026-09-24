/**
 * PHASE 9 AUTOMATED TEST SUITE - KINETIX
 * Comprehensive Verification of Exercise Coach System & Media Architecture
 *
 * Verifies all 20 required Phase 9 scenarios:
 * 1. coach metadata validation
 * 2. media schema validation
 * 3. missing media
 * 4. invalid media
 * 5. fallback
 * 6. coach consistency metadata
 * 7. pilot exercise mapping
 * 8. video URL validation
 * 9. image fallback
 * 10. SVG fallback
 * 11. Workout Player integration
 * 12. Exercise Detail integration
 * 13. Exercise Library integration
 * 14. lazy-loading behavior assumptions
 * 15. corrupted media metadata
 * 16. existing 47-exercise regression
 * 17. Phase 8.1 security regression
 * 18. missing coach identity
 * 19. wrong coach identity
 * 20. duplicate asset IDs
 */

// ----------------------------------------------------
// Headless Mock DOM & Browser Environment
// ----------------------------------------------------
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.classList = new Set();
    this.listeners = {};
    this.innerHTMLText = '';
    this.style = {};
  }

  get innerHTML() {
    return this.innerHTMLText;
  }

  set innerHTML(html) {
    this.innerHTMLText = String(html);
    if (this._parent && this.attributes.id) {
      const id = this.attributes.id;
      const re = new RegExp(`(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/[a-z0-9]+>)`, 'i');
      if (re.test(this._parent.innerHTMLText)) {
        this._parent.innerHTMLText = this._parent.innerHTMLText.replace(re, `$1${this.innerHTMLText}$2`);
      }
    }
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }

  getAttribute(k) {
    return this.attributes[k] || null;
  }

  hasAttribute(k) {
    return k in this.attributes;
  }

  addEventListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  removeEventListener(event, cb) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(fn => fn !== cb);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    list.forEach(cb => cb(event));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const searchHtml = this.innerHTMLText;

    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      const re = new RegExp(`id=["']${id}["']`, 'i');
      if (re.test(searchHtml)) {
        const el = new MockElement('div');
        el._parent = this;
        el.setAttribute('id', id);
        results.push(el);
      }
    } else if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'gi');
      let m;
      while ((m = re.exec(searchHtml)) !== null) {
        const el = new MockElement('div');
        el.classList.add(cls);
        results.push(el);
      }
    } else if (selector.startsWith('[data-')) {
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

  remove() {
    this.innerHTMLText = '';
  }

  insertAdjacentHTML(pos, html) {
    this.innerHTMLText += String(html);
  }
}

globalThis.document = {
  body: new MockElement('body'),
  querySelector: (s) => globalThis.document.body.querySelector(s),
  querySelectorAll: (s) => globalThis.document.body.querySelectorAll(s),
  addEventListener: () => {},
  removeEventListener: () => {},
  insertAdjacentHTML: (pos, html) => {
    globalThis.document.body.innerHTMLText += html;
  }
};
globalThis.document.body.contains = () => true;

globalThis.localStorage = {
  data: {},
  getItem: (k) => globalThis.localStorage.data[k] || null,
  setItem: (k, v) => { globalThis.localStorage.data[k] = String(v); },
  removeItem: (k) => { delete globalThis.localStorage.data[k]; }
};

globalThis.window = {
  location: { hash: '#library' },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  matchMedia: (q) => ({ matches: q.includes('reduced-motion') })
};

// ----------------------------------------------------
// System Imports
// ----------------------------------------------------
import { EXERCISES, getExerciseById } from '../js/data/exercises.js';
import { validateExerciseRecord } from '../js/data/exercise-validator.js';
import {
  KINETIX_COACH,
  COACH_REGISTRY,
  PILOT_EXERCISE_IDS,
  PILOT_COACH_MEDIA,
  validateCoachMedia,
  validatePilotConsistency,
  resolveExerciseWithCoachMedia
} from '../js/data/coach-system.js';
import {
  renderExerciseMedia,
  showExerciseDetailModal,
  sanitizeMediaUrl,
  getBiomechanicalIllustration,
  escapeHtml
} from '../js/components/exercise-media.js';
import { renderWorkoutPlayer } from '../js/views/workout-player.js';
import { renderExerciseLibrary } from '../js/views/exercise-library.js';

let passed = 0;
let failed = 0;
let total = 0;

function assert(cond, desc) {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${desc}`);
  }
}

console.log('====================================================');
console.log('PHASE 9 — KINETIX COACH SYSTEM & MEDIA ARCHITECTURE');
console.log('====================================================\n');

// ----------------------------------------------------
// Test 1: Coach Metadata Validation
// ----------------------------------------------------
console.log('Test 1: Coach Metadata Validation');
assert(KINETIX_COACH.id === 'coach-kai', 'Coach ID is "coach-kai"');
assert(KINETIX_COACH.name === 'Coach Kai', 'Coach name is "Coach Kai"');
assert(KINETIX_COACH.type === 'digital-fictional', 'Coach type is digital-fictional');
assert(KINETIX_COACH.fictionalEntity === true, 'Coach is explicitly marked as original fictional entity');
assert(KINETIX_COACH.noRealPersonCloned === true, 'Guarantees no real person likeness cloned or used');
assert(typeof KINETIX_COACH.bodyProportions === 'string' && KINETIX_COACH.bodyProportions.length > 0, 'Body proportions specified');
assert(typeof KINETIX_COACH.outfit === 'string' && KINETIX_COACH.outfit.includes('#FF542E'), 'Outfit includes Kinetix brand accent');
assert(KINETIX_COACH.framing === '16:9 full-body athletic framing', '16:9 consistent studio framing specified');
assert(KINETIX_COACH.background.toLowerCase().includes('dark graphite'), 'Standard dark studio environment specified');
assert(COACH_REGISTRY['coach-kai'] === KINETIX_COACH, 'Coach registered in COACH_REGISTRY');

// ----------------------------------------------------
// Test 2: Media Schema Validation
// ----------------------------------------------------
console.log('\nTest 2: Media Schema Validation');
const sampleMedia = PILOT_COACH_MEDIA['air-squat'];
const validationResult = validateCoachMedia(sampleMedia);
assert(validationResult.valid === true, 'Valid pilot media passes schema validation');
assert(validationResult.errors.length === 0, 'No errors on valid pilot media schema');

// ----------------------------------------------------
// Test 3: Missing Media Resilience
// ----------------------------------------------------
console.log('\nTest 3: Missing Media Resilience');
const exWithoutMedia = { id: 'test-no-media', name: 'Unknown Move', movementPattern: 'squat', primaryMuscles: ['quadriceps'] };
const resolvedNoMedia = resolveExerciseWithCoachMedia(exWithoutMedia);
assert(resolvedNoMedia.media && resolvedNoMedia.media.type === 'placeholder', 'Missing media sets safe placeholder type');
const htmlNoMedia = renderExerciseMedia(exWithoutMedia);
assert(htmlNoMedia.includes('player-media-stage'), 'Renders player-media-stage for exercise without media');
assert(htmlNoMedia.includes('exercise-vector-presentation'), 'Renders biomechanical vector presentation on missing media');

// ----------------------------------------------------
// Test 4: Invalid Media Resilience
// ----------------------------------------------------
console.log('\nTest 4: Invalid Media Resilience');
const corruptMediaEx = {
  id: 'corrupt-media-ex',
  name: 'Corrupt Move',
  media: { type: 'invalid-type-123', source: null, poster: 9999 }
};
const htmlCorrupt = renderExerciseMedia(corruptMediaEx);
assert(htmlCorrupt.includes('player-media-stage'), 'Invalid media safely renders player-media-stage');
assert(htmlCorrupt.includes('exercise-bio-svg'), 'Invalid media gracefully falls back to SVG illustration');

// ----------------------------------------------------
// Test 5: Fallback Multi-Tier Resolution Chain
// ----------------------------------------------------
console.log('\nTest 5: Fallback Multi-Tier Resolution Chain');
const pilotSquat = resolveExerciseWithCoachMedia(getExerciseById('air-squat'));
const htmlSquat = renderExerciseMedia(pilotSquat);
assert(htmlSquat.includes('<video'), 'Tier 1: Video tag present for coach-motion');
assert(htmlSquat.includes('exercise-media-fallback'), 'Tier 2: Fallback container present in DOM');
assert(htmlSquat.includes('exercise-media-poster'), 'Tier 3: Poster image fallback present inside container');
assert(htmlSquat.includes('exercise-vector-fallback'), 'Tier 4: Biomechanical SVG vector fallback present');
assert(htmlSquat.includes('onerror='), 'Inline failure handlers trigger fallback on network or decode errors');

// ----------------------------------------------------
// Test 6: Coach Consistency Metadata Across Pilot
// ----------------------------------------------------
console.log('\nTest 6: Coach Consistency Metadata Across Pilot');
const consistencyCheck = validatePilotConsistency();
assert(consistencyCheck.isValid === true, 'All pilot assets pass strict consistency validation');
assert(consistencyCheck.errors.length === 0, 'Zero consistency errors detected');
assert(consistencyCheck.checkedCount === 8, 'All 8 pilot exercises evaluated');

// ----------------------------------------------------
// Test 7: Pilot Exercise Mapping
// ----------------------------------------------------
console.log('\nTest 7: Pilot Exercise Mapping');
assert(PILOT_EXERCISE_IDS.length === 8, 'Pilot contains exactly 8 movement pattern representatives');
PILOT_EXERCISE_IDS.forEach(exId => {
  const masterEx = getExerciseById(exId);
  assert(Boolean(masterEx), `Pilot exercise [${exId}] exists in master database`);
  const pilotDef = PILOT_COACH_MEDIA[exId];
  assert(Boolean(pilotDef), `Pilot exercise [${exId}] has coach media definition`);
  assert(Boolean(pilotDef.demonstration), `Pilot exercise [${exId}] has demonstration standard`);
  assert(Boolean(pilotDef.demonstration.tempo), `Pilot exercise [${exId}] specifies movement tempo`);
  assert(Boolean(pilotDef.demonstration.startPosition), `Pilot exercise [${exId}] specifies starting posture`);
  assert(Boolean(pilotDef.demonstration.endPosition), `Pilot exercise [${exId}] specifies end position lockout`);
  assert(Boolean(pilotDef.demonstration.primaryFormCue), `Pilot exercise [${exId}] has primary form cue`);
});

// ----------------------------------------------------
// Test 8: Video URL Validation & Sanitization
// ----------------------------------------------------
console.log('\nTest 8: Video URL Validation & Sanitization');
assert(sanitizeMediaUrl('https://assets.kinetix.fit/coach/kai-squat.mp4') !== null, 'Valid HTTPS URL is allowed');
assert(sanitizeMediaUrl('assets/media/coach/kai-squat.mp4') !== null, 'Valid relative asset path is allowed');
assert(sanitizeMediaUrl('javascript:alert(1)') === null, 'Malicious javascript: protocol blocked');
assert(sanitizeMediaUrl('data:text/html,<script>alert(1)</script>') === null, 'Dangerous data:text/html protocol blocked');
assert(sanitizeMediaUrl('vbscript:msgbox(1)') === null, 'Dangerous vbscript: protocol blocked');
assert(sanitizeMediaUrl(null) === null, 'Null URL returns null safely');
assert(sanitizeMediaUrl({}) === null, 'Object URL returns null safely');

// ----------------------------------------------------
// Test 9: Image Fallback Verification
// ----------------------------------------------------
console.log('\nTest 9: Image Fallback Verification');
const imageMediaEx = {
  id: 'image-only-ex',
  name: 'Image Move',
  movementPattern: 'lunge',
  media: {
    type: 'image',
    source: 'assets/media/coach/kai-lunge-poster.webp',
    poster: 'assets/media/coach/kai-lunge-poster.webp'
  }
};
const htmlImageEx = renderExerciseMedia(imageMediaEx);
assert(htmlImageEx.includes('<img'), 'Renders <img> tag for image media type');
assert(htmlImageEx.includes('loading="lazy"'), 'Image has loading="lazy" for mobile performance');
assert(htmlImageEx.includes('onerror='), 'Image includes onerror fallback handler');

// ----------------------------------------------------
// Test 10: SVG Fallback Preservation
// ----------------------------------------------------
console.log('\nTest 10: SVG Fallback Preservation');
const patterns = ['squat', 'horizontal-push', 'vertical-pull', 'hinge', 'lunge', 'isolation', 'core', 'cardio'];
patterns.forEach(pat => {
  const svg = getBiomechanicalIllustration(pat, ['quadriceps']);
  assert(svg.includes('<svg') && svg.includes('viewBox="0 0 160 120"'), `SVG rendered for pattern [${pat}] with valid viewBox`);
});

// ----------------------------------------------------
// Test 11: Workout Player Integration
// ----------------------------------------------------
console.log('\nTest 11: Workout Player Integration');
const playerContainer = new MockElement('div');
renderWorkoutPlayer(playerContainer, 'metabolic-ignition');
const playerHtml = playerContainer.innerHTML;
assert(playerHtml.includes('player-media-stage'), 'Workout player renders coach media stage');
assert(playerHtml.includes('btn-player-exercise-guide'), 'Workout player includes Coach Guide CTA button');
assert(playerHtml.includes('Coach Guide'), 'Coach Guide button label is visible');

// ----------------------------------------------------
// Test 12: Exercise Detail Integration
// ----------------------------------------------------
console.log('\nTest 12: Exercise Detail Integration');
const squatEx = getExerciseById('air-squat');
showExerciseDetailModal(squatEx);
const modalHtml = globalThis.document.body.innerHTML;
assert(modalHtml.includes('exercise-detail-modal'), 'Detail modal rendered in DOM');
assert(modalHtml.includes('Coach Kai'), 'Modal includes Coach Kai identity badge');
assert(modalHtml.includes('Demonstration Standard'), 'Modal includes Demonstration Standard card');
assert(modalHtml.includes('Starting Posture:'), 'Modal breaks down starting posture');
assert(modalHtml.includes('Movement Trajectory:'), 'Modal breaks down movement trajectory');
assert(modalHtml.includes('Contraction & Lockout:'), 'Modal breaks down lockout posture');
assert(modalHtml.includes('Primary Form Cue:'), 'Modal highlights primary form cue');
assert(modalHtml.includes('Avoid Mistake:'), 'Modal provides common mistake warning');

// ----------------------------------------------------
// Test 13: Exercise Library Integration
// ----------------------------------------------------
console.log('\nTest 13: Exercise Library Integration');
const libraryContainer = new MockElement('div');
libraryContainer.innerHTML = `
  <div id="exercises-grid"></div>
  <div id="exercises-count-badge"></div>
`;
renderExerciseLibrary(libraryContainer);
const libraryHtml = libraryContainer.innerHTML;
assert(libraryHtml.includes('exercise-card'), 'Exercise Library renders exercise cards');
assert(libraryHtml.includes('exercise-thumb-img'), 'Pilot exercises render thumbnail images');
assert(libraryHtml.includes('Coach Kai'), 'Pilot exercise cards display Coach Kai badge');
assert(libraryHtml.includes('exercise-thumb-svg'), 'Cards include hidden SVG fallback for thumbnails');

// ----------------------------------------------------
// Test 14: Lazy-Loading & Preload Policy
// ----------------------------------------------------
console.log('\nTest 14: Lazy-Loading & Preload Policy');
assert(htmlSquat.includes('preload="none"'), 'Video uses preload="none" to prevent bandwidth bloat');
assert(htmlSquat.includes('playsinline'), 'Video includes playsinline for seamless mobile playback');
assert(htmlSquat.includes('muted'), 'Video includes muted for browser autoplay compliance');
assert(htmlSquat.includes('loop'), 'Video includes loop for continuous form study');
assert(libraryHtml.includes('loading="lazy"'), 'Library thumbnails enforce loading="lazy"');

// ----------------------------------------------------
// Test 15: Corrupted Media Metadata Resilience
// ----------------------------------------------------
console.log('\nTest 15: Corrupted Media Metadata Resilience');
const corruptResult1 = validateCoachMedia(null);
assert(corruptResult1.valid === false && corruptResult1.errors.length > 0, 'Null media returns validation errors');
const corruptResult2 = validateCoachMedia({ type: 'coach-motion', source: 12345, durationSec: -10 });
assert(corruptResult2.valid === false, 'Non-string source and negative duration fail validation');

// ----------------------------------------------------
// Test 16: Full 47-Exercise Database Regression
// ----------------------------------------------------
console.log('\nTest 16: Full 47-Exercise Database Regression');
assert(EXERCISES.length >= 47, `Exercise database contains at least 47 exercises (actual: ${EXERCISES.length})`);
let schemaErrorsCount = 0;
EXERCISES.forEach(ex => {
  const errors = validateExerciseRecord(ex);
  if (errors.length > 0) {
    schemaErrorsCount += errors.length;
    console.error(`Schema error on ${ex.id}:`, errors);
  }
  const resolved = resolveExerciseWithCoachMedia(ex);
  assert(Boolean(resolved && resolved.name), `Exercise [${ex.id}] resolves with coach media`);
  const mediaOutput = renderExerciseMedia(resolved);
  assert(mediaOutput.includes('player-media-stage'), `Exercise [${ex.id}] renders media stage safely`);
});
assert(schemaErrorsCount === 0, 'All 47 exercises pass schema validation with 0 errors');

// ----------------------------------------------------
// Test 17: Phase 8.1 Security Regression (XSS Protection)
// ----------------------------------------------------
console.log('\nTest 17: Phase 8.1 Security Regression (XSS Protection)');
const maliciousEx = {
  id: 'xss-exercise',
  name: '<script>alert("pwned")</script>',
  movementPattern: 'squat"><img src=x onerror=alert(1)>',
  primaryMuscles: ['quadriceps'],
  instructions: ['<script>evil()</script>'],
  formCues: ['"><svg onload=alert(1)>'],
  coach: { name: '<b>Bad Coach</b>' }
};
const xssMediaHtml = renderExerciseMedia(maliciousEx);
assert(!xssMediaHtml.includes('<script>alert("pwned")</script>'), 'Escapes malicious exercise name in media card');
assert(xssMediaHtml.includes('&lt;script&gt;'), 'Encodes script tags as HTML entities');
assert(!xssMediaHtml.includes('<b>Bad Coach</b>'), 'Escapes coach name HTML injection');

showExerciseDetailModal(maliciousEx);
const xssModalHtml = globalThis.document.body.innerHTML;
assert(!xssModalHtml.includes('<script>evil()</script>'), 'Modal escapes malicious instructions');
assert(!xssModalHtml.includes('"><svg onload=alert(1)>'), 'Modal escapes malicious form cues');

// ----------------------------------------------------
// Test 18: Missing Coach Identity Detection
// ----------------------------------------------------
console.log('\nTest 18: Missing Coach Identity Detection');
const mediaNoCoach = {
  ...sampleMedia,
  coachId: null
};
const checkNoCoach = validateCoachMedia(mediaNoCoach);
assert(checkNoCoach.valid === false, 'Media without coachId is recognized as invalid');
assert(checkNoCoach.errors.some(e => e.includes('coachId is required')), 'Flags missing coach identity error');

// ----------------------------------------------------
// Test 19: Wrong / Mismatched Coach Identity Detection
// ----------------------------------------------------
console.log('\nTest 19: Wrong / Mismatched Coach Identity Detection');
const mediaWrongCoach = {
  ...sampleMedia,
  coachId: 'celebrity-trainer-arnold'
};
const checkWrongCoach = validateCoachMedia(mediaWrongCoach);
assert(checkWrongCoach.valid === false, 'Unregistered external coach identity rejected');
assert(checkWrongCoach.errors.some(e => e.includes('Unrecognized coachId')), 'Flags unverified external coach identity');

// ----------------------------------------------------
// Test 20: Duplicate Asset ID Detection
// ----------------------------------------------------
console.log('\nTest 20: Duplicate Asset ID Detection');
const assetIds = new Set();
let hasDuplicates = false;
PILOT_EXERCISE_IDS.forEach(exId => {
  const assetId = PILOT_COACH_MEDIA[exId].provenance.assetId;
  if (assetIds.has(assetId)) {
    hasDuplicates = true;
  }
  assetIds.add(assetId);
});
assert(!hasDuplicates, 'All 8 pilot assets have unique asset IDs in provenance registry');
assert(assetIds.size === 8, 'Provenance registry tracks 8 distinct verified asset IDs');

console.log('\n====================================================');
console.log(`TOTAL PHASE 9 TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 20 PHASE 9 TEST SCENARIOS PASSED WITH ZERO FAILURES!\n');
}
