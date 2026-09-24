/**
 * PHASE 6.1 REGRESSION & ADVERSARIAL HARDENING TEST SUITE - KINETIX
 * Production Hardening & Real-World Validation for Adaptive Training Intelligence:
 *
 * 1. Contradictory Signal Resolution (Recovery vs Progression vs Rotation)
 * 2. Adversarial Progression Engine (Single workout, mixed success/failure, single-set, ceilings, unit consistency, log sanitization)
 * 3. Adversarial Recovery Engine (Same-day workouts, 48h boundary, future timestamps, schema variance, fatigue states)
 * 4. Adversarial Exercise Rotation (Staleness, anti-ping-ponging, equipment constraints)
 * 5. Adaptive Workout Generator Safety Guards (Invalid inputs, duration bounds, durationAccuracy synchronization, fallback safety)
 * 6. UI Unit Consistency (Weight formatting in lb vs kg)
 */

import assert from 'node:assert';

// Core analytics & engine modules
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
  formatWeight,
  createPerformanceRecord
} from '../js/analytics/performance-tracker.js';

import { EXERCISES, getExerciseById } from '../js/data/exercises.js';

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
console.log('KINETIX PHASE 6.1: ADAPTIVE TRAINING HARDENING');
console.log('====================================================\n');

const baseProfile = {
  name: 'Jordan Lee',
  fitnessLevel: 'intermediate',
  goal: 'build_muscle',
  focusAreas: ['Chest', 'Arms'],
  workoutDuration: 30,
  equipment: ['dumbbell', 'bench', 'bodyweight'],
  trainingDays: 4,
  unitPreference: 'kg'
};

// -----------------------------------------------------------------------------
console.log('Test Suite 1: Contradictory Signal Resolution & Priority Hierarchy');
// -----------------------------------------------------------------------------

test('1.1 RECOVERY_RECOMMENDED de-escalates progression to MAINTAIN', () => {
  const refDate = new Date('2026-06-10T12:00:00Z');
  // High fatigue history (consecutive heavy days)
  const historyRecords = [
    {
      id: 'sess-1',
      date: new Date('2026-06-09T18:00:00Z').toISOString(),
      durationMinutes: 45,
      completedExerciseIds: ['dumbbell-bench-press', 'push-up']
    },
    {
      id: 'sess-2',
      date: new Date('2026-06-08T18:00:00Z').toISOString(),
      durationMinutes: 45,
      completedExerciseIds: ['dumbbell-bench-press', 'push-up']
    },
    {
      id: 'sess-3',
      date: new Date('2026-06-07T18:00:00Z').toISOString(),
      durationMinutes: 45,
      completedExerciseIds: ['dumbbell-bench-press', 'push-up']
    }
  ];

  // Strong progression logs that would normally trigger INCREASE_WEIGHT
  const performanceLogs = [
    {
      id: 'log-1',
      sessionId: 'sess-1',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 1,
      weightKg: 20,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-09T18:10:00Z').toISOString()
    },
    {
      id: 'log-2',
      sessionId: 'sess-1',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 2,
      weightKg: 20,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-09T18:15:00Z').toISOString()
    },
    {
      id: 'log-3',
      sessionId: 'sess-2',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 1,
      weightKg: 20,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-08T18:10:00Z').toISOString()
    },
    {
      id: 'log-4',
      sessionId: 'sess-2',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 2,
      weightKg: 20,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-08T18:15:00Z').toISOString()
    }
  ];

  const intelligence = analyzeTrainingIntelligence({
    historyRecords,
    performanceLogs,
    profile: baseProfile,
    referenceDate: refDate
  });

  assert(
    intelligence.readiness.status === RECOVERY_STATES.RECOVERY_RECOMMENDED ||
    intelligence.readiness.status === RECOVERY_STATES.REDUCE_VOLUME,
    'Readiness reflects high fatigue'
  );

  const benchCandidate = intelligence.progression.candidateExercises.find(c => c.exerciseId === 'dumbbell-bench-press');
  assert(benchCandidate, 'Candidate exists');
  // Must be de-escalated to MAINTAIN!
  assert.strictEqual(benchCandidate.action, PROGRESSION_ACTIONS.MAINTAIN, 'De-escalated to MAINTAIN during recovery');
  assert.strictEqual(benchCandidate.adaptationApplied, false, 'No progressive overload applied during high recovery need');
  assert(benchCandidate.reason.includes('Recovery priority'), 'Explanation mentions recovery priority');
});

test('1.2 REDUCE_VOLUME with muscle overlap de-escalates overlapping exercises to MAINTAIN', () => {
  const refDate = new Date('2026-06-10T12:00:00Z');
  // Session yesterday trained chest
  const historyRecords = [
    {
      id: 'sess-chest',
      date: new Date('2026-06-09T16:00:00Z').toISOString(),
      durationMinutes: 40,
      completedExerciseIds: ['dumbbell-bench-press']
    }
  ];

  // Strong progression on dumbbell-bench-press
  const performanceLogs = [
    {
      id: 'log-1',
      sessionId: 'sess-prev1',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 1,
      weightKg: 22,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-07T16:00:00Z').toISOString()
    },
    {
      id: 'log-2',
      sessionId: 'sess-prev1',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 2,
      weightKg: 22,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-07T16:05:00Z').toISOString()
    },
    {
      id: 'log-3',
      sessionId: 'sess-chest',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 1,
      weightKg: 22,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-09T16:00:00Z').toISOString()
    },
    {
      id: 'log-4',
      sessionId: 'sess-chest',
      exerciseId: 'dumbbell-bench-press',
      setNumber: 2,
      weightKg: 22,
      targetReps: 10,
      reps: 10,
      completedAt: new Date('2026-06-09T16:05:00Z').toISOString()
    }
  ];

  // Proposed workout targets Chest
  const proposedWorkout = {
    id: 'test-chest-wkt',
    exercises: [getExerciseById('dumbbell-bench-press') || { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', muscleGroups: ['chest'] }]
  };

  const intelligence = analyzeTrainingIntelligence({
    historyRecords,
    performanceLogs,
    profile: baseProfile,
    referenceDate: refDate,
    proposedWorkout
  });

  const benchCandidate = intelligence.progression.candidateExercises.find(c => c.exerciseId === 'dumbbell-bench-press');
  assert(benchCandidate, 'Bench candidate analyzed');
  assert.strictEqual(benchCandidate.action, PROGRESSION_ACTIONS.MAINTAIN, 'Overlapping muscle de-escalates to MAINTAIN under fatigue');
});

test('1.3 Exercise rotation supersedes progressive overload for rotated exercise', () => {
  const refDate = new Date('2026-06-10T12:00:00Z');
  // Exercise repeated in 3 consecutive sessions
  const historyRecords = [
    {
      id: 'sess-3',
      date: new Date('2026-06-08T10:00:00Z').toISOString(),
      durationMinutes: 30,
      completedExerciseIds: ['dumbbell-bench-press']
    },
    {
      id: 'sess-2',
      date: new Date('2026-06-05T10:00:00Z').toISOString(),
      durationMinutes: 30,
      completedExerciseIds: ['dumbbell-bench-press']
    },
    {
      id: 'sess-1',
      date: new Date('2026-06-02T10:00:00Z').toISOString(),
      durationMinutes: 30,
      completedExerciseIds: ['dumbbell-bench-press']
    }
  ];

  // Logs show successful hits across sessions
  const performanceLogs = [
    { id: 'l1', sessionId: 'sess-1', exerciseId: 'dumbbell-bench-press', setNumber: 1, weightKg: 20, targetReps: 10, reps: 10, completedAt: '2026-06-02T10:10:00Z' },
    { id: 'l2', sessionId: 'sess-1', exerciseId: 'dumbbell-bench-press', setNumber: 2, weightKg: 20, targetReps: 10, reps: 10, completedAt: '2026-06-02T10:15:00Z' },
    { id: 'l3', sessionId: 'sess-2', exerciseId: 'dumbbell-bench-press', setNumber: 1, weightKg: 20, targetReps: 10, reps: 10, completedAt: '2026-06-05T10:10:00Z' },
    { id: 'l4', sessionId: 'sess-2', exerciseId: 'dumbbell-bench-press', setNumber: 2, weightKg: 20, targetReps: 10, reps: 10, completedAt: '2026-06-05T10:15:00Z' },
    { id: 'l5', sessionId: 'sess-3', exerciseId: 'dumbbell-bench-press', setNumber: 1, weightKg: 20, targetReps: 10, reps: 10, completedAt: '2026-06-08T10:10:00Z' },
    { id: 'l6', sessionId: 'sess-3', exerciseId: 'dumbbell-bench-press', setNumber: 2, weightKg: 20, targetReps: 10, reps: 10, completedAt: '2026-06-08T10:15:00Z' }
  ];

  const proposedWorkout = {
    id: 'test-wkt',
    exercises: [getExerciseById('dumbbell-bench-press') || { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', muscleGroups: ['chest'] }]
  };

  const intelligence = analyzeTrainingIntelligence({
    historyRecords,
    performanceLogs,
    profile: baseProfile,
    referenceDate: refDate,
    proposedWorkout
  });

  assert(intelligence.rotation.hasRotations, 'Rotation suggested for stale exercise');
  const benchCandidate = intelligence.progression.candidateExercises.find(c => c.exerciseId === 'dumbbell-bench-press');
  assert(benchCandidate.supersededByRotation === true, 'Progression marked supersededByRotation');

  // Recommendations should recommend rotation, not overload for the rotated-out exercise
  const hasProgressionRec = intelligence.recommendations.some(r => r.type === 'PROGRESSION');
  assert.strictEqual(hasProgressionRec, false, 'No contradictory progression recommendation emitted for rotated exercise');
});

// -----------------------------------------------------------------------------
console.log('Test Suite 2: Adversarial Progression Engine');
// -----------------------------------------------------------------------------

test('2.1 Single workout completion maintains load with LOW confidence', () => {
  const ex = getExerciseById('push-up') || { id: 'push-up', name: 'Push Up', category: 'bodyweight' };
  const logs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, targetReps: 12, reps: 12, completedAt: '2026-06-01T10:00:00Z' },
    { sessionId: 's1', exerciseId: ex.id, setNumber: 2, targetReps: 12, reps: 12, completedAt: '2026-06-01T10:05:00Z' }
  ];

  const result = analyzeExerciseProgression(ex, logs);
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN);
  assert.strictEqual(result.confidence, CONFIDENCE_TIERS.LOW);
  assert.strictEqual(result.adaptationApplied, false);
});

test('2.2 Repeated success across 2+ sessions triggers progressive overload', () => {
  const ex = getExerciseById('db-bicep-curl') || { id: 'db-bicep-curl', name: 'Dumbbell Bicep Curl', category: 'strength' };
  const logs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, weightKg: 12, targetReps: 10, reps: 10, completedAt: '2026-06-01T10:00:00Z' },
    { sessionId: 's1', exerciseId: ex.id, setNumber: 2, weightKg: 12, targetReps: 10, reps: 10, completedAt: '2026-06-01T10:05:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 1, weightKg: 12, targetReps: 10, reps: 10, completedAt: '2026-06-04T10:00:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 2, weightKg: 12, targetReps: 10, reps: 10, completedAt: '2026-06-04T10:05:00Z' }
  ];

  const result = analyzeExerciseProgression(ex, logs, { unit: 'kg' });
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.INCREASE_WEIGHT);
  assert.strictEqual(result.recommendedWeightKg, 14); // +2kg for dumbbell
  assert.strictEqual(result.adaptationApplied, true);
});

test('2.3 Mixed success and failure across sets does NOT trigger overload', () => {
  const ex = getExerciseById('db-bicep-curl') || { id: 'db-bicep-curl', name: 'Dumbbell Bicep Curl', category: 'strength' };
  const logs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, weightKg: 12, targetReps: 10, reps: 10, completedAt: '2026-06-01T10:00:00Z' },
    { sessionId: 's1', exerciseId: ex.id, setNumber: 2, weightKg: 12, targetReps: 10, reps: 6, completedAt: '2026-06-01T10:05:00Z' }, // Failed set
    { sessionId: 's2', exerciseId: ex.id, setNumber: 1, weightKg: 12, targetReps: 10, reps: 10, completedAt: '2026-06-04T10:00:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 2, weightKg: 12, targetReps: 10, reps: 7, completedAt: '2026-06-04T10:05:00Z' }  // Failed set
  ];

  const result = analyzeExerciseProgression(ex, logs);
  assert.notStrictEqual(result.action, PROGRESSION_ACTIONS.INCREASE_WEIGHT, 'Must not increase weight on failed sets');
});

test('2.4 Bodyweight progression respects rep ceiling (<=30 reps) without regressing', () => {
  const ex = getExerciseById('push-up') || { id: 'push-up', name: 'Push Up', category: 'bodyweight' };
  const logs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, targetReps: 30, reps: 30, completedAt: '2026-06-01T10:00:00Z' },
    { sessionId: 's1', exerciseId: ex.id, setNumber: 2, targetReps: 30, reps: 30, completedAt: '2026-06-01T10:05:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 1, targetReps: 30, reps: 30, completedAt: '2026-06-04T10:00:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 2, targetReps: 30, reps: 30, completedAt: '2026-06-04T10:05:00Z' }
  ];

  const result = analyzeExerciseProgression(ex, logs);
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.MAINTAIN, 'Ceiling reached maintains rather than over-inflating reps');
  assert.strictEqual(result.recommendedReps, 30, 'Preserves 30 reps');
});

test('2.5 Progression with unit=lb applies +5 lb or +4 lb and formats explanation in lb', () => {
  const ex = getExerciseById('barbell-bench-press') || { id: 'barbell-bench-press', name: 'Barbell Bench Press', category: 'strength' };
  const logs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, weightKg: 60, targetReps: 8, reps: 8, completedAt: '2026-06-01T10:00:00Z' },
    { sessionId: 's1', exerciseId: ex.id, setNumber: 2, weightKg: 60, targetReps: 8, reps: 8, completedAt: '2026-06-01T10:05:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 1, weightKg: 60, targetReps: 8, reps: 8, completedAt: '2026-06-04T10:00:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 2, weightKg: 60, targetReps: 8, reps: 8, completedAt: '2026-06-04T10:05:00Z' }
  ];

  const result = analyzeExerciseProgression(ex, logs, { unit: 'lb' });
  assert.strictEqual(result.action, PROGRESSION_ACTIONS.INCREASE_WEIGHT);
  assert(result.reason.includes('lb'), 'Reason string references lb units');
  assert(result.reason.includes('+5 lb'), 'Reason string specifies +5 lb increment for barbell');
});

test('2.6 Missing or invalid timestamps are rejected with zero fabrication', () => {
  const ex = getExerciseById('push-up') || { id: 'push-up', name: 'Push Up' };
  const corruptLogs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, targetReps: 10, reps: 10 }, // Missing completedAt
    { sessionId: 's2', exerciseId: ex.id, setNumber: 1, targetReps: 10, reps: 10, completedAt: 'INVALID_DATE' },
    { sessionId: 's3', exerciseId: ex.id, setNumber: 1, targetReps: 10, reps: 10, completedAt: null }
  ];

  const result = analyzeExerciseProgression(ex, corruptLogs);
  assert.strictEqual(result.confidence, CONFIDENCE_TIERS.INSUFFICIENT_DATA, 'Corrupted timestamps rejected safely');
});

test('2.7 Absurd weights (>500kg or NaN) are safely ignored or clamped', () => {
  const ex = getExerciseById('db-bicep-curl') || { id: 'db-bicep-curl', name: 'Dumbbell Bicep Curl' };
  const crazyLogs = [
    { sessionId: 's1', exerciseId: ex.id, setNumber: 1, weightKg: 999999, targetReps: 10, reps: 10, completedAt: '2026-06-01T10:00:00Z' },
    { sessionId: 's2', exerciseId: ex.id, setNumber: 1, weightKg: NaN, targetReps: 10, reps: 10, completedAt: '2026-06-04T10:00:00Z' }
  ];

  const result = analyzeExerciseProgression(ex, crazyLogs);
  assert(result.recommendedWeightKg === null || result.recommendedWeightKg <= 500, 'Weight clamped/handled within realistic bounds');
});

// -----------------------------------------------------------------------------
console.log('Test Suite 3: Adversarial Recovery Engine');
// -----------------------------------------------------------------------------

test('3.1 Same-day workout (>12h ago) reports NORMAL, not false READY claiming 0 days', () => {
  const refDate = new Date('2026-06-10T22:00:00Z');
  const history = [
    {
      id: 'session-am',
      date: new Date('2026-06-10T07:00:00Z').toISOString(), // 15 hours ago, same calendar day
      durationMinutes: 30,
      completedExerciseIds: ['push-up']
    }
  ];

  const recovery = analyzeRecovery(history, refDate);
  assert.strictEqual(recovery.daysSinceLastWorkout, 0);
  assert.strictEqual(recovery.hoursSinceLastWorkout, 15);
  // Must NOT claim "Optimal recovery window achieved (0 days since last session)"!
  assert.strictEqual(recovery.status, RECOVERY_STATES.NORMAL);
  assert(recovery.reasons[0].includes('earlier today'), 'Explains workout completed earlier today');
});

test('3.2 Same-day workout (<12h ago) reports MODERATE fatigue', () => {
  const refDate = new Date('2026-06-10T14:00:00Z');
  const history = [
    {
      id: 'session-noon',
      date: new Date('2026-06-10T10:00:00Z').toISOString(), // 4 hours ago
      durationMinutes: 30,
      completedExerciseIds: ['push-up']
    }
  ];

  const recovery = analyzeRecovery(history, refDate);
  assert.strictEqual(recovery.hoursSinceLastWorkout, 4);
  assert(
    recovery.status === RECOVERY_STATES.RECOVERY_RECOMMENDED ||
    recovery.status === RECOVERY_STATES.REDUCE_VOLUME ||
    recovery.reasons[0].includes('hours ago'),
    'Identifies recent workout today'
  );
});

test('3.3 Future timestamps are clamped safely and do not produce negative hours', () => {
  const refDate = new Date('2026-06-10T10:00:00Z');
  const history = [
    {
      id: 'session-future',
      date: new Date('2026-06-11T10:00:00Z').toISOString(), // 24h into future
      durationMinutes: 30,
      completedExerciseIds: ['push-up']
    }
  ];

  const recovery = analyzeRecovery(history, refDate);
  assert(recovery.hoursSinceLastWorkout >= 0, 'Hours since last workout is not negative');
  assert(recovery.daysSinceLastWorkout >= 0, 'Days since last workout is not negative');
});

test('3.4 History schema variance: extracts muscles across all four legacy/current formats', () => {
  const refDate = new Date('2026-06-10T10:00:00Z');
  // Format 1: completedExerciseIds
  const h1 = [{ id: '1', date: '2026-06-09T10:00:00Z', completedExerciseIds: ['push-up'] }];
  // Format 2: exerciseIds
  const h2 = [{ id: '2', date: '2026-06-09T10:00:00Z', exerciseIds: ['push-up'] }];
  // Format 3: completedExercises objects
  const h3 = [{ id: '3', date: '2026-06-09T10:00:00Z', completedExercises: [{ id: 'push-up' }] }];
  // Format 4: exercises objects
  const h4 = [{ id: '4', date: '2026-06-09T10:00:00Z', exercises: [{ id: 'push-up' }] }];

  const proposedWorkout = {
    exercises: [getExerciseById('push-up') || { id: 'push-up', muscleGroups: ['chest'] }]
  };

  [h1, h2, h3, h4].forEach((hist, idx) => {
    const rec = analyzeRecovery(hist, refDate, proposedWorkout);
    assert(rec.recentTrainedMuscles.length > 0, `Format ${idx + 1} extracts trained muscles successfully`);
    assert(rec.overlappingMuscles.length > 0, `Format ${idx + 1} detects muscle overlap successfully`);
  });
});

// -----------------------------------------------------------------------------
console.log('Test Suite 4: Adversarial Exercise Rotation & Anti-Ping-Ponging');
// -----------------------------------------------------------------------------

test('4.1 Anti-ping-ponging prioritizes exercises not performed in recent sessions', () => {
  // Candidate A (dumbbell-bench-press) done in sess-1, sess-2, sess-3
  // If we have alternative candidate B and C:
  // Suppose candidate B (dumbbell-chest-fly) was performed in sess-1, candidate C (push-up) was not performed recently
  const recentWorkouts = [
    { completedExerciseIds: ['dumbbell-bench-press', 'dumbbell-chest-fly'] },
    { completedExerciseIds: ['dumbbell-bench-press'] },
    { completedExerciseIds: ['dumbbell-bench-press'] }
  ];

  const ex = getExerciseById('dumbbell-bench-press');
  const rotation = analyzeExerciseRotation(ex, recentWorkouts, ['dumbbell', 'bench', 'bodyweight']);

  assert.strictEqual(rotation.shouldRotate, true, 'Triggers rotation after 3 consecutive sessions');
  assert(rotation.replacementExercise, 'Finds replacement exercise');
  // Should NOT pick dumbbell-chest-fly if push-up or incline-push-up is available
  assert.notStrictEqual(rotation.replacementExercise.id, 'dumbbell-chest-fly', 'Avoids candidate used in recent sessions (anti-ping-pong)');
});

test('4.2 Exercise rotation strictly preserves user equipment constraints', () => {
  const recentWorkouts = [
    { completedExerciseIds: ['push-up'] },
    { completedExerciseIds: ['push-up'] },
    { completedExerciseIds: ['push-up'] }
  ];

  const ex = getExerciseById('push-up') || { id: 'push-up', muscleGroups: ['chest'], equipment: 'bodyweight' };
  // User ONLY has bodyweight
  const rotation = analyzeExerciseRotation(ex, recentWorkouts, ['bodyweight']);

  if (rotation.shouldRotate && rotation.replacementExercise) {
    const eq = Array.isArray(rotation.replacementExercise.equipment)
      ? rotation.replacementExercise.equipment
      : [rotation.replacementExercise.equipment];
    const isBodyweight = eq.every(item => item === 'bodyweight' || item === 'none');
    assert.strictEqual(isBodyweight, true, 'Replacement respects bodyweight-only constraint');
  }
});

// -----------------------------------------------------------------------------
console.log('Test Suite 5: Adaptive Workout Generator Safety Bounds & Synchronization');
// -----------------------------------------------------------------------------

test('5.1 Invalid rawProfile normalizes safely without throwing', () => {
  const invalidInputs = [null, undefined, 123, 'string-profile', []];
  invalidInputs.forEach(input => {
    const workout = generateAdaptiveWorkout(input, 0);
    assert(workout && workout.ok, 'Generates valid workout despite corrupt profile input');
  });
});

test('5.2 Invalid variationSeed handles gracefully', () => {
  const invalidSeeds = [NaN, -5, 3.1415, 'invalid', null, undefined];
  invalidSeeds.forEach(seed => {
    const workout = generateAdaptiveWorkout(baseProfile, seed);
    assert(workout && workout.ok, 'Generates valid workout despite abnormal seed');
  });
});

test('5.3 durationAccuracy is synchronized when VOLUME_CALIBRATION reduces rounds', () => {
  const refDate = new Date('2026-06-10T12:00:00Z');
  // High fatigue history: 3 consecutive days of workouts
  const historyRecords = [
    { id: '1', date: '2026-06-09T10:00:00Z', durationMinutes: 45, completedExerciseIds: ['db-bench-press'] },
    { id: '2', date: '2026-06-08T10:00:00Z', durationMinutes: 45, completedExerciseIds: ['db-bench-press'] },
    { id: '3', date: '2026-06-07T10:00:00Z', durationMinutes: 45, completedExerciseIds: ['db-bench-press'] }
  ];

  const workout = generateAdaptiveWorkout(baseProfile, 0, {
    historyRecords,
    referenceDate: refDate
  });

  assert(workout.ok, 'Workout is ok');
  if (workout.adaptation && workout.adaptation.changes.some(c => c.type === 'VOLUME_CALIBRATION')) {
    assert(workout.durationAccuracy, 'durationAccuracy metadata exists');
    assert.strictEqual(
      workout.durationAccuracy.actualMinutes,
      workout.durationMinutes,
      'durationAccuracy.actualMinutes matches calibrated durationMinutes'
    );
    assert.strictEqual(
      workout.durationAccuracy.differenceMinutes,
      workout.durationMinutes - workout.durationAccuracy.requestedMinutes,
      'durationAccuracy.differenceMinutes accurately recalculated'
    );
  }
});

test('5.4 Generator enforces duration bounds (10 to 75 min)', () => {
  const workout = generateAdaptiveWorkout(baseProfile, 0);
  assert(workout.durationMinutes >= 10, 'Duration is at least 10 minutes');
  assert(workout.durationMinutes <= 75, 'Duration does not exceed 75 minutes');
});

test('5.5 Fallback safety: corrupt exercise DB falls back to baseline safely', () => {
  // If an exercise in the DB has invalid equipment that triggers safety guard during adaptation
  const corruptDb = [
    {
      id: 'db-bench-press',
      name: 'Dumbbell Bench Press',
      muscleGroups: ['chest'],
      equipment: ['spaceship_thruster'] // Incompatible equipment!
    }
  ];

  const workout = generateAdaptiveWorkout(baseProfile, 0, {
    exerciseDb: corruptDb
  });

  // Must not throw or crash!
  assert(workout, 'Returned workout object');
});

// -----------------------------------------------------------------------------
console.log('Test Suite 6: UI Unit Consistency & Detail Rendering');
// -----------------------------------------------------------------------------

test('6.1 formatWeight formats correctly for both kg and lb preferences', () => {
  const kgStr = formatWeight(20, 'kg');
  assert.strictEqual(kgStr, '20 kg');

  const lbStr = formatWeight(20, 'lb');
  // 20 kg = 44.1 lbs
  assert.strictEqual(lbStr, '44.1 lb');

  const nullStr = formatWeight(null, 'lb');
  assert.strictEqual(nullStr, '0 lb');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================\n');

if (totalTests === passedTests) {
  console.log('🎉 ALL PHASE 6.1 ADAPTIVE TRAINING HARDENING TESTS PASSED!\n');
} else {
  process.exitCode = 1;
}
