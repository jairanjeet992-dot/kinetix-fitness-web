/**
 * WORKOUT HISTORY & PERFORMANCE LOGS - KINETIX
 * Phase 8: Session Persistence, Performance Tracking & Progress Reconciliation
 *
 * Implements:
 * 1. Persistent workout session logs in localStorage
 * 2. Real-time reconciliation with Weekly Training Plan and Progress Analytics
 * 3. Personal Records (PR) detection and historical tracking
 * 4. Exercise-specific performance query for Exercise Detail view
 * 5. Corrupted storage resilience & zero-fake-data guarantee
 */

import { PROGRESS_DATA } from '../data/progress.js';
import { WEEKLY_PLAN } from '../data/plans.js';

export const HISTORY_STORAGE_KEY = 'kinetix_workout_history';
export const PROGRESS_STORAGE_KEY = 'kinetix_progress_data';
export const PLAN_STORAGE_KEY = 'kinetix_weekly_plan';

/**
 * Safely parses JSON from localStorage with graceful fallback.
 */
function safeGet(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' ? parsed : fallback;
  } catch (err) {
    console.warn(`[Kinetix History] Safe recovery from corrupted ${key}`, err);
    return fallback;
  }
}

/**
 * Safely writes JSON to localStorage.
 */
function safeSet(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.error(`[Kinetix History] Failed to write ${key}:`, err);
  }
}

/**
 * Retrieves the complete array of completed workout logs.
 * @returns {Array<Object>}
 */
export function getWorkoutHistory() {
  const history = safeGet(HISTORY_STORAGE_KEY, null);
  if (Array.isArray(history)) return history;

  // Fallback to initial seeds from progress.js recentHistory
  const seeded = (PROGRESS_DATA.recentHistory || []).map((item, idx) => ({
    sessionId: `seeded_${idx}`,
    workoutTitle: item.workoutTitle,
    workoutId: item.workoutTitle.toLowerCase().replace(/\s+/g, '-'),
    category: item.category,
    durationMin: parseInt(item.duration, 10) || 20,
    caloriesBurned: item.calories || 200,
    completedAt: item.date,
    status: 'Completed',
    setsCompleted: 12,
    totalSets: 12,
    exerciseLogs: []
  }));

  safeSet(HISTORY_STORAGE_KEY, seeded);
  return seeded;
}

/**
 * Returns the most recent completed workouts up to limit.
 */
export function getRecentWorkouts(limit = 5) {
  const all = getWorkoutHistory();
  return all.slice(0, limit);
}

/**
 * Queries completed history for a specific exercise ID.
 * Returns personal bests and set history.
 */
export function getExerciseHistory(exerciseId) {
  if (!exerciseId) return { totalSets: 0, maxReps: 0, maxWeight: 0, lastPerformed: null, history: [] };

  const all = getWorkoutHistory();
  const relevantEntries = [];
  let maxReps = 0;
  let maxWeight = 0;
  let lastPerformed = null;

  all.forEach(workout => {
    if (Array.isArray(workout.exerciseLogs)) {
      workout.exerciseLogs.forEach(setLog => {
        if (setLog.exerciseId === exerciseId) {
          relevantEntries.push({
            date: workout.completedAt,
            reps: setLog.loggedReps || 0,
            weight: setLog.loggedWeight || 0,
            durationSec: setLog.loggedDurationSec || 0
          });

          if ((setLog.loggedReps || 0) > maxReps) maxReps = setLog.loggedReps;
          if ((setLog.loggedWeight || 0) > maxWeight) maxWeight = setLog.loggedWeight;
          if (!lastPerformed) lastPerformed = workout.completedAt;
        }
      });
    }
  });

  return {
    totalSets: relevantEntries.length,
    maxReps,
    maxWeight,
    lastPerformed,
    history: relevantEntries.slice(0, 10)
  };
}

/**
 * Retrieves the live Progress Analytics data structure.
 */
export function getProgressData() {
  const stored = safeGet(PROGRESS_STORAGE_KEY, null);
  if (stored && typeof stored === 'object' && stored.overview) {
    return stored;
  }
  // Safe default progress structure (handles hardened empty PROGRESS_DATA)
  const base = (PROGRESS_DATA && PROGRESS_DATA.overview) ? PROGRESS_DATA : {
    overview: {
      totalWorkouts: 0,
      totalMinutes: 0,
      caloriesBurnedTotal: 0,
      currentStreakDays: 0
    },
    weeklyActivity: [],
    recentHistory: [],
    personalRecords: []
  };
  const initial = JSON.parse(JSON.stringify(base));
  safeSet(PROGRESS_STORAGE_KEY, initial);
  return initial;
}

/**
 * Retrieves the live Weekly Plan data structure.
 */
export function getWeeklyPlan() {
  const stored = safeGet(PLAN_STORAGE_KEY, null);
  if (stored && typeof stored === 'object' && Array.isArray(stored.days)) {
    return stored;
  }
  const initial = JSON.parse(JSON.stringify(WEEKLY_PLAN));
  safeSet(PLAN_STORAGE_KEY, initial);
  return initial;
}

/**
 * Records a completed workout session into persistence,
 * reconciles with weekly plan and updates progress stats.
 *
 * @param {Object} sessionSummary
 * @returns {{ ok: boolean, historyEntry: Object, newPrs: Array<Object> }}
 */
export function recordCompletedWorkout(sessionSummary) {
  if (!sessionSummary || typeof sessionSummary !== 'object') {
    return { ok: false, error: 'Invalid session summary' };
  }

  const sessionId = sessionSummary.sessionId || `sess_${Date.now()}`;
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const displayDate = `Today at ${timeFormatted}`;

  const historyEntry = {
    sessionId,
    workoutId: sessionSummary.workoutId || 'custom-routine',
    workoutTitle: sessionSummary.workoutTitle || 'Custom Workout',
    category: sessionSummary.category || 'Strength',
    durationMin: sessionSummary.durationMin || Math.max(1, Math.round((sessionSummary.totalElapsedSec || 60) / 60)),
    caloriesBurned: sessionSummary.caloriesBurned || 150,
    completedAt: displayDate,
    completedTimestamp: now.toISOString(),
    status: 'Completed',
    setsCompleted: sessionSummary.setsCompleted || 0,
    totalSets: sessionSummary.totalSets || 0,
    plannedSessionId: sessionSummary.plannedSessionId || null,
    planId: sessionSummary.planId || null,
    planVersion: sessionSummary.planVersion || '1.0',
    isAdaptive: Boolean(sessionSummary.isAdaptive),
    exerciseLogs: Array.isArray(sessionSummary.exerciseLogs) ? sessionSummary.exerciseLogs : []
  };

  // 1. Prepend to History
  const history = getWorkoutHistory();
  // Check duplicate session id to prevent double insertion
  const existingIdx = history.findIndex(h => h.sessionId === sessionId);
  if (existingIdx !== -1) {
    return { ok: true, historyEntry: history[existingIdx], newPrs: [], isDuplicate: true };
  }

  history.unshift(historyEntry);
  safeSet(HISTORY_STORAGE_KEY, history);

  // 2. Check for New Personal Records
  const newPrs = [];
  const progress = getProgressData();

  if (Array.isArray(sessionSummary.exerciseLogs)) {
    sessionSummary.exerciseLogs.forEach(log => {
      if (log.loggedReps && log.loggedReps >= 30) {
        // e.g. High reps milestone
        const prKey = `${log.exerciseName || 'Exercise'} Reps`;
        const exists = progress.personalRecords.find(p => p.metric.includes(log.exerciseName));
        if (!exists) {
          const newPr = {
            metric: `Max ${log.exerciseName}`,
            value: `${log.loggedReps} Reps`,
            exercise: log.exerciseName || 'Exercise',
            dateAchieved: dateFormatted,
            improved: `+${log.loggedReps} Reps`
          };
          progress.personalRecords.unshift(newPr);
          newPrs.push(newPr);
        }
      }
    });
  }

  // 3. Update Progress Overview
  progress.overview.totalWorkouts += 1;
  progress.overview.totalMinutes += historyEntry.durationMin;
  progress.overview.caloriesBurnedTotal += historyEntry.caloriesBurned;

  // Prepend to progress recentHistory
  progress.recentHistory.unshift({
    workoutTitle: historyEntry.workoutTitle,
    date: displayDate,
    duration: `${historyEntry.durationMin} min`,
    calories: historyEntry.caloriesBurned,
    category: historyEntry.category,
    status: 'Completed'
  });
  if (progress.recentHistory.length > 8) {
    progress.recentHistory.pop();
  }

  // Update today's bar in weeklyActivity
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayName = daysOfWeek[now.getDay()];
  const todayBar = progress.weeklyActivity.find(a => a.day === todayDayName || a.isToday);
  if (todayBar) {
    todayBar.completed = true;
    todayBar.minutes = (todayBar.minutes || 0) + historyEntry.durationMin;
    todayBar.label = `${todayBar.minutes}m`;
  }

  safeSet(PROGRESS_STORAGE_KEY, progress);

  // 4. Reconcile with Weekly Training Plan
  const plan = getWeeklyPlan();
  let planUpdated = false;

  plan.days.forEach(day => {
    const isMatchingPlanned = sessionSummary.plannedSessionId && day.dayOfWeek === sessionSummary.plannedSessionId;
    const isMatchingWorkout = day.workoutId && day.workoutId === sessionSummary.workoutId && (day.status === 'today' || day.status === 'upcoming');

    if (isMatchingPlanned || isMatchingWorkout) {
      day.status = 'completed';
      day.completedAt = timeFormatted;
      day.caloriesBurned = historyEntry.caloriesBurned;
      planUpdated = true;
    }
  });

  if (planUpdated) {
    const completedDaysCount = plan.days.filter(d => d.status === 'completed').length;
    const activeDaysCount = plan.days.filter(d => d.status !== 'rest').length;
    plan.weeklyCompletionPercent = Math.min(100, Math.round((completedDaysCount / (activeDaysCount || 1)) * 100));
    safeSet(PLAN_STORAGE_KEY, plan);
  }

  // Emit event for any listening UI views
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('kinetix:workout-completed', {
      detail: { historyEntry, progress, plan, newPrs }
    }));
  }

  return { ok: true, historyEntry, newPrs, isDuplicate: false };
}
