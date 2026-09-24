/**
 * WORKOUT SESSION STATE & PERSISTENCE - KINETIX
 * Phase 3 & 3.1: Real Guided Workout Session Engine & Hardened State Machine
 *
 * Dedicated state management for active workout execution:
 * - Session lifecycle (IDLE, EXERCISE, REST, COMPLETED, PAUSED)
 * - Multi-set progression and accurate countdown/reps tracking
 * - Bounded wall-clock state-machine recovery loop across arbitrary elapsed time
 * - Deterministic Previous navigation rollback model with stats reconciliation
 * - Lightweight localStorage history persistence with idempotent completion guards
 * - Safety guards against duplicate completion, missing data, and invalid states
 */

import { getExerciseById } from '../data/exercises.js';
import { calculateSessionTrainingLoad } from '../analytics/training-load.js';
import { savePerformanceRecord, createPerformanceRecord, sanitizePerformanceRecord } from '../analytics/performance-tracker.js';
import { reconcileCompletedSession } from './training-plan.js';

export const STORAGE_KEY_SESSION = 'kinetix_active_workout_session';
export const STORAGE_KEY_HISTORY = 'kinetix_workout_history';

/**
 * Determines whether an exercise is time-based (countdown) or rep-based.
 */
export function isTimedExercise(ex) {
  if (!ex) return false;
  if (ex.exerciseType === 'strength') return false;
  if (ex.exerciseType === 'timed') return true;
  if (typeof ex.defaultReps === 'string') {
    const trimmed = ex.defaultReps.trim().toLowerCase();
    if (/\b\d+\s*(s|sec|secs|seconds|min|mins|minutes)\b/.test(trimmed) || /^\d+s$/.test(trimmed)) {
      return true;
    }
  }
  if (!ex.defaultReps && typeof ex.defaultDurationSec === 'number' && ex.defaultDurationSec > 0) {
    return true;
  }
  return false;
}

/**
 * Normalizes an exercise into a standardized routine step.
 */
function createRoutineItem(ex, sets, restSec, stage = 'main') {
  const isTimed = isTimedExercise(ex);
  let defaultDurationSec = 40;
  if (typeof ex.defaultDurationSec === 'number' && ex.defaultDurationSec > 0) {
    defaultDurationSec = ex.defaultDurationSec;
  } else if (isTimed && typeof ex.defaultReps === 'string') {
    const match = ex.defaultReps.match(/\d+/);
    if (match) defaultDurationSec = parseInt(match[0], 10);
  }

  let instructionsList = [];
  if (Array.isArray(ex.instructions)) {
    instructionsList = ex.instructions.filter(Boolean);
  } else if (typeof ex.instructions === 'string' && ex.instructions.trim()) {
    instructionsList = [ex.instructions.trim()];
  } else {
    instructionsList = ['Maintain steady breathing and controlled form throughout the movement.'];
  }

  const primaryMuscle = ex.primaryMuscle
    || (Array.isArray(ex.primaryMuscles) && ex.primaryMuscles[0] ? (ex.primaryMuscles[0].charAt(0).toUpperCase() + ex.primaryMuscles[0].slice(1)) : 'General');

  return {
    id: ex.id,
    name: ex.name || 'Exercise',
    primaryMuscle,
    difficulty: ex.difficulty || 'Intermediate',
    equipment: Array.isArray(ex.equipment) ? ex.equipment.join(', ') : (ex.equipment || 'Bodyweight'),
    instructions: instructionsList,
    svgType: ex.svgType || (ex.media && ex.media.svgType) || 'upper-push',
    media: ex.media || { type: 'placeholder', svgType: ex.svgType || 'upper-push' },
    exerciseType: ex.exerciseType || (isTimed ? 'timed' : 'strength'),
    isTimed,
    targetReps: ex.defaultReps || (isTimed ? `${defaultDurationSec}s` : '10-12 Reps'),
    targetDurationSec: defaultDurationSec,
    restSeconds: Number(restSec) || Number(ex.defaultRestSeconds) || 45,
    totalSets: Math.max(1, sets),
    stage
  };
}

/**
 * Builds an array of resolved routine items for a workout.
 * Supports both generated workouts (warmup, main, cooldown) and static workouts (exerciseIds).
 */
export function getRoutineItems(workout) {
  if (!workout) return [];

  // Case 1: Generated workout with distinct warmup, main exercises, and cooldown
  if (Array.isArray(workout.warmup) || Array.isArray(workout.exercises) || Array.isArray(workout.cooldown)) {
    const items = [];
    const mainSets = Number(workout.rounds) || 3;
    const restSec = Number(workout.restBetweenExercisesSec) || 45;

    (workout.warmup || []).forEach(raw => {
      const ex = typeof raw === 'string' ? getExerciseById(raw) : raw;
      if (ex) items.push(createRoutineItem(ex, 1, restSec, 'warmup'));
    });

    (workout.exercises || []).forEach(raw => {
      const ex = typeof raw === 'string' ? getExerciseById(raw) : raw;
      if (ex) items.push(createRoutineItem(ex, mainSets, restSec, 'main'));
    });

    (workout.cooldown || []).forEach(raw => {
      const ex = typeof raw === 'string' ? getExerciseById(raw) : raw;
      if (ex) items.push(createRoutineItem(ex, 1, restSec, 'cooldown'));
    });

    if (items.length > 0) return items;
  }

  // Case 2: Static workout or exerciseIds array
  if (Array.isArray(workout.exerciseIds) && workout.exerciseIds.length > 0) {
    const mainSets = Number(workout.rounds) || 3;
    const restSec = Number(workout.restBetweenExercisesSec) || 45;
    return workout.exerciseIds
      .map(id => getExerciseById(id))
      .filter(Boolean)
      .map(ex => createRoutineItem(ex, mainSets, restSec, 'main'));
  }

  return [];
}

/**
 * Initializes a new workout session from a workout object and persists it.
 */
export function initSession(workout) {
  if (!workout) return null;
  const routine = getRoutineItems(workout);
  if (!routine || routine.length === 0) return null;

  const firstEx = routine[0];
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const session = {
    sessionId,
    workoutId: workout.id,
    workoutTitle: workout.title || 'Workout Session',
    plannedSessionId: (workout && workout.plannedSessionId) || null,
    planId: (workout && workout.planId) || null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSet: 1,
    totalSets: firstEx.totalSets,
    phase: 'EXERCISE', // 'EXERCISE' | 'REST' | 'COMPLETED'
    isPaused: false,
    isCompleted: false,
    elapsedSeconds: 0,
    remainingSeconds: firstEx.isTimed ? firstEx.targetDurationSec : 0,
    phaseDurationSec: firstEx.isTimed ? firstEx.targetDurationSec : 0,
    phaseStartedAt: Date.now(),
    lastTickAt: Date.now(),
    completedExercises: [],
    completedSets: 0,
    skippedExercises: [],
    performanceLogs: []
  };

  saveActiveSession(session);
  return session;
}

/**
 * Safely retrieves the active workout session from localStorage.
 */
export function getActiveSession() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.sessionId || !parsed.workoutId) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to parse active workout session from localStorage:', err);
    return null;
  }
}

/**
 * Safely saves the active workout session to localStorage.
 */
export function saveActiveSession(session) {
  if (!session) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    session.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    return true;
  } catch (err) {
    console.warn('Failed to save active workout session to localStorage:', err);
    return false;
  }
}

/**
 * Safely clears the active workout session from localStorage.
 */
export function clearActiveSession() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (err) {
    console.warn('Failed to clear active workout session from localStorage:', err);
  }
}

/**
 * Recovers active session state on browser reload/crash/backgrounding.
 *
 * Implements a bounded state-machine recovery loop:
 * - Calculates total wall-clock elapsed time.
 * - Paused sessions preserve their remaining countdown without consuming wall time.
 * - Timed exercises and rest intervals advance phase-by-phase as time elapses.
 * - Rep-based exercises DO NOT auto-complete from wall time (waits for athlete input).
 * - Completed sessions are never recovered/replayed.
 * - Includes a hard safety iteration limit to protect against corrupt data.
 */
export function recoverSession(session, workout) {
  if (!session || session.isCompleted) return session;
  if (session.isPaused) return session; // Paused sessions preserve their exact remaining time

  const now = Date.now();
  const lastActive = session.lastTickAt || session.phaseStartedAt;

  // Validate timestamps - safe handling of corrupt/invalid/future timestamps
  if (typeof lastActive !== 'number' || isNaN(lastActive) || lastActive <= 0 || lastActive > now + 60000) {
    session.lastTickAt = now;
    session.phaseStartedAt = now;
    saveActiveSession(session);
    return session;
  }

  const elapsedWallSec = Math.max(0, Math.floor((now - lastActive) / 1000));
  if (elapsedWallSec === 0) {
    session.lastTickAt = now;
    return session;
  }

  // Account for all elapsed wall-clock time in overall workout duration
  session.elapsedSeconds = (session.elapsedSeconds || 0) + elapsedWallSec;
  session.lastTickAt = now;

  const routine = getRoutineItems(workout);
  if (!routine || routine.length === 0) {
    saveActiveSession(session);
    return session;
  }

  // Bounded state-machine recovery loop
  let remainingWallSec = elapsedWallSec;
  let iterations = 0;
  const MAX_ITERATIONS = Math.max(100, routine.length * 20);

  while (remainingWallSec > 0 && !session.isCompleted && iterations < MAX_ITERATIONS) {
    iterations++;
    const safeIdx = Math.min(Math.max(0, session.currentExerciseIndex || 0), routine.length - 1);
    const currentEx = routine[safeIdx];
    if (!currentEx) break;

    if (session.phase === 'REST') {
      const restRemaining = Math.max(0, session.remainingSeconds || 0);
      if (remainingWallSec >= restRemaining) {
        // Rest interval completely expired while user was away
        remainingWallSec -= restRemaining;
        session = skipRest(session, workout);
        // session.phase is now 'EXERCISE'
      } else {
        // Returned partway through rest interval
        session.remainingSeconds = restRemaining - remainingWallSec;
        remainingWallSec = 0;
      }
    } else if (session.phase === 'EXERCISE') {
      if (currentEx.isTimed) {
        const exRemaining = Math.max(0, session.remainingSeconds || 0);
        if (remainingWallSec >= exRemaining) {
          // Timed exercise interval completely expired while user was away
          remainingWallSec -= exRemaining;
          session = completeSet(session, workout);
          // session.phase is now 'REST' or 'COMPLETED'
        } else {
          // Returned partway through timed exercise
          session.remainingSeconds = exRemaining - remainingWallSec;
          remainingWallSec = 0;
        }
      } else {
        // REP-BASED EXERCISE:
        // Must NOT automatically complete from elapsed wall time.
        // Stop consuming remaining countdown so user can manually perform/complete set.
        remainingWallSec = 0;
      }
    } else {
      // Completed or terminal state
      break;
    }
  }

  session.phaseStartedAt = now;
  session.lastTickAt = now;
  saveActiveSession(session);
  return session;
}

/**
 * Pauses an active session.
 */
export function pauseSession(session) {
  if (!session || session.isCompleted) return session;
  session.isPaused = true;
  session.lastTickAt = Date.now();
  saveActiveSession(session);
  return session;
}

/**
 * Resumes a paused session.
 */
export function resumeSession(session) {
  if (!session || session.isCompleted) return session;
  session.isPaused = false;
  session.lastTickAt = Date.now();
  session.phaseStartedAt = Date.now();
  saveActiveSession(session);
  return session;
}

/**
 * Advances the session after completing a set.
 * Optionally logs performance data for the completed set.
 *
 * @param {Object} session
 * @param {Object} workout
 * @param {Object|null} [setLogData=null]
 * @returns {Object}
 */
export function completeSet(session, workout, setLogData = null) {
  if (!session || session.isCompleted) return session;
  if (session.phase === 'REST') return session; // Prevent duplicate set completions while resting

  const routine = getRoutineItems(workout);
  const currentEx = routine[session.currentExerciseIndex];
  if (!currentEx) return session;

  // Optional Performance Record Logging (Phase 5)
  if (setLogData && typeof setLogData === 'object') {
    const rawSetNumber = Number(setLogData.setNumber) || session.currentSet;
    const perfRecord = createPerformanceRecord({
      sessionId: session.sessionId,
      workoutId: session.workoutId,
      exerciseId: currentEx.id,
      setNumber: rawSetNumber,
      weight: setLogData.weight,
      weightKg: setLogData.weightKg,
      unit: setLogData.unit || 'kg',
      reps: setLogData.reps,
      durationSeconds: setLogData.durationSeconds !== undefined ? setLogData.durationSeconds : (setLogData.duration !== undefined ? setLogData.duration : null),
      distanceMeters: setLogData.distanceMeters !== undefined ? setLogData.distanceMeters : (setLogData.distance !== undefined ? setLogData.distance : null),
      isCompleted: setLogData.completed !== false && setLogData.isCompleted !== false,
      completedAt: (typeof setLogData.completedAt === 'string' && setLogData.completedAt.trim().length > 0) ? setLogData.completedAt.trim() : null
    });

    if (perfRecord) {
      savePerformanceRecord(perfRecord);
      session.performanceLogs = session.performanceLogs || [];
      const existingIdx = session.performanceLogs.findIndex(p =>
        p.id === perfRecord.id ||
        (p.exerciseId === perfRecord.exerciseId && p.setNumber === perfRecord.setNumber)
      );
      if (existingIdx >= 0) {
        session.performanceLogs[existingIdx] = perfRecord;
      } else {
        session.performanceLogs.push(perfRecord);
      }
    }
  }

  session.completedSets = (session.completedSets || 0) + 1;

  if (session.currentSet < session.totalSets) {
    // Advance to next set with rest interval in between
    session.currentSet++;
    session.phase = 'REST';
    session.phaseDurationSec = currentEx.restSeconds;
    session.remainingSeconds = currentEx.restSeconds;
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // All sets for this exercise completed
  if (!session.completedExercises.includes(currentEx.id)) {
    session.completedExercises.push(currentEx.id);
  }
  // Ensure if it was previously marked skipped, clean from skippedExercises
  session.skippedExercises = (session.skippedExercises || []).filter(id => id !== currentEx.id);

  if (session.currentExerciseIndex < routine.length - 1) {
    // Move to next exercise with rest interval in between
    session.currentExerciseIndex++;
    const nextEx = routine[session.currentExerciseIndex];
    session.currentSet = 1;
    session.totalSets = nextEx.totalSets;
    session.phase = 'REST';
    session.phaseDurationSec = currentEx.restSeconds;
    session.remainingSeconds = currentEx.restSeconds;
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // Final exercise and final set completed!
  return completeWorkout(session, workout);
}

/**
 * Skips the active rest interval and immediately begins the next set/exercise.
 */
export function skipRest(session, workout) {
  if (!session || session.phase !== 'REST') return session;

  const routine = getRoutineItems(workout);
  const currentEx = routine[session.currentExerciseIndex];

  session.phase = 'EXERCISE';
  if (currentEx && currentEx.isTimed) {
    session.remainingSeconds = currentEx.targetDurationSec;
    session.phaseDurationSec = currentEx.targetDurationSec;
  } else {
    session.remainingSeconds = 0;
    session.phaseDurationSec = 0;
  }
  session.phaseStartedAt = Date.now();
  session.lastTickAt = Date.now();
  saveActiveSession(session);
  return session;
}

/**
 * Skips the current exercise entirely and advances to the next one.
 */
export function skipExercise(session, workout) {
  if (!session || session.isCompleted) return session;

  const routine = getRoutineItems(workout);
  const currentEx = routine[session.currentExerciseIndex];

  if (currentEx && !session.skippedExercises.includes(currentEx.id)) {
    session.skippedExercises.push(currentEx.id);
  }
  // If previously marked completed, clean up
  if (currentEx) {
    session.completedExercises = (session.completedExercises || []).filter(id => id !== currentEx.id);
  }

  if (session.currentExerciseIndex < routine.length - 1) {
    session.currentExerciseIndex++;
    const nextEx = routine[session.currentExerciseIndex];
    session.currentSet = 1;
    session.totalSets = nextEx.totalSets;
    session.phase = 'EXERCISE';
    if (nextEx.isTimed) {
      session.remainingSeconds = nextEx.targetDurationSec;
      session.phaseDurationSec = nextEx.targetDurationSec;
    } else {
      session.remainingSeconds = 0;
      session.phaseDurationSec = 0;
    }
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // Skipped last exercise completes the workout
  return completeWorkout(session, workout);
}

/**
 * Returns to previous exercise/set with deterministic state rollback.
 *
 * DETERMINISTIC ROLLBACK MODEL:
 * 1. If currently in REST phase:
 *    - The user completed a set just before entering REST.
 *    - Resting between sets of the same exercise (currentSet > 1):
 *      Rewind back to (currentSet - 1) in EXERCISE phase, decrementing completedSets.
 *    - Resting between exercises (currentSet === 1 and currentExerciseIndex > 0):
 *      Rewind back to the final set of (currentExerciseIndex - 1) in EXERCISE phase,
 *      decrementing completedSets and removing the previous exercise from completedExercises/skippedExercises.
 *
 * 2. If currently in EXERCISE phase:
 *    - If currentSet > 1:
 *      Rewind to (currentSet - 1) in EXERCISE phase, decrementing completedSets.
 *    - If currentSet === 1 and currentExerciseIndex > 0:
 *      Rewind to the final set of (currentExerciseIndex - 1) in EXERCISE phase,
 *      decrementing completedSets and removing the previous exercise from completedExercises/skippedExercises.
 *    - If at Exercise 0, Set 1:
 *      Cannot rewind further; state remains safely unchanged.
 */
export function previousExercise(session, workout) {
  if (!session || session.isCompleted) return session;

  const routine = getRoutineItems(workout);
  if (!routine || routine.length === 0) return session;

  // Case 1: In REST phase
  if (session.phase === 'REST') {
    if (session.currentSet > 1) {
      // Resting after completing (currentSet - 1). Rewind back to that set.
      session.currentSet = session.currentSet - 1;
      session.completedSets = Math.max(0, (session.completedSets || 0) - 1);
      session.phase = 'EXERCISE';

      const currentEx = routine[session.currentExerciseIndex];
      if (currentEx && currentEx.isTimed) {
        session.remainingSeconds = currentEx.targetDurationSec;
        session.phaseDurationSec = currentEx.targetDurationSec;
      } else {
        session.remainingSeconds = 0;
        session.phaseDurationSec = 0;
      }
      session.phaseStartedAt = Date.now();
      session.lastTickAt = Date.now();
      saveActiveSession(session);
      return session;
    } else if (session.currentExerciseIndex > 0) {
      // Resting after completing previous exercise. Rewind to final set of that exercise.
      session.currentExerciseIndex = session.currentExerciseIndex - 1;
      const prevEx = routine[session.currentExerciseIndex];
      session.totalSets = prevEx.totalSets;
      session.currentSet = prevEx.totalSets;
      session.completedSets = Math.max(0, (session.completedSets || 0) - 1);

      // Reconcile completed & skipped records
      session.completedExercises = (session.completedExercises || []).filter(id => id !== prevEx.id);
      session.skippedExercises = (session.skippedExercises || []).filter(id => id !== prevEx.id);
      session.phase = 'EXERCISE';

      if (prevEx.isTimed) {
        session.remainingSeconds = prevEx.targetDurationSec;
        session.phaseDurationSec = prevEx.targetDurationSec;
      } else {
        session.remainingSeconds = 0;
        session.phaseDurationSec = 0;
      }
      session.phaseStartedAt = Date.now();
      session.lastTickAt = Date.now();
      saveActiveSession(session);
      return session;
    }

    // At index 0, set 1: simply cancel rest and return to exercise
    session.phase = 'EXERCISE';
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // Case 2: In EXERCISE phase
  if (session.currentSet > 1) {
    // Rewind one set within same exercise
    session.currentSet = session.currentSet - 1;
    session.completedSets = Math.max(0, (session.completedSets || 0) - 1);
    session.phase = 'EXERCISE';

    const currentEx = routine[session.currentExerciseIndex];
    if (currentEx && currentEx.isTimed) {
      session.remainingSeconds = currentEx.targetDurationSec;
      session.phaseDurationSec = currentEx.targetDurationSec;
    } else {
      session.remainingSeconds = 0;
      session.phaseDurationSec = 0;
    }
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  if (session.currentExerciseIndex > 0) {
    // Rewind to previous exercise's final set
    session.currentExerciseIndex = session.currentExerciseIndex - 1;
    const prevEx = routine[session.currentExerciseIndex];
    session.totalSets = prevEx.totalSets;
    session.currentSet = prevEx.totalSets;
    session.completedSets = Math.max(0, (session.completedSets || 0) - 1);

    // Reconcile completed & skipped records
    session.completedExercises = (session.completedExercises || []).filter(id => id !== prevEx.id);
    session.skippedExercises = (session.skippedExercises || []).filter(id => id !== prevEx.id);
    session.phase = 'EXERCISE';

    if (prevEx.isTimed) {
      session.remainingSeconds = prevEx.targetDurationSec;
      session.phaseDurationSec = prevEx.targetDurationSec;
    } else {
      session.remainingSeconds = 0;
      session.phaseDurationSec = 0;
    }
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // At Exercise 0, Set 1: cannot rewind further
  return session;
}

/**
 * Validates and normalizes a workout history record.
 * Handles backward compatibility with Phase 3.1 records, sanitizes data types,
 * prevents corrupt values from crashing the application, and computes deterministic training load.
 *
 * Data Integrity Invariants (Phase 4.1):
 * - Records with missing or invalid timestamps are rejected safely (returns null).
 * - Current time is NEVER used as a replacement for missing timestamps.
 * - Missing calories are NEVER fabricated; preserved as null.
 * - Missing goal or difficulty are preserved as null (never defaulted to fake values).
 *
 * @param {Object} raw - Raw history record.
 * @returns {Object|null} Sanitized record, or null if fatally invalid.
 */
export function sanitizeHistoryRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Essential IDs: sessionId is required
  const sessionId = typeof raw.sessionId === 'string' && raw.sessionId.trim().length > 0
    ? raw.sessionId.trim()
    : null;
  if (!sessionId) return null;

  // Timestamps validation: MUST have valid completedAt timestamp (never fabricate with now)
  const rawCompletedAt = raw.completedAt;
  if (!rawCompletedAt || typeof rawCompletedAt !== 'string') return null;
  const completedTime = new Date(rawCompletedAt).getTime();
  if (isNaN(completedTime) || completedTime <= 0) return null; // Reject missing/invalid timestamp

  const completedAt = rawCompletedAt;

  // startedAt validation: if valid use it, otherwise match completedAt (never fabricate with now)
  let startedAt = completedAt;
  if (raw.startedAt && typeof raw.startedAt === 'string') {
    const startedTime = new Date(raw.startedAt).getTime();
    if (!isNaN(startedTime) && startedTime > 0) {
      startedAt = raw.startedAt;
    }
  }

  const workoutId = typeof raw.workoutId === 'string' && raw.workoutId.trim().length > 0
    ? raw.workoutId.trim()
    : 'workout-custom';

  const title = typeof raw.title === 'string' && raw.title.trim().length > 0
    ? raw.title.trim()
    : (typeof raw.workoutTitle === 'string' && raw.workoutTitle.trim().length > 0
        ? raw.workoutTitle.trim()
        : 'Workout Session');

  // Duration normalization
  let durationSeconds = 0;
  if (Number.isFinite(raw.durationSeconds) && raw.durationSeconds > 0) {
    durationSeconds = Math.round(raw.durationSeconds);
  } else if (Number.isFinite(raw.duration) && raw.duration > 0) {
    durationSeconds = Math.round(raw.duration);
  } else if (Number.isFinite(raw.actualDuration) && raw.actualDuration > 0) {
    durationSeconds = Math.round(raw.actualDuration);
  } else if (Number.isFinite(raw.actualDurationMinutes) && raw.actualDurationMinutes > 0) {
    durationSeconds = Math.round(raw.actualDurationMinutes * 60);
  } else {
    const diff = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    durationSeconds = diff > 0 ? diff : 0;
  }

  // Sets normalization
  const rawSets = raw.setsCompleted ?? raw.completedSets ?? 0;
  const setsCompleted = Number.isFinite(Number(rawSets)) && Number(rawSets) >= 0 ? Math.round(Number(rawSets)) : 0;
  const rawTotalSets = raw.totalSets ?? setsCompleted;
  const totalSets = Number.isFinite(Number(rawTotalSets)) && Number(rawTotalSets) >= setsCompleted ? Math.round(Number(rawTotalSets)) : setsCompleted;

  // Exercises arrays and counts
  const completedExerciseIds = Array.isArray(raw.completedExerciseIds)
    ? raw.completedExerciseIds.filter(id => typeof id === 'string' && id.trim().length > 0)
    : (Array.isArray(raw.completedExercises)
        ? raw.completedExercises.filter(id => typeof id === 'string' && id.trim().length > 0)
        : []);

  const skippedExerciseIds = Array.isArray(raw.skippedExerciseIds)
    ? raw.skippedExerciseIds.filter(id => typeof id === 'string' && id.trim().length > 0)
    : (Array.isArray(raw.skippedExercises)
        ? raw.skippedExercises.filter(id => typeof id === 'string' && id.trim().length > 0)
        : []);

  const exercisesCompleted = Number.isFinite(Number(raw.exercisesCompleted))
    ? Math.max(0, Math.round(Number(raw.exercisesCompleted)))
    : completedExerciseIds.length;

  const skippedExercises = Number.isFinite(Number(raw.skippedExercises))
    ? Math.max(0, Math.round(Number(raw.skippedExercises)))
    : skippedExerciseIds.length;

  // Calories: Never fabricate calories if missing; preserve as null
  const rawCalories = Number(raw.estimatedCalories);
  const estimatedCalories = Number.isFinite(rawCalories) && rawCalories > 0
    ? Math.round(rawCalories)
    : null;

  // Goal & Difficulty: Never fabricate fake defaults; preserve as null if unknown
  const rawGoal = typeof raw.workoutGoal === 'string' && raw.workoutGoal.trim().length > 0
    ? raw.workoutGoal.trim().toLowerCase()
    : (typeof raw.goal === 'string' && raw.goal.trim().length > 0 ? raw.goal.trim().toLowerCase() : null);
  const workoutGoal = rawGoal || null;

  const rawDifficulty = typeof raw.workoutDifficulty === 'string' && raw.workoutDifficulty.trim().length > 0
    ? raw.workoutDifficulty.trim().toLowerCase()
    : (typeof raw.difficulty === 'string' && raw.difficulty.trim().length > 0 ? raw.difficulty.trim().toLowerCase() : null);
  const workoutDifficulty = rawDifficulty || null;

  // Completion percentage
  const rawPercent = Number(raw.completionPercentage);
  const completionPercentage = Number.isFinite(rawPercent) && rawPercent >= 0 && rawPercent <= 100
    ? Math.round(rawPercent)
    : (totalSets > 0 ? Math.min(100, Math.round((setsCompleted / totalSets) * 100)) : 100);

  // Requested duration: preserve null if missing
  const requestedDuration = Number.isFinite(Number(raw.requestedDuration))
    ? Number(raw.requestedDuration)
    : (Number.isFinite(Number(raw.requestedDurationMinutes)) ? Number(raw.requestedDurationMinutes) : null);

  const sanitized = {
    sessionId,
    workoutId,
    title,
    workoutTitle: title,
    startedAt,
    completedAt,
    durationSeconds,
    duration: durationSeconds,
    actualDuration: durationSeconds,
    actualDurationMinutes: Math.round((durationSeconds / 60) * 10) / 10,
    requestedDuration,
    exercisesCompleted,
    completedExerciseIds,
    skippedExercises,
    skippedExerciseIds,
    totalSets,
    setsCompleted,
    completedSets: setsCompleted,
    workoutGoal,
    workoutDifficulty,
    estimatedCalories,
    completionPercentage,
    trainingLoad: 0
  };

  if (typeof raw.plannedSessionId === 'string' && raw.plannedSessionId.trim().length > 0) {
    sanitized.plannedSessionId = raw.plannedSessionId.trim();
  }
  if (typeof raw.planId === 'string' && raw.planId.trim().length > 0) {
    sanitized.planId = raw.planId.trim();
  }

  // Phase 5 Performance Tracking
  if (Array.isArray(raw.performanceLogs)) {
    sanitized.performanceLogs = raw.performanceLogs
      .map(p => sanitizePerformanceRecord(p))
      .filter(Boolean);
  }
  if (Number.isFinite(Number(raw.totalVolumeKg)) && Number(raw.totalVolumeKg) >= 0) {
    sanitized.totalVolumeKg = Math.round(Number(raw.totalVolumeKg) * 10) / 10;
  }

  sanitized.trainingLoad = Number.isFinite(Number(raw.trainingLoad)) && Number(raw.trainingLoad) > 0
    ? Math.round(Number(raw.trainingLoad))
    : calculateSessionTrainingLoad(sanitized);

  return sanitized;
}

/**
 * Completes the workout session and records it in local workout history.
 * Prevents duplicate completion (strictly idempotent).
 */
export function completeWorkout(session, workout) {
  if (!session) return null;
  if (session.isCompleted) return session; // Idempotent guard

  session.phase = 'COMPLETED';
  session.isCompleted = true;
  session.isPaused = false;
  session.updatedAt = new Date().toISOString();

  const routine = getRoutineItems(workout);
  let totalRoutineSets = 0;
  if (routine && routine.length > 0) {
    routine.forEach(item => {
      totalRoutineSets += (item.totalSets || 1);
    });
  }

  const durationSec = Math.max(1, session.elapsedSeconds || 1);
  const estCalories = (workout && typeof workout.estimatedCalories === 'number' && Number.isFinite(workout.estimatedCalories) && workout.estimatedCalories > 0)
    ? Math.round(workout.estimatedCalories)
    : null;

  const completedSetsCount = Math.max(0, session.completedSets || 0);
  const completedIds = Array.isArray(session.completedExercises) ? [...session.completedExercises] : [];
  const skippedIds = Array.isArray(session.skippedExercises) ? [...session.skippedExercises] : [];

  const perfLogs = Array.isArray(session.performanceLogs) ? session.performanceLogs : [];
  const totalVolumeKg = perfLogs.reduce((acc, log) => acc + (Number(log.volumeKg) || 0), 0);

  const rawRecord = {
    sessionId: session.sessionId,
    workoutId: session.workoutId,
    plannedSessionId: session.plannedSessionId || (workout && workout.plannedSessionId) || null,
    planId: session.planId || (workout && workout.planId) || null,
    title: session.workoutTitle || (workout && workout.title) || 'Workout Session',
    workoutTitle: session.workoutTitle || (workout && workout.title) || 'Workout Session',
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    durationSeconds: durationSec,
    duration: durationSec,
    actualDuration: durationSec,
    actualDurationMinutes: Math.round((durationSec / 60) * 10) / 10,
    requestedDuration: (workout && (workout.requestedDurationMinutes || workout.durationMinutes)) || null,
    exercisesCompleted: completedIds.length,
    completedExerciseIds: completedIds,
    skippedExercises: skippedIds.length,
    skippedExerciseIds: skippedIds,
    totalSets: Math.max(totalRoutineSets, completedSetsCount),
    setsCompleted: completedSetsCount,
    completedSets: completedSetsCount,
    performanceLogs: perfLogs,
    totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
    workoutGoal: (workout && workout.goal) || session.workoutGoal || null,
    workoutDifficulty: (workout && workout.difficulty) || session.workoutDifficulty || null,
    estimatedCalories: estCalories,
    completionPercentage: totalRoutineSets > 0 ? Math.min(100, Math.round((completedSetsCount / totalRoutineSets) * 100)) : 100
  };

  const historyRecord = sanitizeHistoryRecord(rawRecord);
  saveWorkoutHistoryRecord(historyRecord);
  try {
    reconcileCompletedSession(historyRecord);
  } catch (err) {
    // Non-fatal training plan reconciliation
    console.warn('Plan reconciliation note:', err);
  }
  saveActiveSession(session);
  return session;
}

/**
 * Retrieves the list of completed workout history records from localStorage.
 * Automatically sanitizes records and gracefully handles corrupt storage.
 */
export function getWorkoutHistory() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sanitize records and drop fatal corruptions
    return parsed
      .map(item => sanitizeHistoryRecord(item))
      .filter(Boolean);
  } catch (err) {
    console.warn('Failed to parse workout history from localStorage:', err);
    return [];
  }
}

/**
 * Saves a workout completion record to history, preventing duplicate session entries.
 */
export function saveWorkoutHistoryRecord(record) {
  const sanitized = sanitizeHistoryRecord(record);
  if (!sanitized) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const history = getWorkoutHistory();
    const exists = history.some(h => h && h.sessionId === sanitized.sessionId);
    if (!exists) {
      history.unshift(sanitized);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }
    return true;
  } catch (err) {
    console.warn('Failed to persist workout history record:', err);
    return false;
  }
}

/**
 * Calculates current and overall progress metrics from session state and routine items.
 *
 * Guarantees:
 * - Never negative
 * - Never exceeds 100%
 * - Monotonic during forward execution
 * - Immediately reaches 100% upon completion
 */
export function calculateWorkoutProgress(session, routine) {
  if (!session || !routine || routine.length === 0) {
    return { exerciseIndex: 1, totalExercises: 1, overallPercent: 0, currentSet: 1, totalSets: 1 };
  }

  const totalExercises = routine.length;
  const currentExerciseIndex = Math.min(Math.max(0, session.currentExerciseIndex || 0), totalExercises - 1);
  const currentItem = routine[currentExerciseIndex];

  let totalRoutineSets = 0;
  routine.forEach(item => {
    totalRoutineSets += (item.totalSets || 1);
  });

  const completedSets = Math.min(Math.max(0, session.completedSets || 0), totalRoutineSets);
  let overallPercent = 0;
  if (session.isCompleted) {
    overallPercent = 100;
  } else if (totalRoutineSets > 0) {
    overallPercent = Math.min(99, Math.round((completedSets / totalRoutineSets) * 100));
  }

  return {
    exerciseIndex: currentExerciseIndex + 1,
    totalExercises,
    overallPercent: Math.max(0, Math.min(100, overallPercent)),
    currentSet: Math.max(1, Math.min(session.currentSet || 1, (currentItem && currentItem.totalSets) || 1)),
    totalSets: (currentItem && currentItem.totalSets) || 1
  };
}

/**
 * Testing helper to reset all session and history storage.
 */
export function _resetSessionStorageForTesting() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (_) {}
  }
}
