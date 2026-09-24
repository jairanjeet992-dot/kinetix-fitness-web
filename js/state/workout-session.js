/**
 * WORKOUT SESSION STATE & PERSISTENCE - KINETIX
 * Phase 3: Real Guided Workout Session Engine
 *
 * Dedicated state management for active workout execution:
 * - Session lifecycle (IDLE, EXERCISE, REST, COMPLETED, PAUSED)
 * - Multi-set progression and accurate countdown/reps tracking
 * - True reload/crash recovery without resetting timers
 * - Lightweight localStorage history persistence
 * - Safety guards against duplicate completion, missing data, and invalid states
 */

import { getExerciseById } from '../data/exercises.js';

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
    skippedExercises: []
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
 * Recovers active session state on browser reload/crash, calculating elapsed time.
 */
export function recoverSession(session, workout) {
  if (!session || session.isCompleted) return session;
  if (session.isPaused) return session; // Paused sessions preserve their exact remaining time

  const now = Date.now();
  const lastActive = session.lastTickAt || session.phaseStartedAt || now;
  const deltaSec = Math.max(0, Math.floor((now - lastActive) / 1000));

  if (deltaSec > 0) {
    session.elapsedSeconds = (session.elapsedSeconds || 0) + deltaSec;
    session.lastTickAt = now;

    if (session.phase === 'REST' || (session.phase === 'EXERCISE' && session.remainingSeconds > 0)) {
      session.remainingSeconds = Math.max(0, session.remainingSeconds - deltaSec);
    }
    saveActiveSession(session);
  }

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
 */
export function completeSet(session, workout) {
  if (!session || session.isCompleted) return session;
  if (session.phase === 'REST') return session; // Prevent duplicate set completions while resting

  const routine = getRoutineItems(workout);
  const currentEx = routine[session.currentExerciseIndex];
  if (!currentEx) return session;

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
 * Returns to previous exercise/set where safe.
 */
export function previousExercise(session, workout) {
  if (!session || session.isCompleted) return session;

  const routine = getRoutineItems(workout);

  // If in rest phase, back out of rest to current exercise
  if (session.phase === 'REST') {
    session.phase = 'EXERCISE';
    const currentEx = routine[session.currentExerciseIndex];
    if (currentEx && currentEx.isTimed) {
      session.remainingSeconds = currentEx.targetDurationSec;
      session.phaseDurationSec = currentEx.targetDurationSec;
    }
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // If beyond first set, go back one set
  if (session.currentSet > 1) {
    session.currentSet--;
    session.phase = 'EXERCISE';
    const currentEx = routine[session.currentExerciseIndex];
    if (currentEx && currentEx.isTimed) {
      session.remainingSeconds = currentEx.targetDurationSec;
      session.phaseDurationSec = currentEx.targetDurationSec;
    }
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  // If beyond first exercise, go back to previous exercise
  if (session.currentExerciseIndex > 0) {
    session.currentExerciseIndex--;
    const prevEx = routine[session.currentExerciseIndex];
    session.currentSet = 1;
    session.totalSets = prevEx.totalSets;
    session.phase = 'EXERCISE';
    if (prevEx.isTimed) {
      session.remainingSeconds = prevEx.targetDurationSec;
      session.phaseDurationSec = prevEx.targetDurationSec;
    }
    session.phaseStartedAt = Date.now();
    session.lastTickAt = Date.now();
    saveActiveSession(session);
    return session;
  }

  return session;
}

/**
 * Completes the workout session and records it in local workout history.
 * Prevents duplicate completion.
 */
export function completeWorkout(session, workout) {
  if (!session) return null;
  if (session.isCompleted) return session;

  session.phase = 'COMPLETED';
  session.isCompleted = true;
  session.isPaused = false;
  session.updatedAt = new Date().toISOString();

  const durationSec = Math.max(1, session.elapsedSeconds || 1);
  const estCalories = (workout && workout.estimatedCalories)
    ? workout.estimatedCalories
    : Math.max(10, Math.round((durationSec / 60) * 7.5));

  const historyRecord = {
    sessionId: session.sessionId,
    workoutId: session.workoutId,
    title: session.workoutTitle || (workout && workout.title) || 'Workout Session',
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    durationSeconds: durationSec,
    exercisesCompleted: (session.completedExercises || []).length,
    setsCompleted: session.completedSets || 0,
    skippedExercises: (session.skippedExercises || []).length,
    estimatedCalories: estCalories
  };

  saveWorkoutHistoryRecord(historyRecord);
  saveActiveSession(session);
  return session;
}

/**
 * Retrieves the list of completed workout history records from localStorage.
 */
export function getWorkoutHistory() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse workout history from localStorage:', err);
    return [];
  }
}

/**
 * Saves a workout completion record to history, preventing duplicate session entries.
 */
export function saveWorkoutHistoryRecord(record) {
  if (!record || !record.sessionId) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const history = getWorkoutHistory();
    const exists = history.some(h => h && h.sessionId === record.sessionId);
    if (!exists) {
      history.unshift(record);
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

  const completedSets = Math.min(session.completedSets || 0, totalRoutineSets);
  const overallPercent = totalRoutineSets > 0
    ? (session.isCompleted ? 100 : Math.min(99, Math.round((completedSets / totalRoutineSets) * 100)))
    : 0;

  return {
    exerciseIndex: currentExerciseIndex + 1,
    totalExercises,
    overallPercent,
    currentSet: session.currentSet || 1,
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
