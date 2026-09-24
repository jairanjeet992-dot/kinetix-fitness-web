/**
 * PHASE 7.1 HARDENING & PRODUCTION INTEGRITY TEST SUITE - KINETIX
 * Comprehensive adversarial verification of Training Plan architecture.
 *
 * Verifies 16 Critical Invariants:
 * 1. Active-plan invariant (multiple active plans in storage resolved safely to single authoritative plan)
 * 2. Ambiguous reconciliation protection (multiple candidate training sessions without workoutId returns null)
 * 3. Calendar-date collision safety (rescheduled session coexists without silently overwriting another session)
 * 4. Multiple reschedules audit trail (originalScheduledDate preserved across A -> B -> C -> D)
 * 5. Plan version isolation (workouts completed under v1 reconcile into v1, never into v2)
 * 6. Future session safety (future dates never counted as completed, missed, or failure)
 * 7. Adherence denominator correctness (optional completed sessions cannot inflate adherence > 100%)
 * 8. Optional/rest semantics (rest days never count as missed or fake completed workouts)
 * 9. Midnight boundary consistency (23:59 vs 00:01 calendar date mapping)
 * 10. Duplicate prevention (idempotent reconciliation and plan saves)
 * 11. Corrupted storage resilience (invalid structures filtered without throwing)
 * 12. Deterministic regeneration (identical inputs = identical output, incremented version)
 * 13. Adaptive integration identity preservation (plannedSessionId, planId, planVersion retained)
 * 14. Workout-Player full lifecycle reconciliation (plan -> player -> history -> reconciled)
 * 15. Archived plan protection (archived plans cannot receive blind fallback attributions)
 * 16. Large-history performance sanity (5,000 history records processed without lag)
 */

import assert from 'node:assert';

import {
  generateTrainingPlan,
  toDateString,
  getStartOfWeek,
  addDays,
  SESSION_TYPE,
  SESSION_STATUS,
  PLAN_STATUS
} from '../js/engine/plan-generator.js';

import {
  getActivePlan,
  createTrainingPlan,
  regeneratePlan,
  getPlanById,
  getAllPlans,
  reschedulePlannedSession,
  skipPlannedSession,
  reconcileCompletedSession,
  computePlanAdherence,
  generateWorkoutForPlannedSession,
  _resetTrainingPlanStorageForTesting,
  STORAGE_KEY_PLANS
} from '../js/state/training-plan.js';

import {
  initSession,
  completeSet,
  completeWorkout,
  getWorkoutHistory,
  _resetSessionStorageForTesting
} from '../js/state/workout-session.js';

import { generateAdaptiveWorkout } from '../js/engine/adaptive-workout-generator.js';

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
console.log('KINETIX PHASE 7.1: TRAINING PLAN PRODUCTION HARDENING');
console.log('====================================================\n');

const profile = {
  name: 'Jordan Case',
  fitnessLevel: 'intermediate',
  goal: 'build-muscle',
  focusAreas: ['Chest', 'Back'],
  equipment: ['Dumbbells', 'Bench'],
  trainingDays: 4,
  workoutDuration: '30-45 min'
};

const fixedAnchor = new Date('2026-06-10T12:00:00Z'); // Wednesday

// ---------------------------------------------------------------------------
console.log('Test Suite 1: Invariants & Plan Architecture');
// ---------------------------------------------------------------------------

test('1. Active-plan invariant: multiple active plans in storage resolved to single authoritative plan', () => {
  _resetTrainingPlanStorageForTesting();

  // Simulate storage corruption with 3 active plans
  const corrupted = [
    { planId: 'p_v1', planVersion: 1, status: PLAN_STATUS.ACTIVE, updatedAt: '2026-06-01T00:00:00Z', weeks: [] },
    { planId: 'p_v3', planVersion: 3, status: PLAN_STATUS.ACTIVE, updatedAt: '2026-06-10T00:00:00Z', weeks: [] },
    { planId: 'p_v2', planVersion: 2, status: PLAN_STATUS.ACTIVE, updatedAt: '2026-06-05T00:00:00Z', weeks: [] }
  ];
  globalThis.localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(corrupted));

  const active = getActivePlan(fixedAnchor);
  assert.ok(active);
  assert.strictEqual(active.planId, 'p_v3');
  assert.strictEqual(active.planVersion, 3);
  assert.strictEqual(active.status, PLAN_STATUS.ACTIVE);

  // Verify other plans were automatically demoted to ARCHIVED in storage
  const all = getAllPlans();
  const activeCount = all.filter(p => p.status === PLAN_STATUS.ACTIVE).length;
  assert.strictEqual(activeCount, 1);
  assert.strictEqual(getPlanById('p_v1').status, PLAN_STATUS.ARCHIVED);
  assert.strictEqual(getPlanById('p_v2').status, PLAN_STATUS.ARCHIVED);
});

test('2. Ambiguous reconciliation: multiple candidates on same calendar date without matching workoutId returns null', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = createTrainingPlan(profile, { referenceDate: fixedAnchor });

  // Introduce two training sessions on the same scheduledDate
  const targetDate = '2026-06-10';
  const week = plan.weeks[0];
  const s1 = week.sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);
  s1.scheduledDate = targetDate;
  s1.status = SESSION_STATUS.READY;
  s1.workoutId = 'w_chest_1';

  // Add a second training session on the same date with different workoutId
  const s2 = {
    ...s1,
    plannedSessionId: 'ps_colliding_2',
    workoutId: 'w_arms_2',
    status: SESSION_STATUS.READY
  };
  week.sessions.push(s2);

  // A free-form workout completes with no plannedSessionId and unknown workoutId
  const freeFormWorkout = {
    sessionId: 'free_sess_1',
    completedAt: '2026-06-10T15:00:00Z',
    workoutId: 'w_unknown_random'
  };

  const result = reconcileCompletedSession(freeFormWorkout, plan);
  // Must reject without guessing
  assert.strictEqual(result, null);
  assert.strictEqual(s1.status, SESSION_STATUS.READY);
  assert.strictEqual(s2.status, SESSION_STATUS.READY);

  // But if workoutId matches s1 specifically, it resolves unambiguously
  const specificWorkout = {
    sessionId: 'free_sess_2',
    completedAt: '2026-06-10T16:00:00Z',
    workoutId: 'w_chest_1'
  };
  const resolved = reconcileCompletedSession(specificWorkout, plan);
  assert.ok(resolved);
  assert.strictEqual(resolved.plannedSessionId, s1.plannedSessionId);
  assert.strictEqual(resolved.status, SESSION_STATUS.COMPLETED);
});

test('3. Calendar-date collision: rescheduling onto an existing day coexists safely without overwriting', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = createTrainingPlan(profile, { referenceDate: fixedAnchor });

  const week = plan.weeks[0];
  const trainingSessions = week.sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const sessionA = trainingSessions[0];
  const sessionB = trainingSessions[1];

  const targetDate = sessionB.scheduledDate;
  const initialSessionCount = week.sessions.length;

  // Reschedule sessionA to the same date as sessionB
  const rescheduled = reschedulePlannedSession(sessionA.plannedSessionId, targetDate, plan);
  assert.ok(rescheduled);
  assert.strictEqual(rescheduled.scheduledDate, targetDate);
  assert.strictEqual(rescheduled.rescheduledToDate, targetDate);

  // Verify sessionB was NOT deleted or overwritten
  const stillExistingB = week.sessions.find(s => s.plannedSessionId === sessionB.plannedSessionId);
  assert.ok(stillExistingB);
  assert.strictEqual(stillExistingB.plannedSessionId, sessionB.plannedSessionId);
  assert.strictEqual(week.sessions.length, initialSessionCount);
});

test('4. Multiple reschedules: preserves the true originalScheduledDate across A -> B -> C', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = createTrainingPlan(profile, { referenceDate: fixedAnchor });
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);
  const initialDate = session.scheduledDate;

  // First reschedule
  reschedulePlannedSession(session.plannedSessionId, '2026-06-15', plan);
  assert.strictEqual(session.originalScheduledDate, initialDate);
  assert.strictEqual(session.scheduledDate, '2026-06-15');

  // Second reschedule
  reschedulePlannedSession(session.plannedSessionId, '2026-06-17', plan);
  assert.strictEqual(session.originalScheduledDate, initialDate);
  assert.strictEqual(session.scheduledDate, '2026-06-17');

  // Third reschedule
  reschedulePlannedSession(session.plannedSessionId, '2026-06-19', plan);
  assert.strictEqual(session.originalScheduledDate, initialDate);
  assert.strictEqual(session.scheduledDate, '2026-06-19');
});

test('5. Plan version isolation: workouts completed under v1 reconcile into v1, never into v2', () => {
  _resetTrainingPlanStorageForTesting();
  const v1 = createTrainingPlan(profile, { referenceDate: fixedAnchor, planVersion: 1 });
  const s_v1 = v1.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  // Athlete starts workout from v1
  const workout_v1 = generateWorkoutForPlannedSession(s_v1, profile);
  assert.strictEqual(workout_v1.planId, v1.planId);

  // In the meantime, plan is regenerated to v2
  const v2 = regeneratePlan(profile, { referenceDate: fixedAnchor });
  assert.strictEqual(v2.planVersion, 2);
  assert.strictEqual(v2.status, PLAN_STATUS.ACTIVE);
  assert.strictEqual(getPlanById(v1.planId).status, PLAN_STATUS.ARCHIVED);

  // Athlete finishes workout started from v1
  const completedHistoryRecord = {
    sessionId: 'sess_v1_finished',
    workoutId: workout_v1.id,
    plannedSessionId: workout_v1.plannedSessionId,
    planId: workout_v1.planId,
    completedAt: '2026-06-10T14:30:00Z'
  };

  const reconciled = reconcileCompletedSession(completedHistoryRecord);
  assert.ok(reconciled);
  assert.strictEqual(reconciled.planId, v1.planId);
  assert.strictEqual(reconciled.status, SESSION_STATUS.COMPLETED);

  // Verify v1 received completion
  const refreshedV1 = getPlanById(v1.planId);
  const matched_v1 = refreshedV1.weeks[0].sessions.find(s => s.plannedSessionId === s_v1.plannedSessionId);
  assert.strictEqual(matched_v1.status, SESSION_STATUS.COMPLETED);

  // Verify v2 remained unaffected and did NOT receive v1's completion
  const refreshedV2 = getPlanById(v2.planId);
  assert.ok(refreshedV2.weeks[0].sessions.every(s => s.status !== SESSION_STATUS.COMPLETED));
});

test('6. Future session safety: future dates never count as completed or missed', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan('2026-06-08', profile); // Monday
  const allFutureSessions = plan.weeks.flatMap(w => w.sessions).filter(s => s.scheduledDate > '2026-06-08');

  assert.ok(allFutureSessions.length > 0);
  assert.ok(allFutureSessions.every(s => s.status === SESSION_STATUS.PLANNED));

  const adherence = computePlanAdherence(plan, '2026-06-08');
  assert.strictEqual(adherence.missedSessions, 0);
  assert.strictEqual(adherence.completedSessions, 0);
  assert.strictEqual(adherence.remainingFutureSessions, allFutureSessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING).length);
});

test('7. Adherence denominator: optional completed sessions cannot inflate adherence > 100%', () => {
  const plan = {
    planId: 'plan_adh_cap',
    weeks: [
      {
        weekNumber: 1,
        sessions: [
          // 1 required training session (completed)
          { sessionType: SESSION_TYPE.TRAINING, status: SESSION_STATUS.COMPLETED, scheduledDate: '2026-06-08' },
          // 1 optional recovery session (also completed)
          { sessionType: SESSION_TYPE.RECOVERY, isOptional: true, status: SESSION_STATUS.COMPLETED, scheduledDate: '2026-06-09' },
          // 1 rest day
          { sessionType: SESSION_TYPE.REST, status: SESSION_STATUS.PLANNED, scheduledDate: '2026-06-10' }
        ]
      }
    ]
  };

  const adherence = computePlanAdherence(plan, '2026-06-10');
  assert.strictEqual(adherence.totalPlannedSessions, 1);
  assert.strictEqual(adherence.completedRequiredSessions, 1);
  assert.strictEqual(adherence.completedOptionalSessions, 1);
  assert.strictEqual(adherence.completedSessions, 2);
  assert.strictEqual(adherence.adherenceRate, 1.0);
  assert.strictEqual(adherence.adherencePercentage, 100);
});

test('8. Optional/rest semantics: rest days never count as missed or fake completed workouts', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan('2026-06-14', profile); // End of week
  const restSessions = plan.weeks[0].sessions.filter(s => s.sessionType === SESSION_TYPE.REST);

  // None of the rest days should be marked MISSED
  assert.ok(restSessions.every(s => s.status !== SESSION_STATUS.MISSED));

  // None of the rest days should have completedSessionId or fake completedAt
  assert.ok(restSessions.every(s => s.completedSessionId === null));
  assert.ok(restSessions.every(s => s.completedAt === null));
});

test('9. Midnight boundary: 23:59 vs 00:01 calendar date boundary mapping', () => {
  const t1 = new Date('2026-06-10T23:59:59.000Z');
  const t2 = new Date('2026-06-11T00:00:01.000Z');

  assert.strictEqual(toDateString(t1), '2026-06-10');
  assert.strictEqual(toDateString(t2), '2026-06-11');

  // Verify already-formatted string fast-path
  assert.strictEqual(toDateString('2026-06-10'), '2026-06-10');
  assert.strictEqual(toDateString('2026-06-11'), '2026-06-11');
});

test('10. Duplicate prevention: idempotent reconciliation and duplicate completion prevention', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = createTrainingPlan(profile, { referenceDate: fixedAnchor });
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  const historyRecord = {
    sessionId: 'sess_idemp_orig',
    plannedSessionId: session.plannedSessionId,
    completedAt: '2026-06-10T12:00:00Z',
    workoutId: 'w_test'
  };

  // Reconcile once
  const first = reconcileCompletedSession(historyRecord, plan);
  assert.strictEqual(first.status, SESSION_STATUS.COMPLETED);

  // Reconcile again with same record (idempotent)
  const second = reconcileCompletedSession(historyRecord, plan);
  assert.strictEqual(second.status, SESSION_STATUS.COMPLETED);
  assert.strictEqual(second.completedSessionId, 'sess_idemp_orig');

  // Attempting to overwrite with a DIFFERENT completed session must be rejected
  const intruder = {
    sessionId: 'sess_idemp_intruder',
    plannedSessionId: session.plannedSessionId,
    completedAt: '2026-06-10T13:00:00Z',
    workoutId: 'w_intruder'
  };
  const rejected = reconcileCompletedSession(intruder, plan);
  assert.strictEqual(rejected, null);
  assert.strictEqual(session.completedSessionId, 'sess_idemp_orig');
});

test('11. Corrupted storage: handles array of corrupt items and missing weeks array gracefully', () => {
  _resetTrainingPlanStorageForTesting();
  globalThis.localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify([
    { planId: 'corrupt_1' }, // Missing weeks
    null,
    12345,
    { planId: 'corrupt_2', status: PLAN_STATUS.ACTIVE, weeks: 'not-an-array' }
  ]));

  const plan = getActivePlan(fixedAnchor, profile);
  assert.ok(plan);
  assert.ok(Array.isArray(plan.weeks));
  assert.ok(plan.weeks.length > 0);
});

test('12. Deterministic regeneration: regenerating with same profile creates equivalent structure with bumped version', () => {
  _resetTrainingPlanStorageForTesting();
  const v1 = createTrainingPlan(profile, { referenceDate: fixedAnchor, planVersion: 1 });
  const v2 = regeneratePlan(profile, { referenceDate: fixedAnchor });

  assert.strictEqual(v1.weeks[0].sessions.length, v2.weeks[0].sessions.length);
  for (let i = 0; i < 7; i++) {
    assert.strictEqual(v1.weeks[0].sessions[i].sessionType, v2.weeks[0].sessions[i].sessionType);
    assert.strictEqual(v1.weeks[0].sessions[i].targetFocus, v2.weeks[0].sessions[i].targetFocus);
  }
  assert.strictEqual(v2.planVersion, 2);
});

test('13. Adaptive integration identity: generateWorkoutForPlannedSession preserves all plan metadata', () => {
  const plan = generateTrainingPlan(profile, { referenceDate: fixedAnchor, planVersion: 2 });
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  const workout = generateWorkoutForPlannedSession(session, profile);
  assert.strictEqual(workout.plannedSessionId, session.plannedSessionId);
  assert.strictEqual(workout.planId, session.planId);
  assert.strictEqual(workout.planVersion, session.planVersion);
  assert.strictEqual(workout.scheduledDate, session.scheduledDate);
  assert.ok(session.workoutId === workout.id);
});

test('14. Workout-Player full lifecycle: plan session -> player init -> complete -> reconciled', () => {
  _resetTrainingPlanStorageForTesting();
  _resetSessionStorageForTesting();

  const plan = getActivePlan(fixedAnchor, profile);
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  // 1. Generate workout from plan
  const workout = generateWorkoutForPlannedSession(session, profile);

  // 2. Player initializes session
  const playerSession = initSession(workout);
  assert.strictEqual(playerSession.plannedSessionId, session.plannedSessionId);
  assert.strictEqual(playerSession.planId, session.planId);

  // 3. Player completes set and workout
  completeSet(playerSession, workout, { repsCompleted: 12, weightUsedKg: 24 });
  completeWorkout(playerSession, workout);

  // 4. Verify history has authentic record
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].plannedSessionId, session.plannedSessionId);
  assert.strictEqual(history[0].planId, session.planId);

  // 5. Verify plan session is reconciled
  const refreshedPlan = getPlanById(plan.planId);
  const reconciledSession = refreshedPlan.weeks[0].sessions.find(s => s.plannedSessionId === session.plannedSessionId);
  assert.strictEqual(reconciledSession.status, SESSION_STATUS.COMPLETED);
  assert.strictEqual(reconciledSession.completedSessionId, playerSession.sessionId);
  assert.ok(reconciledSession.completedAt);
});

test('15. Archived plan protection: archived plans cannot receive blind fallback attributions', () => {
  _resetTrainingPlanStorageForTesting();
  const v1 = createTrainingPlan(profile, { referenceDate: fixedAnchor, planVersion: 1 });
  const v2 = regeneratePlan(profile, { referenceDate: fixedAnchor });

  const archivedV1 = getPlanById(v1.planId);
  assert.strictEqual(archivedV1.status, PLAN_STATUS.ARCHIVED);

  // An untagged workout completes
  const untaggedWorkout = {
    sessionId: 'free_workout_attempt',
    completedAt: '2026-06-10T11:00:00Z'
    // No plannedSessionId, no planId
  };

  // Explicitly calling reconcile on archived plan without matching plannedSessionId must reject
  const result = reconcileCompletedSession(untaggedWorkout, archivedV1);
  assert.strictEqual(result, null);
});

test('16. Large-history performance sanity: processes 5,000 history records within milliseconds', () => {
  // Generate 5,000 realistic historical records
  const bigHistory = [];
  const baseTime = new Date('2025-01-01T00:00:00Z').getTime();

  for (let i = 0; i < 5000; i++) {
    bigHistory.push({
      sessionId: `bulk_sess_${i}`,
      workoutId: `w_${i % 10}`,
      completedAt: new Date(baseTime + i * 3600000 * 24).toISOString(),
      completedExerciseIds: ['bench_press', 'barbell_squat'],
      durationSeconds: 2400,
      trainingLoad: 75
    });
  }

  const startTime = Date.now();
  const plan = generateTrainingPlan(profile, {
    referenceDate: fixedAnchor,
    historyRecords: bigHistory
  });
  const durationMs = Date.now() - startTime;

  assert.ok(plan);
  assert.ok(plan.weeks.length > 0);
  // Must execute boundedly in under 100ms
  assert.ok(durationMs < 100, `Expected < 100ms, took ${durationMs}ms`);
});

// Final Summary
console.log('\n====================================================');
console.log(`TOTAL HARDENING TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================\n');

if (totalTests === passedTests) {
  console.log('🎉 ALL PHASE 7.1 HARDENING TESTS PASSED!\n');
} else {
  console.error('❌ SOME HARDENING TESTS FAILED.');
  process.exit(1);
}
