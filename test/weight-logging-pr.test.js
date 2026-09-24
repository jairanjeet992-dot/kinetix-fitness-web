/**
 * PHASE 5 REGRESSION TEST SUITE - KINETIX
 * Weight Logging, Personal Records, Exercise History, and Player Integration
 */

import assert from 'node:assert';
import {
  lbsToKg,
  kgToLbs,
  formatWeight,
  sanitizePerformanceRecord,
  createPerformanceRecord,
  getPerformanceRecords,
  savePerformanceRecord,
  savePerformanceRecords,
  getPerformanceRecordsForExercise,
  getPerformanceRecordsForSession,
  detectPersonalRecords,
  getAllPersonalRecords,
  getExercisePerformanceHistory,
  _resetPerformanceStorageForTesting,
  PR_TYPES
} from '../js/analytics/performance-tracker.js';

import {
  calculateEstimated1RM,
  createPRRecord,
  computeSessionMilestones
} from '../js/analytics/pr-model.js';

import {
  initSession,
  completeSet,
  completeWorkout,
  previousExercise,
  recoverSession,
  getWorkoutHistory,
  sanitizeHistoryRecord,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_HISTORY
} from '../js/state/workout-session.js';

import {
  computeProgressAnalytics,
  getEmptyProgressAnalytics
} from '../js/analytics/progress-engine.js';

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
    console.error(`  ✗ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('====================================================');
console.log('KINETIX PHASE 5: WEIGHT LOGGING & PERSONAL RECORDS');
console.log('====================================================\n');

// Mock Workouts for Player Integration
const mockWorkout = {
  id: 'workout-test-strength',
  title: 'Upper Body Power',
  durationMinutes: 30,
  exercises: [
    {
      id: 'bench-press-dumbbell',
      name: 'Dumbbell Bench Press',
      equipment: ['dumbbell', 'bench'],
      primaryMuscles: ['chest'],
      difficulty: 'intermediate',
      exerciseType: 'strength',
      defaultReps: '10-12 Reps',
      defaultSets: 3,
      defaultRestSeconds: 45
    },
    {
      id: 'plank',
      name: 'Plank Hold',
      equipment: ['bodyweight'],
      primaryMuscles: ['core'],
      difficulty: 'beginner',
      exerciseType: 'timed',
      defaultDurationSec: 45,
      defaultReps: '45s',
      defaultSets: 2,
      defaultRestSeconds: 30
    }
  ]
};

// -----------------------------------------------------------------------------
// TEST SUITE 1: UNIT CONVERSIONS & METRIC NORMALIZATION
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Unit Conversions & Metric Normalization');

test('1.1 lbsToKg converts pounds to kilograms with 2 decimal precision', () => {
  assert.strictEqual(lbsToKg(0), 0);
  assert.strictEqual(lbsToKg(-10), 0);
  assert.strictEqual(lbsToKg(NaN), 0);
  // 50 lbs / 2.20462262 = 22.6796 -> 22.68 kg
  assert.strictEqual(lbsToKg(50), 22.68);
  // 100 lbs = 45.36 kg
  assert.strictEqual(lbsToKg(100), 45.36);
});

test('1.2 kgToLbs converts kilograms to pounds with 1 decimal precision', () => {
  assert.strictEqual(kgToLbs(0), 0);
  assert.strictEqual(kgToLbs(-5), 0);
  // 20 kg * 2.20462262 = 44.09 -> 44.1 lbs
  assert.strictEqual(kgToLbs(20), 44.1);
  // 50 kg = 110.2 lbs
  assert.strictEqual(kgToLbs(50), 110.2);
});

test('1.3 formatWeight formats correctly for kg and lb preferences', () => {
  assert.strictEqual(formatWeight(24, 'kg'), '24 kg');
  assert.strictEqual(formatWeight(24.56, 'kg'), '24.6 kg');
  assert.strictEqual(formatWeight(20, 'lb'), '44.1 lb');
  assert.strictEqual(formatWeight(0, 'kg'), '0 kg');
  assert.strictEqual(formatWeight(null, 'kg'), '0 kg');
});

// -----------------------------------------------------------------------------
// TEST SUITE 2: SET RECORD SCHEMA & VALIDATION
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Set Record Validation & Sanitization');

test('2.1 Valid strength set creates sanitized versioned record with canonical kg', () => {
  const record = sanitizePerformanceRecord({
    sessionId: 'sess_1',
    workoutId: 'workout-1',
    exerciseId: 'bench-press-dumbbell',
    setNumber: 1,
    weight: 24,
    unit: 'kg',
    reps: 10,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  assert.ok(record);
  assert.strictEqual(record.sessionId, 'sess_1');
  assert.strictEqual(record.exerciseId, 'bench-press-dumbbell');
  assert.strictEqual(record.setNumber, 1);
  assert.strictEqual(record.weight, 24);
  assert.strictEqual(record.weightKg, 24);
  assert.strictEqual(record.unit, 'kg');
  assert.strictEqual(record.reps, 10);
  assert.strictEqual(record.volumeKg, 240); // 24 * 10
  assert.strictEqual(record.estimated1RM, 32); // 24 * (1 + 10/30) = 32
  assert.strictEqual(record.isCompleted, true);
  assert.strictEqual(record.schemaVersion, 1);
});

test('2.2 Pound (lb) logged set stores raw lb and canonical kg correctly', () => {
  const record = sanitizePerformanceRecord({
    sessionId: 'sess_1',
    workoutId: 'workout-1',
    exerciseId: 'bench-press-dumbbell',
    setNumber: 2,
    weight: 50,
    unit: 'lb',
    reps: 8,
    completedAt: '2026-09-24T10:05:00.000Z'
  });

  assert.ok(record);
  assert.strictEqual(record.weight, 50);
  assert.strictEqual(record.unit, 'lb');
  assert.strictEqual(record.weightKg, 22.68);
  assert.strictEqual(record.volumeKg, 181.4); // 22.68 * 8 = 181.44 -> 181.4
  assert.ok(record.estimated1RM > 22.68);
});

test('2.3 Zero data fabrication: Bodyweight set leaves weightKg as null, no fake weight', () => {
  const record = sanitizePerformanceRecord({
    sessionId: 'sess_1',
    workoutId: 'workout-1',
    exerciseId: 'push-up',
    setNumber: 1,
    weight: null,
    reps: 15,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  assert.ok(record);
  assert.strictEqual(record.weight, null);
  assert.strictEqual(record.weightKg, null);
  assert.strictEqual(record.volumeKg, 0);
  assert.strictEqual(record.estimated1RM, null); // Cannot compute 1RM without weight
  assert.strictEqual(record.reps, 15);
});

test('2.4 Invalid numeric inputs are sanitized safely without corrupting record', () => {
  const record = sanitizePerformanceRecord({
    sessionId: 'sess_1',
    exerciseId: 'push-up',
    setNumber: 'invalid',
    weight: -20, // Negative weight rejected
    reps: -5,    // Negative reps rejected
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  assert.ok(record);
  assert.strictEqual(record.setNumber, 1); // Defaults safely to 1
  assert.strictEqual(record.weight, null);
  assert.strictEqual(record.weightKg, null);
  assert.strictEqual(record.reps, null);
});

test('2.5 Missing essential IDs returns null safely', () => {
  assert.strictEqual(sanitizePerformanceRecord(null), null);
  assert.strictEqual(sanitizePerformanceRecord({}), null);
  assert.strictEqual(sanitizePerformanceRecord({ sessionId: 's1' }), null); // Missing exerciseId
  assert.strictEqual(sanitizePerformanceRecord({ exerciseId: 'e1' }), null); // Missing sessionId
});

test('2.6 Timed exercise records durationSeconds correctly', () => {
  const record = sanitizePerformanceRecord({
    sessionId: 'sess_1',
    exerciseId: 'plank',
    setNumber: 1,
    durationSeconds: 60,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  assert.ok(record);
  assert.strictEqual(record.durationSeconds, 60);
  assert.strictEqual(record.weightKg, null);
  assert.strictEqual(record.estimated1RM, null);
});

// -----------------------------------------------------------------------------
// TEST SUITE 3: STORAGE PERSISTENCE & CORRUPTION RESILIENCE
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Local-First Storage & Resilience');

test('3.1 Performance record persists to localStorage', () => {
  _resetPerformanceStorageForTesting();
  const rec = createPerformanceRecord({
    sessionId: 'sess_persist',
    workoutId: 'w1',
    exerciseId: 'squat',
    setNumber: 1,
    weight: 60,
    unit: 'kg',
    reps: 10,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  const ok = savePerformanceRecord(rec);
  assert.strictEqual(ok, true);

  const stored = getPerformanceRecords();
  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].exerciseId, 'squat');
  assert.strictEqual(stored[0].weightKg, 60);
});

test('3.2 Duplicate set logging updates record instead of creating duplicate', () => {
  _resetPerformanceStorageForTesting();
  const rec1 = createPerformanceRecord({
    sessionId: 'sess_dup',
    workoutId: 'w1',
    exerciseId: 'squat',
    setNumber: 1,
    weight: 50,
    reps: 10,
    completedAt: '2026-09-24T10:00:00.000Z'
  });
  savePerformanceRecord(rec1);

  // Edit / redo the same set with updated reps
  const rec2 = createPerformanceRecord({
    sessionId: 'sess_dup',
    workoutId: 'w1',
    exerciseId: 'squat',
    setNumber: 1,
    weight: 50,
    reps: 12,
    completedAt: '2026-09-24T10:02:00.000Z'
  });
  savePerformanceRecord(rec2);

  const stored = getPerformanceRecords();
  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].reps, 12);
});

test('3.3 Corrupted JSON in performance storage handled gracefully, returning []', () => {
  localStorage.setItem('kinetix_performance_logs', '{invalid-json-data');
  const logs = getPerformanceRecords();
  assert.deepStrictEqual(logs, []);
});

test('3.4 getPerformanceRecordsForExercise isolates requested exercise chronologically', () => {
  _resetPerformanceStorageForTesting();
  savePerformanceRecord({
    sessionId: 's1',
    exerciseId: 'deadlift',
    setNumber: 1,
    weight: 100,
    reps: 5,
    completedAt: '2026-09-20T10:00:00.000Z'
  });
  savePerformanceRecord({
    sessionId: 's1',
    exerciseId: 'bench',
    setNumber: 1,
    weight: 70,
    reps: 8,
    completedAt: '2026-09-20T10:10:00.000Z'
  });
  savePerformanceRecord({
    sessionId: 's2',
    exerciseId: 'deadlift',
    setNumber: 1,
    weight: 110,
    reps: 5,
    completedAt: '2026-09-22T10:00:00.000Z'
  });

  const deadliftLogs = getPerformanceRecordsForExercise('deadlift');
  assert.strictEqual(deadliftLogs.length, 2);
  assert.strictEqual(deadliftLogs[0].weightKg, 100);
  assert.strictEqual(deadliftLogs[1].weightKg, 110);
});

// -----------------------------------------------------------------------------
// TEST SUITE 4: DETERMINISTIC PERSONAL RECORDS (PR) DETECTION
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Deterministic PR Detection Engine');

test('4.1 Heaviest weight unlocks HEAVIEST_WEIGHT PR', () => {
  const prior = [
    sanitizePerformanceRecord({
      id: 'p1',
      sessionId: 's1',
      exerciseId: 'overhead-press',
      setNumber: 1,
      weight: 40,
      unit: 'kg',
      reps: 8,
      completedAt: '2026-09-24T10:00:00.000Z'
    })
  ];

  const newRecord = sanitizePerformanceRecord({
    id: 'p2',
    sessionId: 's2',
    exerciseId: 'overhead-press',
    setNumber: 1,
    weight: 45,
    unit: 'kg',
    reps: 5,
    completedAt: '2026-09-24T10:05:00.000Z'
  });

  const prs = detectPersonalRecords(newRecord, prior);
  const heavyPR = prs.find(p => p.type === PR_TYPES.HEAVIEST_WEIGHT);
  assert.ok(heavyPR);
  assert.strictEqual(heavyPR.value, 45);
  assert.strictEqual(heavyPR.previousValue, 40);
});

test('4.2 Equal or lower weight does NOT unlock heaviest weight PR', () => {
  const prior = [
    sanitizePerformanceRecord({
      id: 'p1',
      sessionId: 's1',
      exerciseId: 'overhead-press',
      setNumber: 1,
      weight: 50,
      unit: 'kg',
      reps: 5,
      completedAt: '2026-09-24T10:00:00.000Z'
    })
  ];

  const newRecord = sanitizePerformanceRecord({
    id: 'p2',
    sessionId: 's2',
    exerciseId: 'overhead-press',
    setNumber: 1,
    weight: 45,
    unit: 'kg',
    reps: 5,
    completedAt: '2026-09-24T10:05:00.000Z'
  });

  const prs = detectPersonalRecords(newRecord, prior);
  const heavyPR = prs.find(p => p.type === PR_TYPES.HEAVIEST_WEIGHT);
  assert.strictEqual(heavyPR, undefined);
});

test('4.3 Best reps at specific weight unlocks BEST_REPS PR', () => {
  const prior = [
    sanitizePerformanceRecord({
      id: 'p1',
      sessionId: 's1',
      exerciseId: 'pull-up-weighted',
      setNumber: 1,
      weight: 10,
      unit: 'kg',
      reps: 6,
      completedAt: '2026-09-24T10:00:00.000Z'
    })
  ];

  const newRecord = sanitizePerformanceRecord({
    id: 'p2',
    sessionId: 's2',
    exerciseId: 'pull-up-weighted',
    setNumber: 1,
    weight: 10,
    unit: 'kg',
    reps: 8,
    completedAt: '2026-09-24T10:05:00.000Z'
  });

  const prs = detectPersonalRecords(newRecord, prior);
  const repsPR = prs.find(p => p.type === PR_TYPES.BEST_REPS);
  assert.ok(repsPR);
  assert.strictEqual(repsPR.value, 8);
  assert.strictEqual(repsPR.previousValue, 6);
});

test('4.4 Higher reps at lower weight can unlock ESTIMATED_1RM PR', () => {
  // 100kg x 1 = 100kg 1RM
  const prior = [
    sanitizePerformanceRecord({
      id: 'p1',
      sessionId: 's1',
      exerciseId: 'bench-press',
      setNumber: 1,
      weight: 100,
      unit: 'kg',
      reps: 1,
      completedAt: '2026-09-24T10:00:00.000Z'
    })
  ];

  // 90kg x 6 -> 90 * (1 + 6/30) = 90 * 1.2 = 108kg 1RM!
  const newRecord = sanitizePerformanceRecord({
    id: 'p2',
    sessionId: 's2',
    exerciseId: 'bench-press',
    setNumber: 1,
    weight: 90,
    unit: 'kg',
    reps: 6,
    completedAt: '2026-09-24T10:05:00.000Z'
  });

  const prs = detectPersonalRecords(newRecord, prior);
  const oneRmPR = prs.find(p => p.type === PR_TYPES.ESTIMATED_1RM);
  assert.ok(oneRmPR);
  assert.strictEqual(oneRmPR.value, 108);
  assert.strictEqual(oneRmPR.previousValue, 100);
});

test('4.5 Timed exercise unlocks LONGEST_DURATION PR', () => {
  const prior = [
    sanitizePerformanceRecord({
      id: 'p1',
      sessionId: 's1',
      exerciseId: 'plank',
      setNumber: 1,
      durationSeconds: 45,
      completedAt: '2026-09-24T10:00:00.000Z'
    })
  ];

  const newRecord = sanitizePerformanceRecord({
    id: 'p2',
    sessionId: 's2',
    exerciseId: 'plank',
    setNumber: 1,
    durationSeconds: 65,
    completedAt: '2026-09-24T10:05:00.000Z'
  });

  const prs = detectPersonalRecords(newRecord, prior);
  const durPR = prs.find(p => p.type === PR_TYPES.LONGEST_DURATION);
  assert.ok(durPR);
  assert.strictEqual(durPR.value, 65);
  assert.strictEqual(durPR.previousValue, 45);
});

test('4.6 Never generates fake PRs when data is absent', () => {
  const emptyRecord = sanitizePerformanceRecord({
    sessionId: 's1',
    exerciseId: 'empty-test',
    setNumber: 1,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  const prs = detectPersonalRecords(emptyRecord, []);
  assert.strictEqual(prs.length, 0);
});

test('4.7 getAllPersonalRecords computes all-time records across all exercises deterministically', () => {
  _resetPerformanceStorageForTesting();
  savePerformanceRecords([
    {
      sessionId: 's1',
      exerciseId: 'bench',
      setNumber: 1,
      weight: 60,
      reps: 10,
      completedAt: '2026-09-20T10:00:00.000Z'
    },
    {
      sessionId: 's2',
      exerciseId: 'bench',
      setNumber: 1,
      weight: 70,
      reps: 8,
      completedAt: '2026-09-22T10:00:00.000Z'
    },
    {
      sessionId: 's1',
      exerciseId: 'plank',
      setNumber: 1,
      durationSeconds: 60,
      completedAt: '2026-09-20T10:15:00.000Z'
    }
  ]);

  const allPRs = getAllPersonalRecords();
  assert.ok(allPRs.length >= 3);

  const benchMax = allPRs.find(p => p.exerciseId === 'bench' && p.type === PR_TYPES.HEAVIEST_WEIGHT);
  assert.strictEqual(benchMax.value, 70);

  const plankMax = allPRs.find(p => p.exerciseId === 'plank' && p.type === PR_TYPES.LONGEST_DURATION);
  assert.strictEqual(plankMax.value, 60);
});

// -----------------------------------------------------------------------------
// TEST SUITE 5: EXERCISE PERFORMANCE HISTORY
// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Exercise Performance History & Trends');

test('5.1 Empty history returns safe structured object with hasHistory=false', () => {
  const hist = getExercisePerformanceHistory('unperformed-exercise');
  assert.strictEqual(hist.hasHistory, false);
  assert.strictEqual(hist.totalSetsLogged, 0);
  assert.strictEqual(hist.previousPerformance, null);
  assert.deepStrictEqual(hist.volumeTrend, []);
});

test('5.2 Populated history returns previous session, personal bests, and volume trend', () => {
  _resetPerformanceStorageForTesting();
  savePerformanceRecords([
    {
      sessionId: 'session_A',
      workoutId: 'wA',
      exerciseId: 'bicep-curl',
      setNumber: 1,
      weight: 12,
      reps: 12,
      completedAt: '2026-09-18T10:00:00.000Z'
    },
    {
      sessionId: 'session_A',
      workoutId: 'wA',
      exerciseId: 'bicep-curl',
      setNumber: 2,
      weight: 12,
      reps: 10,
      completedAt: '2026-09-18T10:03:00.000Z'
    },
    {
      sessionId: 'session_B',
      workoutId: 'wB',
      exerciseId: 'bicep-curl',
      setNumber: 1,
      weight: 14,
      reps: 10,
      completedAt: '2026-09-22T10:00:00.000Z'
    }
  ]);

  const hist = getExercisePerformanceHistory('bicep-curl');
  assert.strictEqual(hist.hasHistory, true);
  assert.strictEqual(hist.totalSetsLogged, 3);

  // Previous performance is session B (most recent)
  assert.strictEqual(hist.previousPerformance.sessionId, 'session_B');
  assert.strictEqual(hist.previousPerformance.maxWeightKg, 14);

  // Personal Bests
  assert.strictEqual(hist.personalBests[PR_TYPES.HEAVIEST_WEIGHT].value, 14);

  // Volume Trend: Session A had 12*12 + 12*10 = 144 + 120 = 264kg; Session B had 14*10 = 140kg
  assert.strictEqual(hist.volumeTrend.length, 2);
  assert.strictEqual(hist.volumeTrend[0].volumeKg, 264);
  assert.strictEqual(hist.volumeTrend[1].volumeKg, 140);
});

// -----------------------------------------------------------------------------
// TEST SUITE 6: WORKOUT PLAYER INTEGRATION & STATE MACHINE
// -----------------------------------------------------------------------------
console.log('\nTest Suite 6: Workout Player Integration & State Machine');

test('6.1 initSession creates performanceLogs array on session', () => {
  storage.clear();
  const session = initSession(mockWorkout);
  assert.ok(session);
  assert.deepStrictEqual(session.performanceLogs, []);
});

test('6.2 completeSet with setLogData records performance log and advances session', () => {
  storage.clear();
  _resetPerformanceStorageForTesting();
  let session = initSession(mockWorkout);

  // Complete Set 1 with 20kg x 10 reps
  session = completeSet(session, mockWorkout, {
    weight: 20,
    unit: 'kg',
    reps: 10,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  assert.strictEqual(session.currentSet, 2);
  assert.strictEqual(session.phase, 'REST');
  assert.strictEqual(session.completedSets, 1);

  // Check performance logs on session
  assert.strictEqual(session.performanceLogs.length, 1);
  assert.strictEqual(session.performanceLogs[0].weightKg, 20);
  assert.strictEqual(session.performanceLogs[0].reps, 10);
  assert.strictEqual(session.performanceLogs[0].volumeKg, 200);

  // Check persisted performance storage
  const stored = getPerformanceRecordsForSession(session.sessionId);
  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].weightKg, 20);
});

test('6.3 Backward compatibility: completeSet without set data functions normally without crashing', () => {
  storage.clear();
  let session = initSession(mockWorkout);

  // Call completeSet with legacy signature (no 3rd argument)
  session = completeSet(session, mockWorkout);
  assert.strictEqual(session.currentSet, 2);
  assert.strictEqual(session.phase, 'REST');
  assert.strictEqual(session.completedSets, 1);
  assert.strictEqual(session.performanceLogs.length, 0); // No fake data fabricated
});

test('6.4 Previous exercise navigation rewinds set and allows safe re-logging', () => {
  storage.clear();
  _resetPerformanceStorageForTesting();
  let session = initSession(mockWorkout);

  // Set 1
  session = completeSet(session, mockWorkout, { weight: 20, reps: 10, completedAt: '2026-09-24T10:00:00.000Z' });
  assert.strictEqual(session.currentSet, 2);

  // User hits "Previous" to redo Set 1
  session = previousExercise(session, mockWorkout);
  assert.strictEqual(session.currentSet, 1);
  assert.strictEqual(session.phase, 'EXERCISE');
  assert.strictEqual(session.completedSets, 0);

  // Re-log Set 1 with corrected reps: 12
  session = completeSet(session, mockWorkout, { weight: 20, reps: 12, completedAt: '2026-09-24T10:02:00.000Z' });
  assert.strictEqual(session.performanceLogs.length, 1);
  assert.strictEqual(session.performanceLogs[0].reps, 12);
});

test('6.5 completeWorkout computes total volume and persists performance logs to history', () => {
  storage.clear();
  _resetPerformanceStorageForTesting();
  let session = initSession(mockWorkout);

  // Complete exercise 1 (3 sets)
  session = completeSet(session, mockWorkout, { weight: 25, reps: 10, completedAt: '2026-09-24T10:00:00.000Z' }); // 250kg
  session.phase = 'EXERCISE';
  session = completeSet(session, mockWorkout, { weight: 25, reps: 10, completedAt: '2026-09-24T10:02:00.000Z' }); // 250kg
  session.phase = 'EXERCISE';
  session = completeSet(session, mockWorkout, { weight: 25, reps: 10, completedAt: '2026-09-24T10:04:00.000Z' }); // 250kg

  // Move to exercise 2 (timed plank, 3 sets)
  session.phase = 'EXERCISE';
  session = completeSet(session, mockWorkout, { durationSeconds: 45, completedAt: '2026-09-24T10:06:00.000Z' });
  session.phase = 'EXERCISE';
  session = completeSet(session, mockWorkout, { durationSeconds: 45, completedAt: '2026-09-24T10:08:00.000Z' });
  session.phase = 'EXERCISE';
  session = completeSet(session, mockWorkout, { durationSeconds: 45, completedAt: '2026-09-24T10:10:00.000Z' }); // Finishes workout

  assert.strictEqual(session.phase, 'COMPLETED');
  assert.strictEqual(session.isCompleted, true);

  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  const record = history[0];
  assert.strictEqual(record.totalVolumeKg, 750); // 250 * 3
  assert.strictEqual(record.performanceLogs.length, 6);
});

test('6.6 recoverSession preserves performance logs across browser reloads', () => {
  storage.clear();
  let session = initSession(mockWorkout);
  session.performanceLogs.push({
    id: 'test_log',
    sessionId: 'sess_recover',
    exerciseId: 'bench',
    setNumber: 1,
    weightKg: 30,
    reps: 8,
    volumeKg: 240,
    completedAt: '2026-09-24T10:00:00.000Z'
  });

  const recovered = recoverSession(session, mockWorkout);
  assert.strictEqual(recovered.performanceLogs.length, 1);
  assert.strictEqual(recovered.performanceLogs[0].weightKg, 30);
});

// -----------------------------------------------------------------------------
// TEST SUITE 7: PROGRESS ANALYTICS INTEGRATION
// -----------------------------------------------------------------------------
console.log('\nTest Suite 7: Progress Analytics Extension');

test('7.1 computeProgressAnalytics derives total volume and PR counts', () => {
  _resetPerformanceStorageForTesting();
  const mockHistory = [
    {
      sessionId: 'sess_prog_1',
      workoutId: 'w1',
      title: 'Power Day',
      completedAt: '2026-09-24T10:00:00.000Z',
      durationSeconds: 1800,
      completedSets: 6,
      exercisesCompleted: 2,
      completedExerciseIds: ['bench-press', 'squat'],
      totalVolumeKg: 1200
    }
  ];

  const mockPerfLogs = [
    sanitizePerformanceRecord({
      sessionId: 'sess_prog_1',
      workoutId: 'w1',
      exerciseId: 'bench-press',
      setNumber: 1,
      weight: 60,
      reps: 10,
      completedAt: '2026-09-24T10:00:00.000Z'
    }),
    sanitizePerformanceRecord({
      sessionId: 'sess_prog_1',
      workoutId: 'w1',
      exerciseId: 'squat',
      setNumber: 1,
      weight: 100,
      reps: 6,
      completedAt: '2026-09-24T10:05:00.000Z'
    })
  ];

  const analytics = computeProgressAnalytics(mockHistory, null, new Date('2026-09-24T12:00:00.000Z'), mockPerfLogs);
  assert.strictEqual(analytics.hasData, true);
  assert.strictEqual(analytics.strength.totalVolumeKg, 1200); // (60*10) + (100*6) = 600 + 600 = 1200
  assert.ok(analytics.strength.totalPRsCount >= 2);
  assert.strictEqual(analytics.muscles.isEstimated, true); // Kept clearly marked as estimated
});

test('7.2 getEmptyProgressAnalytics provides clean strength zero-state structure', () => {
  const empty = getEmptyProgressAnalytics();
  assert.strictEqual(empty.hasData, false);
  assert.strictEqual(empty.overview.totalVolumeKg, 0);
  assert.strictEqual(empty.overview.totalPRsCount, 0);
  assert.strictEqual(empty.strength.totalVolumeKg, 0);
  assert.deepStrictEqual(empty.strength.allPRs, []);
  assert.strictEqual(empty.muscles.isEstimated, true);
});

// -----------------------------------------------------------------------------
// TEST SUITE 8: PHASE 5.1 PERFORMANCE DATA INTEGRITY HARDENING
// -----------------------------------------------------------------------------
console.log('\nTest Suite 8: Phase 5.1 Performance Data Integrity Hardening');

test('8.1 Missing performance timestamp: rejects record safely without fabricating a timestamp', () => {
  // sanitizePerformanceRecord rejects records missing completedAt
  const res1 = sanitizePerformanceRecord({
    sessionId: 'sess_missing_ts',
    exerciseId: 'squat',
    setNumber: 1,
    weight: 60,
    reps: 10
  });
  assert.strictEqual(res1, null, 'Record missing completedAt must return null');

  // createPerformanceRecord rejects records missing completedAt
  const res2 = createPerformanceRecord({
    sessionId: 'sess_missing_ts',
    exerciseId: 'squat',
    setNumber: 1,
    weight: 60,
    reps: 10
  });
  assert.strictEqual(res2, null, 'createPerformanceRecord without completedAt must return null');

  // savePerformanceRecord returns false and saves nothing
  _resetPerformanceStorageForTesting();
  const ok = savePerformanceRecord({
    sessionId: 'sess_missing_ts',
    exerciseId: 'squat',
    setNumber: 1,
    weight: 60,
    reps: 10
  });
  assert.strictEqual(ok, false);
  assert.deepStrictEqual(getPerformanceRecords(), []);

  // completeSet with missing completedAt does NOT append to session.performanceLogs
  let session = initSession(mockWorkout);
  session = completeSet(session, mockWorkout, {
    weight: 50,
    reps: 8
    // No completedAt provided
  });
  assert.strictEqual(session.performanceLogs.length, 0, 'No performance record should be added without completedAt');
  assert.strictEqual(session.currentSet, 2, 'Session state machine should still advance normally');
});

test('8.2 Invalid timestamp: rejects invalid string, empty string, whitespace, and non-date values', () => {
  const base = {
    sessionId: 'sess_invalid_ts',
    exerciseId: 'bench-press',
    setNumber: 1,
    weight: 70,
    reps: 6
  };

  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: 'not-a-date' }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: '' }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: '   ' }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: null }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: undefined }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: 12345 }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: {} }), null);
  assert.strictEqual(sanitizePerformanceRecord({ ...base, completedAt: '1969-12-31T23:59:59.000Z' }), null);

  // savePerformanceRecord returns false on invalid timestamp
  assert.strictEqual(savePerformanceRecord({ ...base, completedAt: 'invalid' }), false);
});

test('8.3 No timestamp fabrication: never uses new Date() fallback when completedAt is missing', () => {
  // Test across multiple set variations to confirm zero fabrication
  const variations = [
    { sessionId: 's1', exerciseId: 'push-up', reps: 20 },
    { sessionId: 's1', exerciseId: 'deadlift', weight: 140, reps: 5 },
    { sessionId: 's1', exerciseId: 'plank', durationSeconds: 60 }
  ];

  variations.forEach(v => {
    const sanitized = sanitizePerformanceRecord(v);
    assert.strictEqual(sanitized, null, 'Never fabricate completedAt timestamp');
  });
});

test('8.4 Duplicate batch records: prevents duplicates using sessionId + exerciseId + setNumber as well as record ID', () => {
  _resetPerformanceStorageForTesting();

  // Initial stored record
  savePerformanceRecord({
    id: 'rec_initial_id',
    sessionId: 'session_batch_dup',
    exerciseId: 'deadlift',
    setNumber: 1,
    weight: 120,
    reps: 5,
    completedAt: '2026-09-24T09:00:00.000Z'
  });

  assert.strictEqual(getPerformanceRecords().length, 1);

  // Batch insert:
  // Item 1: matches (sessionId, exerciseId, setNumber) with different ID ('rec_new_id') -> updates existing
  // Item 2: new set (setNumber: 2) -> adds
  // Item 3: duplicates item 2's (sessionId, exerciseId, setNumber) within the same batch -> updates item 2
  const batch = [
    {
      id: 'rec_new_id',
      sessionId: 'session_batch_dup',
      exerciseId: 'deadlift',
      setNumber: 1,
      weight: 125,
      reps: 5,
      completedAt: '2026-09-24T09:02:00.000Z'
    },
    {
      id: 'rec_set2_a',
      sessionId: 'session_batch_dup',
      exerciseId: 'deadlift',
      setNumber: 2,
      weight: 130,
      reps: 4,
      completedAt: '2026-09-24T09:05:00.000Z'
    },
    {
      id: 'rec_set2_b',
      sessionId: 'session_batch_dup',
      exerciseId: 'deadlift',
      setNumber: 2,
      weight: 130,
      reps: 6, // Updated reps
      completedAt: '2026-09-24T09:06:00.000Z'
    }
  ];

  const ok = savePerformanceRecords(batch);
  assert.strictEqual(ok, true);

  const stored = getPerformanceRecords();
  assert.strictEqual(stored.length, 2, 'Must have exactly 2 distinct sets, preventing duplicate batch records');

  const set1 = stored.find(r => r.setNumber === 1);
  assert.strictEqual(set1.weightKg, 125, 'Set 1 updated with latest batch weight');

  const set2 = stored.find(r => r.setNumber === 2);
  assert.strictEqual(set2.reps, 6, 'Set 2 updated with latest batch reps, not duplicated');
});

test('8.5 Legacy performance records: loads legacy records safely and filters un-timestamped legacy entries', () => {
  _resetPerformanceStorageForTesting();

  // Legacy record with valid timestamp from earlier schema (lacks schemaVersion, source, distanceMeters)
  const legacyValid = {
    sessionId: 'sess_legacy',
    exerciseId: 'pull-up',
    setNumber: 1,
    weight: 10,
    unit: 'lb',
    reps: 8,
    completedAt: '2026-08-01T12:00:00.000Z'
  };

  // Legacy invalid record missing completedAt entirely
  const legacyCorrupt = {
    sessionId: 'sess_legacy_corrupt',
    exerciseId: 'pull-up',
    setNumber: 2,
    weight: 15,
    reps: 5
    // Missing completedAt
  };

  localStorage.setItem('kinetix_performance_logs', JSON.stringify([legacyValid, legacyCorrupt]));

  const records = getPerformanceRecords();
  assert.strictEqual(records.length, 1, 'Corrupt legacy record without timestamp must be filtered safely');
  assert.strictEqual(records[0].sessionId, 'sess_legacy');
  assert.strictEqual(records[0].weightKg, 4.54); // 10 lb converted to kg
  assert.strictEqual(records[0].schemaVersion, 1);
  assert.strictEqual(records[0].source, 'workout-player');

  // sanitizeHistoryRecord filtering legacy performanceLogs
  const historyWithMixedLogs = {
    sessionId: 'sess_history_mixed',
    workoutId: 'w1',
    completedAt: '2026-09-24T10:00:00.000Z',
    performanceLogs: [legacyValid, legacyCorrupt]
  };
  const sanitizedHistory = sanitizeHistoryRecord(historyWithMixedLogs);
  assert.strictEqual(sanitizedHistory.performanceLogs.length, 1, 'History sanitization safely rejects timestamp-less logs');
  assert.strictEqual(sanitizedHistory.performanceLogs[0].sessionId, 'sess_legacy');
});

test('8.6 Valid performance logging: records comprehensive performance data without mutation or corruption', () => {
  const genuineTimestamp = '2026-09-24T10:30:00.000Z';
  const record = sanitizePerformanceRecord({
    sessionId: 'sess_valid_log',
    workoutId: 'workout-strength-1',
    exerciseId: 'barbell-squat',
    setNumber: 3,
    weight: 100,
    unit: 'kg',
    reps: 5,
    completedAt: genuineTimestamp,
    notes: 'Clean reps, RPE 8'
  });

  assert.ok(record);
  assert.strictEqual(record.sessionId, 'sess_valid_log');
  assert.strictEqual(record.exerciseId, 'barbell-squat');
  assert.strictEqual(record.setNumber, 3);
  assert.strictEqual(record.weight, 100);
  assert.strictEqual(record.weightKg, 100);
  assert.strictEqual(record.unit, 'kg');
  assert.strictEqual(record.reps, 5);
  assert.strictEqual(record.volumeKg, 500); // 100 * 5
  assert.strictEqual(record.estimated1RM, 116.7); // 100 * (1 + 5/30) = 116.666... -> 116.7
  assert.strictEqual(record.completedAt, genuineTimestamp);
  assert.strictEqual(record.schemaVersion, 1);
});

test('8.7 PR detection: requires valid timestamps and unlocks records with genuine achievedAt', () => {
  // Attempt PR detection with invalid candidate
  const invalidCandidate = {
    sessionId: 's_pr_inv',
    exerciseId: 'bench-press',
    weight: 120,
    reps: 5
    // Missing completedAt
  };
  const prsInvalid = detectPersonalRecords(invalidCandidate, []);
  assert.deepStrictEqual(prsInvalid, [], 'PR detection on invalid candidate must return empty array');

  // Valid prior records
  const prior = [
    sanitizePerformanceRecord({
      sessionId: 's_pr_1',
      exerciseId: 'bench-press',
      setNumber: 1,
      weight: 80,
      reps: 5,
      completedAt: '2026-09-20T10:00:00.000Z'
    })
  ];

  // Valid candidate record
  const genuineAchievedAt = '2026-09-24T11:00:00.000Z';
  const validCandidate = sanitizePerformanceRecord({
    sessionId: 's_pr_2',
    exerciseId: 'bench-press',
    setNumber: 1,
    weight: 90,
    reps: 5,
    completedAt: genuineAchievedAt
  });

  const prsValid = detectPersonalRecords(validCandidate, prior);
  assert.ok(prsValid.length >= 2, 'Should unlock heaviest weight and 1RM');

  const heavyPR = prsValid.find(p => p.type === PR_TYPES.HEAVIEST_WEIGHT);
  assert.ok(heavyPR);
  assert.strictEqual(heavyPR.value, 90);
  assert.strictEqual(heavyPR.previousValue, 80);
  assert.strictEqual(heavyPR.achievedAt, genuineAchievedAt);

  const oneRmPR = prsValid.find(p => p.type === PR_TYPES.ESTIMATED_1RM);
  assert.ok(oneRmPR);
  assert.strictEqual(oneRmPR.achievedAt, genuineAchievedAt);
});

test('8.8 Workout Player integration: completeSet with genuine timestamp logs performance seamlessly', () => {
  storage.clear();
  _resetPerformanceStorageForTesting();
  let session = initSession(mockWorkout);

  const userTimestamp = '2026-09-24T10:15:30.000Z';
  session = completeSet(session, mockWorkout, {
    setNumber: 1,
    weight: 75,
    unit: 'kg',
    reps: 8,
    completedAt: userTimestamp
  });

  assert.strictEqual(session.currentSet, 2);
  assert.strictEqual(session.phase, 'REST');
  assert.strictEqual(session.performanceLogs.length, 1);
  assert.strictEqual(session.performanceLogs[0].completedAt, userTimestamp);
  assert.strictEqual(session.performanceLogs[0].weightKg, 75);
  assert.strictEqual(session.performanceLogs[0].volumeKg, 600);

  // Finish session
  session.currentSet = session.totalSets;
  session.currentExerciseIndex = mockWorkout.exercises.length - 1;
  session = completeWorkout(session, mockWorkout);

  assert.strictEqual(session.isCompleted, true);
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].performanceLogs.length, 1);
  assert.strictEqual(history[0].performanceLogs[0].completedAt, userTimestamp);
  assert.strictEqual(history[0].totalVolumeKg, 600);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
console.log('====================================================\n');
console.log('🎉 ALL PHASE 5 & 5.1 WEIGHT LOGGING & PERSONAL RECORDS TESTS PASSED!');
