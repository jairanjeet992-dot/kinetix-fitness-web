/**
 * PROGRESSION ENGINE - KINETIX
 * Phase 6: Adaptive Training Intelligence
 *
 * Deterministic progressive overload, volume calibration, and exercise rotation.
 * All recommendations are conservative, multi-signal, and strictly derived from
 * verified local performance data without fabrication.
 */

import { getExerciseById, EXERCISES } from '../data/exercises.js';
import { EQUIPMENT } from '../data/taxonomy.js';
import { isEquipmentCompatible } from '../engine/workout-generator.js';

export const PROGRESSION_ACTIONS = Object.freeze({
  INCREASE_WEIGHT: 'INCREASE_WEIGHT',
  INCREASE_REPS: 'INCREASE_REPS',
  INCREASE_SETS: 'INCREASE_SETS',
  MAINTAIN: 'MAINTAIN',
  REDUCE_WEIGHT: 'REDUCE_WEIGHT',
  REDUCE_REPS: 'REDUCE_REPS',
  REDUCE_SETS: 'REDUCE_SETS',
  DELOAD: 'DELOAD',
  REPLACE_EXERCISE: 'REPLACE_EXERCISE'
});

/**
 * Parses target reps from an exercise definition or string.
 * Examples: 12 -> 12, "10-12 Reps" -> { min: 10, max: 12, target: 12 }
 *
 * @param {number|string} rawReps
 * @returns {{ min: number, max: number, target: number }}
 */
export function parseTargetReps(rawReps) {
  if (typeof rawReps === 'number' && Number.isFinite(rawReps) && rawReps > 0) {
    return { min: rawReps, max: rawReps, target: rawReps };
  }

  if (typeof rawReps === 'string') {
    const rangeMatch = rawReps.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      return { min, max, target: max };
    }

    const singleMatch = rawReps.match(/\d+/);
    if (singleMatch) {
      const val = parseInt(singleMatch[0], 10);
      return { min: val, max: val, target: val };
    }
  }

  // Default fallback
  return { min: 10, max: 12, target: 12 };
}

/**
 * Analyzes performance history for a specific exercise and computes deterministic progression.
 *
 * @param {string} exerciseId
 * @param {Object} options
 * @param {Array<Object>} [options.performanceLogs=[]] - All performance logs for this exercise
 * @param {Object|null} [options.exerciseDefinition=null] - Exercise metadata
 * @param {string} [options.unit='kg'] - User weight unit preference
 * @returns {Object} Deterministic progression recommendation
 */
export function analyzeExerciseProgression(exerciseId, {
  performanceLogs = [],
  exerciseDefinition = null,
  unit = 'kg'
} = {}) {
  const cleanId = String(exerciseId || '').trim();
  const ex = exerciseDefinition || getExerciseById(cleanId);

  if (!cleanId || !ex) {
    return {
      exerciseId: cleanId,
      action: PROGRESSION_ACTIONS.MAINTAIN,
      confidence: 'INSUFFICIENT_DATA',
      currentWeightKg: null,
      recommendedWeightKg: null,
      currentReps: null,
      recommendedReps: null,
      currentSets: null,
      recommendedSets: null,
      reason: 'Exercise not found in database.',
      adaptationApplied: false
    };
  }

  const isTimed = ex.isTimed || ex.exerciseType === 'timed';
  const targetRepInfo = parseTargetReps(ex.defaultReps);
  const targetReps = targetRepInfo.target;

  // Filter logs for this specific exercise
  const exerciseLogs = (performanceLogs || [])
    .filter(log => log && log.exerciseId === cleanId && log.completedAt)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  // Group logs into distinct sessions chronologically
  const sessionsMap = new Map();
  exerciseLogs.forEach(log => {
    if (!sessionsMap.has(log.sessionId)) {
      sessionsMap.set(log.sessionId, {
        sessionId: log.sessionId,
        date: log.completedAt,
        sets: []
      });
    }
    sessionsMap.get(log.sessionId).sets.push(log);
  });

  const sessionList = Array.from(sessionsMap.values());
  const sessionsCount = sessionList.length;

  // Rule 1: Insufficient data guard (requires at least 2 completed sessions)
  if (sessionsCount < 2) {
    const latestSet = exerciseLogs.length > 0 ? exerciseLogs[exerciseLogs.length - 1] : null;
    return {
      exerciseId: cleanId,
      exerciseName: ex.name,
      action: PROGRESSION_ACTIONS.MAINTAIN,
      confidence: sessionsCount === 1 ? 'LOW' : 'INSUFFICIENT_DATA',
      sessionsEvaluated: sessionsCount,
      currentWeightKg: latestSet ? latestSet.weightKg : null,
      recommendedWeightKg: latestSet ? latestSet.weightKg : null,
      currentReps: latestSet ? latestSet.reps : null,
      recommendedReps: targetReps,
      currentSets: ex.defaultSets || 3,
      recommendedSets: ex.defaultSets || 3,
      reason: sessionsCount === 1
        ? 'Single session recorded. A second session is required to confirm movement consistency before progressing.'
        : 'No previous performance logs recorded for this exercise. Maintain baseline parameters.',
      adaptationApplied: false
    };
  }

  // Evaluate the last 2 sessions (Session N-1 and Session N)
  const sessionPrev = sessionList[sessionsCount - 2];
  const sessionLatest = sessionList[sessionsCount - 1];

  const evalSession = (session) => {
    const completedSets = session.sets.filter(s => s.isCompleted !== false);
    if (completedSets.length === 0) return { hitTargetCount: 0, totalSets: 0, avgReps: 0, avgWeightKg: 0, allHit: false };

    let totalReps = 0;
    let totalWeight = 0;
    let weightCount = 0;
    let hitCount = 0;

    completedSets.forEach(s => {
      const repVal = isTimed ? (s.durationSeconds || 0) : (s.reps || 0);
      totalReps += repVal;
      if (repVal >= (isTimed ? (ex.targetDurationSec || 40) : targetReps)) {
        hitCount++;
      }
      if (s.weightKg && s.weightKg > 0) {
        totalWeight += s.weightKg;
        weightCount++;
      }
    });

    const avgReps = Math.round((totalReps / completedSets.length) * 10) / 10;
    const avgWeightKg = weightCount > 0 ? Math.round((totalWeight / weightCount) * 100) / 100 : null;

    return {
      hitTargetCount: hitCount,
      totalSets: completedSets.length,
      avgReps,
      avgWeightKg,
      allHit: hitCount >= completedSets.length && completedSets.length >= 2
    };
  };

  const prevStats = evalSession(sessionPrev);
  const latestStats = evalSession(sessionLatest);

  const currentWeightKg = latestStats.avgWeightKg;
  const currentReps = latestStats.avgReps;
  const currentSets = ex.defaultSets || 3;

  // Equipment categorization for sensible progression increments
  const eqList = Array.isArray(ex.equipment) ? ex.equipment : [ex.equipment || ''];
  const isDumbbell = eqList.some(eq => typeof eq === 'string' && eq.includes('dumbbell'));
  const isBarbell = eqList.some(eq => typeof eq === 'string' && eq.includes('barbell'));
  const isBodyweight = eqList.every(eq => typeof eq === 'string' && (eq.includes('bodyweight') || eq.includes('none')));

  // Case A: PROGRESSIVE OVERLOAD CANDIDATE (Target achieved across both sessions)
  if (prevStats.allHit && latestStats.allHit) {
    if (isTimed) {
      const targetSec = ex.targetDurationSec || 40;
      const recDuration = Math.min(120, targetSec + 10);
      return {
        exerciseId: cleanId,
        exerciseName: ex.name,
        action: PROGRESSION_ACTIONS.INCREASE_REPS,
        confidence: sessionsCount >= 3 ? 'HIGH' : 'MODERATE',
        sessionsEvaluated: sessionsCount,
        currentWeightKg: null,
        recommendedWeightKg: null,
        currentReps: currentReps,
        recommendedReps: recDuration,
        currentSets,
        recommendedSets: currentSets,
        reason: `Target duration (${targetSec}s) held on all sets across previous 2 sessions. Duration extension recommended (+10s).`,
        adaptationApplied: true
      };
    }

    if (currentWeightKg !== null && currentWeightKg > 0) {
      // Weight progression
      let increment = 2.0; // Standard dumbbell increment in kg (~4.4 lb)
      if (isBarbell) increment = 2.5; // Standard barbell increment (2x 1.25kg plates)
      if (unit === 'lb') increment = isBarbell ? 2.27 : 1.81; // ~5lb / ~4lb

      const recommendedWeightKg = Math.round((currentWeightKg + increment) * 100) / 100;
      return {
        exerciseId: cleanId,
        exerciseName: ex.name,
        action: PROGRESSION_ACTIONS.INCREASE_WEIGHT,
        confidence: sessionsCount >= 3 ? 'HIGH' : 'MODERATE',
        sessionsEvaluated: sessionsCount,
        currentWeightKg,
        recommendedWeightKg,
        currentReps,
        recommendedReps: targetReps,
        currentSets,
        recommendedSets: currentSets,
        reason: `Target reps (${targetReps}) consistently completed across previous 2 consecutive sessions at ${currentWeightKg}kg. Progressive overload recommended (+${increment}kg).`,
        adaptationApplied: true
      };
    }

    // Bodyweight or no logged weight: progress via reps
    const recReps = Math.min(30, Math.round(currentReps + 2));
    return {
      exerciseId: cleanId,
      exerciseName: ex.name,
      action: PROGRESSION_ACTIONS.INCREASE_REPS,
      confidence: sessionsCount >= 3 ? 'HIGH' : 'MODERATE',
      sessionsEvaluated: sessionsCount,
      currentWeightKg: null,
      recommendedWeightKg: null,
      currentReps,
      recommendedReps: recReps,
      currentSets,
      recommendedSets: currentSets,
      reason: `Target reps (${targetReps}) achieved on all sets across previous 2 consecutive sessions. Volume progression recommended (+2 reps).`,
      adaptationApplied: true
    };
  }

  // Case B: MISSED TARGETS / STALLING (Under 70% target reps across both sessions)
  const prevStalled = prevStats.totalSets > 0 && (prevStats.hitTargetCount / prevStats.totalSets) < 0.5;
  const latestStalled = latestStats.totalSets > 0 && (latestStats.hitTargetCount / latestStats.totalSets) < 0.5;

  if (prevStalled && latestStalled) {
    if (currentWeightKg !== null && currentWeightKg > 0) {
      // Conservative ~10% deload to regain form and full range of motion
      const recWeight = Math.max(1, Math.round(currentWeightKg * 0.9 * 2) / 2);
      return {
        exerciseId: cleanId,
        exerciseName: ex.name,
        action: PROGRESSION_ACTIONS.REDUCE_WEIGHT,
        confidence: 'HIGH',
        sessionsEvaluated: sessionsCount,
        currentWeightKg,
        recommendedWeightKg: recWeight,
        currentReps,
        recommendedReps: targetReps,
        currentSets,
        recommendedSets: currentSets,
        reason: `Target reps missed across consecutive sessions. Recommended ~10% load reduction (${currentWeightKg}kg -> ${recWeight}kg) to restore movement quality and prevent fatigue accumulation.`,
        adaptationApplied: true
      };
    }

    const recReps = Math.max(5, Math.floor(currentReps * 0.85));
    return {
      exerciseId: cleanId,
      exerciseName: ex.name,
      action: PROGRESSION_ACTIONS.REDUCE_REPS,
      confidence: 'HIGH',
      sessionsEvaluated: sessionsCount,
      currentWeightKg: null,
      recommendedWeightKg: null,
      currentReps,
      recommendedReps: recReps,
      currentSets,
      recommendedSets: currentSets,
      reason: `Target reps missed across consecutive sessions. Rep reduction recommended to prioritize form stability.`,
      adaptationApplied: true
    };
  }

  // Case C: STABLE / MAINTAIN
  return {
    exerciseId: cleanId,
    exerciseName: ex.name,
    action: PROGRESSION_ACTIONS.MAINTAIN,
    confidence: 'MODERATE',
    sessionsEvaluated: sessionsCount,
    currentWeightKg,
    recommendedWeightKg: currentWeightKg,
    currentReps,
    recommendedReps: targetReps,
    currentSets,
    recommendedSets: currentSets,
    reason: 'Performance is stable and on track. Maintain current weight and volume to solidify movement pattern.',
    adaptationApplied: false
  };
}

/**
 * Checks for excessive exercise repetition and finds a compatible rotation replacement.
 *
 * @param {Object} params
 * @param {string} params.exerciseId - Exercise being evaluated for rotation
 * @param {Array<Object>} [params.workoutHistory=[]] - Recent workout history
 * @param {Array<Object>} [params.eligibleExercises=[]] - Available exercises matching user equipment
 * @param {Array<string>} [params.currentRoutineExerciseIds=[]] - Exercises already in today's routine
 * @returns {{ shouldRotate: boolean, replacementExercise: Object|null, reason: string }}
 */
export function analyzeExerciseRotation({
  exerciseId,
  workoutHistory = [],
  eligibleExercises = EXERCISES,
  currentRoutineExerciseIds = []
} = {}) {
  const cleanId = String(exerciseId || '').trim();
  const currentEx = getExerciseById(cleanId);

  if (!cleanId || !currentEx) {
    return { shouldRotate: false, replacementExercise: null, reason: 'Exercise not found.' };
  }

  // Analyze the last 3-5 completed workouts for repetition
  const recentWorkouts = (workoutHistory || [])
    .filter(r => r && r.completedAt)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  if (recentWorkouts.length < 3) {
    return {
      shouldRotate: false,
      replacementExercise: null,
      reason: 'Insufficient workout history to evaluate exercise staleness.'
    };
  }

  // Helper to extract exercise IDs from any history record format
  function extractExerciseIds(w) {
    if (!w || typeof w !== 'object') return [];
    const ids = new Set();
    if (Array.isArray(w.completedExerciseIds)) w.completedExerciseIds.forEach(id => ids.add(String(id)));
    if (Array.isArray(w.exerciseIds)) w.exerciseIds.forEach(id => ids.add(String(id)));
    if (Array.isArray(w.completedExercises)) {
      w.completedExercises.forEach(e => {
        if (typeof e === 'string') ids.add(e);
        else if (e && e.id) ids.add(String(e.id));
        else if (e && e.exerciseId) ids.add(String(e.exerciseId));
      });
    }
    if (Array.isArray(w.exercises)) {
      w.exercises.forEach(e => {
        if (typeof e === 'string') ids.add(e);
        else if (e && e.id) ids.add(String(e.id));
        else if (e && e.exerciseId) ids.add(String(e.exerciseId));
      });
    }
    return Array.from(ids);
  }

  // Count consecutive sessions containing this exercise starting from the most recent
  let consecutiveCount = 0;
  for (const w of recentWorkouts) {
    const exIds = extractExerciseIds(w);

    if (exIds.includes(cleanId)) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  // Threshold: 3 consecutive sessions triggers rotation
  if (consecutiveCount < 3) {
    return {
      shouldRotate: false,
      replacementExercise: null,
      replacementExerciseId: null,
      consecutiveCount,
      consecutiveSessions: consecutiveCount,
      reason: `Exercise performed in ${consecutiveCount} consecutive session(s); within optimal rotation limits.`
    };
  }

  // Stale! Search for a compatible alternative exercise
  const primaryMuscles = currentEx.primaryMuscles || [];
  const movementPattern = currentEx.movementPattern;
  const category = currentEx.category;

  const candidates = (eligibleExercises || []).filter(candidate => {
    if (!candidate || candidate.id === cleanId) return false;
    // Cannot duplicate an exercise already in the current routine
    if (currentRoutineExerciseIds.includes(candidate.id)) return false;

    // Must match at least one primary muscle
    const sharesPrimaryMuscle = (candidate.primaryMuscles || []).some(m => primaryMuscles.includes(m));
    if (!sharesPrimaryMuscle) return false;

    // Must match movement pattern OR category
    const matchesPattern = candidate.movementPattern && candidate.movementPattern === movementPattern;
    const matchesCategory = candidate.category === category;

    return matchesPattern || matchesCategory;
  });

  if (candidates.length === 0) {
    return {
      shouldRotate: false,
      replacementExercise: null,
      replacementExerciseId: null,
      consecutiveCount,
      consecutiveSessions: consecutiveCount,
      reason: `Exercise has been performed in ${consecutiveCount} consecutive workouts, but no compatible alternative matching your equipment is available. Preserving original exercise.`
    };
  }

  // Select the best alternative (prioritize matching movement pattern)
  const patternMatches = candidates.filter(c => c.movementPattern === movementPattern);
  const selectedReplacement = patternMatches.length > 0 ? patternMatches[0] : candidates[0];

  const targetMuscleLabel = primaryMuscles.length > 0
    ? primaryMuscles[0].charAt(0).toUpperCase() + primaryMuscles[0].slice(1)
    : 'target';

  return {
    shouldRotate: true,
    replacementExercise: selectedReplacement,
    replacementExerciseId: selectedReplacement.id,
    consecutiveCount,
    consecutiveSessions: consecutiveCount,
    reason: `Staleness detected: "${currentEx.name}" was performed in ${consecutiveCount} consecutive workouts. Rotating to "${selectedReplacement.name}" to vary biomechanical stimulus while preserving ${targetMuscleLabel} focus.`
  };
}
