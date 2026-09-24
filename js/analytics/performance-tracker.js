/**
 * EXERCISE PERFORMANCE & PERSONAL RECORDS ENGINE - KINETIX
 * Phase 5: Weight Logging & Personal Records
 *
 * Local-first, deterministic performance tracking:
 * - Versioned schema for individual set logs (weight, reps, duration, distance, unit).
 * - Canonical metric storage in kilograms (kg) and seconds (s) with safe unit conversions (kg/lb).
 * - Deterministic PR detection: Heaviest Weight, Best Reps at Weight, Highest Session Volume,
 *   Estimated 1RM (Epley), Longest Duration, and Longest Distance.
 * - Exercise history aggregation: previous performance, personal bests, recent sessions, volume trends.
 * - Resilience: corrupt storage handling, duplicate prevention, and zero fake data.
 */

import { calculateEstimated1RM } from './pr-model.js';

export const STORAGE_KEY_PERFORMANCE = 'kinetix_performance_logs';
export const STORAGE_KEY_PRS = 'kinetix_personal_records';

export const LBS_PER_KG = 2.20462262;

export const PR_TYPES = Object.freeze({
  HEAVIEST_WEIGHT: 'heaviest_weight',
  BEST_REPS: 'best_reps',
  ESTIMATED_1RM: 'estimated_1rm',
  SESSION_VOLUME: 'session_volume',
  LONGEST_DURATION: 'longest_duration',
  LONGEST_DISTANCE: 'longest_distance'
});

export const PR_LABELS = Object.freeze({
  [PR_TYPES.HEAVIEST_WEIGHT]: 'Heaviest Weight',
  [PR_TYPES.BEST_REPS]: 'Best Reps at Weight',
  [PR_TYPES.ESTIMATED_1RM]: 'Estimated 1RM',
  [PR_TYPES.SESSION_VOLUME]: 'Highest Session Volume',
  [PR_TYPES.LONGEST_DURATION]: 'Longest Duration',
  [PR_TYPES.LONGEST_DISTANCE]: 'Longest Distance'
});

/**
 * Converts pounds (lbs) to canonical kilograms (kg).
 *
 * @param {number} lbs
 * @returns {number}
 */
export function lbsToKg(lbs) {
  const num = Number(lbs);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round((num / LBS_PER_KG) * 100) / 100;
}

/**
 * Converts kilograms (kg) to pounds (lbs).
 *
 * @param {number} kg
 * @returns {number}
 */
export function kgToLbs(kg) {
  const num = Number(kg);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round((num * LBS_PER_KG) * 10) / 10;
}

/**
 * Formats weight in the user's preferred unit for UI display.
 *
 * @param {number} weightKg - Canonical weight in kg.
 * @param {string} [unit='kg'] - Target unit ('kg' or 'lb').
 * @returns {string} Formatted string, e.g. "24 kg" or "52.9 lb".
 */
export function formatWeight(weightKg, unit = 'kg') {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return '0 kg';
  const u = String(unit).toLowerCase().trim() === 'lb' ? 'lb' : 'kg';
  if (u === 'lb') {
    return `${kgToLbs(weightKg)} lb`;
  }
  return `${Math.round(weightKg * 10) / 10} kg`;
}

/**
 * Validates, normalizes, and sanitizes a raw performance record.
 * Returns null if the record is fatally corrupt or missing essential IDs.
 *
 * @param {Object} raw
 * @returns {Object|null}
 */
export function sanitizePerformanceRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Session ID & Exercise ID are mandatory
  const sessionId = typeof raw.sessionId === 'string' && raw.sessionId.trim().length > 0
    ? raw.sessionId.trim()
    : null;
  const exerciseId = typeof raw.exerciseId === 'string' && raw.exerciseId.trim().length > 0
    ? raw.exerciseId.trim()
    : null;

  if (!sessionId || !exerciseId) return null;

  // Set number (1-indexed)
  const rawSetNum = Number(raw.setNumber);
  const setNumber = Number.isInteger(rawSetNum) && rawSetNum >= 1 ? rawSetNum : 1;

  // Timestamp
  const completedAt = (raw.completedAt && !isNaN(new Date(raw.completedAt).getTime()))
    ? new Date(raw.completedAt).toISOString()
    : new Date().toISOString();

  // Unit: 'kg' or 'lb'
  const unit = String(raw.unit || 'kg').toLowerCase().trim() === 'lb' ? 'lb' : 'kg';

  // Weight handling: store raw entered weight and canonical weightKg
  let rawWeight = null;
  let weightKg = null;
  if (raw.weight !== null && raw.weight !== undefined && raw.weight !== '') {
    const numW = Number(raw.weight);
    if (Number.isFinite(numW) && numW > 0) {
      rawWeight = Math.round(numW * 100) / 100;
      weightKg = unit === 'lb' ? lbsToKg(rawWeight) : rawWeight;
    }
  } else if (raw.weightKg !== null && raw.weightKg !== undefined) {
    const numWKg = Number(raw.weightKg);
    if (Number.isFinite(numWKg) && numWKg > 0) {
      weightKg = Math.round(numWKg * 100) / 100;
      rawWeight = unit === 'lb' ? kgToLbs(weightKg) : weightKg;
    }
  }

  // Reps: integer >= 0
  let reps = null;
  if (raw.reps !== null && raw.reps !== undefined && raw.reps !== '') {
    const numReps = Number(raw.reps);
    if (Number.isFinite(numReps) && numReps >= 0) {
      reps = Math.floor(numReps);
    }
  }

  // Duration in seconds (for timed movements)
  let durationSeconds = null;
  if (raw.durationSeconds !== null && raw.durationSeconds !== undefined) {
    const numSec = Number(raw.durationSeconds);
    if (Number.isFinite(numSec) && numSec >= 0) {
      durationSeconds = Math.round(numSec);
    }
  }

  // Distance in meters (if applicable)
  let distanceMeters = null;
  if (raw.distanceMeters !== null && raw.distanceMeters !== undefined) {
    const numDist = Number(raw.distanceMeters);
    if (Number.isFinite(numDist) && numDist >= 0) {
      distanceMeters = Math.round(numDist * 10) / 10;
    }
  }

  // Completion status
  const isCompleted = raw.isCompleted !== false;

  // Estimated 1RM (Epley formula, only valid if weight > 0 and reps >= 1)
  let estimated1RM = null;
  if (weightKg !== null && weightKg > 0 && reps !== null && reps >= 1) {
    estimated1RM = calculateEstimated1RM(weightKg, reps);
  }

  // Set Volume: weight in kg * reps
  const volumeKg = (weightKg !== null && weightKg > 0 && reps !== null && reps > 0)
    ? Math.round(weightKg * reps * 10) / 10
    : 0;

  const id = typeof raw.id === 'string' && raw.id.trim().length > 0
    ? raw.id.trim()
    : `perf_${sessionId}_${exerciseId}_set${setNumber}`;

  return {
    id,
    sessionId,
    workoutId: typeof raw.workoutId === 'string' ? raw.workoutId.trim() : 'custom',
    exerciseId,
    setNumber,
    weight: rawWeight,
    weightKg,
    unit,
    reps,
    durationSeconds,
    distanceMeters,
    isCompleted,
    completedAt,
    estimated1RM,
    volumeKg,
    schemaVersion: 1,
    source: raw.source || 'workout-player'
  };
}

/**
 * Creates a validated performance record for a completed or logged set.
 *
 * @param {Object} params
 * @returns {Object|null}
 */
export function createPerformanceRecord(params = {}) {
  return sanitizePerformanceRecord(params);
}

/**
 * Retrieves all stored performance logs from localStorage.
 * Handles corrupt JSON safely by returning an empty array.
 *
 * @returns {Array<Object>}
 */
export function getPerformanceRecords() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_PERFORMANCE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => sanitizePerformanceRecord(item))
      .filter(Boolean);
  } catch (err) {
    console.warn('Failed to parse performance records from localStorage:', err);
    return [];
  }
}

/**
 * Saves a performance record to localStorage, updating existing set records
 * with matching id or (sessionId, exerciseId, setNumber).
 *
 * @param {Object} record - Raw or sanitized record.
 * @returns {boolean} True if saved successfully.
 */
export function savePerformanceRecord(record) {
  const sanitized = sanitizePerformanceRecord(record);
  if (!sanitized) return false;

  try {
    if (typeof localStorage === 'undefined') return false;
    const records = getPerformanceRecords();

    // Check if set already logged for this session, exercise, and setNumber
    const existingIdx = records.findIndex(r =>
      r.id === sanitized.id ||
      (r.sessionId === sanitized.sessionId && r.exerciseId === sanitized.exerciseId && r.setNumber === sanitized.setNumber)
    );

    if (existingIdx >= 0) {
      records[existingIdx] = sanitized;
    } else {
      records.push(sanitized);
    }

    localStorage.setItem(STORAGE_KEY_PERFORMANCE, JSON.stringify(records));
    return true;
  } catch (err) {
    console.warn('Failed to persist performance record:', err);
    return false;
  }
}

/**
 * Batch saves multiple performance records.
 *
 * @param {Array<Object>} recordsArray
 * @returns {boolean}
 */
export function savePerformanceRecords(recordsArray = []) {
  if (!Array.isArray(recordsArray) || recordsArray.length === 0) return true;
  try {
    if (typeof localStorage === 'undefined') return false;
    const current = getPerformanceRecords();
    const map = new Map(current.map(r => [r.id, r]));

    recordsArray.forEach(raw => {
      const sanitized = sanitizePerformanceRecord(raw);
      if (sanitized) {
        map.set(sanitized.id, sanitized);
      }
    });

    localStorage.setItem(STORAGE_KEY_PERFORMANCE, JSON.stringify(Array.from(map.values())));
    return true;
  } catch (err) {
    console.warn('Failed to batch persist performance records:', err);
    return false;
  }
}

/**
 * Retrieves performance records for a specific exercise.
 *
 * @param {string} exerciseId
 * @returns {Array<Object>}
 */
export function getPerformanceRecordsForExercise(exerciseId) {
  if (!exerciseId) return [];
  const cleanId = String(exerciseId).trim();
  const all = getPerformanceRecords();
  return all
    .filter(r => r.exerciseId === cleanId)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
}

/**
 * Retrieves performance records for a specific workout session.
 *
 * @param {string} sessionId
 * @returns {Array<Object>}
 */
export function getPerformanceRecordsForSession(sessionId) {
  if (!sessionId) return [];
  const cleanId = String(sessionId).trim();
  const all = getPerformanceRecords();
  return all
    .filter(r => r.sessionId === cleanId)
    .sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Deterministically detects if a new performance record unlocks any new Personal Records (PRs)
 * compared against previous records for that exercise.
 *
 * Checks:
 * 1. Heaviest Weight (kg)
 * 2. Best Reps at this Weight
 * 3. Estimated 1RM (kg)
 * 4. Longest Duration (s)
 * 5. Longest Distance (m)
 *
 * @param {Object} newRecord - Sanitized performance record.
 * @param {Array<Object>} [priorRecords=null] - Historical records prior to this record.
 * @returns {Array<Object>} List of newly unlocked PR descriptors.
 */
export function detectPersonalRecords(newRecord, priorRecords = null) {
  const sanitized = sanitizePerformanceRecord(newRecord);
  if (!sanitized) return [];

  const history = priorRecords !== null
    ? priorRecords.filter(r => r && r.exerciseId === sanitized.exerciseId && r.id !== sanitized.id)
    : getPerformanceRecordsForExercise(sanitized.exerciseId).filter(r => r.id !== sanitized.id);

  const unlockedPRs = [];

  // 1. HEAVIEST WEIGHT
  if (sanitized.weightKg !== null && sanitized.weightKg > 0) {
    const previousMaxWeight = history.reduce((max, r) =>
      (r.weightKg !== null && r.weightKg > max) ? r.weightKg : max, 0);

    if (sanitized.weightKg > previousMaxWeight) {
      unlockedPRs.push({
        type: PR_TYPES.HEAVIEST_WEIGHT,
        label: PR_LABELS[PR_TYPES.HEAVIEST_WEIGHT],
        value: sanitized.weightKg,
        previousValue: previousMaxWeight > 0 ? previousMaxWeight : null,
        formattedValue: formatWeight(sanitized.weightKg, sanitized.unit),
        exerciseId: sanitized.exerciseId,
        performanceLogId: sanitized.id,
        achievedAt: sanitized.completedAt
      });
    }
  }

  // 2. ESTIMATED 1RM
  if (sanitized.estimated1RM !== null && sanitized.estimated1RM > 0) {
    const previousMax1RM = history.reduce((max, r) =>
      (r.estimated1RM !== null && r.estimated1RM > max) ? r.estimated1RM : max, 0);

    if (sanitized.estimated1RM > previousMax1RM) {
      unlockedPRs.push({
        type: PR_TYPES.ESTIMATED_1RM,
        label: PR_LABELS[PR_TYPES.ESTIMATED_1RM],
        value: sanitized.estimated1RM,
        previousValue: previousMax1RM > 0 ? previousMax1RM : null,
        formattedValue: formatWeight(sanitized.estimated1RM, sanitized.unit),
        exerciseId: sanitized.exerciseId,
        performanceLogId: sanitized.id,
        achievedAt: sanitized.completedAt
      });
    }
  }

  // 3. BEST REPS AT WEIGHT (Within ±0.5kg tolerance or exact weight)
  if (sanitized.reps !== null && sanitized.reps > 0) {
    const targetW = sanitized.weightKg || 0;
    const matchingWeightLogs = history.filter(r => {
      const rw = r.weightKg || 0;
      return Math.abs(rw - targetW) <= 0.5 && r.reps !== null && r.reps > 0;
    });

    const previousMaxReps = matchingWeightLogs.reduce((max, r) => Math.max(max, r.reps), 0);
    if (sanitized.reps > previousMaxReps && (history.length > 0 || sanitized.reps >= 1)) {
      unlockedPRs.push({
        type: PR_TYPES.BEST_REPS,
        label: PR_LABELS[PR_TYPES.BEST_REPS],
        value: sanitized.reps,
        previousValue: previousMaxReps > 0 ? previousMaxReps : null,
        formattedValue: `${sanitized.reps} Reps${targetW > 0 ? ` @ ${formatWeight(targetW, sanitized.unit)}` : ''}`,
        exerciseId: sanitized.exerciseId,
        performanceLogId: sanitized.id,
        achievedAt: sanitized.completedAt
      });
    }
  }

  // 4. LONGEST DURATION (Timed exercises)
  if (sanitized.durationSeconds !== null && sanitized.durationSeconds > 0) {
    const previousMaxDuration = history.reduce((max, r) =>
      (r.durationSeconds !== null && r.durationSeconds > max) ? r.durationSeconds : max, 0);

    if (sanitized.durationSeconds > previousMaxDuration) {
      unlockedPRs.push({
        type: PR_TYPES.LONGEST_DURATION,
        label: PR_LABELS[PR_TYPES.LONGEST_DURATION],
        value: sanitized.durationSeconds,
        previousValue: previousMaxDuration > 0 ? previousMaxDuration : null,
        formattedValue: `${sanitized.durationSeconds}s`,
        exerciseId: sanitized.exerciseId,
        performanceLogId: sanitized.id,
        achievedAt: sanitized.completedAt
      });
    }
  }

  // 5. LONGEST DISTANCE
  if (sanitized.distanceMeters !== null && sanitized.distanceMeters > 0) {
    const previousMaxDistance = history.reduce((max, r) =>
      (r.distanceMeters !== null && r.distanceMeters > max) ? r.distanceMeters : max, 0);

    if (sanitized.distanceMeters > previousMaxDistance) {
      unlockedPRs.push({
        type: PR_TYPES.LONGEST_DISTANCE,
        label: PR_LABELS[PR_TYPES.LONGEST_DISTANCE],
        value: sanitized.distanceMeters,
        previousValue: previousMaxDistance > 0 ? previousMaxDistance : null,
        formattedValue: `${sanitized.distanceMeters}m`,
        exerciseId: sanitized.exerciseId,
        performanceLogId: sanitized.id,
        achievedAt: sanitized.completedAt
      });
    }
  }

  return unlockedPRs;
}

/**
 * Computes all-time Personal Records for an exercise or across all exercises.
 * Deterministic and derived entirely from real performance logs.
 *
 * @param {string|null} [exerciseId=null]
 * @param {Array<Object>|null} [performanceLogs=null]
 * @returns {Array<Object>} List of all-time PR records.
 */
export function getAllPersonalRecords(exerciseId = null, performanceLogs = null) {
  const allLogs = Array.isArray(performanceLogs)
    ? performanceLogs
    : getPerformanceRecords();
  const filtered = exerciseId
    ? allLogs.filter(r => r.exerciseId === exerciseId)
    : allLogs;

  if (filtered.length === 0) return [];

  // Group logs by exerciseId
  const exerciseGroups = new Map();
  filtered.forEach(rec => {
    if (!exerciseGroups.has(rec.exerciseId)) {
      exerciseGroups.set(rec.exerciseId, []);
    }
    exerciseGroups.get(rec.exerciseId).push(rec);
  });

  const allPRs = [];

  exerciseGroups.forEach((logs, exId) => {
    let heaviest = null;
    let max1RM = null;
    let longestDur = null;
    let longestDist = null;

    // Session volume tracking
    const sessionVolumeMap = new Map();

    logs.forEach(r => {
      // Heaviest weight
      if (r.weightKg !== null && r.weightKg > 0) {
        if (!heaviest || r.weightKg > heaviest.value) {
          heaviest = {
            type: PR_TYPES.HEAVIEST_WEIGHT,
            label: PR_LABELS[PR_TYPES.HEAVIEST_WEIGHT],
            value: r.weightKg,
            formattedValue: formatWeight(r.weightKg, r.unit),
            exerciseId: exId,
            performanceLogId: r.id,
            achievedAt: r.completedAt
          };
        }
      }

      // 1RM
      if (r.estimated1RM !== null && r.estimated1RM > 0) {
        if (!max1RM || r.estimated1RM > max1RM.value) {
          max1RM = {
            type: PR_TYPES.ESTIMATED_1RM,
            label: PR_LABELS[PR_TYPES.ESTIMATED_1RM],
            value: r.estimated1RM,
            formattedValue: formatWeight(r.estimated1RM, r.unit),
            exerciseId: exId,
            performanceLogId: r.id,
            achievedAt: r.completedAt
          };
        }
      }

      // Duration
      if (r.durationSeconds !== null && r.durationSeconds > 0) {
        if (!longestDur || r.durationSeconds > longestDur.value) {
          longestDur = {
            type: PR_TYPES.LONGEST_DURATION,
            label: PR_LABELS[PR_TYPES.LONGEST_DURATION],
            value: r.durationSeconds,
            formattedValue: `${r.durationSeconds}s`,
            exerciseId: exId,
            performanceLogId: r.id,
            achievedAt: r.completedAt
          };
        }
      }

      // Distance
      if (r.distanceMeters !== null && r.distanceMeters > 0) {
        if (!longestDist || r.distanceMeters > longestDist.value) {
          longestDist = {
            type: PR_TYPES.LONGEST_DISTANCE,
            label: PR_LABELS[PR_TYPES.LONGEST_DISTANCE],
            value: r.distanceMeters,
            formattedValue: `${r.distanceMeters}m`,
            exerciseId: exId,
            performanceLogId: r.id,
            achievedAt: r.completedAt
          };
        }
      }

      // Session volume
      if (r.volumeKg > 0) {
        const curVol = sessionVolumeMap.get(r.sessionId) || { vol: 0, date: r.completedAt };
        curVol.vol += r.volumeKg;
        sessionVolumeMap.set(r.sessionId, curVol);
      }
    });

    if (heaviest) allPRs.push(heaviest);
    if (max1RM) allPRs.push(max1RM);
    if (longestDur) allPRs.push(longestDur);
    if (longestDist) allPRs.push(longestDist);

    // Max session volume for exercise
    let maxSessionVol = null;
    sessionVolumeMap.forEach((entry, sessId) => {
      if (!maxSessionVol || entry.vol > maxSessionVol.value) {
        maxSessionVol = {
          type: PR_TYPES.SESSION_VOLUME,
          label: PR_LABELS[PR_TYPES.SESSION_VOLUME],
          value: Math.round(entry.vol * 10) / 10,
          formattedValue: `${Math.round(entry.vol * 10) / 10} kg`,
          exerciseId: exId,
          sessionId: sessId,
          achievedAt: entry.date
        };
      }
    });
    if (maxSessionVol) allPRs.push(maxSessionVol);
  });

  return allPRs;
}

/**
 * Aggregates complete exercise performance history:
 * - Personal Bests
 * - Previous session performance
 * - Recent sessions log
 * - Volume trend
 * - Progression metrics
 *
 * @param {string} exerciseId
 * @returns {Object}
 */
export function getExercisePerformanceHistory(exerciseId) {
  if (!exerciseId) {
    return {
      exerciseId: null,
      hasHistory: false,
      totalSetsLogged: 0,
      personalBests: {},
      previousPerformance: null,
      recentSessions: [],
      volumeTrend: [],
      progression: []
    };
  }

  const cleanId = String(exerciseId).trim();
  const logs = getPerformanceRecordsForExercise(cleanId);

  if (logs.length === 0) {
    return {
      exerciseId: cleanId,
      hasHistory: false,
      totalSetsLogged: 0,
      personalBests: {},
      previousPerformance: null,
      recentSessions: [],
      volumeTrend: [],
      progression: []
    };
  }

  // Group by sessionId
  const sessionsMap = new Map();
  logs.forEach(r => {
    if (!sessionsMap.has(r.sessionId)) {
      sessionsMap.set(r.sessionId, {
        sessionId: r.sessionId,
        workoutId: r.workoutId,
        date: r.completedAt,
        sets: [],
        totalVolumeKg: 0,
        maxWeightKg: 0,
        maxEstimated1RM: 0,
        maxReps: 0
      });
    }
    const sess = sessionsMap.get(r.sessionId);
    sess.sets.push(r);
    sess.totalVolumeKg += (r.volumeKg || 0);
    if (r.weightKg && r.weightKg > sess.maxWeightKg) sess.maxWeightKg = r.weightKg;
    if (r.estimated1RM && r.estimated1RM > sess.maxEstimated1RM) sess.maxEstimated1RM = r.estimated1RM;
    if (r.reps && r.reps > sess.maxReps) sess.maxReps = r.reps;
  });

  const sessionList = Array.from(sessionsMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Previous performance is the most recent completed session
  const previousPerformance = sessionList.length > 0 ? sessionList[0] : null;

  // Personal Bests for this exercise
  const prs = getAllPersonalRecords(cleanId);
  const personalBests = {};
  prs.forEach(pr => {
    personalBests[pr.type] = pr;
  });

  // Volume Trend: chronological list of volume per session
  const volumeTrend = [...sessionList]
    .reverse()
    .map(s => ({
      date: s.date,
      volumeKg: Math.round(s.totalVolumeKg * 10) / 10
    }));

  // Progression: chronological max weight & 1RM
  const progression = [...sessionList]
    .reverse()
    .map(s => ({
      date: s.date,
      maxWeightKg: s.maxWeightKg,
      maxEstimated1RM: s.maxEstimated1RM,
      maxReps: s.maxReps
    }));

  return {
    exerciseId: cleanId,
    hasHistory: true,
    totalSetsLogged: logs.length,
    personalBests,
    previousPerformance,
    recentSessions: sessionList.slice(0, 10),
    volumeTrend,
    progression
  };
}

/**
 * Testing helper: clears all performance logs from localStorage.
 */
export function _resetPerformanceStorageForTesting() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_PERFORMANCE);
      localStorage.removeItem(STORAGE_KEY_PRS);
    } catch (_) {}
  }
}
