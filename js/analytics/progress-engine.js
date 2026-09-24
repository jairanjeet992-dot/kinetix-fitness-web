/**
 * PROGRESS & TRAINING INTELLIGENCE ENGINE - KINETIX
 * Phase 4: Progress & Training Intelligence
 *
 * Deterministic analytics layer that derives all training intelligence
 * metrics from sanitized completed workout history.
 *
 * O(N) single-pass aggregation designed to scale efficiently up to 5,000+ records.
 *
 * ARCHITECTURAL CONTRACT:
 * - Pure computation layer: does not access localStorage directly.
 * - Accepts validated history records and optional profile.
 * - Returns structured, UI-agnostic analytics dataset.
 * - Guarantees zero fake statistics: returns honest empty-state representation
 *   when history is empty.
 */

import { calculateStreak } from './streak-engine.js';
import {
  calculateSessionTrainingLoad,
  calculateTotalTrainingLoad,
  calculateRecentTrainingLoad
} from './training-load.js';
import { computeSessionMilestones } from './pr-model.js';
import { EXERCISES } from '../data/exercises.js';
import {
  ALL_CANONICAL_MUSCLES,
  MUSCLE_LABELS,
  GOALS,
  normalizeGoal
} from '../data/taxonomy.js';

// Pre-index exercises for O(1) metadata lookup
const EXERCISE_CACHE = new Map();
if (Array.isArray(EXERCISES)) {
  EXERCISES.forEach(ex => {
    if (ex && ex.id) {
      EXERCISE_CACHE.set(ex.id, ex);
    }
  });
}

/**
 * Returns empty analytics state structure with honest zero/empty values.
 */
export function getEmptyProgressAnalytics() {
  const muscleDistribution = ALL_CANONICAL_MUSCLES.map(muscleId => ({
    muscleId,
    label: MUSCLE_LABELS[muscleId] || muscleId,
    exerciseCount: 0,
    primarySets: 0,
    secondarySets: 0,
    totalSets: 0,
    sessionCount: 0,
    percentage: 0
  }));

  return {
    hasData: false,
    overview: {
      totalWorkouts: 0,
      totalDurationSeconds: 0,
      totalDurationMinutes: 0,
      totalSets: 0,
      totalExercises: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalTrainingDays: 0,
      totalTrainingLoad: 0,
      recentTrainingLoad: 0,
      avgDurationMinutes: 0,
      avgSetsPerWorkout: 0
    },
    frequency: {
      weeklyWorkouts: 0,
      monthlyWorkouts: 0,
      consistencyScore: 0, // 0 - 100%
      averageWorkoutsPerWeek: 0,
      weeklyVolumeTrend: [] // 7-day array
    },
    goals: {
      userGoal: null,
      distribution: {},
      primaryGoalMatchPercentage: 0
    },
    muscles: {
      distribution: muscleDistribution,
      topMuscles: [],
      mostTrainedMuscle: null
    },
    exercises: {
      topExercises: [],
      uniqueExercisesCount: 0
    },
    milestones: {
      longestDurationMinutes: 0,
      maxSetsInSession: 0,
      maxExercisesInSession: 0,
      highestTrainingLoad: 0,
      hasRealData: false
    },
    recentActivity: []
  };
}

/**
 * Derives comprehensive training intelligence from workout history.
 *
 * @param {Array} historyRecords - Sanitized completed workout records.
 * @param {Object} [profile=null] - User profile for goal alignment analysis.
 * @param {Date|string} [referenceDate=new Date()] - Reference date for time-window calculations.
 * @returns {Object} Complete training intelligence metrics.
 */
export function computeProgressAnalytics(historyRecords = [], profile = null, referenceDate = new Date()) {
  if (!Array.isArray(historyRecords) || historyRecords.length === 0) {
    const emptyState = getEmptyProgressAnalytics();
    if (profile && profile.goal) {
      emptyState.goals.userGoal = normalizeGoal(profile.goal);
    }
    return emptyState;
  }

  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refTime = !isNaN(refDateObj.getTime()) ? refDateObj.getTime() : Date.now();
  const MS_PER_DAY = 86400000;
  const sevenDaysAgo = refTime - (7 * MS_PER_DAY);
  const thirtyDaysAgo = refTime - (30 * MS_PER_DAY);

  // 1. STREAK ENGINE
  const streakData = calculateStreak(historyRecords, refDateObj);

  // 2. INITIALIZE ACCUMULATORS
  let totalDurationSeconds = 0;
  let totalSets = 0;
  let totalExercises = 0;
  let weeklyWorkouts = 0;
  let monthlyWorkouts = 0;

  // Goals map
  const goalCounts = {};
  Object.values(GOALS).forEach(g => { goalCounts[g] = 0; });
  goalCounts['other'] = 0;

  // Exercise frequency map: exerciseId -> { id, name, count, totalSets }
  const exerciseFreqMap = new Map();

  // Muscle tracking: muscleId -> { primarySets, secondarySets, uniqueExercises: Set, sessionDates: Set }
  const muscleMap = new Map();
  ALL_CANONICAL_MUSCLES.forEach(m => {
    muscleMap.set(m, {
      primarySets: 0,
      secondarySets: 0,
      uniqueExercises: new Set(),
      sessionDates: new Set()
    });
  });

  // 7-day volume trend (last 7 days ending at reference date)
  const last7DaysMap = new Map();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refTime - (i * MS_PER_DAY));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    last7DaysMap.set(dateKey, { date: dateKey, dayName, count: 0, minutes: 0 });
  }

  // 3. SINGLE LINEAR SCAN O(N) OVER HISTORY RECORDS
  historyRecords.forEach(rec => {
    if (!rec || typeof rec !== 'object') return;

    // A. Duration
    const durSec = Number(rec.durationSeconds || rec.duration || 0);
    const validDurSec = Number.isFinite(durSec) && durSec > 0 ? durSec : 0;
    totalDurationSeconds += validDurSec;

    // B. Sets
    const sets = Number(rec.setsCompleted ?? rec.completedSets ?? 0);
    const validSets = Number.isFinite(sets) && sets > 0 ? sets : 0;
    totalSets += validSets;

    // C. Exercises count
    const completedExList = Array.isArray(rec.completedExerciseIds)
      ? rec.completedExerciseIds
      : (Array.isArray(rec.completedExercises) ? rec.completedExercises : []);

    const exCount = completedExList.length > 0
      ? completedExList.length
      : Number(rec.exercisesCompleted || 0);
    totalExercises += (Number.isFinite(exCount) && exCount > 0 ? exCount : 0);

    // D. Time Window Calculations
    const completedAtStr = rec.completedAt || rec.startedAt;
    let recordTime = NaN;
    let calendarDate = null;
    if (completedAtStr) {
      const d = new Date(completedAtStr);
      recordTime = d.getTime();
      if (!isNaN(recordTime)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        calendarDate = `${y}-${m}-${day}`;
      }
    }

    if (!isNaN(recordTime)) {
      if (recordTime >= sevenDaysAgo && recordTime <= refTime + 60000) {
        weeklyWorkouts++;
      }
      if (recordTime >= thirtyDaysAgo && recordTime <= refTime + 60000) {
        monthlyWorkouts++;
      }
      if (calendarDate && last7DaysMap.has(calendarDate)) {
        const dayEntry = last7DaysMap.get(calendarDate);
        dayEntry.count += 1;
        dayEntry.minutes += Math.round(validDurSec / 60);
      }
    }

    // E. Goal Distribution
    const rawGoal = rec.workoutGoal || rec.goal;
    const normalizedGoal = rawGoal ? normalizeGoal(rawGoal) : 'other';
    goalCounts[normalizedGoal] = (goalCounts[normalizedGoal] || 0) + 1;

    // F. Exercises and Muscle Attribution
    const workoutSets = validSets;
    const setsPerEx = completedExList.length > 0
      ? Math.max(1, Math.round(workoutSets / completedExList.length))
      : 3;

    completedExList.forEach(exId => {
      if (!exId || typeof exId !== 'string') return;
      const cleanId = exId.trim();

      // Track exercise frequency
      let exEntry = exerciseFreqMap.get(cleanId);
      if (!exEntry) {
        const meta = EXERCISE_CACHE.get(cleanId);
        exEntry = {
          id: cleanId,
          name: meta ? meta.name : cleanId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          count: 0,
          totalSets: 0
        };
        exerciseFreqMap.set(cleanId, exEntry);
      }
      exEntry.count += 1;
      exEntry.totalSets += setsPerEx;

      // Track muscles attribution
      const exMeta = EXERCISE_CACHE.get(cleanId);
      if (exMeta) {
        const primaries = Array.isArray(exMeta.primaryMuscles) ? exMeta.primaryMuscles : [];
        const secondaries = Array.isArray(exMeta.secondaryMuscles) ? exMeta.secondaryMuscles : [];

        primaries.forEach(pMuscle => {
          const muscleData = muscleMap.get(pMuscle);
          if (muscleData) {
            muscleData.primarySets += setsPerEx;
            muscleData.uniqueExercises.add(cleanId);
            if (calendarDate) muscleData.sessionDates.add(calendarDate);
          }
        });

        secondaries.forEach(sMuscle => {
          const muscleData = muscleMap.get(sMuscle);
          if (muscleData) {
            muscleData.secondarySets += Math.max(1, Math.round(setsPerEx * 0.5));
            muscleData.uniqueExercises.add(cleanId);
            if (calendarDate) muscleData.sessionDates.add(calendarDate);
          }
        });
      }
    });
  });

  const totalWorkouts = historyRecords.length;
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60);
  const avgDurationMinutes = totalWorkouts > 0 ? Math.round(totalDurationMinutes / totalWorkouts) : 0;
  const avgSetsPerWorkout = totalWorkouts > 0 ? Math.round(totalSets / totalWorkouts) : 0;

  // 4. TRAINING LOAD
  const totalTrainingLoad = calculateTotalTrainingLoad(historyRecords);
  const recentTrainingLoad = calculateRecentTrainingLoad(historyRecords, refDateObj);

  // 5. TRAINING CONSISTENCY & FREQUENCY
  // Estimate average weekly workouts based on active calendar weeks span (min 1 week)
  const earliestDateStr = streakData.trainingDates[0];
  let activeWeeksSpan = 1;
  if (earliestDateStr) {
    const daysSinceFirst = Math.max(1, Math.abs(streakData.trainingDates.length > 0
      ? (new Date(refTime) - new Date(earliestDateStr)) / MS_PER_DAY
      : 1));
    activeWeeksSpan = Math.max(1, Math.ceil(daysSinceFirst / 7));
  }
  const averageWorkoutsPerWeek = Math.round((totalWorkouts / activeWeeksSpan) * 10) / 10;
  // Consistency score: benchmark 3 sessions/week as 100% baseline consistency
  const consistencyScore = Math.min(100, Math.round((weeklyWorkouts / 3) * 100));

  // 6. GOAL ALIGNMENT
  const userGoal = profile && profile.goal ? normalizeGoal(profile.goal) : null;
  let matchingGoalWorkouts = 0;
  if (userGoal && goalCounts[userGoal]) {
    matchingGoalWorkouts = goalCounts[userGoal];
  }
  const primaryGoalMatchPercentage = totalWorkouts > 0
    ? Math.round((matchingGoalWorkouts / totalWorkouts) * 100)
    : 0;

  // 7. MUSCLE GROUP ANALYTICS
  let totalMuscleStimulusScore = 0;
  const muscleDistribution = ALL_CANONICAL_MUSCLES.map(muscleId => {
    const data = muscleMap.get(muscleId) || {
      primarySets: 0,
      secondarySets: 0,
      uniqueExercises: new Set(),
      sessionDates: new Set()
    };
    const totalMuscleSets = data.primarySets + data.secondarySets;
    totalMuscleStimulusScore += totalMuscleSets;

    return {
      muscleId,
      label: MUSCLE_LABELS[muscleId] || muscleId,
      exerciseCount: data.uniqueExercises.size,
      primarySets: data.primarySets,
      secondarySets: data.secondarySets,
      totalSets: totalMuscleSets,
      sessionCount: data.sessionDates.size,
      percentage: 0 // Computed below once total is known
    };
  });

  // Calculate percentage of total training volume
  if (totalMuscleStimulusScore > 0) {
    muscleDistribution.forEach(item => {
      item.percentage = Math.round((item.totalSets / totalMuscleStimulusScore) * 100);
    });
  }

  // Sorted top muscles
  const topMuscles = [...muscleDistribution]
    .filter(m => m.totalSets > 0)
    .sort((a, b) => b.totalSets - a.totalSets);

  const mostTrainedMuscle = topMuscles.length > 0 ? topMuscles[0] : null;

  // 8. TOP EXERCISES
  const topExercises = Array.from(exerciseFreqMap.values())
    .sort((a, b) => b.count - a.count || b.totalSets - a.totalSets)
    .slice(0, 5);

  // 9. RECENT ACTIVITY LIST (Sorted latest first, max 10)
  const recentActivity = [...historyRecords]
    .filter(r => r && typeof r === 'object')
    .sort((a, b) => {
      const tsA = new Date(a.completedAt || a.startedAt || 0).getTime();
      const tsB = new Date(b.completedAt || b.startedAt || 0).getTime();
      return tsB - tsA;
    })
    .slice(0, 10)
    .map(r => {
      const durSec = Number(r.durationSeconds || r.duration || 0);
      const minutes = Math.max(1, Math.round(durSec / 60));
      const sets = Number(r.setsCompleted ?? r.completedSets ?? 0);
      const completedCount = Number(r.exercisesCompleted ?? (Array.isArray(r.completedExerciseIds) ? r.completedExerciseIds.length : 0));
      const load = r.trainingLoad ?? calculateSessionTrainingLoad(r);

      return {
        sessionId: r.sessionId,
        workoutId: r.workoutId,
        title: r.title || r.workoutTitle || 'Workout Session',
        completedAt: r.completedAt || r.startedAt,
        durationMinutes: minutes,
        durationSeconds: durSec,
        setsCompleted: sets,
        exercisesCompleted: completedCount,
        trainingLoad: load,
        completionPercentage: Number(r.completionPercentage || 100),
        goal: r.workoutGoal || r.goal || 'General'
      };
    });

  // 10. REAL MILESTONES
  const milestones = computeSessionMilestones(historyRecords);

  return {
    hasData: true,
    overview: {
      totalWorkouts,
      totalDurationSeconds,
      totalDurationMinutes,
      totalSets,
      totalExercises,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      totalTrainingDays: streakData.totalTrainingDays,
      totalTrainingLoad,
      recentTrainingLoad,
      avgDurationMinutes,
      avgSetsPerWorkout
    },
    frequency: {
      weeklyWorkouts,
      monthlyWorkouts,
      consistencyScore,
      averageWorkoutsPerWeek,
      weeklyVolumeTrend: Array.from(last7DaysMap.values())
    },
    goals: {
      userGoal,
      distribution: goalCounts,
      primaryGoalMatchPercentage
    },
    muscles: {
      distribution: muscleDistribution,
      topMuscles,
      mostTrainedMuscle
    },
    exercises: {
      topExercises,
      uniqueExercisesCount: exerciseFreqMap.size
    },
    milestones,
    recentActivity
  };
}
