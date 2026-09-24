/**
 * TRAINING LOAD MODEL - KINETIX
 * Phase 4: Progress & Training Intelligence
 *
 * Deterministic training-load estimation derived from verified session parameters:
 * - Completed sets (volume indicator)
 * - Actual workout duration (density indicator)
 * - Workout difficulty factor (intensity scalar)
 *
 * FORMULA:
 *   trainingLoad = Math.round((completedSets * 5 * difficultyFactor) + (durationMinutes * 0.5))
 *
 * CONSTANTS:
 *   - Base set multiplier: 5 points per completed set
 *   - Duration multiplier: 0.5 points per elapsed minute
 *   - Difficulty factors:
 *       beginner: 1.0
 *       intermediate: 1.25
 *       advanced: 1.5
 *       (fallback: 1.0)
 *
 * PROPERTIES:
 *   - Pure, deterministic, zero side effects
 *   - Same inputs always produce identical training load
 *   - Fully safe against missing/malformed records
 */

export const DIFFICULTY_FACTORS = Object.freeze({
  beginner: 1.0,
  intermediate: 1.25,
  advanced: 1.5
});

export const LOAD_TIERS = Object.freeze([
  { max: 50, label: 'Light', description: 'Active recovery or introductory session' },
  { max: 120, label: 'Moderate', description: 'Balanced training volume' },
  { max: 200, label: 'Challenging', description: 'High-effort progressive overload' },
  { max: Infinity, label: 'Intense', description: 'Peak stimulus session' }
]);

/**
 * Calculates deterministic training load for a single workout history record.
 *
 * @param {Object} record - Completed workout record.
 * @returns {number} Integer training load score (>= 0).
 */
export function calculateSessionTrainingLoad(record) {
  if (!record || typeof record !== 'object') return 0;

  // Extract completed sets (handle Phase 3.1 setsCompleted or Phase 4 completedSets)
  const sets = Number(record.setsCompleted ?? record.completedSets ?? 0);
  const validSets = Number.isFinite(sets) && sets > 0 ? sets : 0;

  // Extract duration in minutes
  let durationMinutes = 0;
  if (Number.isFinite(record.actualDurationMinutes) && record.actualDurationMinutes > 0) {
    durationMinutes = record.actualDurationMinutes;
  } else if (Number.isFinite(record.durationSeconds) && record.durationSeconds > 0) {
    durationMinutes = record.durationSeconds / 60;
  } else if (Number.isFinite(record.duration) && record.duration > 0) {
    durationMinutes = record.duration / 60;
  }

  // Extract difficulty scalar
  const rawDifficulty = String(record.workoutDifficulty || record.difficulty || '').toLowerCase().trim();
  const difficultyFactor = DIFFICULTY_FACTORS[rawDifficulty] || 1.0;

  const rawScore = (validSets * 5 * difficultyFactor) + (durationMinutes * 0.5);
  return Math.round(rawScore);
}

/**
 * Categorizes a training load score into human-readable load tier.
 *
 * @param {number} score - Training load score.
 * @returns {string} Label ('Light' | 'Moderate' | 'Challenging' | 'Intense').
 */
export function getLoadTierLabel(score) {
  const safeScore = Number.isFinite(score) && score > 0 ? score : 0;
  const match = LOAD_TIERS.find(tier => safeScore <= tier.max);
  return match ? match.label : 'Light';
}

/**
 * Computes total aggregate training load across an array of records.
 *
 * @param {Array} records - Array of workout history records.
 * @returns {number} Sum of all session loads.
 */
export function calculateTotalTrainingLoad(records = []) {
  if (!Array.isArray(records)) return 0;
  return records.reduce((sum, rec) => sum + calculateSessionTrainingLoad(rec), 0);
}

/**
 * Computes training load for the past 7 days relative to reference date.
 *
 * @param {Array} records - Array of workout history records.
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {number} 7-day trailing training load.
 */
export function calculateRecentTrainingLoad(records = [], referenceDate = new Date()) {
  if (!Array.isArray(records) || records.length === 0) return 0;

  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refTime = !isNaN(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();
  const sevenDaysAgo = refTime - (7 * 86400000);

  return records.reduce((sum, rec) => {
    if (!rec || typeof rec !== 'object') return sum;
    const ts = rec.completedAt || rec.startedAt;
    if (!ts) return sum;
    const recordTime = new Date(ts).getTime();
    if (isNaN(recordTime) || recordTime < sevenDaysAgo || recordTime > refTime) return sum;
    return sum + calculateSessionTrainingLoad(rec);
  }, 0);
}
