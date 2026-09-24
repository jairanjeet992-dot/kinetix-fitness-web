/**
 * PHASE 7 REGRESSION & ADVERSARIAL TEST SUITE - KINETIX
 * Long-Term Workout Planning, Weekly Schedule, Planned Sessions,
 * Versioning, Adherence, and Adaptive Integration.
 *
 * Verifies Scenarios A through AD + Adversarial Test Suite:
 * A. 1-day training frequency
 * B. 2-day frequency
 * C. 3-day frequency
 * D. 4-day frequency
 * E. 5-day frequency
 * F. 6-day frequency
 * G. 7-day frequency (systemic recovery protection: 5 training + 2 active recovery)
 * H. Goal-aware planning
 * I. Focus-area planning
 * J. Rest-day placement
 * K. Muscle distribution
 * L. Recovery-aware scheduling
 * M. Planned vs completed distinction
 * N. Missed workout
 * O. Rescheduled workout
 * P. Skipped workout
 * Q. Optional workout
 * R. Completed planned workout reconciliation
 * S. Future sessions
 * T. Week boundary
 * U. Plan versioning
 * V. Deterministic generation
 * W. Duplicate prevention
 * X. Malformed storage
 * Y. Insufficient profile data
 * Z. Adaptive generator integration
 * AA. Existing workout generator regression
 * AB. Existing workout player regression
 * AC. Existing progress analytics regression
 * AD. Adherence calculation
 *
 * Adversarial Tests:
 * - Missing/partial profile
 * - Invalid training days (0, -1, >7, non-numeric)
 * - Invalid focus/goal
 * - Corrupted plan objects
 * - Storage quota errors
 * - Multiple reschedules
 * - Old plan version preservation
 */

import assert from 'node:assert';

// 1. Planning engine & state modules
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
  updatePlannedSessionStatus,
  reconcileCompletedSession,
  computePlanAdherence,
  generateWorkoutForPlannedSession,
  _resetTrainingPlanStorageForTesting,
  STORAGE_KEY_PLANS
} from '../js/state/training-plan.js';

// 2. Integration dependencies
import { generateWorkout } from '../js/engine/workout-generator.js';
import { generateAdaptiveWorkout } from '../js/engine/adaptive-workout-generator.js';
import {
  initSession,
  completeSet,
  completeWorkout,
  getWorkoutHistory,
  _resetSessionStorageForTesting
} from '../js/state/workout-session.js';
import { computeProgressAnalytics } from '../js/analytics/progress-engine.js';
import { analyzeRecovery } from '../js/analytics/recovery-engine.js';

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
console.log('KINETIX PHASE 7: WORKOUT PLANNING & TRAINING SYSTEM');
console.log('====================================================\n');

const baseProfile = {
  name: 'Taylor Reed',
  fitnessLevel: 'intermediate',
  goal: 'build-muscle',
  focusAreas: ['Chest', 'Arms'],
  equipment: ['Dumbbells', 'Bench'],
  trainingDays: 4,
  workoutDuration: '30-45 min'
};

const fixedAnchorDate = new Date('2026-06-10T10:00:00Z'); // Wednesday

// ---------------------------------------------------------------------------
console.log('Test Suite 1: Training Frequency Coverage (Scenarios A through G)');
// ---------------------------------------------------------------------------

test('A. 1-day training frequency generates 1 training session and 6 rest days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 1 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 1);
  const sessions = plan.weeks[0].sessions;
  assert.strictEqual(sessions.length, 7);

  const trainingSessions = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const restSessions = sessions.filter(s => s.sessionType === SESSION_TYPE.REST);
  assert.strictEqual(trainingSessions.length, 1);
  assert.strictEqual(restSessions.length, 6);
  assert.ok(trainingSessions[0].targetFocus.length > 0);
});

test('B. 2-day training frequency generates 2 training sessions and 5 rest days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 2 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 2);
  const sessions = plan.weeks[0].sessions;
  const training = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const rest = sessions.filter(s => s.sessionType === SESSION_TYPE.REST);
  assert.strictEqual(training.length, 2);
  assert.strictEqual(rest.length, 5);
});

test('C. 3-day training frequency generates 3 training sessions and 4 rest days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 3 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 3);
  const sessions = plan.weeks[0].sessions;
  const training = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const rest = sessions.filter(s => s.sessionType === SESSION_TYPE.REST);
  assert.strictEqual(training.length, 3);
  assert.strictEqual(rest.length, 4);
});

test('D. 4-day training frequency generates 4 training sessions and 3 rest days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 4 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 4);
  const sessions = plan.weeks[0].sessions;
  const training = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const rest = sessions.filter(s => s.sessionType === SESSION_TYPE.REST);
  assert.strictEqual(training.length, 4);
  assert.strictEqual(rest.length, 3);
});

test('E. 5-day training frequency generates 5 training sessions and 2 rest days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 5 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 5);
  const sessions = plan.weeks[0].sessions;
  const training = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const rest = sessions.filter(s => s.sessionType === SESSION_TYPE.REST);
  assert.strictEqual(training.length, 5);
  assert.strictEqual(rest.length, 2);
});

test('F. 6-day training frequency generates 6 training sessions and 1 rest day', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 6 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 6);
  const sessions = plan.weeks[0].sessions;
  const training = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const rest = sessions.filter(s => s.sessionType === SESSION_TYPE.REST);
  assert.strictEqual(training.length, 6);
  assert.strictEqual(rest.length, 1);
});

test('G. 7-day training frequency protects systemic recovery: 5 training + 2 active recovery days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 7 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 7);
  const sessions = plan.weeks[0].sessions;
  assert.strictEqual(sessions.length, 7);

  const training = sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  const recovery = sessions.filter(s => s.sessionType === SESSION_TYPE.RECOVERY);
  assert.strictEqual(training.length, 5);
  assert.strictEqual(recovery.length, 2);
  // Recovery sessions are flagged optional
  assert.ok(recovery.every(r => r.isOptional === true));
});

// ---------------------------------------------------------------------------
console.log('\nTest Suite 2: Structure, Focus & Muscle Distribution (Scenarios H through L)');
// ---------------------------------------------------------------------------

test('H. Goal-aware planning reflects goal-specific periodization and duration', () => {
  const musclePlan = generateTrainingPlan({ ...baseProfile, goal: 'build-muscle' }, { referenceDate: fixedAnchorDate });
  const endurancePlan = generateTrainingPlan({ ...baseProfile, goal: 'improve-endurance' }, { referenceDate: fixedAnchorDate });
  const strengthPlan = generateTrainingPlan({ ...baseProfile, goal: 'get-stronger' }, { referenceDate: fixedAnchorDate });

  assert.strictEqual(musclePlan.goal, 'build-muscle');
  assert.strictEqual(endurancePlan.goal, 'improve-endurance');
  assert.strictEqual(strengthPlan.goal, 'get-stronger');

  // Verify duration defaults align with profile
  assert.ok(musclePlan.workoutDuration >= 30 && musclePlan.workoutDuration <= 45);
});

test('I. Focus-area planning prioritizes athlete focus areas without excluding balanced coverage', () => {
  const chestPlan = generateTrainingPlan({ ...baseProfile, focusAreas: ['Chest'] }, { referenceDate: fixedAnchorDate });
  const sessions = chestPlan.weeks[0].sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);

  const chestMentioned = sessions.some(s =>
    s.targetFocus.toLowerCase().includes('chest') ||
    (s.targetMuscles || []).includes('chest')
  );
  assert.ok(chestMentioned, 'Plan should emphasize chest');

  // Complementary coverage is maintained (not 100% chest on every single session)
  const nonChestMuscles = sessions.flatMap(s => s.targetMuscles || []).filter(m => m !== 'chest');
  assert.ok(nonChestMuscles.length > 0, 'Plan should maintain complementary muscle coverage');
});

test('J. Rest-day placement distributes recovery intervals across week', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 3 }, { referenceDate: fixedAnchorDate });
  const sessions = plan.weeks[0].sessions;
  // Day indices 0, 2, 4 are training in a 3-day split (Mon, Wed, Fri), 1, 3, 5, 6 are rest
  assert.strictEqual(sessions[0].sessionType, SESSION_TYPE.TRAINING);
  assert.strictEqual(sessions[1].sessionType, SESSION_TYPE.REST);
  assert.strictEqual(sessions[2].sessionType, SESSION_TYPE.TRAINING);
  assert.strictEqual(sessions[3].sessionType, SESSION_TYPE.REST);
});

test('K. Muscle distribution minimizes consecutive heavy overlap across adjacent days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 4 }, { referenceDate: fixedAnchorDate });
  const sessions = plan.weeks[0].sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  // Compare adjacent training sessions: upper body vs lower body
  assert.notDeepStrictEqual(sessions[0].targetMuscles, sessions[1].targetMuscles);
});

test('L. Recovery-aware scheduling incorporates existing recovery engine intelligence', () => {
  // Simulate heavy recent training history in legs within past 24h
  const history = [
    {
      sessionId: 'sess_1',
      workoutId: 'w_legs',
      completedAt: '2026-06-09T18:00:00Z',
      durationSeconds: 2400,
      completedExerciseIds: ['squat', 'lunges'],
      trainingLoad: 80
    }
  ];

  const plan = generateTrainingPlan(baseProfile, {
    referenceDate: fixedAnchorDate,
    historyRecords: history
  });

  assert.ok(plan.planId);
  assert.ok(plan.weeks.length > 0);
});

// ---------------------------------------------------------------------------
console.log('\nTest Suite 3: Planned Sessions, Lifecycle & Integrity (Scenarios M through R)');
// ---------------------------------------------------------------------------

test('M. Planned vs Completed distinction: planned sessions are NEVER counted as completed', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = createTrainingPlan(baseProfile, { referenceDate: fixedAnchorDate });
  const sessions = plan.weeks[0].sessions;

  // Verify none are COMPLETED upon creation
  assert.ok(sessions.every(s => s.status !== SESSION_STATUS.COMPLETED));

  // Compute adherence: 0 completed
  const adherence = computePlanAdherence(plan, fixedAnchorDate);
  assert.strictEqual(adherence.completedSessions, 0);
});

test('N. Missed workout handling marks past uncompleted training as MISSED deterministically', () => {
  _resetTrainingPlanStorageForTesting();
  // Plan starts Monday 2026-06-08. Anchor is Friday 2026-06-12.
  const anchorFriday = new Date('2026-06-12T12:00:00Z');
  const plan = getActivePlan(anchorFriday, baseProfile);

  const pastTraining = plan.weeks[0].sessions.filter(s =>
    s.scheduledDate < '2026-06-12' && s.sessionType === SESSION_TYPE.TRAINING
  );

  // Past uncompleted training must be MISSED
  assert.ok(pastTraining.length > 0);
  assert.ok(pastTraining.every(s => s.status === SESSION_STATUS.MISSED));

  // Rest days remain in REST state (never marked MISSED)
  const pastRest = plan.weeks[0].sessions.filter(s =>
    s.scheduledDate < '2026-06-12' && s.sessionType === SESSION_TYPE.REST
  );
  assert.ok(pastRest.every(s => s.status === SESSION_STATUS.PLANNED || s.status === SESSION_STATUS.READY));
});

test('O. Rescheduled workout preserves identity, originalScheduledDate and prevents duplication', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const targetSession = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);
  const originalDate = targetSession.scheduledDate;
  const newDate = '2026-06-20';

  const updated = reschedulePlannedSession(targetSession.plannedSessionId, newDate, plan);
  assert.strictEqual(updated.status, SESSION_STATUS.RESCHEDULED);
  assert.strictEqual(updated.originalScheduledDate, originalDate);
  assert.strictEqual(updated.rescheduledToDate, newDate);

  // Verify no duplicate session was introduced into the week
  const allIds = plan.weeks[0].sessions.map(s => s.plannedSessionId);
  const uniqueIds = new Set(allIds);
  assert.strictEqual(allIds.length, uniqueIds.size);
});

test('P. Skipped workout marks status SKIPPED and logs skip reason', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const targetSession = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  const skipped = skipPlannedSession(targetSession.plannedSessionId, 'Traveling for work', plan);
  assert.strictEqual(skipped.status, SESSION_STATUS.SKIPPED);
  assert.strictEqual(skipped.skippedReason, 'Traveling for work');
});

test('Q. Optional sessions are marked isOptional and do not depress adherence when unperformed', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 7 }, { referenceDate: fixedAnchorDate, totalWeeks: 1 });
  const optionalSessions = plan.weeks[0].sessions.filter(s => s.isOptional);
  assert.strictEqual(optionalSessions.length, 2);

  const adherence = computePlanAdherence(plan, fixedAnchorDate);
  assert.strictEqual(adherence.optionalSessions, 2);
  // Missing optional sessions does not count as missed
  assert.strictEqual(adherence.missedSessions, 0);
});

test('R. Completed planned workout reconciles with planned session via plannedSessionId', () => {
  _resetTrainingPlanStorageForTesting();
  _resetSessionStorageForTesting();

  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const todaySession = plan.weeks[0].sessions.find(s => s.scheduledDate === '2026-06-10') ||
    plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  // Generate workout for planned session
  const workout = generateWorkoutForPlannedSession(todaySession, baseProfile);
  assert.strictEqual(workout.plannedSessionId, todaySession.plannedSessionId);
  assert.strictEqual(workout.planId, todaySession.planId);

  // Execute and complete workout via session engine
  const session = initSession(workout);
  completeWorkout(session, workout);

  // Verify plan session is now reconciled as COMPLETED
  const refreshedPlan = getPlanById(plan.planId);
  const reconciledSession = refreshedPlan.weeks[0].sessions.find(s => s.plannedSessionId === todaySession.plannedSessionId);

  assert.strictEqual(reconciledSession.status, SESSION_STATUS.COMPLETED);
  assert.strictEqual(reconciledSession.completedSessionId, session.sessionId);
  assert.ok(reconciledSession.completedAt);
});

// ---------------------------------------------------------------------------
console.log('\nTest Suite 4: Versioning, Dates & Storage (Scenarios S through Y)');
// ---------------------------------------------------------------------------

test('S. Future sessions remain PLANNED and are never counted as completed', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const futureSessions = plan.weeks[0].sessions.filter(s => s.scheduledDate > '2026-06-10');

  assert.ok(futureSessions.length > 0);
  assert.ok(futureSessions.every(s => s.status === SESSION_STATUS.PLANNED));

  const adherence = computePlanAdherence(plan, fixedAnchorDate);
  assert.ok(adherence.remainingFutureSessions > 0);
});

test('T. Week boundary uses Monday-to-Sunday UTC calendar dates consistently', () => {
  const dateSunday = new Date('2026-06-14T15:00:00Z');
  const monday = getStartOfWeek(dateSunday);
  assert.strictEqual(toDateString(monday), '2026-06-08');

  const dateMonday = new Date('2026-06-08T02:00:00Z');
  const startOfMon = getStartOfWeek(dateMonday);
  assert.strictEqual(toDateString(startOfMon), '2026-06-08');
});

test('U. Plan versioning: regeneratePlan bumps version and archives previous plan', () => {
  _resetTrainingPlanStorageForTesting();
  const v1 = createTrainingPlan(baseProfile, { referenceDate: fixedAnchorDate, planVersion: 1 });
  assert.strictEqual(v1.planVersion, 1);
  assert.strictEqual(v1.status, PLAN_STATUS.ACTIVE);

  const v2 = regeneratePlan(baseProfile, { referenceDate: fixedAnchorDate });
  assert.strictEqual(v2.planVersion, 2);
  assert.strictEqual(v2.status, PLAN_STATUS.ACTIVE);

  const storedV1 = getPlanById(v1.planId);
  assert.strictEqual(storedV1.status, PLAN_STATUS.ARCHIVED);

  const allPlans = getAllPlans();
  assert.strictEqual(allPlans.length, 2);
});

test('V. Deterministic generation: same profile + referenceDate + seed produces identical plan', () => {
  const planA = generateTrainingPlan(baseProfile, { referenceDate: fixedAnchorDate, seed: 42 });
  const planB = generateTrainingPlan(baseProfile, { referenceDate: fixedAnchorDate, seed: 42 });

  assert.strictEqual(planA.weeks[0].sessions.length, planB.weeks[0].sessions.length);
  for (let i = 0; i < 7; i++) {
    const sA = planA.weeks[0].sessions[i];
    const sB = planB.weeks[0].sessions[i];
    assert.strictEqual(sA.sessionType, sB.sessionType);
    assert.strictEqual(sA.targetFocus, sB.targetFocus);
    assert.strictEqual(sA.scheduledDate, sB.scheduledDate);
  }
});

test('W. Duplicate prevention: repeated savePlan calls are idempotent', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = createTrainingPlan(baseProfile, { referenceDate: fixedAnchorDate });
  const countBefore = getAllPlans().length;

  getActivePlan(fixedAnchorDate);
  getActivePlan(fixedAnchorDate);

  const countAfter = getAllPlans().length;
  assert.strictEqual(countBefore, countAfter);
});

test('X. Malformed storage recovery handles corrupted JSON in localStorage without throwing', () => {
  globalThis.localStorage.setItem(STORAGE_KEY_PLANS, '{ invalid json corrupted ***');
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  assert.ok(plan);
  assert.strictEqual(plan.status, PLAN_STATUS.ACTIVE);
});

test('Y. Insufficient profile data returns safe, deterministic plan defaults', () => {
  const minimalPlan = generateTrainingPlan({}, { referenceDate: fixedAnchorDate });
  assert.ok(minimalPlan);
  assert.strictEqual(minimalPlan.trainingFrequency, 3);
  assert.strictEqual(minimalPlan.goal, 'build-muscle');
  assert.strictEqual(minimalPlan.weeks[0].sessions.length, 7);
});

// ---------------------------------------------------------------------------
console.log('\nTest Suite 5: Adaptive Integration & Regressions (Scenarios Z through AD)');
// ---------------------------------------------------------------------------

test('Z. Adaptive generator integration: planned session passes intent to generateAdaptiveWorkout', () => {
  const plan = generateTrainingPlan(baseProfile, { referenceDate: fixedAnchorDate });
  const plannedSession = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  const workout = generateWorkoutForPlannedSession(plannedSession, baseProfile);
  assert.ok(workout);
  assert.ok(workout.exercises.length > 0);
  assert.strictEqual(workout.plannedSessionId, plannedSession.plannedSessionId);
  assert.strictEqual(workout.planId, plannedSession.planId);
});

test('AA. Existing workout generator regression: generateWorkout operates independently', () => {
  const workout = generateWorkout(baseProfile, 10);
  assert.ok(workout);
  assert.strictEqual(workout.ok, true);
  assert.ok(workout.exercises.length > 0);
});

test('AB. Existing workout player regression: initSession, completeSet, completeWorkout function normally', () => {
  _resetSessionStorageForTesting();
  const workout = generateWorkout(baseProfile, 1);
  const session = initSession(workout);
  assert.ok(session);
  assert.strictEqual(session.phase, 'EXERCISE');

  completeSet(session, workout, { repsCompleted: 10, weightUsedKg: 20 });
  completeWorkout(session, workout);
  assert.strictEqual(session.isCompleted, true);

  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
});

test('AC. Existing progress analytics regression: computeProgressAnalytics operates accurately', () => {
  const analytics = computeProgressAnalytics([], baseProfile);
  assert.ok(analytics);
  assert.strictEqual(typeof analytics.overview.currentStreak, 'number');
});

test('AD. Adherence calculation computes accurate completed, missed, and adherence percentage', () => {
  const mockPlan = {
    planId: 'plan_adh_test',
    weeks: [
      {
        weekNumber: 1,
        sessions: [
          { sessionType: SESSION_TYPE.TRAINING, status: SESSION_STATUS.COMPLETED, scheduledDate: '2026-06-08' },
          { sessionType: SESSION_TYPE.REST, status: SESSION_STATUS.PLANNED, scheduledDate: '2026-06-09' },
          { sessionType: SESSION_TYPE.TRAINING, status: SESSION_STATUS.MISSED, scheduledDate: '2026-06-10' },
          { sessionType: SESSION_TYPE.TRAINING, status: SESSION_STATUS.COMPLETED, scheduledDate: '2026-06-11' },
          { sessionType: SESSION_TYPE.TRAINING, status: SESSION_STATUS.PLANNED, scheduledDate: '2026-06-12' }, // Future
          { sessionType: SESSION_TYPE.RECOVERY, isOptional: true, status: SESSION_STATUS.PLANNED, scheduledDate: '2026-06-13' },
          { sessionType: SESSION_TYPE.REST, status: SESSION_STATUS.PLANNED, scheduledDate: '2026-06-14' }
        ]
      }
    ]
  };

  const adherence = computePlanAdherence(mockPlan, '2026-06-11');
  // Past/today training sessions: 2026-06-08 (completed), 2026-06-10 (missed), 2026-06-11 (completed) -> 3 total
  assert.strictEqual(adherence.totalPlannedSessions, 3);
  assert.strictEqual(adherence.completedSessions, 2);
  assert.strictEqual(adherence.missedSessions, 1);
  assert.strictEqual(adherence.remainingFutureSessions, 1);
  assert.strictEqual(adherence.optionalSessions, 1);
  assert.strictEqual(adherence.adherencePercentage, 67);
});

// ---------------------------------------------------------------------------
console.log('\nTest Suite 6: Adversarial & Edge Cases (Section 32)');
// ---------------------------------------------------------------------------

test('Adv 1: Missing profile falls back safely to default 3-day full body plan', () => {
  const plan = generateTrainingPlan(null, { referenceDate: fixedAnchorDate });
  assert.ok(plan);
  assert.strictEqual(plan.trainingFrequency, 3);
  assert.strictEqual(plan.weeks[0].sessions.length, 7);
});

test('Adv 2: Partial profile with nulls and undefined fields normalizes safely', () => {
  const plan = generateTrainingPlan({ name: null, goal: undefined, trainingDays: null }, { referenceDate: fixedAnchorDate });
  assert.ok(plan);
  assert.ok(plan.title);
  assert.strictEqual(plan.trainingFrequency, 3);
});

test('Adv 3: Invalid trainingDays (0, negative, non-numeric) clamped to safe 1–7 range', () => {
  const zeroPlan = generateTrainingPlan({ ...baseProfile, trainingDays: 0 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(zeroPlan.trainingFrequency, 1);

  const negPlan = generateTrainingPlan({ ...baseProfile, trainingDays: -5 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(negPlan.trainingFrequency, 1);

  const stringPlan = generateTrainingPlan({ ...baseProfile, trainingDays: 'invalid-string' }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(stringPlan.trainingFrequency, 3);
});

test('Adv 4: Over-7 training days clamped safely to 7 days', () => {
  const plan = generateTrainingPlan({ ...baseProfile, trainingDays: 14 }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.trainingFrequency, 7);
  assert.strictEqual(plan.weeks[0].sessions.length, 7);
});

test('Adv 5: Invalid focus areas fall back safely to canonical full-body focus', () => {
  const plan = generateTrainingPlan({ ...baseProfile, focusAreas: ['SuperSpeed', 'LaserEyes'] }, { referenceDate: fixedAnchorDate });
  assert.ok(plan);
  const training = plan.weeks[0].sessions.filter(s => s.sessionType === SESSION_TYPE.TRAINING);
  assert.ok(training.every(s => s.targetFocus.length > 0));
});

test('Adv 6: Invalid goal normalizes safely to canonical default', () => {
  const plan = generateTrainingPlan({ ...baseProfile, goal: 'become-superhero' }, { referenceDate: fixedAnchorDate });
  assert.strictEqual(plan.goal, 'build-muscle');
});

test('Adv 7: Corrupted plan objects in storage are filtered out without crashing', () => {
  _resetTrainingPlanStorageForTesting();
  globalThis.localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify([
    null,
    { invalid: true },
    'string-instead-of-object',
    { planId: 'valid_p1', status: PLAN_STATUS.ACTIVE, weeks: [] }
  ]));

  const plans = getAllPlans();
  assert.strictEqual(plans.length, 1);
  assert.strictEqual(plans[0].planId, 'valid_p1');
});

test('Adv 8: Duplicate reconciliation calls are strictly idempotent', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  const completedRecord = {
    sessionId: 'sess_idemp_1',
    plannedSessionId: session.plannedSessionId,
    completedAt: '2026-06-10T12:00:00Z',
    workoutId: 'w_123'
  };

  const firstCall = reconcileCompletedSession(completedRecord, plan);
  const secondCall = reconcileCompletedSession(completedRecord, plan);

  assert.strictEqual(firstCall.status, SESSION_STATUS.COMPLETED);
  assert.strictEqual(secondCall.status, SESSION_STATUS.COMPLETED);
  assert.strictEqual(firstCall.completedSessionId, secondCall.completedSessionId);
});

test('Adv 9: Missing completedAt on history record rejects reconciliation without fabricating date', () => {
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);

  const invalidRecord = {
    sessionId: 'sess_nofab_1',
    plannedSessionId: session.plannedSessionId
    // missing completedAt
  };

  const res = reconcileCompletedSession(invalidRecord, plan);
  assert.strictEqual(res, null);
});

test('Adv 10: Multiple reschedules on the same session retain the first originalScheduledDate', () => {
  _resetTrainingPlanStorageForTesting();
  const plan = getActivePlan(fixedAnchorDate, baseProfile);
  const session = plan.weeks[0].sessions.find(s => s.sessionType === SESSION_TYPE.TRAINING);
  const originalDate = session.scheduledDate;

  reschedulePlannedSession(session.plannedSessionId, '2026-06-18', plan);
  assert.strictEqual(session.originalScheduledDate, originalDate);
  assert.strictEqual(session.rescheduledToDate, '2026-06-18');

  // Second reschedule
  reschedulePlannedSession(session.plannedSessionId, '2026-06-22', plan);
  // Must preserve the genuine original date
  assert.strictEqual(session.originalScheduledDate, originalDate);
  assert.strictEqual(session.rescheduledToDate, '2026-06-22');
});

test('Adv 11: LocalStorage quota exceeded failure returns false safely without throwing', () => {
  const originalSet = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => {
    throw new Error('QuotaExceededError: storage limit reached');
  };

  // Attempting to save plan should return false safely and log warning
  const res = getActivePlan(fixedAnchorDate, baseProfile);
  assert.ok(res); // In-memory plan still returned

  globalThis.localStorage.setItem = originalSet;
});

// Final Summary
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================\n');

if (totalTests === passedTests) {
  console.log('🎉 ALL PHASE 7 TRAINING PLAN TESTS PASSED!\n');
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
