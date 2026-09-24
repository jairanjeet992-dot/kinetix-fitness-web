/**
 * TRAINING INTELLIGENCE ENGINE - KINETIX
 * Phase 6: Adaptive Training Intelligence
 *
 * Central intelligence orchestrator that analyzes user workout history,
 * performance logs, muscle fatigue, and training frequency to synthesize
 * deterministic, explainable training insights and adaptation recommendations.
 *
 * Invariants:
 * - Pure, deterministic calculations (zero uncontrolled randomness).
 * - Zero data/timestamp fabrication (missing fields remain null or explicitly unavailable).
 * - Explainable recommendations with documented rationales.
 */

import { getWorkoutHistory } from '../state/workout-session.js';
import { getPerformanceRecords } from './performance-tracker.js';
import { getProfile } from '../state/profile.js';
import { analyzeRecovery, RECOVERY_STATES } from './recovery-engine.js';
import {
  analyzeExerciseProgression,
  analyzeExerciseRotation,
  PROGRESSION_ACTIONS
} from './progression-engine.js';
import { EXERCISES } from '../data/exercises.js';
import { isEquipmentCompatible } from '../engine/workout-generator.js';

export { RECOVERY_STATES } from './recovery-engine.js';
export { PROGRESSION_ACTIONS } from './progression-engine.js';

export const CONFIDENCE_TIERS = Object.freeze({
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH'
});

/**
 * Computes deterministic confidence tier based on available evidence.
 *
 * Rules:
 * - INSUFFICIENT_DATA: < 2 completed history workouts or 0 performance logs.
 * - LOW: 2-3 workouts, or < 6 total performance logs.
 * - MODERATE: 4-7 workouts with regular performance logs.
 * - HIGH: 8+ workouts with comprehensive performance logs across multiple exercises.
 *
 * @param {Array<Object>} historyRecords
 * @param {Array<Object>} performanceLogs
 * @returns {'INSUFFICIENT_DATA'|'LOW'|'MODERATE'|'HIGH'}
 */
export function calculateConfidence(historyRecords = [], performanceLogs = []) {
  const validHistory = (historyRecords || []).filter(r => r && r.completedAt);
  const validLogs = (performanceLogs || []).filter(l => l && l.completedAt);

  if (validHistory.length < 2 && validLogs.length === 0) {
    return 'INSUFFICIENT_DATA';
  }

  if (validHistory.length < 4 || validLogs.length < 6) {
    return 'LOW';
  }

  if (validHistory.length >= 8 && validLogs.length >= 15) {
    return 'HIGH';
  }

  return 'MODERATE';
}

/**
 * Comprehensive Training Intelligence analysis.
 *
 * @param {Object} [options={}]
 * @param {Array<Object>|null} [options.historyRecords=null]
 * @param {Array<Object>|null} [options.performanceLogs=null]
 * @param {Object|null} [options.profile=null]
 * @param {Date|string} [options.referenceDate=new Date()]
 * @param {Object|null} [options.proposedWorkout=null] - Candidate workout to evaluate
 * @returns {Object} Structured training intelligence report
 */
export function analyzeTrainingIntelligence({
  historyRecords = null,
  performanceLogs = null,
  profile = null,
  referenceDate = new Date(),
  proposedWorkout = null
} = {}) {
  const resolvedHistory = Array.isArray(historyRecords) ? historyRecords : getWorkoutHistory();
  const resolvedLogs = Array.isArray(performanceLogs) ? performanceLogs : getPerformanceRecords();
  const resolvedProfile = profile && typeof profile === 'object' ? profile : getProfile();

  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refTime = !isNaN(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

  // Filter valid history up to reference date
  const validHistory = resolvedHistory.filter(r => {
    if (!r || !r.completedAt || typeof r.completedAt !== 'string') return false;
    const ts = new Date(r.completedAt).getTime();
    return !isNaN(ts) && ts > 0 && ts <= refTime;
  });

  // Filter valid performance logs up to reference date
  const validLogs = resolvedLogs.filter(l => {
    if (!l || !l.completedAt || typeof l.completedAt !== 'string') return false;
    const ts = new Date(l.completedAt).getTime();
    return !isNaN(ts) && ts > 0 && ts <= refTime;
  });

  // Extract proposed muscles from the upcoming workout
  let proposedMuscles = [];
  if (proposedWorkout && Array.isArray(proposedWorkout.targetMuscles)) {
    proposedMuscles = proposedWorkout.targetMuscles;
  } else if (proposedWorkout && Array.isArray(proposedWorkout.exercises)) {
    const pSet = new Set();
    proposedWorkout.exercises.forEach(ex => {
      (ex.primaryMuscles || []).forEach(m => pSet.add(m));
    });
    proposedMuscles = Array.from(pSet);
  } else if (resolvedProfile && Array.isArray(resolvedProfile.focusAreas)) {
    proposedMuscles = resolvedProfile.focusAreas;
  }

  // 1. Recovery Analysis
  const recoveryReport = analyzeRecovery({
    historyRecords: validHistory,
    referenceDate: refDateObj,
    proposedMuscles
  });

  // 2. Progression & Rotation Analysis
  const candidateExercises = [];
  const exerciseInsights = [];
  const staleExercises = [];
  const suggestedReplacements = [];

  // Identify exercises to evaluate: from proposedWorkout, or fallback to recent history
  let exercisesToEvaluate = [];
  if (proposedWorkout && Array.isArray(proposedWorkout.exercises) && proposedWorkout.exercises.length > 0) {
    exercisesToEvaluate = proposedWorkout.exercises.map(e => (typeof e === 'string' ? e : e.id));
  } else {
    // Unique exercises from the last 3 workouts
    const recentExSet = new Set();
    validHistory.slice(0, 3).forEach(w => {
      const ids = Array.isArray(w.completedExerciseIds) ? w.completedExerciseIds : (w.completedExercises || []);
      ids.forEach(id => recentExSet.add(id));
    });
    exercisesToEvaluate = Array.from(recentExSet);
  }

  const eligibleExercises = EXERCISES.filter(ex =>
    isEquipmentCompatible(ex, resolvedProfile.equipment || ['Bodyweight'])
  );

  const userUnit = (resolvedProfile.unit || 'kg').toLowerCase() === 'lb' ? 'lb' : 'kg';

  exercisesToEvaluate.forEach(exId => {
    // A. Progression analysis
    const prog = analyzeExerciseProgression(exId, {
      performanceLogs: validLogs,
      unit: userUnit
    });
    candidateExercises.push(prog);

    // B. Rotation analysis
    const rot = analyzeExerciseRotation({
      exerciseId: exId,
      workoutHistory: validHistory,
      eligibleExercises,
      currentRoutineExerciseIds: exercisesToEvaluate
    });

    if (rot.shouldRotate && rot.replacementExercise) {
      staleExercises.push({ exerciseId: exId, consecutiveCount: rot.consecutiveCount, reason: rot.reason });
      suggestedReplacements.push({
        originalExerciseId: exId,
        replacementExercise: rot.replacementExercise,
        reason: rot.reason
      });
    }

    exerciseInsights.push({
      exerciseId: exId,
      exerciseName: prog.exerciseName || exId,
      progressionAction: prog.action,
      recommendedWeightKg: prog.recommendedWeightKg,
      recommendedReps: prog.recommendedReps,
      shouldRotate: rot.shouldRotate,
      rotationReplacementId: rot.replacementExercise ? rot.replacementExercise.id : null,
      progressionReason: prog.reason,
      rotationReason: rot.reason
    });
  });

  // Progression summary counts
  const progressionCount = candidateExercises.filter(p =>
    p.action === PROGRESSION_ACTIONS.INCREASE_WEIGHT || p.action === PROGRESSION_ACTIONS.INCREASE_REPS
  ).length;

  const deloadCount = candidateExercises.filter(p =>
    p.action === PROGRESSION_ACTIONS.REDUCE_WEIGHT || p.action === PROGRESSION_ACTIONS.REDUCE_REPS
  ).length;

  const maintainCount = candidateExercises.filter(p =>
    p.action === PROGRESSION_ACTIONS.MAINTAIN
  ).length;

  let progressionSummary = 'No adjustments needed. Maintain current parameters.';
  if (progressionCount > 0) {
    progressionSummary = `${progressionCount} exercise(s) primed for progressive overload advancement.`;
  } else if (deloadCount > 0) {
    progressionSummary = `${deloadCount} exercise(s) recommended for load calibration to restore movement quality.`;
  }

  // 3. Consolidated Recommendations & Reasons
  const recommendations = [];
  const reasons = [];

  // Recovery recommendations
  if (recoveryReport.status === RECOVERY_STATES.RECOVERY_RECOMMENDED) {
    recommendations.push('Schedule an active rest day or reduce workout intensity to support recovery.');
    reasons.push(...recoveryReport.reasons);
  } else if (recoveryReport.status === RECOVERY_STATES.REDUCE_VOLUME) {
    recommendations.push('Reduce workout volume (sets/rounds) to manage systemic or localized muscle fatigue.');
    reasons.push(...recoveryReport.reasons);
  } else if (recoveryReport.status === RECOVERY_STATES.READY) {
    recommendations.push('Recovery is optimal. Safe to apply progressive overload.');
    reasons.push(...recoveryReport.reasons);
  } else if (recoveryReport.status === RECOVERY_STATES.NORMAL) {
    recommendations.push('Standard training cadence. Proceed with scheduled workout parameters.');
    reasons.push(...recoveryReport.reasons);
  } else {
    recommendations.push('Baseline parameters active. Log performance sets to enable adaptive intelligence.');
    reasons.push(...recoveryReport.reasons);
  }

  // Progression recommendations
  candidateExercises.forEach(p => {
    if (p.adaptationApplied) {
      recommendations.push(`${p.exerciseName}: ${p.reason}`);
      reasons.push(`${p.exerciseName}: ${p.reason}`);
    }
  });

  // Rotation recommendations
  suggestedReplacements.forEach(r => {
    recommendations.push(r.reason);
    reasons.push(r.reason);
  });

  const confidence = calculateConfidence(validHistory, validLogs);

  return {
    readiness: {
      status: recoveryReport.status,
      score: recoveryReport.score,
      consecutiveDays: recoveryReport.consecutiveDays,
      daysSinceLastWorkout: recoveryReport.daysSinceLastWorkout,
      hoursSinceLastWorkout: recoveryReport.hoursSinceLastWorkout,
      fatiguedMuscles: recoveryReport.fatiguedMuscles,
      overlappingMuscles: recoveryReport.overlappingMuscles,
      reasons: recoveryReport.reasons,
      recommendedAction: recoveryReport.recommendations[0] || 'Proceed with standard training.'
    },
    recovery: recoveryReport,
    progression: {
      candidateExercises,
      progressionCount,
      deloadCount,
      maintainCount,
      summary: progressionSummary
    },
    rotation: {
      staleExercises,
      suggestedReplacements
    },
    exerciseInsights,
    recommendations,
    confidence,
    reasons
  };
}
