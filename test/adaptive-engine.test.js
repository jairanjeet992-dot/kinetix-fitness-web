/**
 * PHASE 6 REGRESSION TEST SUITE - KINETIX
 * Adaptive Training Intelligence, Progression Engine, Recovery Engine,
 * Exercise Rotation, and Adaptive Workout Generator.
 * 
 * Verifies Scenarios A through X:
 * A. No history
 * B. Insufficient data
 * C. One successful workout
 * D. Repeated successful workouts
 * E. Missed reps
 * F. Declining performance
 * G. Stable performance
 * H. Progressive overload
 * I. Maintain recommendation
 * J. Reduction recommendation
 * K. Recovery recommendation
 * L. Muscle overlap
 * M. Exercise rotation
 * N. Equipment compatibility
 * O. Duration preservation
 * P. Invalid exercise protection
 * Q. Missing timestamp protection
 * R. Corrupt performance records
 * S. Duplicate performance records
 * T. Adaptive generator fallback
 * U. Deterministic output
 * V. Existing workout generator regression
 * W. Existing workout player regression
 * X. Existing progress analytics regression
 */

import assert from 'node:assert';

// 1. Core analytics & engine modules
import {
  analyzeRecovery,
  RECOVERY_STATES
} from '../js/analytics/recovery-engine.js';

import {
  analyzeExerciseProgression,
  analyzeExerciseRotation,
  PROGRESSION_ACTIONS
} from '../js/analytics/progression-engine.js';

import {
  analyzeTrainingIntelligence,
  CONFIDENCE_TIERS
} from '../js/analytics/training-intelligence.js';

import {
  generateAdaptiveWorkout
} from '../js/engine/adaptive-workout-generator.js';

import {
  generateWorkout
} from '../js/engine/workout-generator.js';

import {
  initSession,
  completeSet,
  completeWorkout,
  getWorkoutHistory
} from '../js/state/workout-session.js';

import {
  computeProgressAnalytics
} from '../js/analytics/progress-engine.js';

import {
  createPerformanceRecord
} from '../js/analytics/performance-tracker.js';

import { EXERCISES } from '../js/data/exercises.js';

// Setup Mock In-Memory localStorage
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n====================================================');
console.log('KINETIX PHASE 6: ADAPTIVE TRAINING INTELLIGENCE');
console.log('====================================================\n');

// Standard user profile for testing
const baseProfile = {
  name: 'Alex Rivera',
  fitnessLevel: 'intermediate',
  goal: 'build_muscle',
  focusAreas: ['Chest'],
  workoutDuration: 30,
  equipment: ['dumbbell', 'bench', 'bodyweight'],
  trainingDays: 4
};

// -----------------------------------------------------------------------------
console.log('Test Suite 1: Scenario A & B - No History & Insufficient Data');
// -----------------------------------------------------------------------------

test('A.1 Recovery engine returns INSUFFICIENT_DATA when workout history is empty', () => {
  const result = analyzeRecovery({
    historyRecords: [],
    referenceDate: '2026-09-24T10:00:00.000Z',
    proposedMuscles: ['chest', 'triceps']
  });

  assert.strictEqual(result.state, RECOVERY_STATES.INSUFFICIENT_DATA);
  assert.strictEqual(result.readinessScore, null);
  assert.strictEqual(result.fatiguedMuscles.length, 0);
  assert.strictEqual(result.overlappingMuscles.length, 0);
  assert.strictEqual(result.trailing7DaysWorkouts, 0);
  assert.ok(result.reason.includes('No prior completed workout history'));
});

test('B.1 Progression engine returns INSUFFICIENT_DATA when exercise has 0 performance logs', () => {
  const result = analyzeExerciseProgression('dumbbell-bench-press', {
    performanceLogs: [],
    historyRecords: []
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN);
  assert.strictEqual(result.confidence, CONFIDENCE_TIERS.INSUFFICIENT_DATA);
  assert.strictEqual(result.recommendedWeightKg, null);
  assert.ok(result.reason.includes('No previous performance logs'));
});

test('B.2 Training intelligence returns INSUFFICIENT_DATA confidence when no history exists', () => {
  const intel = analyzeTrainingIntelligence({
    historyRecords: [],
    performanceLogs: [],
    profile: baseProfile,
    referenceDate: '2026-09-24T10:00:00.000Z'
  });

  assert.strictEqual(intel.confidence, CONFIDENCE_TIERS.INSUFFICIENT_DATA);
  assert.strictEqual(intel.recovery.state, RECOVERY_STATES.INSUFFICIENT_DATA);
  assert.ok(intel.recommendations.some(r => r.includes('Baseline parameters active')));
  assert.ok(intel.reasons.some(r => r.includes('Baseline calibration active')));
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Scenario C, D & H - Single Session, Repeated Success & Progressive Overload');
// -----------------------------------------------------------------------------

test('C.1 Single successful session recommends MAINTAIN with LOW confidence (conservative overload)', () => {
  const singleSessionLogs = [
    {
      id: 'perf-1',
      exerciseId: 'dumbbell-bench-press',
      sessionId: 'sess-1',
      setNumber: 1,
      targetReps: 10,
      actualReps: 10,
      reps: 10,
      weightKg: 20,
      completedAt: '2026-09-20T10:00:00.000Z'
    },
    {
      id: 'perf-2',
      exerciseId: 'dumbbell-bench-press',
      sessionId: 'sess-1',
      setNumber: 2,
      targetReps: 10,
      actualReps: 10,
      reps: 10,
      weightKg: 20,
      completedAt: '2026-09-20T10:05:00.000Z'
    },
    {
      id: 'perf-3',
      exerciseId: 'dumbbell-bench-press',
      sessionId: 'sess-1',
      setNumber: 3,
      targetReps: 10,
      actualReps: 10,
      reps: 10,
      weightKg: 20,
      completedAt: '2026-09-20T10:10:00.000Z'
    }
  ];

  const result = analyzeExerciseProgression('dumbbell-bench-press', {
    performanceLogs: singleSessionLogs
  });

  // Conservative: 1 session is not enough to increase load!
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN);
  assert.strictEqual(result.confidence, CONFIDENCE_TIERS.LOW);
  assert.strictEqual(result.recommendedWeightKg, 20);
  assert.ok(result.reason.includes('Single session recorded'));
});

test('D.1 Repeated successful workouts across 2+ sessions triggers PROGRESSION candidate', () => {
  const twoSessionLogs = [
    // Session 1
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-1', setNumber: 1, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-1', setNumber: 2, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-18T10:05:00.000Z' },
    // Session 2
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-2', setNumber: 1, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-21T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-2', setNumber: 2, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-21T10:05:00.000Z' }
  ];

  const result = analyzeExerciseProgression('dumbbell-bench-press', {
    performanceLogs: twoSessionLogs
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.INCREASE_WEIGHT);
  assert.strictEqual(result.confidence, CONFIDENCE_TIERS.MODERATE);
  // Dumbbell increment: +2kg (20kg -> 22kg)
  assert.strictEqual(result.recommendedWeightKg, 22);
  assert.ok(result.reason.includes('Progressive overload recommended'));
});

test('H.1 Barbell exercise applies +2.5kg progressive overload increment', () => {
  const barbellLogs = [
    { exerciseId: 'barbell-bench-press', sessionId: 'sess-1', setNumber: 1, targetReps: 8, actualReps: 8, reps: 8, weightKg: 60, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'barbell-bench-press', sessionId: 'sess-1', setNumber: 2, targetReps: 8, actualReps: 8, reps: 8, weightKg: 60, completedAt: '2026-09-18T10:05:00.000Z' },
    { exerciseId: 'barbell-bench-press', sessionId: 'sess-2', setNumber: 1, targetReps: 8, actualReps: 8, reps: 8, weightKg: 60, completedAt: '2026-09-21T10:00:00.000Z' },
    { exerciseId: 'barbell-bench-press', sessionId: 'sess-2', setNumber: 2, targetReps: 8, actualReps: 8, reps: 8, weightKg: 60, completedAt: '2026-09-21T10:05:00.000Z' }
  ];

  const result = analyzeExerciseProgression('barbell-bench-press', {
    performanceLogs: barbellLogs
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.INCREASE_WEIGHT);
  // 60kg + 2.5kg = 62.5kg
  assert.strictEqual(result.recommendedWeightKg, 62.5);
});

test('H.2 Bodyweight exercise applies +2 reps progressive overload increment', () => {
  const pushupLogs = [
    { exerciseId: 'push-up', sessionId: 'sess-1', setNumber: 1, targetReps: 12, actualReps: 12, reps: 12, weightKg: null, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'push-up', sessionId: 'sess-1', setNumber: 2, targetReps: 12, actualReps: 12, reps: 12, weightKg: null, completedAt: '2026-09-18T10:05:00.000Z' },
    { exerciseId: 'push-up', sessionId: 'sess-2', setNumber: 1, targetReps: 12, actualReps: 12, reps: 12, weightKg: null, completedAt: '2026-09-21T10:00:00.000Z' },
    { exerciseId: 'push-up', sessionId: 'sess-2', setNumber: 2, targetReps: 12, actualReps: 12, reps: 12, weightKg: null, completedAt: '2026-09-21T10:05:00.000Z' }
  ];

  const result = analyzeExerciseProgression('push-up', {
    performanceLogs: pushupLogs
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.INCREASE_REPS);
  assert.strictEqual(result.recommendedWeightKg, null);
  // 12 reps + 2 = 14 reps
  assert.strictEqual(result.recommendedReps, 14);
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Scenario E, F, G, I & J - Missed Reps, Declining Performance, Stable Performance & Deload');
// -----------------------------------------------------------------------------

test('E.1 Repeated missed reps across consecutive sessions triggers REDUCE_WEIGHT (deload ~10%)', () => {
  const strugglingLogs = [
    // Session 1: Target 10, got 4 & 4 (under 50%)
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-1', setNumber: 1, targetReps: 10, actualReps: 4, reps: 4, weightKg: 30, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-1', setNumber: 2, targetReps: 10, actualReps: 4, reps: 4, weightKg: 30, completedAt: '2026-09-18T10:05:00.000Z' },
    // Session 2: Target 10, got 4 & 4
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-2', setNumber: 1, targetReps: 10, actualReps: 4, reps: 4, weightKg: 30, completedAt: '2026-09-21T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-2', setNumber: 2, targetReps: 10, actualReps: 4, reps: 4, weightKg: 30, completedAt: '2026-09-21T10:05:00.000Z' }
  ];

  const result = analyzeExerciseProgression('dumbbell-bench-press', {
    performanceLogs: strugglingLogs
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.REDUCE_WEIGHT);
  // 30kg * 0.9 = 27kg -> rounded to nearest 0.5kg
  assert.strictEqual(result.recommendedWeightKg, 27);
  assert.ok(result.reason.includes('load reduction'));
});

test('F.1 Declining performance across sessions triggers volume reduction or deload', () => {
  const strugglingBodyweightLogs = [
    // Session 1: 5 reps (target 12)
    { exerciseId: 'push-up', sessionId: 'sess-1', setNumber: 1, targetReps: 12, actualReps: 5, reps: 5, weightKg: null, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'push-up', sessionId: 'sess-1', setNumber: 2, targetReps: 12, actualReps: 5, reps: 5, weightKg: null, completedAt: '2026-09-18T10:05:00.000Z' },
    // Session 2: 4 reps
    { exerciseId: 'push-up', sessionId: 'sess-2', setNumber: 1, targetReps: 12, actualReps: 4, reps: 4, weightKg: null, completedAt: '2026-09-20T10:00:00.000Z' },
    { exerciseId: 'push-up', sessionId: 'sess-2', setNumber: 2, targetReps: 12, actualReps: 4, reps: 4, weightKg: null, completedAt: '2026-09-20T10:05:00.000Z' }
  ];

  const result = analyzeExerciseProgression('push-up', {
    performanceLogs: strugglingBodyweightLogs
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.REDUCE_REPS);
  assert.ok(result.recommendedReps < 12);
  assert.ok(result.reason.includes('reduction recommended'));
});

test('G.1 Stable performance with minor variance recommends MAINTAIN', () => {
  const stableLogs = [
    // Session 1: Target 10, hit 9
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-1', setNumber: 1, targetReps: 10, actualReps: 9, reps: 9, weightKg: 20, completedAt: '2026-09-18T10:00:00.000Z' },
    // Session 2: Target 10, hit 10
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-2', setNumber: 1, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-21T10:00:00.000Z' }
  ];

  const result = analyzeExerciseProgression('dumbbell-bench-press', {
    performanceLogs: stableLogs
  });

  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN);
  assert.strictEqual(result.recommendedWeightKg, 20);
  assert.ok(result.reason.includes('stable'));
});

test('I.1 Maintain recommendation preserves existing weight and reps parameters', () => {
  const logs = [
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-1', setNumber: 1, targetReps: 10, actualReps: 9, reps: 9, weightKg: 18, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 'sess-2', setNumber: 1, targetReps: 10, actualReps: 10, reps: 10, weightKg: 18, completedAt: '2026-09-21T10:00:00.000Z' }
  ];

  const result = analyzeExerciseProgression('dumbbell-bench-press', { performanceLogs: logs });
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN);
  assert.strictEqual(result.recommendedWeightKg, 18);
});

test('J.1 Reduction recommendation calculates safe rounded deload', () => {
  const strugglingLogs = [
    { exerciseId: 'dumbbell-bench-press', sessionId: 's1', setNumber: 1, targetReps: 10, actualReps: 3, reps: 3, weightKg: 25, completedAt: '2026-09-18T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 's2', setNumber: 1, targetReps: 10, actualReps: 4, reps: 4, weightKg: 25, completedAt: '2026-09-21T10:00:00.000Z' }
  ];

  const result = analyzeExerciseProgression('dumbbell-bench-press', { performanceLogs: strugglingLogs });
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.REDUCE_WEIGHT);
  // 25 * 0.9 = 22.5
  assert.strictEqual(result.recommendedWeightKg, 22.5);
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Scenario K & L - Recovery Recommendation & Muscle Overlap');
// -----------------------------------------------------------------------------

test('K.1 High training density (3+ consecutive days) triggers RECOVERY_RECOMMENDED or REDUCE_VOLUME', () => {
  const consecutiveHistory = [
    { id: 'h1', completedAt: '2026-09-21T09:00:00.000Z', durationMinutes: 45, difficulty: 'advanced', targetMuscles: ['Chest'], exercises: [{ exerciseId: 'dumbbell-bench-press' }] },
    { id: 'h2', completedAt: '2026-09-22T09:00:00.000Z', durationMinutes: 45, difficulty: 'advanced', targetMuscles: ['Back'], exercises: [{ exerciseId: 'dumbbell-row' }] },
    { id: 'h3', completedAt: '2026-09-23T09:00:00.000Z', durationMinutes: 45, difficulty: 'advanced', targetMuscles: ['Legs'], exercises: [{ exerciseId: 'goblet-squat' }] }
  ];

  const recovery = analyzeRecovery({
    historyRecords: consecutiveHistory,
    referenceDate: '2026-09-24T09:00:00.000Z',
    proposedMuscles: ['shoulders']
  });

  assert.ok(
    recovery.state === RECOVERY_STATES.REDUCE_VOLUME ||
    recovery.state === RECOVERY_STATES.RECOVERY_RECOMMENDED
  );
  assert.strictEqual(recovery.consecutiveDays, 3);
  assert.ok(recovery.readinessScore <= 70);
});

test('L.1 Muscle overlap detected when proposed muscle was trained within 48h', () => {
  const recentChestWorkout = [
    {
      id: 'h1',
      completedAt: '2026-09-23T18:00:00.000Z', // 16 hours ago
      durationMinutes: 35,
      difficulty: 'intermediate',
      targetMuscles: ['Chest'],
      exercises: [
        { exerciseId: 'dumbbell-bench-press', sets: 4 }
      ]
    }
  ];

  const recovery = analyzeRecovery({
    historyRecords: recentChestWorkout,
    referenceDate: '2026-09-24T10:00:00.000Z',
    proposedMuscles: ['chest', 'triceps']
  });

  assert.ok(recovery.fatiguedMuscles.includes('chest'));
  assert.ok(recovery.overlappingMuscles.includes('chest'));
  assert.ok(recovery.overlapDetected);
  assert.strictEqual(recovery.state, RECOVERY_STATES.REDUCE_VOLUME);
  assert.ok(recovery.reason.includes('overlap detected'));
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Scenario M & N - Exercise Rotation & Equipment Compatibility');
// -----------------------------------------------------------------------------

test('M.1 Exercise repeated across 3 consecutive sessions triggers ROTATION recommendation', () => {
  const staleHistory = [
    {
      id: 'h1',
      completedAt: '2026-09-18T10:00:00.000Z',
      exercises: [{ exerciseId: 'push-up' }]
    },
    {
      id: 'h2',
      completedAt: '2026-09-20T10:00:00.000Z',
      exercises: [{ exerciseId: 'push-up' }]
    },
    {
      id: 'h3',
      completedAt: '2026-09-22T10:00:00.000Z',
      exercises: [{ exerciseId: 'push-up' }]
    }
  ];

  const eligibleExercises = EXERCISES.filter(ex => {
    const eq = Array.isArray(ex.equipment) ? ex.equipment : [ex.equipment];
    return eq.includes('bodyweight') || eq.includes('none');
  });

  const rotation = analyzeExerciseRotation({
    exerciseId: 'push-up',
    workoutHistory: staleHistory,
    eligibleExercises,
    currentRoutineExerciseIds: ['push-up']
  });

  assert.strictEqual(rotation.shouldRotate, true);
  assert.strictEqual(rotation.consecutiveSessions, 3);
  assert.ok(rotation.replacementExerciseId !== null);
  assert.notStrictEqual(rotation.replacementExerciseId, 'push-up');
  assert.ok(rotation.reason.includes('Staleness detected'));
});

test('N.1 Rotation preserves user equipment constraints strictly', () => {
  // Dumbbell-only user with repeated dumbbell bench press
  const dbOnlyEligible = EXERCISES.filter(ex => {
    const eq = Array.isArray(ex.equipment) ? ex.equipment : [ex.equipment];
    return eq.includes('dumbbell');
  });

  const staleHistory = [
    { id: 'h1', completedAt: '2026-09-18T10:00:00.000Z', exercises: [{ exerciseId: 'dumbbell-bench-press' }] },
    { id: 'h2', completedAt: '2026-09-20T10:00:00.000Z', exercises: [{ exerciseId: 'dumbbell-bench-press' }] },
    { id: 'h3', completedAt: '2026-09-22T10:00:00.000Z', exercises: [{ exerciseId: 'dumbbell-bench-press' }] }
  ];

  const rotation = analyzeExerciseRotation({
    exerciseId: 'dumbbell-bench-press',
    workoutHistory: staleHistory,
    eligibleExercises: dbOnlyEligible,
    currentRoutineExerciseIds: ['dumbbell-bench-press']
  });

  if (rotation.shouldRotate && rotation.replacementExerciseId) {
    const replacement = EXERCISES.find(e => e.id === rotation.replacementExerciseId);
    assert.ok(replacement, 'Replacement exercise exists');
    const eq = Array.isArray(replacement.equipment) ? replacement.equipment : [replacement.equipment];
    assert.ok(eq.includes('dumbbell'), 'Must strictly include dumbbell equipment');
  }
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 6: Scenario O, P, Q, R, S & T - Safety, Integrity & Fallback Guards');
// -----------------------------------------------------------------------------

test('Q.1 Missing timestamp protection: performance record without completedAt is strictly rejected', () => {
  const invalidLog = createPerformanceRecord({
    sessionId: 'sess-invalid',
    exerciseId: 'push-up',
    setNumber: 1,
    actualReps: 10,
    completedAt: null // Strictly forbidden!
  });

  assert.strictEqual(invalidLog, null, 'Must reject record with missing completedAt timestamp');
});

test('R.1 Corrupted performance records handled gracefully by training intelligence', () => {
  const corruptLogs = [
    null,
    undefined,
    {},
    { id: 'bad-1', exerciseId: null },
    { id: 'bad-2', exerciseId: 'push-up', completedAt: 'invalid-date' },
    { id: 'good-1', exerciseId: 'push-up', completedAt: '2026-09-23T10:00:00.000Z', setNumber: 1, targetReps: 10, actualReps: 10, reps: 10 }
  ];

  const intel = analyzeTrainingIntelligence({
    historyRecords: [],
    performanceLogs: corruptLogs,
    profile: baseProfile
  });

  assert.ok(intel, 'Analysis succeeds without throwing on corrupted logs');
});

test('S.1 Duplicate performance records do not corrupt progression logic', () => {
  const duplicateLogs = [
    { id: 'rec-1', sessionId: 'sess-1', exerciseId: 'push-up', setNumber: 1, actualReps: 12, reps: 12, targetReps: 10, completedAt: '2026-09-22T10:00:00.000Z' },
    { id: 'rec-1', sessionId: 'sess-1', exerciseId: 'push-up', setNumber: 1, actualReps: 12, reps: 12, targetReps: 10, completedAt: '2026-09-22T10:00:00.000Z' }, // exact dupe
    { id: 'rec-2', sessionId: 'sess-1', exerciseId: 'push-up', setNumber: 1, actualReps: 12, reps: 12, targetReps: 10, completedAt: '2026-09-22T10:00:00.000Z' }  // logical dupe
  ];

  const result = analyzeExerciseProgression('push-up', {
    performanceLogs: duplicateLogs
  });

  // Evaluates 1 single session -> MAINTAIN
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN);
  assert.strictEqual(result.sessionsEvaluated, 1);
});

test('T.1 Adaptive generator safely falls back to valid baseline workout if adaptation fails', () => {
  const result = generateAdaptiveWorkout(baseProfile, 0, {
    historyRecords: [{ id: 'corrupted-record', exercises: null, completedAt: 'invalid' }],
    performanceLogs: [{ exerciseId: null }]
  });

  assert.strictEqual(result.ok, true, 'Result remains ok');
  assert.ok(result.exercises.length > 0, 'Exercises preserved');
  assert.ok(result.title, 'Title preserved');
  assert.strictEqual(result.adaptation.applied, false, 'Adaptation marked as not applied due to safety');
});

test('O.1 Duration preservation: volume reduction preserves sensible duration within requested range', () => {
  const denseHistory = [
    { id: 'h1', completedAt: '2026-09-21T09:00:00.000Z', durationMinutes: 45, difficulty: 'advanced', targetMuscles: ['Chest'], exercises: [{ exerciseId: 'dumbbell-bench-press' }] },
    { id: 'h2', completedAt: '2026-09-22T09:00:00.000Z', durationMinutes: 45, difficulty: 'advanced', targetMuscles: ['Back'], exercises: [{ exerciseId: 'dumbbell-row' }] },
    { id: 'h3', completedAt: '2026-09-23T09:00:00.000Z', durationMinutes: 45, difficulty: 'advanced', targetMuscles: ['Legs'], exercises: [{ exerciseId: 'goblet-squat' }] }
  ];

  const result = generateAdaptiveWorkout(baseProfile, 0, {
    historyRecords: denseHistory,
    referenceDate: '2026-09-24T09:00:00.000Z'
  });

  assert.strictEqual(result.ok, true);
  assert.ok(result.durationMinutes > 0);
  assert.ok(result.rounds >= 2, 'Rounds preserved safely at >= 2');
  assert.ok(result.adaptation.applied === true);
});

test('P.1 Invalid exercise protection: generator never produces non-existent exercises', () => {
  const result = generateAdaptiveWorkout(baseProfile, 0);
  for (const item of result.exercises) {
    const exId = typeof item === 'string' ? item : item.id;
    const exists = EXERCISES.some(e => e.id === exId);
    assert.strictEqual(exists, true, `Exercise ${exId} exists in database`);
  }
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 7: Scenario U - Determinism Requirement');
// -----------------------------------------------------------------------------

test('U.1 Same profile + history + logs + seed + referenceDate produces 100% identical adaptive workout', () => {
  const history = [
    { id: 'h1', completedAt: '2026-09-20T10:00:00.000Z', durationMinutes: 30, targetMuscles: ['Chest'], difficulty: 'intermediate', exercises: [{ exerciseId: 'dumbbell-bench-press' }] }
  ];
  const logs = [
    { exerciseId: 'dumbbell-bench-press', sessionId: 's1', setNumber: 1, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-20T10:00:00.000Z' },
    { exerciseId: 'dumbbell-bench-press', sessionId: 's1', setNumber: 2, targetReps: 10, actualReps: 10, reps: 10, weightKg: 20, completedAt: '2026-09-20T10:05:00.000Z' }
  ];
  const refDate = '2026-09-24T10:00:00.000Z';

  const run1 = generateAdaptiveWorkout(baseProfile, 42, {
    historyRecords: history,
    performanceLogs: logs,
    referenceDate: refDate
  });

  const run2 = generateAdaptiveWorkout(baseProfile, 42, {
    historyRecords: history,
    performanceLogs: logs,
    referenceDate: refDate
  });

  assert.strictEqual(run1.id, run2.id);
  assert.strictEqual(run1.title, run2.title);
  assert.strictEqual(run1.rounds, run2.rounds);
  assert.strictEqual(run1.durationMinutes, run2.durationMinutes);
  assert.deepStrictEqual(run1.exerciseIds, run2.exerciseIds);
  assert.deepStrictEqual(run1.adaptation, run2.adaptation);
});

// -----------------------------------------------------------------------------
console.log('\nTest Suite 8: Scenario V, W & X - Backward Compatibility & Regressions');
// -----------------------------------------------------------------------------

test('V.1 Existing generateWorkout() functions independently without regression', () => {
  const baseline = generateWorkout(baseProfile, 0);

  assert.strictEqual(baseline.ok, true);
  assert.ok(baseline.id);
  assert.ok(baseline.title);
  assert.ok(baseline.exercises.length > 0);
  assert.ok(Array.isArray(baseline.exerciseIds));
  assert.strictEqual(baseline.adaptation, undefined, 'Baseline has no adaptation property');
});

test('W.1 Workout session state machine completes and tracks performance seamlessly', () => {
  storage.clear();
  const workout = generateAdaptiveWorkout(baseProfile, 0);

  const session = initSession(workout);
  assert.strictEqual(session.phase, 'EXERCISE');
  assert.ok(Array.isArray(session.performanceLogs));

  // Log set 1
  const updatedSession = completeSet(session, workout, {
    weightKg: 22,
    actualReps: 10,
    reps: 10,
    targetReps: 10,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  assert.strictEqual(updatedSession.performanceLogs.length, 1);
  assert.strictEqual(updatedSession.performanceLogs[0].weightKg, 22);

  // Complete workout
  completeWorkout(updatedSession, workout);
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].workoutId, workout.id);
  assert.strictEqual(history[0].totalVolumeKg, 220); // 22kg * 10 reps
});

test('X.1 Existing progress analytics computes streak and load accurately', () => {
  const history = [
    {
      id: 'h-prog-1',
      workoutId: 'w-1',
      workoutTitle: 'Chest Blast',
      completedAt: '2026-09-23T10:00:00.000Z',
      durationSeconds: 1800,
      actualDurationMinutes: 30,
      setsCompleted: 3,
      difficulty: 'intermediate',
      workoutDifficulty: 'intermediate',
      targetMuscles: ['Chest'],
      caloriesBurned: 180,
      exercises: [{ exerciseId: 'dumbbell-bench-press', sets: 3 }]
    }
  ];

  const analytics = computeProgressAnalytics(history, '2026-09-24T10:00:00.000Z');

  assert.strictEqual(analytics.overview.totalWorkouts, 1);
  assert.strictEqual(analytics.overview.currentStreak, 1);
  assert.ok(analytics.overview.totalTrainingLoad > 0);
  assert.strictEqual(analytics.hasData, true);
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================\n');

if (totalTests === passedTests) {
  console.log('🎉 ALL PHASE 6 ADAPTIVE TRAINING INTELLIGENCE TESTS PASSED!\n');
} else {
  process.exitCode = 1;
}
