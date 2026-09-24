/**
 * RECOVERY ENGINE - KINETIX
 * Phase 6: Adaptive Training Intelligence
 *
 * Deterministic recovery and muscle-fatigue evaluation based strictly
 * on actual local workout history.
 *
 * Non-medical disclaimer:
 * All recovery states and readiness metrics are software heuristics for
 * training volume adjustments, NOT medical diagnoses or health claims.
 */

import { ALL_CANONICAL_MUSCLES, MUSCLES, FOCUS_AREA_TO_MUSCLES } from '../data/taxonomy.js';
import { calculateRecentTrainingLoad, getLoadTierLabel, calculateSessionTrainingLoad } from './training-load.js';
import { getExerciseById } from '../data/exercises.js';

export const RECOVERY_STATES = Object.freeze({
  READY: 'READY',
  NORMAL: 'NORMAL',
  RECOVERY_RECOMMENDED: 'RECOVERY_RECOMMENDED',
  REDUCE_VOLUME: 'REDUCE_VOLUME',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Normalizes a list of target muscles or focus areas to canonical muscle strings.
 *
 * @param {Array<string>|string} rawMuscles
 * @returns {Array<string>}
 */
export function normalizeMuscleList(rawMuscles) {
  if (!rawMuscles) return [];
  const list = Array.isArray(rawMuscles) ? rawMuscles : [rawMuscles];
  const canonical = new Set();

  list.forEach(item => {
    if (typeof item !== 'string') return;
    const clean = item.trim().toLowerCase();
    const mapped = FOCUS_AREA_TO_MUSCLES[item] || FOCUS_AREA_TO_MUSCLES[clean];
    if (mapped) {
      mapped.forEach(m => canonical.add(m));
    } else if (ALL_CANONICAL_MUSCLES.includes(clean)) {
      canonical.add(clean);
    }
  });

  return Array.from(canonical);
}

/**
 * Extracts all primary and secondary muscles trained in a completed workout history record.
 *
 * @param {Object} historyRecord
 * @returns {{ primary: Set<string>, secondary: Set<string>, setsPerMuscle: Map<string, number> }}
 */
export function extractMusclesFromHistoryRecord(historyRecord) {
  const primary = new Set();
  const secondary = new Set();
  const setsPerMuscle = new Map();

  if (!historyRecord || typeof historyRecord !== 'object') {
    return { primary, secondary, setsPerMuscle };
  }

  // 1. If completed exercise IDs are recorded
  const exerciseIds = [];
  if (Array.isArray(historyRecord.completedExerciseIds)) {
    historyRecord.completedExerciseIds.forEach(id => { if (typeof id === 'string' && id.trim()) exerciseIds.push(id.trim()); });
  }
  if (Array.isArray(historyRecord.exerciseIds)) {
    historyRecord.exerciseIds.forEach(id => { if (typeof id === 'string' && id.trim()) exerciseIds.push(id.trim()); });
  }
  if (Array.isArray(historyRecord.completedExercises)) {
    historyRecord.completedExercises.forEach(e => {
      if (typeof e === 'string' && e.trim()) exerciseIds.push(e.trim());
      else if (e && e.id && typeof e.id === 'string') exerciseIds.push(e.id.trim());
      else if (e && e.exerciseId && typeof e.exerciseId === 'string') exerciseIds.push(e.exerciseId.trim());
    });
  }
  if (Array.isArray(historyRecord.exercises)) {
    historyRecord.exercises.forEach(e => {
      if (typeof e === 'string' && e.trim()) exerciseIds.push(e.trim());
      else if (e && e.id && typeof e.id === 'string') exerciseIds.push(e.id.trim());
      else if (e && e.exerciseId && typeof e.exerciseId === 'string') exerciseIds.push(e.exerciseId.trim());
    });
  }

  const defaultSets = Number(historyRecord.setsCompleted) > 0
    ? Math.max(1, Math.round(Number(historyRecord.setsCompleted) / (exerciseIds.length || 1)))
    : 3;

  exerciseIds.forEach(id => {
    const ex = getExerciseById(id);
    if (!ex) return;

    (ex.primaryMuscles || []).forEach(m => {
      primary.add(m);
      setsPerMuscle.set(m, (setsPerMuscle.get(m) || 0) + defaultSets);
    });

    (ex.secondaryMuscles || []).forEach(m => {
      secondary.add(m);
      setsPerMuscle.set(m, (setsPerMuscle.get(m) || 0) + Math.round(defaultSets * 0.5));
    });
  });

  // 2. If targetMuscles was saved on the record and no exercises were resolved
  if (primary.size === 0 && Array.isArray(historyRecord.targetMuscles)) {
    const mapped = normalizeMuscleList(historyRecord.targetMuscles);
    mapped.forEach(m => {
      primary.add(m);
      setsPerMuscle.set(m, (setsPerMuscle.get(m) || 0) + defaultSets);
    });
  }

  return { primary, secondary, setsPerMuscle };
}

/**
 * Evaluates recovery state, training cadence, and muscle fatigue deterministically.
 *
 * @param {Object} params
 * @param {Array<Object>} [params.historyRecords=[]] - Completed workout history
 * @param {Date|string} [params.referenceDate=new Date()] - Evaluation anchor timestamp
 * @param {Array<string>} [params.proposedMuscles=[]] - Muscle groups targeted by the upcoming session
 * @returns {Object} Structured recovery report
 */
export function analyzeRecovery(params = {}, legacyRefDate = null, legacyProposed = null) {
  let historyRecords = [];
  let referenceDate = new Date();
  let proposedMuscles = [];

  if (Array.isArray(params)) {
    historyRecords = params;
    if (legacyRefDate) referenceDate = legacyRefDate;
    if (legacyProposed) {
      if (Array.isArray(legacyProposed)) {
        proposedMuscles = legacyProposed;
      } else if (legacyProposed && typeof legacyProposed === 'object' && Array.isArray(legacyProposed.exercises)) {
        proposedMuscles = legacyProposed.exercises.flatMap(e => {
          if (!e) return [];
          const exObj = typeof e === 'string' ? getExerciseById(e) : e;
          return (exObj && exObj.muscleGroups) ? exObj.muscleGroups : ((exObj && exObj.primaryMuscles) ? exObj.primaryMuscles : []);
        });
      }
    }
  } else if (params && typeof params === 'object') {
    historyRecords = params.historyRecords || [];
    referenceDate = params.referenceDate || new Date();
    proposedMuscles = params.proposedMuscles || [];
  }

  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refTime = !isNaN(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();

  const getRecordTimestamp = (r) => {
    if (!r || typeof r !== 'object') return null;
    const raw = r.completedAt || r.date || r.timestamp;
    if (!raw) return null;
    const ts = new Date(raw).getTime();
    return (!isNaN(ts) && ts > 0) ? { ts, dateStr: raw } : null;
  };

  // Filter valid historical records up to reference time (strictly no future records)
  const validHistory = (historyRecords || [])
    .map(r => {
      const parsed = getRecordTimestamp(r);
      return parsed ? { ...r, _parsedTs: parsed.ts, _dateStr: parsed.dateStr } : null;
    })
    .filter(r => r !== null && r._parsedTs <= refTime)
    .sort((a, b) => b._parsedTs - a._parsedTs);

  const canonicalProposed = normalizeMuscleList(proposedMuscles);

  // INSUFFICIENT_DATA check
  if (validHistory.length === 0) {
    return {
      status: RECOVERY_STATES.INSUFFICIENT_DATA,
      state: RECOVERY_STATES.INSUFFICIENT_DATA,
      score: null,
      readinessScore: null,
      consecutiveDays: 0,
      daysSinceLastWorkout: null,
      hoursSinceLastWorkout: null,
      weeklyTrainingDays: 0,
      trailing7DaysWorkouts: 0,
      weeklyTrainingLoad: 0,
      weeklyLoadTier: 'None',
      fatiguedMuscles: [],
      recentTrainedMuscles: [],
      overlappingMuscles: [],
      overlapDetected: false,
      muscleFatigueMap: {},
      reasons: ['No completed workout history available to evaluate recovery status. Baseline calibration active.'],
      reason: 'No prior completed workout history available to evaluate recovery status. Baseline calibration active.',
      recommendations: ['Proceed with standard baseline workout volume.']
    };
  }

  const mostRecent = validHistory[0];
  const mostRecentTs = mostRecent._parsedTs;
  const hoursSinceLastWorkout = Math.max(0, Math.round((refTime - mostRecentTs) / MS_PER_HOUR));
  const daysSinceLastWorkout = Math.max(0, Math.floor((refTime - mostRecentTs) / MS_PER_DAY));

  // 1. Calculate consecutive training days leading up to refDate
  // Map history to unique calendar date strings YYYY-MM-DD
  const trainedDates = new Set(
    validHistory.map(r => new Date(r._parsedTs).toISOString().split('T')[0])
  );

  let consecutiveDays = 0;
  // Check day by day backwards from today or yesterday
  const refDateStr = new Date(refTime).toISOString().split('T')[0];
  let checkTime = refTime;

  // If trained today, start streak from today; otherwise start from yesterday
  if (trainedDates.has(refDateStr)) {
    checkTime = refTime;
  } else {
    checkTime = refTime - MS_PER_DAY;
  }

  while (true) {
    const dStr = new Date(checkTime).toISOString().split('T')[0];
    if (trainedDates.has(dStr)) {
      consecutiveDays++;
      checkTime -= MS_PER_DAY;
    } else {
      break;
    }
  }

  // 2. Trailing 7-day metrics
  const sevenDaysAgoTs = refTime - (7 * MS_PER_DAY);
  const last7DaysRecords = validHistory.filter(r => r._parsedTs >= sevenDaysAgoTs);
  const weeklyTrainingDays = new Set(
    last7DaysRecords.map(r => new Date(r._parsedTs).toISOString().split('T')[0])
  ).size;

  const weeklyTrainingLoad = calculateRecentTrainingLoad(validHistory, refDateObj);
  const weeklyLoadTier = getLoadTierLabel(weeklyTrainingLoad);

  // 3. Muscle Fatigue Tracking (last 48 hours)
  const fortyEightHoursAgoTs = refTime - (48 * MS_PER_HOUR);
  const recent48hRecords = validHistory.filter(r => r._parsedTs >= fortyEightHoursAgoTs);

  const muscleFatigueMap = {};
  ALL_CANONICAL_MUSCLES.forEach(m => {
    muscleFatigueMap[m] = {
      muscle: m,
      fatigueLevel: 'FRESH',
      hoursSince: null,
      setsRecent: 0
    };
  });

  // Accumulate sets and recency per muscle from 48h history
  recent48hRecords.forEach(rec => {
    const recHoursAgo = Math.max(0, Math.round((refTime - rec._parsedTs) / MS_PER_HOUR));
    const { primary, secondary, setsPerMuscle } = extractMusclesFromHistoryRecord(rec);

    setsPerMuscle.forEach((sets, muscle) => {
      if (!muscleFatigueMap[muscle]) return;
      const entry = muscleFatigueMap[muscle];
      entry.setsRecent += sets;
      if (entry.hoursSince === null || recHoursAgo < entry.hoursSince) {
        entry.hoursSince = recHoursAgo;
      }
    });
  });

  // Assign fatigue levels deterministically
  const fatiguedMuscles = [];
  ALL_CANONICAL_MUSCLES.forEach(m => {
    const entry = muscleFatigueMap[m];
    if (entry.hoursSince !== null) {
      if (entry.hoursSince <= 24) {
        entry.fatigueLevel = entry.setsRecent >= 6 ? 'HIGH' : 'MODERATE';
      } else if (entry.hoursSince <= 48) {
        entry.fatigueLevel = entry.setsRecent >= 10 ? 'MODERATE' : 'LOW';
      }
    }
    if (entry.fatigueLevel === 'HIGH' || entry.fatigueLevel === 'MODERATE') {
      fatiguedMuscles.push(m);
    }
  });

  // 4. Muscle Overlap with Proposed Workout
  const overlappingMuscles = [];
  canonicalProposed.forEach(m => {
    const fatigue = muscleFatigueMap[m];
    if (fatigue && (fatigue.fatigueLevel === 'HIGH' || fatigue.fatigueLevel === 'MODERATE' || (fatigue.hoursSince !== null && fatigue.hoursSince <= 36))) {
      overlappingMuscles.push(m);
    }
  });

  // 5. Determine Overall Recovery State
  let status = RECOVERY_STATES.READY;
  const reasons = [];
  const recommendations = [];

  if (consecutiveDays >= 3) {
    status = RECOVERY_STATES.RECOVERY_RECOMMENDED;
    reasons.push(`${consecutiveDays} consecutive training days detected without rest.`);
    recommendations.push('Take an active rest day or reduce workout intensity to prevent systemic overtraining.');
  } else if (hoursSinceLastWorkout < 12) {
    status = RECOVERY_STATES.RECOVERY_RECOMMENDED;
    reasons.push(`Previous workout completed only ${hoursSinceLastWorkout} hours ago.`);
    recommendations.push('Allow at least 12–24 hours between intense sessions.');
  } else if (overlappingMuscles.length > 0) {
    status = RECOVERY_STATES.REDUCE_VOLUME;
    reasons.push(`Muscle overlap detected: ${overlappingMuscles.join(', ')} trained within the last 24–48 hours.`);
    recommendations.push(`Reduce volume or substitute exercises targeting ${overlappingMuscles.join(', ')} to promote local recovery.`);
  } else if (weeklyTrainingLoad >= 200) {
    status = RECOVERY_STATES.REDUCE_VOLUME;
    reasons.push(`Trailing 7-day training load is elevated (${weeklyTrainingLoad} pts - ${weeklyLoadTier}).`);
    recommendations.push('Scale back sets or duration by 10–20% to prevent fatigue accumulation.');
  } else if (daysSinceLastWorkout === 0) {
    status = RECOVERY_STATES.NORMAL;
    reasons.push(`Workout completed earlier today (${hoursSinceLastWorkout} hours ago). System is in regular recovery.`);
    recommendations.push('Maintain standard intensity; avoid excessive volume on previously engaged muscles.');
  } else if (daysSinceLastWorkout === 1) {
    status = RECOVERY_STATES.NORMAL;
    reasons.push('Regular daily cadence. Recovery markers are in a balanced, healthy range.');
    recommendations.push('Maintain scheduled workout intensity and target sets.');
  } else {
    status = RECOVERY_STATES.READY;
    reasons.push(`Optimal recovery window achieved (${daysSinceLastWorkout} days since last session). System is primed.`);
    recommendations.push('Prime condition for progressive overload and volume advancement.');
  }

  // Deterministic readiness score calculation (0 - 100)
  let baseScore = 85;
  if (status === RECOVERY_STATES.READY) baseScore = 95;
  else if (status === RECOVERY_STATES.NORMAL) baseScore = 85;
  else if (status === RECOVERY_STATES.REDUCE_VOLUME) baseScore = 65;
  else if (status === RECOVERY_STATES.RECOVERY_RECOMMENDED) baseScore = 45;

  // Modulate slightly based on overlap count and consecutive days
  const overlapPenalty = overlappingMuscles.length * 5;
  const streakPenalty = Math.max(0, consecutiveDays - 2) * 8;
  const score = Math.max(20, Math.min(100, baseScore - overlapPenalty - streakPenalty));

  return {
    status,
    state: status,
    score,
    readinessScore: score,
    consecutiveDays,
    daysSinceLastWorkout,
    hoursSinceLastWorkout,
    weeklyTrainingDays,
    trailing7DaysWorkouts: weeklyTrainingDays,
    weeklyTrainingLoad,
    weeklyLoadTier,
    fatiguedMuscles,
    recentTrainedMuscles: ALL_CANONICAL_MUSCLES.filter(m => muscleFatigueMap[m] && muscleFatigueMap[m].hoursSince !== null),
    overlappingMuscles,
    overlapDetected: overlappingMuscles.length > 0,
    muscleFatigueMap,
    reasons,
    reason: reasons[0] || '',
    recommendations
  };
}
