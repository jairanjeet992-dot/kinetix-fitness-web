/**
 * TRAINING PLAN GENERATOR - KINETIX
 * Phase 7: Workout Planning & Long-Term Training System
 *
 * Deterministic generator for structured, goal-aware weekly training plans.
 * Responsibilities:
 * - Deterministic weekly schedule mapping (1 to 7 training days/week).
 * - Goal periodization and focus-area prioritization.
 * - Non-overlapping muscle distribution and recovery-aware spacing.
 * - Explicit planned sessions with target intent (muscles, focus, duration).
 * - 100% deterministic (same profile, frequency, goal, referenceDate, seed -> identical plan).
 *
 * Architecture Invariant:
 * The plan generator determines STRUCTURE and SESSION INTENT.
 * It NEVER generates exercises directly. Exercise selection and load calibration
 * remain the sole responsibility of the Adaptive Workout Generator.
 */

import {
  MUSCLES,
  CATEGORIES,
  EQUIPMENT,
  GOALS,
  DIFFICULTIES,
  FOCUS_AREA_TO_MUSCLES,
  ALL_CANONICAL_MUSCLES,
  normalizeGoal,
  normalizeDifficulty,
  normalizeEquipmentList
} from '../data/taxonomy.js';

import { analyzeRecovery, RECOVERY_STATES } from '../analytics/recovery-engine.js';

export const SESSION_TYPE = Object.freeze({
  TRAINING: 'TRAINING',
  REST: 'REST',
  RECOVERY: 'RECOVERY',
  OPTIONAL: 'OPTIONAL'
});

export const SESSION_STATUS = Object.freeze({
  PLANNED: 'PLANNED',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  MISSED: 'MISSED',
  SKIPPED: 'SKIPPED',
  RESCHEDULED: 'RESCHEDULED',
  CANCELLED: 'CANCELLED'
});

export const PLAN_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  COMPLETED: 'COMPLETED'
});

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Normalizes a date into a deterministic YYYY-MM-DD string using UTC.
 *
 * @param {Date|string|number} d
 * @returns {string} Formatted 'YYYY-MM-DD'
 */
export function toDateString(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the Monday (UTC) of the week containing refDate.
 *
 * @param {Date|string} refDate
 * @returns {Date}
 */
export function getStartOfWeek(refDate) {
  const d = new Date(refDate instanceof Date ? refDate.getTime() : new Date(refDate).getTime());
  if (isNaN(d.getTime())) return new Date('2026-06-08T00:00:00Z');
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diff = (day === 0 ? -6 : 1) - day; // Move to Monday
  const monday = new Date(d.getTime() + diff * 86400000);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Adds N days to a date string or Date object.
 *
 * @param {Date|string} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const d = new Date(date instanceof Date ? date.getTime() : new Date(date).getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Sanitizes and normalizes training frequency to a safe 1-7 range.
 *
 * @param {any} frequency
 * @returns {number} Integer between 1 and 7
 */
export function normalizeTrainingFrequency(frequency) {
  if (frequency === null || frequency === undefined || typeof frequency === 'boolean') {
    return 3; // Standard baseline default
  }
  if (typeof frequency === 'string') {
    const trimmed = frequency.trim();
    if (trimmed.length === 0) return 3;
    const match = trimmed.match(/\d+/);
    if (!match) return 3;
    const val = parseInt(match[0], 10);
    return Math.max(1, Math.min(7, val));
  }
  const num = Number(frequency);
  if (!Number.isFinite(num)) return 3;
  return Math.max(1, Math.min(7, Math.round(num)));
}

/**
 * Maps raw focus areas from profile into canonical muscle arrays.
 *
 * @param {Array<string>|string} focusAreas
 * @returns {Array<string>} Canonical muscle names
 */
export function resolveTargetMuscles(focusAreas) {
  if (!focusAreas) return ['Full Body'];
  const areas = Array.isArray(focusAreas) ? focusAreas : [focusAreas];
  const muscles = new Set();

  areas.forEach(area => {
    if (!area) return;
    const str = String(area).trim();
    const mapped = FOCUS_AREA_TO_MUSCLES[str] || FOCUS_AREA_TO_MUSCLES[str.toLowerCase()];
    if (Array.isArray(mapped)) {
      mapped.forEach(m => muscles.add(m));
    } else if (ALL_CANONICAL_MUSCLES.includes(str.toLowerCase())) {
      muscles.add(str.toLowerCase());
    }
  });

  return muscles.size > 0 ? Array.from(muscles) : ['chest', 'back', 'quadriceps', 'core'];
}

/**
 * Deterministically constructs a 7-day template split based on frequency, goal, and focus.
 *
 * Days index: 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun.
 *
 * @param {number} frequency - 1 to 7
 * @param {string} goal - Normalized goal
 * @param {Array<string>} userFocusMuscles - Resolved primary muscles
 * @returns {Array<Object>} 7 daily template configurations
 */
export function getWeeklySplitTemplate(frequency, goal, userFocusMuscles = []) {
  const hasUserFocus = Array.isArray(userFocusMuscles) && userFocusMuscles.length > 0;
  const primaryFocus = hasUserFocus ? userFocusMuscles : ['chest', 'back'];

  // Base Templates for 1 to 7 days
  switch (frequency) {
    case 1:
      // 1-Day: High-yield Full Body stimulus
      return [
        { dayIndex: 0, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 1, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        {
          dayIndex: 2,
          type: SESSION_TYPE.TRAINING,
          title: 'Full Body Foundational Strength',
          focus: 'Full Body',
          targetMuscles: hasUserFocus ? Array.from(new Set([...primaryFocus, 'quadriceps', 'back', 'core'])) : ['chest', 'back', 'quadriceps', 'core']
        },
        { dayIndex: 3, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 4, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 5, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 6, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' }
      ];

    case 2:
      // 2-Day: Upper / Lower or Full Body A / B with 2+ days rest spacing
      return [
        {
          dayIndex: 0,
          type: SESSION_TYPE.TRAINING,
          title: 'Upper Body & Core Calibration',
          focus: 'Upper Body',
          targetMuscles: Array.from(new Set([...primaryFocus.filter(m => ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core'].includes(m)), 'chest', 'back']))
        },
        { dayIndex: 1, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 2, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        {
          dayIndex: 3,
          type: SESSION_TYPE.TRAINING,
          title: 'Lower Body & Posterior Chain',
          focus: 'Lower Body',
          targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves']
        },
        { dayIndex: 4, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 5, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 6, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' }
      ];

    case 3:
      // 3-Day: Classic Spaced Split (Mon / Wed / Fri)
      return [
        {
          dayIndex: 0,
          type: SESSION_TYPE.TRAINING,
          title: goal === GOALS.GET_STRONGER ? 'Heavy Push & Anterior Chain' : 'Upper Body Push & Core',
          focus: 'Push',
          targetMuscles: ['chest', 'shoulders', 'triceps']
        },
        { dayIndex: 1, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        {
          dayIndex: 2,
          type: SESSION_TYPE.TRAINING,
          title: 'Posterior Chain Pull & Lats',
          focus: 'Pull',
          targetMuscles: ['back', 'biceps', 'forearms']
        },
        { dayIndex: 3, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        {
          dayIndex: 4,
          type: SESSION_TYPE.TRAINING,
          title: 'Lower Body Power & Conditioning',
          focus: 'Lower Body',
          targetMuscles: ['quadriceps', 'hamstrings', 'glutes', 'calves']
        },
        { dayIndex: 5, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' },
        { dayIndex: 6, type: SESSION_TYPE.REST, focus: 'Rest & Recovery' }
      ];

    case 4:
      // 4-Day: Upper / Lower / Rest / Upper / Lower / Rest / Rest
      return [
        {
          dayIndex: 0,
          type: SESSION_TYPE.TRAINING,
          title: 'Upper Body Power & Focus',
          focus: 'Upper Body',
          targetMuscles: ['chest', 'back', 'shoulders']
        },
        {
          dayIndex: 1,
          type: SESSION_TYPE.TRAINING,
          title: 'Lower Body Strength & Calves',
          focus: 'Lower Body',
          targetMuscles: ['quadriceps', 'hamstrings', 'glutes']
        },
        { dayIndex: 2, type: SESSION_TYPE.REST, focus: 'Midweek Rest & Active Recovery' },
        {
          dayIndex: 3,
          type: SESSION_TYPE.TRAINING,
          title: 'Upper Body Hypertrophy & Arms',
          focus: 'Upper Body',
          targetMuscles: Array.from(new Set([...primaryFocus, 'chest', 'back', 'biceps', 'triceps']))
        },
        {
          dayIndex: 4,
          type: SESSION_TYPE.TRAINING,
          title: 'Lower Body Posterior & Core',
          focus: 'Lower Body',
          targetMuscles: ['hamstrings', 'glutes', 'core', 'calves']
        },
        { dayIndex: 5, type: SESSION_TYPE.REST, focus: 'Weekend Recovery' },
        { dayIndex: 6, type: SESSION_TYPE.REST, focus: 'Weekend Rest' }
      ];

    case 5:
      // 5-Day: Push / Pull / Legs / Upper / Conditioning (2 rest days)
      return [
        {
          dayIndex: 0,
          type: SESSION_TYPE.TRAINING,
          title: 'Chest, Shoulders & Triceps (Push)',
          focus: 'Push',
          targetMuscles: ['chest', 'shoulders', 'triceps']
        },
        {
          dayIndex: 1,
          type: SESSION_TYPE.TRAINING,
          title: 'Back, Biceps & Core (Pull)',
          focus: 'Pull',
          targetMuscles: ['back', 'biceps', 'core']
        },
        {
          dayIndex: 2,
          type: SESSION_TYPE.TRAINING,
          title: 'Quad & Glute Drive (Legs)',
          focus: 'Legs',
          targetMuscles: ['quadriceps', 'glutes', 'calves']
        },
        { dayIndex: 3, type: SESSION_TYPE.REST, focus: 'Midweek Systemic Rest' },
        {
          dayIndex: 4,
          type: SESSION_TYPE.TRAINING,
          title: 'Upper Body Focus & Hypertrophy',
          focus: 'Upper Body',
          targetMuscles: Array.from(new Set([...primaryFocus, 'chest', 'back']))
        },
        {
          dayIndex: 5,
          type: SESSION_TYPE.TRAINING,
          title: goal === GOALS.LOSE_FAT ? 'Metabolic Conditioning & Core' : 'Lower Body & Posterior Focus',
          focus: goal === GOALS.LOSE_FAT ? 'HIIT / Core' : 'Legs & Core',
          targetMuscles: ['hamstrings', 'glutes', 'core']
        },
        { dayIndex: 6, type: SESSION_TYPE.REST, focus: 'Weekly Regeneration' }
      ];

    case 6:
      // 6-Day: Push / Pull / Legs x 2 with 1 dedicated rest day
      return [
        {
          dayIndex: 0,
          type: SESSION_TYPE.TRAINING,
          title: 'Push A: Chest & Anterior Focus',
          focus: 'Push',
          targetMuscles: ['chest', 'shoulders', 'triceps']
        },
        {
          dayIndex: 1,
          type: SESSION_TYPE.TRAINING,
          title: 'Pull A: Upper Back & Biceps',
          focus: 'Pull',
          targetMuscles: ['back', 'biceps']
        },
        {
          dayIndex: 2,
          type: SESSION_TYPE.TRAINING,
          title: 'Legs A: Quad Emphasis & Calves',
          focus: 'Legs',
          targetMuscles: ['quadriceps', 'glutes', 'calves']
        },
        {
          dayIndex: 3,
          type: SESSION_TYPE.TRAINING,
          title: 'Push B: Overhead Press & Triceps',
          focus: 'Push',
          targetMuscles: ['shoulders', 'chest', 'triceps']
        },
        {
          dayIndex: 4,
          type: SESSION_TYPE.TRAINING,
          title: 'Pull B: Lat Width & Posterior Core',
          focus: 'Pull',
          targetMuscles: ['back', 'biceps', 'core']
        },
        {
          dayIndex: 5,
          type: SESSION_TYPE.TRAINING,
          title: 'Legs B: Hamstrings & Glute Power',
          focus: 'Legs',
          targetMuscles: ['hamstrings', 'glutes', 'calves']
        },
        { dayIndex: 6, type: SESSION_TYPE.REST, focus: 'Essential Systemic Rest' }
      ];

    case 7:
      // 7-Day: 5 Strength Sessions + 2 Active Recovery / Mobility days (never 7 heavy days)
      return [
        {
          dayIndex: 0,
          type: SESSION_TYPE.TRAINING,
          title: 'Upper Body Push & Anterior Strength',
          focus: 'Push',
          targetMuscles: ['chest', 'shoulders', 'triceps']
        },
        {
          dayIndex: 1,
          type: SESSION_TYPE.TRAINING,
          title: 'Posterior Pull & Mid-Back Alignment',
          focus: 'Pull',
          targetMuscles: ['back', 'biceps']
        },
        {
          dayIndex: 2,
          type: SESSION_TYPE.RECOVERY,
          title: 'Active Recovery & Joint Mobility',
          focus: 'Active Recovery',
          targetMuscles: ['core', 'calves'],
          isOptional: true
        },
        {
          dayIndex: 3,
          type: SESSION_TYPE.TRAINING,
          title: 'Lower Body Strength & Power',
          focus: 'Lower Body',
          targetMuscles: ['quadriceps', 'hamstrings', 'glutes']
        },
        {
          dayIndex: 4,
          type: SESSION_TYPE.TRAINING,
          title: 'Upper Body Hypertrophy & Arms',
          focus: 'Upper Body',
          targetMuscles: Array.from(new Set([...primaryFocus, 'chest', 'back', 'biceps', 'triceps']))
        },
        {
          dayIndex: 5,
          type: SESSION_TYPE.TRAINING,
          title: 'Posterior Chain & Core Stability',
          focus: 'Posterior & Core',
          targetMuscles: ['hamstrings', 'glutes', 'core']
        },
        {
          dayIndex: 6,
          type: SESSION_TYPE.RECOVERY,
          title: 'Regeneration Flow & Mobility',
          focus: 'Rest & Reset',
          targetMuscles: ['core'],
          isOptional: true
        }
      ];

    default:
      return getWeeklySplitTemplate(3, goal, userFocusMuscles);
  }
}

/**
 * Generates a complete, deterministic multi-week training plan.
 *
 * @param {Object} rawProfile - User onboarding/profile settings
 * @param {Object} [options={}]
 * @param {Date|string} [options.referenceDate=new Date()] - Evaluation anchor timestamp
 * @param {number} [options.totalWeeks=4] - Duration of the training block
 * @param {number} [options.variationSeed=0] - Deterministic variation seed
 * @param {number} [options.planVersion=1] - Version number of the plan
 * @param {Array<Object>} [options.historyRecords=[]] - Workout history for recovery awareness
 * @returns {Object} Deterministic TrainingPlan model
 */
export function generateTrainingPlan(rawProfile = {}, options = {}) {
  const safeProfile = (rawProfile && typeof rawProfile === 'object') ? rawProfile : {};
  const goal = normalizeGoal(safeProfile.goal);
  const fitnessLevel = normalizeDifficulty(safeProfile.fitnessLevel);
  const trainingFrequency = normalizeTrainingFrequency(safeProfile.trainingDays);
  let duration = 30;
  if (typeof safeProfile.workoutDuration === 'string') {
    const match = safeProfile.workoutDuration.match(/\d+/);
    if (match) duration = parseInt(match[0], 10);
  } else if (Number.isFinite(Number(safeProfile.workoutDuration))) {
    duration = Math.round(Number(safeProfile.workoutDuration));
  } else if (Number.isFinite(Number(safeProfile.durationMinutes))) {
    duration = Math.round(Number(safeProfile.durationMinutes));
  }
  duration = Math.max(15, Math.min(75, duration));
  const equipment = normalizeEquipmentList(safeProfile.equipment);

  const focusRaw = safeProfile.targetMuscles || safeProfile.focusAreas || ['Full Body'];
  const userFocusMuscles = resolveTargetMuscles(focusRaw);

  const refDateObj = options.referenceDate instanceof Date ? options.referenceDate : new Date(options.referenceDate || Date.now());
  const safeRefDate = isNaN(refDateObj.getTime()) ? new Date('2026-06-08T00:00:00Z') : refDateObj;
  const totalWeeks = Number.isFinite(Number(options.totalWeeks)) && Number(options.totalWeeks) > 0 ? Math.min(12, Math.round(Number(options.totalWeeks))) : 4;
  const version = Number.isFinite(Number(options.planVersion)) && Number(options.planVersion) >= 1 ? Math.round(Number(options.planVersion)) : 1;
  const seed = Number.isFinite(Number(options.variationSeed)) ? Math.max(0, Math.floor(Number(options.variationSeed))) : 0;

  // Week 1 starts on Monday of reference week
  const planStartMonday = getStartOfWeek(safeRefDate);
  const planStartDateStr = toDateString(planStartMonday);

  const planId = `plan-${goal.slice(0, 3)}-${trainingFrequency}d-v${version}-s${seed}`;

  // Evaluate recent recovery state from history if present (bounded to 50 most recent records)
  const recentHistory = Array.isArray(options.historyRecords)
    ? options.historyRecords.slice(0, 50)
    : [];
  const recoveryReport = recentHistory.length > 0 ? analyzeRecovery(recentHistory, safeRefDate) : null;

  // Build weekly schedule weeks
  const weeks = [];
  const splitTemplate = getWeeklySplitTemplate(trainingFrequency, goal, userFocusMuscles);

  for (let w = 1; w <= totalWeeks; w++) {
    const weekMonday = addDays(planStartMonday, (w - 1) * 7);
    const weekSunday = addDays(weekMonday, 6);
    const weekStartDateStr = toDateString(weekMonday);
    const weekEndDateStr = toDateString(weekSunday);

    const sessions = splitTemplate.map(tpl => {
      const sessionDate = addDays(weekMonday, tpl.dayIndex);
      const scheduledDateStr = toDateString(sessionDate);
      const plannedSessionId = `ps-${planId}-w${w}-d${tpl.dayIndex}`;

      const isRestOrRecovery = tpl.type === SESSION_TYPE.REST || tpl.type === SESSION_TYPE.RECOVERY;
      const sessionDuration = isRestOrRecovery ? (tpl.type === SESSION_TYPE.RECOVERY ? 15 : 0) : duration;

      return {
        plannedSessionId,
        planId,
        planVersion: version,
        weekNumber: w,
        dayIndex: tpl.dayIndex,
        dayName: DAY_NAMES[tpl.dayIndex],
        dayShort: DAY_SHORT[tpl.dayIndex],
        scheduledDate: scheduledDateStr,
        sessionType: tpl.type,
        status: SESSION_STATUS.PLANNED,
        sessionName: tpl.title || tpl.focus,
        title: tpl.title || tpl.focus,
        focus: tpl.focus,
        targetFocus: tpl.focus,
        targetMuscles: tpl.targetMuscles || [],
        durationMinutes: sessionDuration,
        isOptional: !!tpl.isOptional,
        workoutId: null,
        completedSessionId: null,
        completedAt: null,
        originalScheduledDate: scheduledDateStr,
        rescheduledToDate: null
      };
    });

    weeks.push({
      weekNumber: w,
      startDate: weekStartDateStr,
      endDate: weekEndDateStr,
      sessions
    });
  }

  // Construct Plan Model
  const planEndDateStr = weeks.length > 0 ? weeks[weeks.length - 1].endDate : planStartDateStr;

  const titlePrefix = {
    [GOALS.BUILD_MUSCLE]: 'Muscle Hypertrophy & Power',
    [GOALS.GET_STRONGER]: 'Functional Strength Progression',
    [GOALS.LOSE_FAT]: 'Metabolic Burn & Conditioning',
    [GOALS.IMPROVE_ENDURANCE]: 'Endurance & Work Capacity',
    [GOALS.IMPROVE_FITNESS]: 'Complete Fitness & Mobility',
    [GOALS.STAY_ACTIVE]: 'Daily Health & Activity'
  }[goal] || 'Custom Training Program';

  return {
    planId,
    version,
    planVersion: version,
    createdAt: safeRefDate.toISOString(),
    updatedAt: safeRefDate.toISOString(),
    status: PLAN_STATUS.ACTIVE,
    title: `${trainingFrequency}-Day ${titlePrefix}`,
    goal,
    fitnessLevel,
    trainingFrequency,
    workoutDuration: duration,
    preferredWorkoutDuration: duration,
    equipment,
    focusAreas: userFocusMuscles,
    totalWeeks,
    currentWeek: 1,
    startDate: planStartDateStr,
    endDate: planEndDateStr,
    profileSnapshot: {
      name: safeProfile.name || '',
      goal,
      fitnessLevel,
      trainingDays: trainingFrequency,
      workoutDuration: duration,
      focusAreas: userFocusMuscles,
      equipment
    },
    recoveryContext: recoveryReport ? {
      status: recoveryReport.status,
      fatiguedMuscles: recoveryReport.fatiguedMuscles || [],
      consecutiveDays: recoveryReport.consecutiveDays || 0
    } : null,
    weeks
  };
}
