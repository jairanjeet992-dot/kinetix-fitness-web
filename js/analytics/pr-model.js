/**
 * PERSONAL RECORD & MILESTONE FOUNDATION - KINETIX
 * Phase 4: Progress & Training Intelligence
 *
 * Provides:
 * 1. Interface and schema specification for future load/weight PR tracking.
 * 2. Standard 1RM estimation formula (Epley) ready for Phase 5 weight logging.
 * 3. Extraction of honest session-level endurance and volume milestones from real completed data.
 *
 * NOTE: As required, this does NOT fabricate weight PRs when user weight input is absent.
 */

/**
 * Creates a validated Personal Record entry schema for future exercise weight/rep logging.
 *
 * @param {Object} params
 * @param {string} params.exerciseId
 * @param {number} params.weight - In kg or lbs as specified by user preferences
 * @param {number} params.reps - Reps performed
 * @param {number} [params.sets=1]
 * @param {string} [params.performedAt=new Date().toISOString()]
 * @param {string} [params.notes='']
 * @returns {Object|null} Validated PR record or null if invalid
 */
export function createPRRecord({
  exerciseId,
  weight,
  reps,
  sets = 1,
  performedAt = new Date().toISOString(),
  notes = ''
} = {}) {
  if (!exerciseId || typeof exerciseId !== 'string') return null;
  const numWeight = Number(weight);
  const numReps = Number(reps);
  const numSets = Number(sets);

  if (!Number.isFinite(numWeight) || numWeight <= 0) return null;
  if (!Number.isFinite(numReps) || numReps <= 0 || !Number.isInteger(numReps)) return null;

  const estimated1RM = calculateEstimated1RM(numWeight, numReps);

  return {
    exerciseId: exerciseId.trim(),
    weight: numWeight,
    reps: numReps,
    sets: Number.isFinite(numSets) && numSets > 0 ? numSets : 1,
    estimated1RM,
    performedAt: typeof performedAt === 'string' ? performedAt : new Date().toISOString(),
    notes: String(notes || '')
  };
}

/**
 * Epley formula for estimated 1-Rep Max (1RM):
 *   1RM = weight * (1 + reps / 30)
 *
 * Special cases:
 * - 1 rep = exact weight
 * - Invalid or zero inputs return 0
 *
 * @param {number} weight
 * @param {number} reps
 * @returns {number} Estimated 1RM rounded to 1 decimal place.
 */
export function calculateEstimated1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);

  if (!Number.isFinite(w) || w <= 0) return 0;
  if (!Number.isFinite(r) || r <= 0) return 0;

  if (r === 1) return Math.round(w * 10) / 10;

  const est = w * (1 + (r / 30));
  return Math.round(est * 10) / 10;
}

/**
 * Computes verifiable session volume and endurance milestones from real completed history.
 * Does NOT invent fake lift numbers.
 *
 * @param {Array} historyRecords - Validated workout history records.
 * @returns {Object} Real session milestones.
 */
export function computeSessionMilestones(historyRecords = []) {
  if (!Array.isArray(historyRecords) || historyRecords.length === 0) {
    return {
      longestDurationMinutes: 0,
      maxSetsInSession: 0,
      maxExercisesInSession: 0,
      highestTrainingLoad: 0,
      hasRealData: false
    };
  }

  let longestDurationMinutes = 0;
  let maxSetsInSession = 0;
  let maxExercisesInSession = 0;
  let highestTrainingLoad = 0;

  historyRecords.forEach(rec => {
    if (!rec || typeof rec !== 'object') return;

    // Duration in minutes
    const durSec = Number(rec.durationSeconds || rec.duration || 0);
    const durMin = Math.round(durSec / 60);
    if (durMin > longestDurationMinutes) longestDurationMinutes = durMin;

    // Sets completed
    const sets = Number(rec.setsCompleted ?? rec.completedSets ?? 0);
    if (sets > maxSetsInSession) maxSetsInSession = sets;

    // Exercises completed
    const exCount = Number(rec.exercisesCompleted ?? (Array.isArray(rec.completedExerciseIds) ? rec.completedExerciseIds.length : 0));
    if (exCount > maxExercisesInSession) maxExercisesInSession = exCount;

    // Training load if present or calculate
    const load = Number(rec.trainingLoad || 0);
    if (load > highestTrainingLoad) highestTrainingLoad = load;
  });

  return {
    longestDurationMinutes,
    maxSetsInSession,
    maxExercisesInSession,
    highestTrainingLoad,
    hasRealData: historyRecords.length > 0
  };
}

export {
  PR_TYPES,
  PR_LABELS,
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
  getExercisePerformanceHistory
} from './performance-tracker.js';
