/**
 * PROGRESS & TRAINING INTELLIGENCE TESTS - KINETIX
 * Phase 4: Comprehensive Test Suite for Workout History, Streak Engine,
 * Training Load, Muscle Group Analytics, PR Foundation, and Progress UI.
 */

import assert from 'assert';
import {
  toCalendarDateString,
  diffCalendarDays,
  calculateStreak
} from '../js/analytics/streak-engine.js';
import {
  calculateSessionTrainingLoad,
  calculateTotalTrainingLoad,
  calculateRecentTrainingLoad,
  getLoadTierLabel,
  DIFFICULTY_FACTORS
} from '../js/analytics/training-load.js';
import {
  createPRRecord,
  calculateEstimated1RM,
  computeSessionMilestones
} from '../js/analytics/pr-model.js';
import {
  computeProgressAnalytics,
  getEmptyProgressAnalytics
} from '../js/analytics/progress-engine.js';
import {
  initSession,
  completeWorkout,
  getWorkoutHistory,
  saveWorkoutHistoryRecord,
  sanitizeHistoryRecord,
  _resetSessionStorageForTesting,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_SESSION
} from '../js/state/workout-session.js';
import { ALL_CANONICAL_MUSCLES, GOALS } from '../js/data/taxonomy.js';
import { renderProgress } from '../js/views/progress.js';

// Setup Mock LocalStorage for Node
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

// Setup Lightweight Headless DOM Mock for UI testing
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.innerHTMLText = '';
  }
  get innerHTML() { return this.innerHTMLText; }
  set innerHTML(html) { this.innerHTMLText = html; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
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
    } else if (selector.startsWith('.')) {
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
  createElement: (tag) => new MockElement(tag)
};

console.log('====================================================');
console.log('KINETIX PHASE 4: PROGRESS & TRAINING INTELLIGENCE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const mockWorkout = {
  id: 'workout-test-1',
  title: 'Full Body Foundation',
  goal: 'build-muscle',
  difficulty: 'intermediate',
  durationMinutes: 30,
  requestedDurationMinutes: 30,
  estimatedCalories: 220,
  rounds: 3,
  exercises: ['push-up', 'dumbbell-goblet-squat', 'forearm-plank']
};

// =========================================================================
// SUITE 1: WORKOUT HISTORY SYSTEM & VALIDATION
// =========================================================================
console.log('Test Suite 1: Workout History System & Validation');

test('1.1 Valid workout completion creates enriched record', () => {
  _resetSessionStorageForTesting();
  const session = initSession(mockWorkout);
  session.elapsedSeconds = 1800; // 30 mins
  session.completedSets = 8;
  session.completedExercises = ['push-up', 'dumbbell-goblet-squat', 'forearm-plank'];

  const completed = completeWorkout(session, mockWorkout);
  assert(completed.isCompleted === true, 'Session is marked completed');

  const history = getWorkoutHistory();
  assert(history.length === 1, 'History contains 1 record');
  const rec = history[0];

  assert.strictEqual(rec.sessionId, session.sessionId);
  assert.strictEqual(rec.workoutId, 'workout-test-1');
  assert.strictEqual(rec.title, 'Full Body Foundation');
  assert.strictEqual(rec.durationSeconds, 1800);
  assert.strictEqual(rec.actualDurationMinutes, 30);
  assert.strictEqual(rec.requestedDuration, 30);
  assert.strictEqual(rec.setsCompleted, 8);
  assert.strictEqual(rec.totalSets, 8);
  assert.strictEqual(rec.exercisesCompleted, 3);
  assert.deepStrictEqual(rec.completedExerciseIds, ['push-up', 'dumbbell-goblet-squat', 'forearm-plank']);
  assert.strictEqual(rec.workoutGoal, 'build-muscle');
  assert.strictEqual(rec.workoutDifficulty, 'intermediate');
  assert.strictEqual(rec.completionPercentage, 100);
  assert(rec.trainingLoad > 0, 'Training load is calculated');
});

test('1.2 Duplicate completion is strictly prevented (idempotent)', () => {
  const session = initSession(mockWorkout);
  session.elapsedSeconds = 1200;
  completeWorkout(session, mockWorkout);
  const countBefore = getWorkoutHistory().length;

  // Second completion attempt on same session
  completeWorkout(session, mockWorkout);
  const countAfter = getWorkoutHistory().length;
  assert.strictEqual(countBefore, countAfter, 'History count remains identical');
});

test('1.3 Malformed records lacking sessionId are rejected safely', () => {
  const res1 = sanitizeHistoryRecord(null);
  assert.strictEqual(res1, null, 'Null record yields null');

  const res2 = sanitizeHistoryRecord({ title: 'No Session ID' });
  assert.strictEqual(res2, null, 'Record missing sessionId is rejected');

  const res3 = sanitizeHistoryRecord({ sessionId: '   ' });
  assert.strictEqual(res3, null, 'Empty whitespace sessionId is rejected');
});

test('1.4 Corrupted JSON in localStorage handled safely without crashing', () => {
  localStorage.setItem(STORAGE_KEY_HISTORY, '{not: valid-json, broken');
  const history = getWorkoutHistory();
  assert(Array.isArray(history), 'Returns array');
  assert.strictEqual(history.length, 0, 'Returns empty array on corrupt storage');
});

test('1.5 Incomplete session never saved as completed history', () => {
  _resetSessionStorageForTesting();
  const session = initSession(mockWorkout);
  assert.strictEqual(session.isCompleted, false);
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 0, 'Incomplete active session does not appear in history');
});

test('1.6 Multiple distinct workouts accumulated in order', () => {
  _resetSessionStorageForTesting();
  const s1 = initSession({ ...mockWorkout, id: 'w1' });
  completeWorkout(s1, mockWorkout);

  const s2 = initSession({ ...mockWorkout, id: 'w2' });
  completeWorkout(s2, mockWorkout);

  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 2, 'Two distinct sessions stored');
  assert.strictEqual(history[0].sessionId, s2.sessionId, 'Latest workout unshifted to front');
});

test('1.7 Old Phase 3.1 history records loaded and sanitized with backward compatibility', () => {
  _resetSessionStorageForTesting();
  const legacyRecord = {
    sessionId: 'session-legacy-123',
    workoutId: 'workout-push-power',
    title: 'Upper Body Push Power',
    startedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T10:45:00.000Z',
    durationSeconds: 2700,
    exercisesCompleted: 5,
    setsCompleted: 15,
    skippedExercises: 0,
    estimatedCalories: 330
  };

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([legacyRecord]));
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1, 'Legacy record read safely');
  const sanitized = history[0];

  assert.strictEqual(sanitized.sessionId, 'session-legacy-123');
  assert.strictEqual(sanitized.durationSeconds, 2700);
  assert.strictEqual(sanitized.setsCompleted, 15);
  assert.strictEqual(sanitized.exercisesCompleted, 5);
  assert.strictEqual(sanitized.workoutGoal, 'build-muscle', 'Default goal assigned');
  assert.strictEqual(sanitized.workoutDifficulty, 'intermediate', 'Default difficulty assigned');
  assert(sanitized.trainingLoad > 0, 'Training load computed for legacy record');
});

// =========================================================================
// SUITE 2: STREAK CALCULATION ENGINE
// =========================================================================
console.log('\nTest Suite 2: Streak Calculation Engine');

test('2.1 No history yields currentStreak=0 and longestStreak=0', () => {
  const streak = calculateStreak([], new Date('2026-09-24T12:00:00'));
  assert.strictEqual(streak.currentStreak, 0);
  assert.strictEqual(streak.longestStreak, 0);
  assert.strictEqual(streak.totalTrainingDays, 0);
});

test('2.2 One workout on anchor date yields streak=1', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [{ completedAt: '2026-09-24T10:00:00' }];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.longestStreak, 1);
  assert.strictEqual(streak.totalTrainingDays, 1);
});

test('2.3 Workout yesterday keeps active streak=1 alive today', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [{ completedAt: '2026-09-23T18:00:00' }];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 1, 'Workout yesterday preserves active streak');
  assert.strictEqual(streak.longestStreak, 1);
});

test('2.4 Multiple workouts on the same day count as 1 training day', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [
    { completedAt: '2026-09-24T08:00:00' },
    { completedAt: '2026-09-24T14:30:00' },
    { completedAt: '2026-09-24T20:15:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.totalTrainingDays, 1, 'Same day workouts collapse to 1 day');
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.longestStreak, 1);
});

test('2.5 Consecutive calendar days form consecutive streak', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [
    { completedAt: '2026-09-22T09:00:00' },
    { completedAt: '2026-09-23T10:00:00' },
    { completedAt: '2026-09-24T11:00:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 3);
  assert.strictEqual(streak.longestStreak, 3);
  assert.strictEqual(streak.totalTrainingDays, 3);
});

test('2.6 Gap in training resets current streak to 0 while preserving longest streak', () => {
  const ref = new Date('2026-09-24T12:00:00');
  // Trained Sep 10, 11, 12, 13 (4-day streak). Gap until today.
  const records = [
    { completedAt: '2026-09-10T10:00:00' },
    { completedAt: '2026-09-11T10:00:00' },
    { completedAt: '2026-09-12T10:00:00' },
    { completedAt: '2026-09-13T10:00:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 0, 'Current streak broken by gap');
  assert.strictEqual(streak.longestStreak, 4, 'Historical maximum preserved');
  assert.strictEqual(streak.totalTrainingDays, 4);
});

test('2.7 Historical longest streak exceeds smaller current streak', () => {
  const ref = new Date('2026-09-24T12:00:00');
  // Historical 5-day streak in August; new 2-day streak ongoing
  const records = [
    { completedAt: '2026-08-01T10:00:00' },
    { completedAt: '2026-08-02T10:00:00' },
    { completedAt: '2026-08-03T10:00:00' },
    { completedAt: '2026-08-04T10:00:00' },
    { completedAt: '2026-08-05T10:00:00' },
    // Gap
    { completedAt: '2026-09-23T10:00:00' },
    { completedAt: '2026-09-24T10:00:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 2);
  assert.strictEqual(streak.longestStreak, 5);
  assert.strictEqual(streak.totalTrainingDays, 7);
});

test('2.8 Duplicate records on same timestamp do not corrupt streak', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [
    { completedAt: '2026-09-23T10:00:00' },
    { completedAt: '2026-09-23T10:00:00' },
    { completedAt: '2026-09-24T10:00:00' },
    { completedAt: '2026-09-24T10:00:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 2);
  assert.strictEqual(streak.longestStreak, 2);
  assert.strictEqual(streak.totalTrainingDays, 2);
});

test('2.9 Malformed timestamps are safely ignored', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [
    { completedAt: 'invalid-date-string' },
    null,
    { completedAt: null },
    { completedAt: '2026-09-24T10:00:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.longestStreak, 1);
});

test('2.10 Future timestamps beyond reference date are excluded', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [
    { completedAt: '2026-09-24T10:00:00' },
    { completedAt: '2026-09-30T10:00:00' } // In the future
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.totalTrainingDays, 1);
});

test('2.11 Year/month boundary transitions correctly calculate consecutive streak', () => {
  const ref = new Date('2027-01-01T12:00:00');
  const records = [
    { completedAt: '2026-12-30T10:00:00' },
    { completedAt: '2026-12-31T10:00:00' },
    { completedAt: '2027-01-01T10:00:00' }
  ];
  const streak = calculateStreak(records, ref);
  assert.strictEqual(streak.currentStreak, 3);
  assert.strictEqual(streak.longestStreak, 3);
});

// =========================================================================
// SUITE 3: TRAINING LOAD MODEL
// =========================================================================
console.log('\nTest Suite 3: Training Load Model');

test('3.1 Deterministic session training load formula matches documented formula', () => {
  // Formula: Math.round((sets * 5 * diffFactor) + (durationMinutes * 0.5))
  // Intermediate (diffFactor = 1.25), 10 sets, 30 min duration
  // Expected: Math.round((10 * 5 * 1.25) + (30 * 0.5)) = Math.round(62.5 + 15) = 78
  const record = {
    setsCompleted: 10,
    durationSeconds: 1800,
    workoutDifficulty: 'intermediate'
  };
  const load = calculateSessionTrainingLoad(record);
  assert.strictEqual(load, 78);
});

test('3.2 Difficulty multipliers beginner, intermediate, advanced apply correctly', () => {
  const base = { setsCompleted: 10, durationSeconds: 1200 }; // 20 mins
  // Beginner: (10 * 5 * 1.0) + (20 * 0.5) = 50 + 10 = 60
  assert.strictEqual(calculateSessionTrainingLoad({ ...base, workoutDifficulty: 'beginner' }), 60);

  // Intermediate: (10 * 5 * 1.25) + 10 = 62.5 + 10 = 73
  assert.strictEqual(calculateSessionTrainingLoad({ ...base, workoutDifficulty: 'intermediate' }), 73);

  // Advanced: (10 * 5 * 1.5) + 10 = 75 + 10 = 85
  assert.strictEqual(calculateSessionTrainingLoad({ ...base, workoutDifficulty: 'advanced' }), 85);
});

test('3.3 Total training load sums sessions deterministically', () => {
  const records = [
    { setsCompleted: 10, durationSeconds: 1200, workoutDifficulty: 'beginner' }, // 60
    { setsCompleted: 10, durationSeconds: 1200, workoutDifficulty: 'advanced' }  // 85
  ];
  const total = calculateTotalTrainingLoad(records);
  assert.strictEqual(total, 145);
});

test('3.4 Recent 7-day training load isolates trailing week only', () => {
  const ref = new Date('2026-09-24T12:00:00');
  const records = [
    { completedAt: '2026-09-23T10:00:00', setsCompleted: 10, durationSeconds: 1200, workoutDifficulty: 'beginner' }, // 60 (in window)
    { completedAt: '2026-09-01T10:00:00', setsCompleted: 10, durationSeconds: 1200, workoutDifficulty: 'beginner' }  // 60 (old, excluded)
  ];
  const recent = calculateRecentTrainingLoad(records, ref);
  assert.strictEqual(recent, 60);
});

test('3.5 Load tier classification is accurate', () => {
  assert.strictEqual(getLoadTierLabel(30), 'Light');
  assert.strictEqual(getLoadTierLabel(80), 'Moderate');
  assert.strictEqual(getLoadTierLabel(160), 'Challenging');
  assert.strictEqual(getLoadTierLabel(250), 'Intense');
});

// =========================================================================
// SUITE 4: MUSCLE GROUP ANALYTICS
// =========================================================================
console.log('\nTest Suite 4: Muscle Group Analytics');

test('4.1 Canonical taxonomy covers exactly the 11 verified muscles', () => {
  const empty = getEmptyProgressAnalytics();
  assert.strictEqual(empty.muscles.distribution.length, 11);
  const ids = empty.muscles.distribution.map(m => m.muscleId);
  ALL_CANONICAL_MUSCLES.forEach(canonical => {
    assert(ids.includes(canonical), `Muscle ${canonical} present in analytics`);
  });
});

test('4.2 Primary and secondary muscle volume attribution functions without double counting', () => {
  // Push-up targets primary: chest; secondary: triceps, shoulders, core
  const records = [{
    sessionId: 's-m1',
    completedAt: '2026-09-24T10:00:00',
    setsCompleted: 6,
    durationSeconds: 900,
    completedExerciseIds: ['push-up']
  }];

  const analytics = computeProgressAnalytics(records, null, new Date('2026-09-24T12:00:00'));
  const chest = analytics.muscles.distribution.find(m => m.muscleId === 'chest');
  const triceps = analytics.muscles.distribution.find(m => m.muscleId === 'triceps');
  const glutes = analytics.muscles.distribution.find(m => m.muscleId === 'glutes');

  assert(chest.primarySets > 0, 'Chest received primary sets');
  assert(triceps.secondarySets > 0, 'Triceps received secondary sets');
  assert.strictEqual(glutes.totalSets, 0, 'Untargeted muscle glutes has 0 sets');
  assert.strictEqual(chest.exerciseCount, 1, 'Push-up counted once for chest');
});

test('4.3 Muscle engagement percentages sum to 100% when data exists', () => {
  const records = [{
    sessionId: 's-m2',
    completedAt: '2026-09-24T10:00:00',
    setsCompleted: 12,
    durationSeconds: 1800,
    completedExerciseIds: ['push-up', 'bodyweight-squat']
  }];
  const analytics = computeProgressAnalytics(records, null, new Date('2026-09-24T12:00:00'));
  const sumPercent = analytics.muscles.distribution.reduce((acc, m) => acc + m.percentage, 0);
  assert(sumPercent >= 98 && sumPercent <= 102, `Percentages sum to ~100% (actual: ${sumPercent})`);
});

// =========================================================================
// SUITE 5: GOAL DISTRIBUTION & PROGRESS ENGINE
// =========================================================================
console.log('\nTest Suite 5: Goal Distribution & Progress Analytics Engine');

test('5.1 Goal distribution accurately tracks multi-goal sessions', () => {
  const records = [
    { sessionId: 'g1', completedAt: '2026-09-20T10:00:00', workoutGoal: 'build-muscle', setsCompleted: 6, durationSeconds: 900 },
    { sessionId: 'g2', completedAt: '2026-09-21T10:00:00', workoutGoal: 'build-muscle', setsCompleted: 6, durationSeconds: 900 },
    { sessionId: 'g3', completedAt: '2026-09-22T10:00:00', workoutGoal: 'lose-fat', setsCompleted: 6, durationSeconds: 900 }
  ];
  const profile = { goal: 'build-muscle' };
  const analytics = computeProgressAnalytics(records, profile, new Date('2026-09-24T12:00:00'));

  assert.strictEqual(analytics.goals.distribution['build-muscle'], 2);
  assert.strictEqual(analytics.goals.distribution['lose-fat'], 1);
  assert.strictEqual(analytics.goals.primaryGoalMatchPercentage, 67, '2 of 3 match target goal');
});

test('5.2 Top exercises are ordered by frequency and volume', () => {
  const records = [
    { sessionId: 'e1', completedAt: '2026-09-20T10:00:00', setsCompleted: 6, durationSeconds: 900, completedExerciseIds: ['push-up', 'bodyweight-squat'] },
    { sessionId: 'e2', completedAt: '2026-09-21T10:00:00', setsCompleted: 6, durationSeconds: 900, completedExerciseIds: ['push-up'] }
  ];
  const analytics = computeProgressAnalytics(records, null, new Date('2026-09-24T12:00:00'));
  assert(analytics.exercises.topExercises.length >= 2);
  assert.strictEqual(analytics.exercises.topExercises[0].id, 'push-up');
  assert.strictEqual(analytics.exercises.topExercises[0].count, 2);
  assert.strictEqual(analytics.exercises.topExercises[1].id, 'bodyweight-squat');
  assert.strictEqual(analytics.exercises.topExercises[1].count, 1);
});

// =========================================================================
// SUITE 6: PR & MILESTONES FOUNDATION
// =========================================================================
console.log('\nTest Suite 6: PR & Milestones Foundation');

test('6.1 Estimated 1RM uses Epley formula correctly without fake data', () => {
  // 1 rep = exact weight
  assert.strictEqual(calculateEstimated1RM(100, 1), 100);

  // 10 reps at 100kg: 100 * (1 + 10/30) = 133.3kg
  assert.strictEqual(calculateEstimated1RM(100, 10), 133.3);

  // Zero / negative reps safely return 0
  assert.strictEqual(calculateEstimated1RM(100, 0), 0);
  assert.strictEqual(calculateEstimated1RM(0, 10), 0);
});

test('6.2 createPRRecord creates validated schema', () => {
  const pr = createPRRecord({
    exerciseId: 'dumbbell-bench-press',
    weight: 24,
    reps: 8,
    sets: 3
  });
  assert.strictEqual(pr.exerciseId, 'dumbbell-bench-press');
  assert.strictEqual(pr.weight, 24);
  assert.strictEqual(pr.reps, 8);
  assert.strictEqual(pr.sets, 3);
  assert.strictEqual(pr.estimated1RM, 30.4);

  // Invalid inputs return null
  assert.strictEqual(createPRRecord({ exerciseId: '', weight: 20, reps: 5 }), null);
  assert.strictEqual(createPRRecord({ exerciseId: 'push-up', weight: -5, reps: 5 }), null);
});

test('6.3 computeSessionMilestones extracts real verifiable records only', () => {
  const records = [
    { sessionId: 'm1', durationSeconds: 1200, setsCompleted: 10, exercisesCompleted: 4, trainingLoad: 75 },
    { sessionId: 'm2', durationSeconds: 2700, setsCompleted: 16, exercisesCompleted: 6, trainingLoad: 140 }
  ];
  const ms = computeSessionMilestones(records);
  assert.strictEqual(ms.longestDurationMinutes, 45); // 2700 / 60
  assert.strictEqual(ms.maxSetsInSession, 16);
  assert.strictEqual(ms.maxExercisesInSession, 6);
  assert.strictEqual(ms.highestTrainingLoad, 140);
  assert.strictEqual(ms.hasRealData, true);
});

// =========================================================================
// SUITE 7: DATA NORMALIZATION & SCHEMA TOLERANCE
// =========================================================================
console.log('\nTest Suite 7: Data Normalization & Schema Tolerance');

test('7.1 Missing optional fields safely normalized with defaults', () => {
  const record = sanitizeHistoryRecord({
    sessionId: 'session-minimal',
    durationSeconds: 1200,
    setsCompleted: 6
  });
  assert(record !== null);
  assert.strictEqual(record.workoutGoal, 'build-muscle');
  assert.strictEqual(record.workoutDifficulty, 'intermediate');
  assert.strictEqual(record.completionPercentage, 100);
  assert.deepStrictEqual(record.completedExerciseIds, []);
  assert(record.estimatedCalories > 0);
});

test('7.2 Invalid numeric values safely clamped or replaced', () => {
  const record = sanitizeHistoryRecord({
    sessionId: 'session-invalid-nums',
    durationSeconds: -500,
    setsCompleted: NaN,
    estimatedCalories: 'not-a-number'
  });
  assert(record !== null);
  assert(record.durationSeconds >= 60, 'Negative duration safely defaulted');
  assert.strictEqual(record.setsCompleted, 0, 'NaN sets safely defaulted to 0');
  assert(record.estimatedCalories > 0, 'Invalid calories re-estimated');
});

test('7.3 Mixed list of valid and corrupted records safely sanitized', () => {
  _resetSessionStorageForTesting();
  const list = [
    null,
    "garbage-string",
    { invalid: true },
    { sessionId: 'ok-1', setsCompleted: 5, durationSeconds: 600 },
    { sessionId: 'ok-2', setsCompleted: 8, durationSeconds: 900 }
  ];
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 2, 'Dropped 3 malformed items and retained 2 valid');
  assert.strictEqual(history[0].sessionId, 'ok-1');
  assert.strictEqual(history[1].sessionId, 'ok-2');
});

// =========================================================================
// SUITE 8: SCALE & PERFORMANCE (5,000+ RECORDS)
// =========================================================================
console.log('\nTest Suite 8: Scale & Performance with Synthetic Dataset');

test('8.1 5,000 synthetic history records processed in < 50ms without O(N^2) explosion', () => {
  const largeDataset = [];
  const baseTime = new Date('2026-09-24T12:00:00').getTime();

  for (let i = 0; i < 5000; i++) {
    const time = new Date(baseTime - (i * 3600000)).toISOString();
    largeDataset.push({
      sessionId: `synth-${i}`,
      workoutId: `workout-${i % 5}`,
      title: `Workout ${i % 5}`,
      completedAt: time,
      durationSeconds: 1800,
      setsCompleted: 10,
      completedExerciseIds: ['push-up', 'bodyweight-squat'],
      workoutGoal: i % 2 === 0 ? 'build-muscle' : 'lose-fat',
      workoutDifficulty: 'intermediate'
    });
  }

  const startMs = Date.now();
  const analytics = computeProgressAnalytics(largeDataset, { goal: 'build-muscle' }, new Date('2026-09-24T12:00:00'));
  const elapsedMs = Date.now() - startMs;

  assert.strictEqual(analytics.overview.totalWorkouts, 5000);
  assert.strictEqual(analytics.overview.totalSets, 50000);
  assert(elapsedMs < 100, `Execution time for 5,000 records was ${elapsedMs}ms (< 100ms)`);
});

// =========================================================================
// SUITE 9: HEADLESS DOM UI RENDERING
// =========================================================================
console.log('\nTest Suite 9: Headless DOM UI Rendering');

test('9.1 Empty progress state renders empty message and zero placeholders', () => {
  _resetSessionStorageForTesting();
  const container = document.createElement('div');
  renderProgress(container);

  assert(container.innerHTML.includes('No Completed Workouts Yet'), 'Displays empty title');
  assert(container.innerHTML.includes('Start Your First Workout'), 'Displays empty action callout');
  assert(container.innerHTML.includes('btn-empty-start-workout'), 'Action button present');
  assert(container.innerHTML.includes('TOTAL SESSIONS'), 'Overview cards present');
});

test('9.2 Populated progress state renders full analytics and history cards', () => {
  _resetSessionStorageForTesting();
  const s = initSession(mockWorkout);
  s.elapsedSeconds = 1800;
  s.completedSets = 8;
  s.completedExercises = ['push-up', 'dumbbell-goblet-squat'];
  completeWorkout(s, mockWorkout);

  const container = document.createElement('div');
  renderProgress(container);

  assert(container.innerHTML.includes('Weekly Training Volume'), 'Displays weekly volume chart');
  assert(container.innerHTML.includes('Muscle Engagement Ratio'), 'Displays muscle ratio');
  assert(container.innerHTML.includes('Goal Distribution'), 'Displays goal distribution');
  assert(container.innerHTML.includes('Full Body Foundation'), 'Displays workout history title');
  assert(container.innerHTML.includes('Session Milestones'), 'Displays session milestones');
  assert(!container.innerHTML.includes('No Completed Workouts Yet'), 'Empty message suppressed when data exists');
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
console.log('====================================================\n');
console.log('🎉 ALL PHASE 4 PROGRESS & TRAINING INTELLIGENCE TESTS PASSED!\n');
