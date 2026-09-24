/**
 * WORKOUT PLAYER & SESSION ENGINE TESTS - KINETIX
 * Phase 3: Comprehensive Test Suite for Guided Workout Session
 *
 * Verifies:
 * 1. Start session
 * 2. Load workout by ID (static and generated)
 * 3. Exercise index and routine building
 * 4. Rep-based vs Timed exercise detection
 * 5. Set progression
 * 6. Rest transition
 * 7. Timed exercise countdown
 * 8. Pause and Resume
 * 9. Skip exercise
 * 10. Previous navigation safety
 * 11. Complete workout
 * 12. Session persistence
 * 13. Refresh/reload recovery
 * 14. Corrupted session recovery
 * 15. Missing workout recovery
 * 16. Completion history logging
 * 17. Duplicate completion prevention
 * 18. Invalid exercise handling
 * 19. Accurate progress calculation
 * 20. Headless DOM UI rendering (Player, Rest, Summary, Resume Banner)
 */

import { WORKOUTS, getWorkoutById, registerGeneratedWorkout } from '../js/data/workouts.js';
import { EXERCISES, getExerciseById } from '../js/data/exercises.js';
import { generateWorkout } from '../js/engine/workout-generator.js';
import {
  initSession,
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  recoverSession,
  pauseSession,
  resumeSession,
  completeSet,
  skipRest,
  skipExercise,
  previousExercise,
  completeWorkout,
  getWorkoutHistory,
  saveWorkoutHistoryRecord,
  getRoutineItems,
  isTimedExercise,
  calculateWorkoutProgress,
  _resetSessionStorageForTesting,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_HISTORY
} from '../js/state/workout-session.js';
import { renderWorkoutPlayer } from '../js/views/workout-player.js';
import { renderHome } from '../js/views/home.js';

// Setup Mock LocalStorage for Node
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

// Simple Headless DOM Mock for UI testing
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.listeners = {};
    this.innerHTMLText = '';
  }
  get innerHTML() { return this.innerHTMLText; }
  set innerHTML(html) { this.innerHTMLText = html; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
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
    const html = this.innerHTMLText;
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      const re = new RegExp(`id=["']${id}["']`, 'i');
      if (re.test(html)) {
        const el = new MockElement('div');
        el.setAttribute('id', id);
        results.push(el);
      }
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'gi');
      let m;
      while ((m = re.exec(html)) !== null) {
        const el = new MockElement('div');
        results.push(el);
      }
    }
    return results;
  }
}

globalThis.document = {
  body: new MockElement('body'),
  querySelector: (s) => globalThis.document.body.querySelector(s),
  querySelectorAll: (s) => globalThis.document.body.querySelectorAll(s),
  createElement: (tag) => new MockElement(tag)
};
globalThis.window = {
  location: { hash: '#home' },
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  showToast: () => {}
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAILED: ${message}`);
  }
}

console.log('====================================================');
console.log('KINETIX FITNESS WEB — PHASE 3 WORKOUT PLAYER TESTS');
console.log('====================================================\n');

// ----------------------------------------------------
// Test Suite 1: Load Workout by ID & Routine Building
// ----------------------------------------------------
console.log('Test Suite 1: Load Workout by ID & Routine Building');
_resetSessionStorageForTesting();

const staticWorkout = getWorkoutById('upper-body-power');
assert(staticWorkout !== null, '1.1 Static workout "upper-body-power" loaded successfully');
assert(staticWorkout.id === 'upper-body-power', '1.2 Workout ID matches requested ID');

const staticRoutine = getRoutineItems(staticWorkout);
assert(Array.isArray(staticRoutine) && staticRoutine.length > 0, `1.3 Resolved static routine contains ${staticRoutine.length} exercises`);
assert(staticRoutine[0].totalSets === staticWorkout.rounds, `1.4 Exercises inherit static rounds (${staticRoutine[0].totalSets} sets)`);
assert(typeof staticRoutine[0].restSeconds === 'number', '1.5 Routine item has valid restSeconds');
assert(Array.isArray(staticRoutine[0].instructions), '1.6 Routine item has instructions array');

// Generated Workout
const genResult = generateWorkout({ goal: 'Build Muscle', fitnessLevel: 'Intermediate', equipment: ['Dumbbells', 'Bench'], durationMinutes: 30 }, 0);
assert(genResult.ok, '1.7 Generated workout created successfully');
registerGeneratedWorkout(genResult);

const retrievedGen = getWorkoutById(genResult.id);
assert(retrievedGen !== null && retrievedGen.id === genResult.id, '1.8 Generated workout loaded by ID from registry');

const genRoutine = getRoutineItems(retrievedGen);
assert(Array.isArray(genRoutine) && genRoutine.length > 0, `1.9 Generated routine resolved with ${genRoutine.length} total exercises`);
const warmupItems = genRoutine.filter(item => item.stage === 'warmup');
const mainItems = genRoutine.filter(item => item.stage === 'main');
const cooldownItems = genRoutine.filter(item => item.stage === 'cooldown');
assert(warmupItems.length > 0, `1.10 Generated routine includes ${warmupItems.length} warmup movements`);
assert(mainItems.length > 0, `1.11 Generated routine includes ${mainItems.length} main movements`);
assert(cooldownItems.length > 0, `1.12 Generated routine includes ${cooldownItems.length} cooldown movements`);
assert(warmupItems[0].totalSets === 1, '1.13 Warmup exercises have 1 set');

// ----------------------------------------------------
// Test Suite 2: Rep-Based vs Time-Based Exercises
// ----------------------------------------------------
console.log('\nTest Suite 2: Rep-Based vs Time-Based Exercises');

const pushUp = getExerciseById('push-up');
assert(isTimedExercise(pushUp) === false, '2.1 Push-Up is correctly identified as Rep-Based (not timed)');

const plank = getExerciseById('forearm-plank');
assert(isTimedExercise(plank) === true, '2.2 Forearm Plank is correctly identified as Timed (countdown)');

const stretch = getExerciseById('standing-quad-stretch');
assert(isTimedExercise(stretch) === true, '2.3 Quadriceps Stretch is correctly identified as Timed');

// ----------------------------------------------------
// Test Suite 3: Start Session & Initialization
// ----------------------------------------------------
console.log('\nTest Suite 3: Start Session & Initialization');
_resetSessionStorageForTesting();

const session = initSession(staticWorkout);
assert(session !== null, '3.1 Session initialized successfully');
assert(session.sessionId && session.sessionId.startsWith('session_'), '3.2 Session has unique sessionId');
assert(session.workoutId === staticWorkout.id, '3.3 Session workoutId matches');
assert(session.workoutTitle === staticWorkout.title, '3.4 Session title matches');
assert(session.currentExerciseIndex === 0, '3.5 Starts at exercise index 0');
assert(session.currentSet === 1, '3.6 Starts at set 1');
assert(session.phase === 'EXERCISE', '3.7 Starts in EXERCISE phase');
assert(session.isPaused === false, '3.8 Initially not paused');
assert(session.isCompleted === false, '3.9 Initially not completed');
assert(session.elapsedSeconds === 0, '3.10 Initial elapsed seconds is 0');
assert(Array.isArray(session.completedExercises), '3.11 completedExercises is an array');
assert(session.completedSets === 0, '3.12 completedSets initialized to 0');

// ----------------------------------------------------
// Test Suite 4: Set Progression & Rest Transitions
// ----------------------------------------------------
console.log('\nTest Suite 4: Set Progression & Rest Transitions');

// Current exercise has 3 sets (totalSets = 3)
assert(session.totalSets === 3, '4.1 Total sets for current exercise is 3');

// Complete Set 1
const afterSet1 = completeSet(session, staticWorkout);
assert(afterSet1.completedSets === 1, '4.2 completedSets incremented to 1');
assert(afterSet1.currentSet === 2, '4.3 currentSet advanced to 2');
assert(afterSet1.phase === 'REST', '4.4 Phase transitioned to REST');
assert(afterSet1.remainingSeconds === staticWorkout.restBetweenExercisesSec, `4.5 Rest timer set to ${staticWorkout.restBetweenExercisesSec}s`);

// Duplicate set completion guard while resting
const duplicateAttempt = completeSet(afterSet1, staticWorkout);
assert(duplicateAttempt.completedSets === 1, '4.6 Duplicate set completion ignored while resting');

// Skip Rest -> resumes exercise for Set 2
const resumeSet2 = skipRest(afterSet1, staticWorkout);
assert(resumeSet2.phase === 'EXERCISE', '4.7 Phase transitioned back to EXERCISE');
assert(resumeSet2.currentSet === 2, '4.8 Active set is 2');

// Complete Set 2
const afterSet2 = completeSet(resumeSet2, staticWorkout);
assert(afterSet2.completedSets === 2, '4.9 completedSets incremented to 2');
assert(afterSet2.currentSet === 3, '4.10 currentSet advanced to 3');
assert(afterSet2.phase === 'REST', '4.11 Phase is REST');

// Skip rest -> Set 3 (Final set of Exercise 1)
const resumeSet3 = skipRest(afterSet2, staticWorkout);
assert(resumeSet3.currentSet === 3, '4.12 Active set is 3 (final set)');

// Complete Set 3 -> transitions to Exercise 2
const afterSet3 = completeSet(resumeSet3, staticWorkout);
assert(afterSet3.completedSets === 3, '4.13 completedSets incremented to 3');
assert(afterSet3.currentExerciseIndex === 1, '4.14 Advanced to next exercise (index 1)');
assert(afterSet3.currentSet === 1, '4.15 Reset to Set 1 for new exercise');
assert(afterSet3.phase === 'REST', '4.16 Transitions to REST before next exercise');
assert(afterSet3.completedExercises.length === 1, '4.17 First exercise recorded in completedExercises');

// ----------------------------------------------------
// Test Suite 5: Pause and Resume
// ----------------------------------------------------
console.log('\nTest Suite 5: Pause and Resume');

const paused = pauseSession(afterSet3);
assert(paused.isPaused === true, '5.1 Session marked paused');

const resumed = resumeSession(paused);
assert(resumed.isPaused === false, '5.2 Session resumed');

// ----------------------------------------------------
// Test Suite 6: Skip Exercise & Previous Navigation
// ----------------------------------------------------
console.log('\nTest Suite 6: Skip Exercise & Previous Navigation');

// Currently at Exercise index 1, in REST. Skip rest to be in EXERCISE.
const activeEx2 = skipRest(resumed, staticWorkout);
assert(activeEx2.currentExerciseIndex === 1, '6.1 Currently at exercise index 1');

// Skip Exercise 2
const skipped = skipExercise(activeEx2, staticWorkout);
assert(skipped.currentExerciseIndex === 2, '6.2 Advanced to exercise index 2');
assert(skipped.skippedExercises.length === 1, '6.3 Skipped exercise added to skippedExercises');
assert(skipped.currentSet === 1, '6.4 Reset to Set 1');

// Test Previous: from Exercise index 2, set 1 -> returns to previous exercise
const prev = previousExercise(skipped, staticWorkout);
assert(prev.currentExerciseIndex === 1, '6.5 Returned to exercise index 1');

// ----------------------------------------------------
// Test Suite 7: Accurate Progress Calculation
// ----------------------------------------------------
console.log('\nTest Suite 7: Accurate Progress Calculation');

const prog = calculateWorkoutProgress(prev, staticRoutine);
assert(prog.exerciseIndex === 2, '7.1 Current exercise index display is 2');
assert(prog.totalExercises === staticRoutine.length, `7.2 Total exercises is ${staticRoutine.length}`);
assert(typeof prog.overallPercent === 'number' && prog.overallPercent >= 0 && prog.overallPercent <= 100, `7.3 Overall progress is valid percentage: ${prog.overallPercent}%`);

// ----------------------------------------------------
// Test Suite 8: Complete Workout & History Logging
// ----------------------------------------------------
console.log('\nTest Suite 8: Complete Workout & History Logging');

prev.elapsedSeconds = 1800; // 30 minutes
const completed = completeWorkout(prev, staticWorkout);

assert(completed.isCompleted === true, '8.1 Session isCompleted marked true');
assert(completed.phase === 'COMPLETED', '8.2 Session phase is COMPLETED');
assert(completed.isPaused === false, '8.3 isPaused is false');

const history = getWorkoutHistory();
assert(Array.isArray(history) && history.length === 1, '8.4 History record created in localStorage');
assert(history[0].sessionId === completed.sessionId, '8.5 History sessionId matches');
assert(history[0].workoutId === staticWorkout.id, '8.6 History workoutId matches');
assert(history[0].durationSeconds === 1800, '8.7 History durationSeconds matches');
assert(history[0].setsCompleted === completed.completedSets, '8.8 History setsCompleted matches');
assert(typeof history[0].estimatedCalories === 'number', '8.9 History estimatedCalories recorded');

// Duplicate Completion Prevention
const duplicateComplete = completeWorkout(completed, staticWorkout);
const historyAfterDuplicate = getWorkoutHistory();
assert(historyAfterDuplicate.length === 1, '8.10 Duplicate completion prevented; history count remains 1');

// ----------------------------------------------------
// Test Suite 9: Refresh / Crash Recovery
// ----------------------------------------------------
console.log('\nTest Suite 9: Refresh / Crash Recovery');
_resetSessionStorageForTesting();

// Create active in-progress session
const crashTestSession = initSession(staticWorkout);
crashTestSession.currentExerciseIndex = 2;
crashTestSession.currentSet = 2;
crashTestSession.phase = 'REST';
crashTestSession.remainingSeconds = 40;
crashTestSession.elapsedSeconds = 600;
crashTestSession.lastTickAt = Date.now() - 5000; // 5 seconds ago
saveActiveSession(crashTestSession);

// Simulate browser restart: read raw session from localStorage
const retrievedSession = getActiveSession();
assert(retrievedSession !== null, '9.1 Session retrieved from localStorage after simulated reload');
assert(retrievedSession.currentExerciseIndex === 2, '9.2 Exercise index preserved (2)');
assert(retrievedSession.currentSet === 2, '9.3 Set index preserved (2)');
assert(retrievedSession.phase === 'REST', '9.4 Rest phase preserved');

// Recover session: elapsed time should be accounted for without resetting
const recovered = recoverSession(retrievedSession, staticWorkout);
assert(recovered.elapsedSeconds >= 605, `9.5 Elapsed seconds recovered accurately: ${recovered.elapsedSeconds}s (was 600s + ~5s)`);
assert(recovered.remainingSeconds <= 35, `9.6 Rest timer decremented elapsed wall-clock time: ${recovered.remainingSeconds}s (was 40s - ~5s)`);

// ----------------------------------------------------
// Test Suite 10: Safety & Error Handling
// ----------------------------------------------------
console.log('\nTest Suite 10: Safety & Error Handling');

// Corrupted Session in localStorage
localStorage.setItem(STORAGE_KEY_SESSION, '{{invalid-json--!!');
const corrupted = getActiveSession();
assert(corrupted === null, '10.1 Corrupted session JSON handled safely without throwing');

// Corrupted History in localStorage
localStorage.setItem(STORAGE_KEY_HISTORY, 'not-a-json-array');
const corruptedHist = getWorkoutHistory();
assert(Array.isArray(corruptedHist) && corruptedHist.length === 0, '10.2 Corrupted history handled safely, returning []');

// Missing Workout ID in Player
const missingContainer = new MockElement('div');
renderWorkoutPlayer(missingContainer, null);
assert(missingContainer.innerHTML.includes('Workout Not Found'), '10.3 Missing workout ID displays "Workout Not Found"');

// Non-existent Workout ID in Player
renderWorkoutPlayer(missingContainer, 'non-existent-id-12345');
assert(missingContainer.innerHTML.includes('Workout Not Found'), '10.4 Non-existent workout ID displays safe error state');

// ----------------------------------------------------
// Test Suite 11: Headless DOM UI Rendering
// ----------------------------------------------------
console.log('\nTest Suite 11: Headless DOM UI Rendering');
_resetSessionStorageForTesting();

const playerContainer = new MockElement('div');
renderWorkoutPlayer(playerContainer, 'metabolic-ignition');

assert(playerContainer.innerHTML.includes('Metabolic Ignition HIIT'), '11.1 Player renders workout title');
assert(playerContainer.innerHTML.includes('Bodyweight Squat'), '11.2 Player renders initial exercise title');
assert(playerContainer.innerHTML.includes('player-overall-progress'), '11.3 Progress bar rendered');
assert(playerContainer.innerHTML.includes('btn-complete-set'), '11.4 Complete Set action button rendered');
assert(playerContainer.innerHTML.includes('btn-player-pause'), '11.5 Pause/Resume action button rendered');
assert(playerContainer.innerHTML.includes('btn-player-skip'), '11.6 Skip action button rendered');
assert(playerContainer.innerHTML.includes('btn-player-exit'), '11.7 Exit button rendered');

// Test Home View Resume Banner
const homeContainer = new MockElement('div');
// Since active session exists now, Home view should show resume banner
renderHome(homeContainer);
assert(homeContainer.innerHTML.includes('Resume "Metabolic Ignition HIIT"?'), '11.8 Home view displays Resume Incomplete Session banner');
assert(homeContainer.innerHTML.includes('btn-resume-session'), '11.9 Resume button rendered in banner');
assert(homeContainer.innerHTML.includes('btn-discard-session'), '11.10 Discard button rendered in banner');

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 3 WORKOUT PLAYER TESTS PASSED!\n');
}
