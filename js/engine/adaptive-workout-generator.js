/**
 * ADAPTIVE WORKOUT GENERATOR - KINETIX
 * Phase 6: Adaptive Training Intelligence
 *
 * Layered adaptive generator that wraps the deterministic baseline workout generator.
 * Synthesizes training intelligence (recovery, progressive overload, exercise rotation)
 * to produce an individually calibrated workout session.
 *
 * Safety Invariants:
 * - Never mutates or replaces the baseline generator.
 * - Strictly enforces equipment compatibility.
 * - Every adaptation must pass safety validation; falls back to baseline on any failure.
 * - 100% deterministic (same profile, history, logs, referenceDate, and seed yield identical output).
 */

import { generateWorkout, isEquipmentCompatible, normalizeProfile } from './workout-generator.js';
import { analyzeTrainingIntelligence, RECOVERY_STATES, PROGRESSION_ACTIONS } from '../analytics/training-intelligence.js';
import { registerGeneratedWorkout } from '../data/workouts.js';
import { EXERCISES, getExerciseById } from '../data/exercises.js';

/**
 * Generates an adaptively calibrated workout plan.
 *
 * @param {Object} rawProfile - User onboarding/profile settings
 * @param {number} [variationSeed=0] - Deterministic variation seed
 * @param {Object} [options={}] - Execution context
 * @param {Array<Object>|null} [options.historyRecords=null] - Workout history override (for testing/mocking)
 * @param {Array<Object>|null} [options.performanceLogs=null] - Performance logs override (for testing/mocking)
 * @param {Date|string} [options.referenceDate=new Date()] - Deterministic evaluation anchor
 * @param {Array<Object>} [options.exerciseDb=EXERCISES] - Exercise database
 * @returns {Object} Structured workout plan with attached adaptation metadata
 */
export function generateAdaptiveWorkout(rawProfile = {}, variationSeed = 0, options = {}) {
  const safeProfileInput = (rawProfile && typeof rawProfile === 'object') ? rawProfile : {};
  const safeSeed = Number.isFinite(Number(variationSeed)) ? Math.max(0, Math.floor(Number(variationSeed))) : 0;
  const safeOptions = (options && typeof options === 'object') ? options : {};

  const exerciseDb = safeOptions.exerciseDb || EXERCISES;
  const profile = normalizeProfile(safeProfileInput);

  // 1. Generate deterministic baseline workout
  const baseline = generateWorkout(safeProfileInput, safeSeed, exerciseDb);
  if (!baseline || !baseline.ok) {
    return baseline;
  }

  // 2. Run Training Intelligence on baseline proposal
  const intelligence = analyzeTrainingIntelligence({
    historyRecords: safeOptions.historyRecords,
    performanceLogs: safeOptions.performanceLogs,
    profile,
    referenceDate: safeOptions.referenceDate,
    proposedWorkout: baseline
  });

  // Guard: If insufficient data, return baseline with un-adapted status
  if (intelligence.confidence === 'INSUFFICIENT_DATA') {
    const unadapted = {
      ...baseline,
      isAdaptive: false,
      adaptation: {
        applied: false,
        status: intelligence.readiness.status,
        confidence: intelligence.confidence,
        recommendations: intelligence.recommendations,
        reasons: intelligence.reasons,
        changes: []
      }
    };
    registerGeneratedWorkout(unadapted);
    return unadapted;
  }

  // Deep clone baseline to ensure zero side-effects on baseline generator
  const adapted = JSON.parse(JSON.stringify(baseline));
  const changes = [];

  try {
    // 3. Apply Exercise Rotations (Stale exercises)
    if (intelligence.rotation && Array.isArray(intelligence.rotation.suggestedReplacements)) {
      intelligence.rotation.suggestedReplacements.forEach(rot => {
        const origId = rot.originalExerciseId;
        const replacementEx = rot.replacementExercise;

        if (origId && replacementEx) {
          const idx = (adapted.exercises || []).findIndex(e => (typeof e === 'string' ? e : e.id) === origId);
          if (idx >= 0) {
            // Check replacement equipment compatibility with user gear
            if (isEquipmentCompatible(replacementEx, profile.equipment)) {
              const prevEx = adapted.exercises[idx];
              adapted.exercises[idx] = replacementEx;

              // Update exerciseIds array
              const idIdx = (adapted.exerciseIds || []).indexOf(origId);
              if (idIdx >= 0) {
                adapted.exerciseIds[idIdx] = replacementEx.id;
              }

              changes.push({
                type: 'EXERCISE_ROTATION',
                originalExerciseId: origId,
                originalExerciseName: typeof prevEx === 'object' ? prevEx.name : origId,
                replacementExerciseId: replacementEx.id,
                replacementExerciseName: replacementEx.name,
                reason: rot.reason
              });
            }
          }
        }
      });
    }

    // 4. Apply Recovery / Fatigue Volume Calibrations
    if (
      intelligence.readiness.status === RECOVERY_STATES.REDUCE_VOLUME ||
      intelligence.readiness.status === RECOVERY_STATES.RECOVERY_RECOMMENDED
    ) {
      if (adapted.rounds && adapted.rounds > 2) {
        const prevRounds = adapted.rounds;
        adapted.rounds = adapted.rounds - 1;
        changes.push({
          type: 'VOLUME_CALIBRATION',
          action: 'REDUCE_ROUNDS',
          previousRounds: prevRounds,
          adaptedRounds: adapted.rounds,
          reason: (intelligence.readiness && intelligence.readiness.reasons && intelligence.readiness.reasons[0]) || 'Volume reduced by 1 round to accommodate current recovery state.'
        });
      } else if (adapted.exercises && adapted.exercises.length > 4) {
        const removed = adapted.exercises.pop();
        adapted.exerciseIds = (adapted.exerciseIds || []).filter(id => id !== removed.id);
        changes.push({
          type: 'VOLUME_CALIBRATION',
          action: 'REMOVE_EXERCISE',
          removedExerciseId: removed.id,
          removedExerciseName: removed.name,
          reason: 'Trimmed exercise count to facilitate recovery from recent training load.'
        });
      }
    }

    // 5. Apply Progressive Overload & Load Calibrations
    if (intelligence.progression && Array.isArray(intelligence.progression.candidateExercises)) {
      intelligence.progression.candidateExercises.forEach(prog => {
        if (!prog || !prog.adaptationApplied) return;

        const exIdx = (adapted.exercises || []).findIndex(e => (typeof e === 'string' ? e : e.id) === prog.exerciseId);
        if (exIdx >= 0) {
          const exObj = adapted.exercises[exIdx];
          exObj.targetWeightKg = prog.recommendedWeightKg;
          exObj.targetReps = prog.recommendedReps;
          exObj.adaptiveProgression = {
            action: prog.action,
            currentWeightKg: prog.currentWeightKg,
            recommendedWeightKg: prog.recommendedWeightKg,
            currentReps: prog.currentReps,
            recommendedReps: prog.recommendedReps,
            reason: prog.reason
          };

          changes.push({
            type: 'PROGRESSIVE_OVERLOAD',
            exerciseId: prog.exerciseId,
            exerciseName: prog.exerciseName,
            action: prog.action,
            previousWeightKg: prog.currentWeightKg,
            recommendedWeightKg: prog.recommendedWeightKg,
            previousReps: prog.currentReps,
            recommendedReps: prog.recommendedReps,
            reason: prog.reason
          });
        }
      });
    }

    // 6. ADAPTATION SAFETY VALIDATION GUARD
    // Check 1: Must have at least 1 exercise
    if (!Array.isArray(adapted.exercises) || adapted.exercises.length === 0) {
      throw new Error('Adapted workout contains zero exercises.');
    }

    // Check 2: Equipment compatibility on all exercises
    const allExercises = [
      ...(adapted.warmup || []),
      ...(adapted.exercises || []),
      ...(adapted.cooldown || [])
    ];

    for (const ex of allExercises) {
      const exObj = typeof ex === 'string' ? getExerciseById(ex) : ex;
      if (!exObj || !isEquipmentCompatible(exObj, profile.equipment)) {
        throw new Error(`Exercise "${exObj ? exObj.id : ex}" violates user equipment constraints.`);
      }
    }

    // Check 3: Rounds sanity
    if (typeof adapted.rounds !== 'number' || adapted.rounds < 1 || adapted.rounds > 6) {
      throw new Error(`Adapted rounds count (${adapted.rounds}) is invalid.`);
    }

    // Check 4: Recalculate duration & calories safely if volume changed
    if (changes.some(c => c.type === 'VOLUME_CALIBRATION')) {
      const mainCount = adapted.exercises.length;
      const setsPerMain = adapted.rounds || 3;
      const restSec = adapted.restBetweenExercisesSec || 45;
      const exerciseDurationSec = 40;
      const totalSeconds = (mainCount * setsPerMain * (exerciseDurationSec + restSec)) + 300; // +5m warmup/cooldown
      const recalcedMin = Math.max(10, Math.min(75, Math.round(totalSeconds / 60)));
      adapted.durationMin = recalcedMin;
      adapted.durationMinutes = recalcedMin;
      adapted.estimatedCalories = Math.max(50, Math.round(recalcedMin * 7.5));

      if (adapted.durationAccuracy) {
        const requested = adapted.durationAccuracy.requestedMinutes ?? profile.durationMinutes ?? recalcedMin;
        const diff = recalcedMin - requested;
        adapted.durationAccuracy = {
          requestedMinutes: requested,
          actualMinutes: recalcedMin,
          differenceMinutes: diff,
          withinTolerance: Math.abs(diff) <= 3
        };
      }
    }

    // Check 5: Duration sanity boundary
    if (typeof adapted.durationMinutes !== 'number' || adapted.durationMinutes < 10 || adapted.durationMinutes > 75) {
      throw new Error(`Adapted duration (${adapted.durationMinutes} min) exceeds safe bounds (10-75 min).`);
    }

    const applied = changes.length > 0;

    // Attach adaptation metadata
    adapted.isAdaptive = applied;
    adapted.adaptation = {
      applied,
      status: intelligence.readiness.status,
      readinessScore: intelligence.readiness.score,
      confidence: intelligence.confidence,
      recommendations: intelligence.recommendations,
      reasons: intelligence.reasons,
      changes
    };

    registerGeneratedWorkout(adapted);
    return adapted;

  } catch (err) {
    // Safety fallback: if anything fails, return baseline cleanly!
    console.warn('Adaptive workout generation validation failed. Safely falling back to baseline workout:', err.message);
    const fallback = {
      ...baseline,
      isAdaptive: false,
      adaptation: {
        applied: false,
        status: intelligence.readiness.status,
        confidence: intelligence.confidence,
        fallback: true,
        fallbackReason: `Validation guard triggered: ${err.message}. Baseline workout preserved.`,
        recommendations: intelligence.recommendations,
        reasons: intelligence.reasons,
        changes: []
      }
    };
    registerGeneratedWorkout(fallback);
    return fallback;
  }
}
