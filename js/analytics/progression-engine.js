/**
 * PROGRESSION ENGINE - KINETIX
 * Phase 6: Adaptive Training Intelligence
 *
 * Deterministic progressive overload, volume calibration, and exercise rotation.
 * All recommendations are conservative, multi-signal, and strictly derived from
 * verified local performance data without fabrication.
 */

import { getExerciseById, EXERCISES } from '../data/exercises.js';
import { EQUIPMENT, normalizeEquipmentList } from '../data/taxonomy.js';
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
export function analyzeExerciseProgression(exerciseId, options = {}, extraOpts = {}) {
  const isOptionsArray = Array.isArray(options);
  const opts = isOptionsArray
    ? { performanceLogs: options, ...extraOpts }
    : (options && typeof options === 'object' ? { ...options, ...extraOpts } : {});
  const performanceLogs = opts.performanceLogs || [];
  const unit = opts.unit || 'kg';

  let cleanId = '';
  let exDef = opts.exerciseDefinition || null;
  if (exerciseId && typeof exerciseId === 'object') {
    cleanId = String(exerciseId.id || '').trim();
    if (!exDef) exDef = exerciseId;
  } else {
    cleanId = String(exerciseId || '').trim();
  }

  const ex = exDef || getExerciseById(cleanId);

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

  // Filter logs for this specific exercise with strict timestamp validation
  const exerciseLogs = (performanceLogs || [])
    .filter(log => {
      if (!log || typeof log !== 'object' || log.exerciseId !== cleanId || !log.completedAt) return false;
      const ts = new Date(log.completedAt).getTime();
      return !isNaN(ts) && ts > 0;
    })
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  // Group logs into distinct sessions chronologically with set-level deduplication
  const sessionsMap = new Map();
  exerciseLogs.forEach(log => {
    if (!sessionsMap.has(log.sessionId)) {
      sessionsMap.set(log.sessionId, {
        sessionId: log.sessionId,
        date: log.completedAt,
        setsMap: new Map()
      });
    }
    const sEntry = sessionsMap.get(log.sessionId);
    const setKey = Number.isFinite(Number(log.setNumber)) ? Number(log.setNumber) : (sEntry.setsMap.size + 1);
    sEntry.setsMap.set(setKey, log);
  });

  const sessionList = Array.from(sessionsMap.values()).map(s => ({
    sessionId: s.sessionId,
    date: s.date,
    sets: Array.from(s.setsMap.values())
  }));
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
      currentReps: latestSet ? (latestSet.reps ?? latestSet.actualReps ?? null) : null,
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
      const rawReps = s.reps ?? s.actualReps ?? 0;
      const repNum = Number.isFinite(Number(rawReps)) ? Math.max(0, Number(rawReps)) : 0;
      const rawDur = s.durationSeconds ?? s.duration ?? 0;
      const durNum = Number.isFinite(Number(rawDur)) ? Math.max(0, Number(rawDur)) : 0;
      const repVal = isTimed ? durNum : repNum;

      const targetForSet = (s.targetReps !== undefined && s.targetReps !== null && Number.isFinite(Number(s.targetReps)) && Number(s.targetReps) > 0)
        ? Number(s.targetReps)
        : (isTimed ? (ex.targetDurationSec || 40) : targetReps);

      totalReps += repVal;
      if (repVal >= targetForSet) {
        hitCount++;
      }
      const rawWeight = s.weightKg ?? s.weight;
      if (rawWeight !== null && rawWeight !== undefined && Number.isFinite(Number(rawWeight)) && Number(rawWeight) > 0 && Number(rawWeight) <= 500) {
        totalWeight += Number(rawWeight);
        weightCount++;
      }
    });

    const avgReps = completedSets.length > 0 ? Math.round((totalReps / completedSets.length) * 10) / 10 : 0;
    const avgWeightKg = weightCount > 0 ? Math.round((totalWeight / weightCount) * 100) / 100 : null;

    const minSetsRequired = Math.min(2, ex.defaultSets || 3);
    const allHit = hitCount >= completedSets.length && completedSets.length >= minSetsRequired && hitCount > 0;

    return {
      hitTargetCount: hitCount,
      totalSets: completedSets.length,
      avgReps,
      avgWeightKg,
      allHit
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
      let incrementLabel = `+${increment}kg`;

      if (unit === 'lb') {
        const lbInc = isBarbell ? 5.0 : 4.0;
        increment = isBarbell ? 2.27 : 1.81; // ~5lb / ~4lb converted to kg
        incrementLabel = `+${lbInc} lb`;
      }

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
        reason: `Target reps (${targetReps}) consistently completed across previous 2 consecutive sessions at ${currentWeightKg}kg. Progressive overload recommended (${incrementLabel}).`,
        adaptationApplied: true
      };
    }

    // Bodyweight or no logged weight: progress via reps (respecting ceiling)
    const recReps = currentReps >= 30 ? Math.round(currentReps) : Math.min(30, Math.round(currentReps + 2));
    const repReason = currentReps >= 30
      ? `Target reps (${targetReps}) consistently completed. Peak bodyweight volume achieved (30+ reps); maintain high volume cadence.`
      : `Target reps (${targetReps}) achieved on all sets across previous 2 consecutive sessions. Volume progression recommended (+2 reps).`;

    return {
      exerciseId: cleanId,
      exerciseName: ex.name,
      action: currentReps >= 30 ? PROGRESSION_ACTIONS.MAINTAIN : PROGRESSION_ACTIONS.INCREASE_REPS,
      confidence: sessionsCount >= 3 ? 'HIGH' : 'MODERATE',
      sessionsEvaluated: sessionsCount,
      currentWeightKg: null,
      recommendedWeightKg: null,
      currentReps,
      recommendedReps: recReps,
      currentSets,
      recommendedSets: currentSets,
      reason: repReason,
      adaptationApplied: currentReps < 30
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
export function analyzeExerciseRotation(params = {}, legacyHistory = null, legacyEligible = null, legacyCurrentIds = null) {
  let exerciseId = '';
  let workoutHistory = [];
  let eligibleExercises = EXERCISES;
  let currentRoutineExerciseIds = [];

  if (typeof params === 'string' || (params && typeof params === 'object' && !('workoutHistory' in params) && !('exerciseId' in params) && params.id)) {
    exerciseId = typeof params === 'string' ? params : params.id;
    if (Array.isArray(legacyHistory)) workoutHistory = legacyHistory;
    if (Array.isArray(legacyEligible)) {
      if (legacyEligible.length > 0 && typeof legacyEligible[0] === 'string' && !EXERCISES.some(e => e.id === legacyEligible[0])) {
        const normalizedEq = normalizeEquipmentList(legacyEligible);
        eligibleExercises = EXERCISES.filter(ex => isEquipmentCompatible(ex, normalizedEq));
      } else {
        eligibleExercises = legacyEligible;
      }
    }
    if (Array.isArray(legacyCurrentIds)) currentRoutineExerciseIds = legacyCurrentIds;
  } else if (params && typeof params === 'object') {
    exerciseId = params.exerciseId || (params.exercise && params.exercise.id) || '';
    workoutHistory = params.workoutHistory || [];
    eligibleExercises = params.eligibleExercises || EXERCISES;
    currentRoutineExerciseIds = params.currentRoutineExerciseIds || [];
  }

  const cleanId = String(exerciseId || '').trim();
  const currentEx = getExerciseById(cleanId) || (params && typeof params === 'object' && params.id === cleanId ? params : null);

  if (!cleanId || !currentEx) {
    return { shouldRotate: false, replacementExercise: null, reason: 'Exercise not found.' };
  }

  // Analyze the last 3-5 completed workouts for repetition
  const hasTimestamps = (workoutHistory || []).some(r => r && (r.completedAt || r.date || r.timestamp));
  const recentWorkouts = hasTimestamps
    ? (workoutHistory || [])
        .filter(r => r && (r.completedAt || r.date || r.timestamp))
        .sort((a, b) => new Date(b.completedAt || b.date || b.timestamp).getTime() - new Date(a.completedAt || a.date || a.timestamp).getTime())
        .slice(0, 5)
    : (workoutHistory || []).slice(0, 5);

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

  // Anti-ping-ponging: If multiple candidates match, prioritize ones not performed in the last 2 workouts
  const recentExIds = new Set();
  recentWorkouts.slice(0, 2).forEach(w => {
    extractExerciseIds(w).forEach(id => recentExIds.add(id));
  });

  const preferredCandidates = candidates.filter(c => !recentExIds.has(c.id));
  const candidatePool = preferredCandidates.length > 0 ? preferredCandidates : candidates;

  // Select the best alternative (prioritize matching movement pattern)
  const patternMatches = candidatePool.filter(c => c.movementPattern === movementPattern);
  const selectedReplacement = patternMatches.length > 0 ? patternMatches[0] : candidatePool[0];

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
