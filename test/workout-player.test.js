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

// ----------------------------------------------------
// Test Suite 12: Phase 3.1 Hardening Tests (A through T)
// ----------------------------------------------------
console.log('\nTest Suite 12: Phase 3.1 Hardening Tests (Requirements A - T)');
_resetSessionStorageForTesting();

// Create a workout with a timed exercise and rest for precision testing
const timedWorkout = {
  id: 'test-timed-routine',
  title: 'Timed Routine',
  rounds: 2,
  restBetweenExercisesSec: 20,
  exerciseIds: ['forearm-plank', 'push-up'] // forearm-plank is timed (40s), push-up is rep-based
};

// Requirement A: Reload during timed exercise
_resetSessionStorageForTesting();
const sessionA = initSession(timedWorkout); // Starts on forearm-plank (timed 45s)
assert(sessionA.remainingSeconds === 45, '12.A.1 Initial timed exercise countdown is 45s');
sessionA.lastTickAt = Date.now() - 15000; // 15s elapsed while closed
const recoveredA = recoverSession(sessionA, timedWorkout);
assert(recoveredA.remainingSeconds === 30, '12.A.2 Reload during timed exercise leaves 30s remaining (45s - 15s)');
assert(recoveredA.phase === 'EXERCISE', '12.A.3 Phase remains EXERCISE');
assert(recoveredA.elapsedSeconds === 15, '12.A.4 elapsedSeconds increased by 15s');

// Requirement B: Reload during rest
_resetSessionStorageForTesting();
const sessionB = initSession(timedWorkout);
sessionB.phase = 'REST';
sessionB.remainingSeconds = 30;
sessionB.lastTickAt = Date.now() - 10000; // 10s elapsed
const recoveredB = recoverSession(sessionB, timedWorkout);
assert(recoveredB.remainingSeconds === 20, '12.B.1 Reload during rest leaves 20s remaining (30s - 10s)');
assert(recoveredB.phase === 'REST', '12.B.2 Phase remains REST');

// Requirement C: Reload after enough time to cross one phase (landing on rep-based Push-Up)
_resetSessionStorageForTesting();
const sessionC = initSession(timedWorkout);
// Advance to final set of exercise 0 (Set 2 of 2)
sessionC.currentSet = 2;
// Complete final set of forearm-plank -> enters REST before Push-Up (Exercise 1)
completeSet(sessionC, timedWorkout);
assert(sessionC.phase === 'REST', '12.C.0 Enters REST before exercise 1 (Push-Up)');
sessionC.remainingSeconds = 15;
sessionC.lastTickAt = Date.now() - 25000; // 25s elapsed (15s rest + 10s into Push-Up)
const recoveredC = recoverSession(sessionC, timedWorkout);
assert(recoveredC.phase === 'EXERCISE', '12.C.1 Rest expired during absence; transitioned to EXERCISE');
assert(recoveredC.currentExerciseIndex === 1, '12.C.2 Advanced to Exercise index 1 (Push-Up)');
assert(recoveredC.remainingSeconds === 0, '12.C.3 Landed on rep-based exercise with 0s countdown');
assert(recoveredC.elapsedSeconds >= 25, '12.C.4 Full 25s elapsed time accounted for');

// Requirement D: Reload after enough time to cross multiple phases
_resetSessionStorageForTesting();
// Workout with consecutive timed movements
const multiTimedWorkout = {
  id: 'multi-timed-routine',
  title: 'Multi Timed Routine',
  rounds: 1,
  restBetweenExercisesSec: 15,
  exerciseIds: ['forearm-plank', 'standing-quad-stretch'] // both timed (45s and 30s)
};
const sessionD = initSession(multiTimedWorkout);
sessionD.phase = 'EXERCISE';
sessionD.remainingSeconds = 10; // 10s left on forearm-plank
// Total time to elapse: 10s (ex 1) + 15s (rest) + 12s (ex 2) = 37s
sessionD.lastTickAt = Date.now() - 37000;
const recoveredD = recoverSession(sessionD, multiTimedWorkout);
assert(recoveredD.currentExerciseIndex === 1, '12.D.1 Advanced through ex 1 and rest to exercise index 1');
assert(recoveredD.phase === 'EXERCISE', '12.D.2 Currently in EXERCISE phase of second timed movement');
assert(recoveredD.remainingSeconds === 18, `12.D.3 Second timed movement countdown at 18s (was 30s - 12s, actual: ${recoveredD.remainingSeconds}s)`);

// Requirement E: Reload while paused must NOT consume wall-clock time
_resetSessionStorageForTesting();
const sessionE = initSession(timedWorkout);
sessionE.remainingSeconds = 35;
pauseSession(sessionE);
sessionE.lastTickAt = Date.now() - 120000; // 2 minutes elapsed while paused
const recoveredE = recoverSession(sessionE, timedWorkout);
assert(recoveredE.isPaused === true, '12.E.1 Session remains paused');
assert(recoveredE.remainingSeconds === 35, '12.E.2 Countdown preserved exactly (35s); no wall time consumed');
assert(recoveredE.elapsedSeconds === 0, '12.E.3 Elapsed workout time did not advance while paused');

// Requirement F: Reload with malformed timestamps
_resetSessionStorageForTesting();
const sessionF = initSession(timedWorkout);
sessionF.lastTickAt = NaN;
const recoveredF1 = recoverSession(sessionF, timedWorkout);
assert(typeof recoveredF1.lastTickAt === 'number' && !isNaN(recoveredF1.lastTickAt), '12.F.1 NaN timestamp reset safely to now');
sessionF.lastTickAt = Date.now() + 10000000; // Far future timestamp
const recoveredF2 = recoverSession(sessionF, timedWorkout);
assert(recoveredF2.remainingSeconds === 45, '12.F.2 Future timestamp handled safely without state distortion');

// Requirement G: Previous from Set 2
_resetSessionStorageForTesting();
const sessionG = initSession(staticWorkout); // rounds: 3
completeSet(sessionG, staticWorkout); // Set 1 complete -> in REST, currentSet is 2
skipRest(sessionG, staticWorkout); // In EXERCISE, Set 2
assert(sessionG.currentSet === 2 && sessionG.completedSets === 1, '12.G.1 Setup: In Set 2 with completedSets = 1');
const prevG = previousExercise(sessionG, staticWorkout);
assert(prevG.currentSet === 1, '12.G.2 Previous from Set 2 rewinds to Set 1');
assert(prevG.completedSets === 0, '12.G.3 completedSets decremented to 0');
assert(prevG.phase === 'EXERCISE', '12.G.4 Phase is EXERCISE');

// Requirement H: Previous from Set 1 (to previous exercise)
_resetSessionStorageForTesting();
const sessionH = initSession(staticWorkout);
// Complete all 3 sets of Exercise 0 to advance to Exercise 1
completeSet(sessionH, staticWorkout); skipRest(sessionH, staticWorkout);
completeSet(sessionH, staticWorkout); skipRest(sessionH, staticWorkout);
completeSet(sessionH, staticWorkout); skipRest(sessionH, staticWorkout);
assert(sessionH.currentExerciseIndex === 1, '12.H.1 Advanced to exercise index 1');
assert(sessionH.currentSet === 1, '12.H.2 At Set 1 of exercise index 1');
assert(sessionH.completedSets === 3, '12.H.3 completedSets is 3');

const prevH = previousExercise(sessionH, staticWorkout);
assert(prevH.currentExerciseIndex === 0, '12.H.4 Previous from Set 1 rewinds to previous exercise (index 0)');
assert(prevH.currentSet === 3, '12.H.5 Rewinds to final set of previous exercise (Set 3)');
assert(prevH.completedSets === 2, '12.H.6 completedSets decremented to 2');

// Requirement I: Previous after completed exercise removes from completedExercises
assert(!prevH.completedExercises.includes(staticWorkout.exerciseIds[0]), '12.I.1 Previous exercise ID removed from completedExercises upon rewind');

// Requirement J: Replay after Previous does not create duplicate completedExercises
completeSet(prevH, staticWorkout); // Complete set 3 again
assert(prevH.completedExercises.filter(id => id === staticWorkout.exerciseIds[0]).length === 1, '12.J.1 Replaying exercise adds ID exactly once without duplicates');

// Requirement K: completedSets consistency (cannot go negative)
_resetSessionStorageForTesting();
const sessionK = initSession(staticWorkout);
previousExercise(sessionK, staticWorkout);
previousExercise(sessionK, staticWorkout);
assert(sessionK.completedSets === 0, '12.K.1 Repeated Previous calls at start never produce negative completedSets');
assert(sessionK.currentSet === 1, '12.K.2 currentSet remains 1');

// Requirement L: completedExercises consistency
_resetSessionStorageForTesting();
const sessionL = initSession(staticWorkout);
completeSet(sessionL, staticWorkout); skipRest(sessionL, staticWorkout);
completeSet(sessionL, staticWorkout); skipRest(sessionL, staticWorkout);
completeSet(sessionL, staticWorkout); // finished exercise 0
const ex0Id = staticWorkout.exerciseIds[0];
assert(sessionL.completedExercises.includes(ex0Id), '12.L.1 Exercise recorded in completedExercises');
assert(new Set(sessionL.completedExercises).size === sessionL.completedExercises.length, '12.L.2 completedExercises has unique entries only');

// Requirement M: skippedExercises consistency
_resetSessionStorageForTesting();
const sessionM = initSession(staticWorkout);
const skipId = staticWorkout.exerciseIds[0];
skipExercise(sessionM, staticWorkout);
assert(sessionM.skippedExercises.includes(skipId), '12.M.1 Skipped exercise recorded in skippedExercises');
// Previous back to skipped exercise
previousExercise(sessionM, staticWorkout);
assert(!sessionM.skippedExercises.includes(skipId), '12.M.2 Rewinding back to skipped exercise removes it from skippedExercises');

// Requirement N: Progress calculation after rewind
const progAfterRewind = calculateWorkoutProgress(sessionM, staticRoutine);
assert(progAfterRewind.overallPercent >= 0 && progAfterRewind.overallPercent <= 100, `12.N.1 Progress after rewind is valid percentage: ${progAfterRewind.overallPercent}%`);
assert(progAfterRewind.exerciseIndex === 1, '12.N.2 Progress reflects rewound exercise index 1');

// Requirement O: Duplicate completion is idempotent
_resetSessionStorageForTesting();
const sessionO = initSession(staticWorkout);
sessionO.elapsedSeconds = 1200;
const completedO = completeWorkout(sessionO, staticWorkout);
assert(completedO.isCompleted === true, '12.O.1 Initial completion marked true');
const reCompletedO = completeWorkout(completedO, staticWorkout);
assert(reCompletedO.isCompleted === true, '12.O.2 Repeated completion is strictly idempotent');

// Requirement P: Duplicate history prevention
const historyO = getWorkoutHistory();
assert(historyO.filter(h => h.sessionId === sessionO.sessionId).length === 1, '12.P.1 Exactly one history record stored for session');

// Requirement Q: Corrupted history handling
localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([null, "corrupted", { invalid: true }, { sessionId: "valid-1", title: "Test", completedAt: "2026-09-01T10:00:00.000Z" }]));
const sanitizedHistory = getWorkoutHistory();
assert(sanitizedHistory.length === 1, '12.Q.1 Sanitized history filters out invalid records and retains valid entry');
assert(sanitizedHistory[0].sessionId === 'valid-1', '12.Q.2 Retained record has valid sessionId');

// Requirement R: Timer boundary at exactly zero
_resetSessionStorageForTesting();
const sessionR = initSession(timedWorkout);
sessionR.remainingSeconds = 20;
sessionR.lastTickAt = Date.now() - 20000; // Exactly 20s
const recoveredR = recoverSession(sessionR, timedWorkout);
assert(recoveredR.phase === 'REST', '12.R.1 Wall time matching remaining time exactly advances phase cleanly');

// Requirement S: Timer cannot go negative
assert(recoveredR.remainingSeconds >= 0, '12.S.1 remainingSeconds is strictly non-negative');

// Requirement T: Completed session recovery
const sessionT = initSession(staticWorkout);
sessionT.isCompleted = true;
sessionT.lastTickAt = Date.now() - 500000;
const recoveredT = recoverSession(sessionT, staticWorkout);
assert(recoveredT.isCompleted === true, '12.T.1 Completed session is never re-executed or replayed upon recovery');

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 3 & PHASE 3.1 TESTS PASSED!\n');
}
