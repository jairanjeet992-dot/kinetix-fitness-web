/**
 * TRAINING PLAN STATE MANAGEMENT & ADHERENCE - KINETIX
 * Phase 7: Workout Planning & Long-Term Training System
 *
 * Local-first persistence, versioning, reconciliation, and adherence analytics.
 * Invariants:
 * - Pure local-first architecture backed by localStorage ('kinetix_training_plans').
 * - Zero data fabrication: Planned sessions are NEVER counted as completed.
 * - Progress analytics continues reading authentic completed history from getWorkoutHistory().
 * - Versioning preserves all past plan versions and links completed workouts to their original plan version.
 * - Safe handling of storage corruption, quota errors, and missing profiles.
 */

import {
  generateTrainingPlan,
  toDateString,
  SESSION_TYPE,
  SESSION_STATUS,
  PLAN_STATUS
} from '../engine/plan-generator.js';

import { getProfile } from './profile.js';
import { generateAdaptiveWorkout } from '../engine/adaptive-workout-generator.js';
import { registerGeneratedWorkout } from '../data/workouts.js';

export const STORAGE_KEY_PLANS = 'kinetix_training_plans';

export {
  SESSION_TYPE,
  SESSION_STATUS,
  PLAN_STATUS
};

/**
 * Safely parses plans storage from localStorage.
 *
 * @returns {Array<Object>} List of stored plans
 */
export function getStoredPlans() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_PLANS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(p => p && typeof p === 'object' && p.planId && Array.isArray(p.weeks))
      : [];
  } catch (err) {
    console.warn('Failed to parse training plans from localStorage. Safely recovering with empty state:', err);
    return [];
  }
}

/**
 * Safely writes plans array to localStorage.
 *
 * @param {Array<Object>} plans
 * @returns {boolean} Success
 */
export function saveStoredPlans(plans) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const safePlans = Array.isArray(plans) ? plans.filter(p => p && typeof p === 'object' && p.planId) : [];
    localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(safePlans));
    return true;
  } catch (err) {
    console.warn('Failed to save training plans to localStorage (e.g. quota exceeded):', err);
    return false;
  }
}

/**
 * Retrieves all stored plans (active, archived, completed).
 *
 * @returns {Array<Object>}
 */
export function getAllPlans() {
  return getStoredPlans();
}

/**
 * Finds a specific plan by its unique planId.
 *
 * @param {string} planId
 * @returns {Object|null}
 */
export function getPlanById(planId) {
  if (!planId) return null;
  const plans = getStoredPlans();
  return plans.find(p => p.planId === planId) || null;
}

/**
 * Saves or updates a training plan idempotently.
 *
 * @param {Object} plan
 * @returns {boolean}
 */
export function savePlan(plan) {
  if (!plan || !plan.planId) return false;
  const plans = getStoredPlans();
  const idx = plans.findIndex(p => p.planId === plan.planId);
  plan.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    plans[idx] = plan;
  } else {
    plans.push(plan);
  }
  return saveStoredPlans(plans);
}

/**
 * Synchronizes planned session statuses against a reference calendar date.
 * - Past scheduled dates that were never completed become MISSED (except rest/recovery days).
 * - Today's scheduled training sessions in PLANNED state become READY.
 * - Future dates remain PLANNED.
 * - Already COMPLETED, SKIPPED, or RESCHEDULED sessions are strictly preserved.
 *
 * @param {Object} plan
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {Object} Updated plan
 */
export function syncPlanStatuses(plan, referenceDate = new Date()) {
  if (!plan || !Array.isArray(plan.weeks)) return plan;
  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refDateStr = toDateString(isNaN(refDateObj.getTime()) ? new Date() : refDateObj);

  let hasChanges = false;

  plan.weeks.forEach(week => {
    (week.sessions || []).forEach(session => {
      if (
        session.status === SESSION_STATUS.COMPLETED ||
        session.status === SESSION_STATUS.SKIPPED ||
        session.status === SESSION_STATUS.RESCHEDULED ||
        session.status === SESSION_STATUS.CANCELLED
      ) {
        return; // Preserved immutable historical terminal states
      }

      const scheduledDate = session.scheduledDate;

      if (session.sessionType === SESSION_TYPE.REST || session.sessionType === SESSION_TYPE.RECOVERY) {
        // Rest and recovery days do not get marked MISSED, and never fake completion
        if (scheduledDate === refDateStr && session.status === SESSION_STATUS.PLANNED) {
          session.status = SESSION_STATUS.READY;
          hasChanges = true;
        }
        return;
      }

      // Training or Optional Sessions
      if (scheduledDate < refDateStr) {
        if (session.status !== SESSION_STATUS.MISSED) {
          session.status = SESSION_STATUS.MISSED;
          hasChanges = true;
        }
      } else if (scheduledDate === refDateStr) {
        if (session.status === SESSION_STATUS.PLANNED) {
          session.status = SESSION_STATUS.READY;
          hasChanges = true;
        }
      } else if (scheduledDate > refDateStr) {
        if (session.status !== SESSION_STATUS.PLANNED) {
          session.status = SESSION_STATUS.PLANNED;
          hasChanges = true;
        }
      }
    });
  });

  // Synchronize currentWeek and mesocycle completion dynamically based on refDateStr
  if (Array.isArray(plan.weeks) && plan.weeks.length > 0) {
    const activeWeekIndex = plan.weeks.findIndex(w => refDateStr >= w.startDate && refDateStr <= w.endDate);
    if (activeWeekIndex >= 0) {
      if (plan.currentWeek !== plan.weeks[activeWeekIndex].weekNumber) {
        plan.currentWeek = plan.weeks[activeWeekIndex].weekNumber;
        hasChanges = true;
      }
    } else if (refDateStr > (plan.weeks[plan.weeks.length - 1]?.endDate || '')) {
      if (plan.currentWeek !== plan.weeks.length) {
        plan.currentWeek = plan.weeks.length;
        hasChanges = true;
      }
      if (plan.status === PLAN_STATUS.ACTIVE) {
        plan.status = PLAN_STATUS.COMPLETED;
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    plan.updatedAt = new Date().toISOString();
  }

  return plan;
}

/**
 * Retrieves the active plan, auto-generating one from user profile if none exists.
 *
 * @param {Date|string} [referenceDate=new Date()]
 * @param {Object|null} [profileOverride=null]
 * @returns {Object} Active TrainingPlan
 */
export function getActivePlan(referenceDate = new Date(), profileOverride = null) {
  const plans = getStoredPlans();
  const activePlans = plans.filter(p => p.status === PLAN_STATUS.ACTIVE);
  let active = null;

  if (activePlans.length > 1) {
    // Active plan invariant: deterministically resolve to single authoritative active plan
    activePlans.sort((a, b) => {
      const verA = Number(a.planVersion || a.version) || 1;
      const verB = Number(b.planVersion || b.version) || 1;
      if (verB !== verA) return verB - verA;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    active = activePlans[0];
    for (let i = 1; i < activePlans.length; i++) {
      activePlans[i].status = PLAN_STATUS.ARCHIVED;
      activePlans[i].updatedAt = new Date().toISOString();
    }
    saveStoredPlans(plans);
  } else if (activePlans.length === 1) {
    active = activePlans[0];
  }

  if (!active) {
    // Generate initial plan using current profile
    const profile = profileOverride || getProfile();
    active = generateTrainingPlan(profile, { referenceDate, planVersion: 1 });
    plans.push(active);
    saveStoredPlans(plans);
  }

  // Synchronize dynamic statuses against referenceDate
  syncPlanStatuses(active, referenceDate);
  savePlan(active);

  return active;
}

/**
 * Creates and activates a new training plan, archiving any existing active plan.
 *
 * @param {Object} rawProfile
 * @param {Object} [options={}]
 * @returns {Object} Newly created active plan
 */
export function createTrainingPlan(rawProfile = {}, options = {}) {
  const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : getProfile();
  const plans = getStoredPlans();

  // Archive any current active plans
  plans.forEach(p => {
    if (p.status === PLAN_STATUS.ACTIVE) {
      p.status = PLAN_STATUS.ARCHIVED;
      p.updatedAt = new Date().toISOString();
    }
  });

  const newPlan = generateTrainingPlan(profile, {
    ...options,
    planVersion: options.planVersion || 1
  });

  plans.push(newPlan);
  saveStoredPlans(plans);
  return newPlan;
}

/**
 * Regenerates the active training plan with a bumped version number (e.g. v2).
 * Existing completed sessions remain linked to their original plan version.
 *
 * @param {Object} rawProfile
 * @param {Object} [options={}]
 * @returns {Object} Newly regenerated active plan
 */
export function regeneratePlan(rawProfile = {}, options = {}) {
  const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : getProfile();
  const plans = getStoredPlans();
  const currentActive = plans.find(p => p.status === PLAN_STATUS.ACTIVE);

  let nextVersion = 1;
  if (currentActive) {
    currentActive.status = PLAN_STATUS.ARCHIVED;
    currentActive.updatedAt = new Date().toISOString();
    nextVersion = (Number(currentActive.planVersion || currentActive.version) || 1) + 1;
  } else if (plans.length > 0) {
    const highestVer = Math.max(...plans.map(p => Number(p.planVersion || p.version) || 1));
    nextVersion = highestVer + 1;
  }

  const regeneratedPlan = generateTrainingPlan(profile, {
    ...options,
    planVersion: nextVersion
  });

  plans.push(regeneratedPlan);
  saveStoredPlans(plans);
  return regeneratedPlan;
}

/**
 * Locates a planned session across all weeks of a plan.
 *
 * @param {string} plannedSessionId
 * @param {Object|null} [plan=null]
 * @returns {Object|null}
 */
export function getPlannedSession(plannedSessionId, plan = null) {
  if (!plannedSessionId) return null;
  const targetPlan = plan || getActivePlan();
  if (!targetPlan || !Array.isArray(targetPlan.weeks)) return null;

  for (const week of targetPlan.weeks) {
    const found = (week.sessions || []).find(s => s.plannedSessionId === plannedSessionId);
    if (found) return found;
  }
  return null;
}

/**
 * Updates a planned session status with optional metadata.
 *
 * @param {string} plannedSessionId
 * @param {string} newStatus
 * @param {Object} [extraData={}]
 * @param {Object|null} [plan=null]
 * @returns {Object|null} Updated session
 */
export function updatePlannedSessionStatus(plannedSessionId, newStatus, extraData = {}, plan = null) {
  const targetPlan = plan || getActivePlan();
  if (!targetPlan) return null;

  const session = getPlannedSession(plannedSessionId, targetPlan);
  if (!session) return null;

  session.status = newStatus;
  Object.assign(session, extraData);

  savePlan(targetPlan);
  return session;
}

/**
 * Safely reschedules a planned session to a new date without duplicating sessions.
 * Preserves the original scheduled date and plan identity.
 *
 * @param {string} plannedSessionId
 * @param {string|Date} newDate
 * @param {Object|null} [plan=null]
 * @returns {Object|null} Rescheduled session
 */
export function reschedulePlannedSession(plannedSessionId, newDate, plan = null) {
  const targetPlan = plan || getActivePlan();
  if (!targetPlan) return null;

  const session = getPlannedSession(plannedSessionId, targetPlan);
  if (!session) return null;

  // Cannot reschedule an already completed session
  if (session.status === SESSION_STATUS.COMPLETED) {
    return null;
  }

  const newDateStr = toDateString(newDate);
  if (!newDateStr) return null;

  if (!session.originalScheduledDate) {
    session.originalScheduledDate = session.scheduledDate;
  }
  session.rescheduledToDate = newDateStr;
  session.scheduledDate = newDateStr;
  session.status = SESSION_STATUS.RESCHEDULED;

  savePlan(targetPlan);
  return session;
}

/**
 * Skips a planned session explicitly.
 *
 * @param {string} plannedSessionId
 * @param {string} [reason='']
 * @param {Object|null} [plan=null]
 * @returns {Object|null}
 */
export function skipPlannedSession(plannedSessionId, reason = '', plan = null) {
  return updatePlannedSessionStatus(
    plannedSessionId,
    SESSION_STATUS.SKIPPED,
    { skippedReason: reason || 'Athlete opted to skip scheduled session.' },
    plan
  );
}

/**
 * Reconciles an actual completed workout session from history with the training plan.
 * Matches by plannedSessionId or by matching calendar date with a READY/PLANNED session.
 *
 * Data Integrity:
 * - Strictly idempotent.
 * - Never fabricates completion if genuine session data is missing.
 * - Associates completedSessionId and completedAt.
 *
 * @param {Object} completedSession - Sanitized history record from workout-session.js
 * @param {Object|null} [plan=null]
 * @returns {Object|null} Reconciled session or null
 */
export function reconcileCompletedSession(completedSession, plan = null) {
  if (!completedSession || !completedSession.sessionId || !completedSession.completedAt) {
    return null;
  }

  let targetPlan = plan;
  if (!targetPlan) {
    if (completedSession.planId) {
      targetPlan = getPlanById(completedSession.planId);
    }
    if (!targetPlan) {
      targetPlan = getActivePlan();
    }
  }

  if (!targetPlan || !Array.isArray(targetPlan.weeks)) return null;

  let sessionToMatch = null;

  // 1. Direct match by plannedSessionId
  if (completedSession.plannedSessionId) {
    sessionToMatch = getPlannedSession(completedSession.plannedSessionId, targetPlan);
  }

  // 2. Fallback match by calendar date & workout target (ONLY permitted for ACTIVE plans)
  if (!sessionToMatch && targetPlan.status === PLAN_STATUS.ACTIVE) {
    const completedDateStr = toDateString(completedSession.completedAt);
    const candidates = [];
    for (const week of targetPlan.weeks) {
      for (const s of (week.sessions || [])) {
        if (
          s.scheduledDate === completedDateStr &&
          s.sessionType === SESSION_TYPE.TRAINING &&
          (s.status === SESSION_STATUS.READY || s.status === SESSION_STATUS.PLANNED || s.status === SESSION_STATUS.MISSED)
        ) {
          candidates.push(s);
        }
      }
    }

    if (candidates.length === 1) {
      sessionToMatch = candidates[0];
    } else if (candidates.length > 1) {
      // Ambiguous: multiple candidates on same calendar date without direct plannedSessionId
      const workoutMatch = candidates.find(c => c.workoutId && c.workoutId === completedSession.workoutId);
      if (workoutMatch) {
        sessionToMatch = workoutMatch;
      } else {
        // Do not guess. Return unresolved null to prevent erroneous attribution.
        console.warn(`Ambiguous reconciliation: ${candidates.length} candidates on ${completedDateStr}; reconciliation unresolved.`);
        return null;
      }
    }
  }

  if (sessionToMatch) {
    // If already completed by another workout, never overwrite
    if (
      sessionToMatch.status === SESSION_STATUS.COMPLETED &&
      sessionToMatch.completedSessionId &&
      sessionToMatch.completedSessionId !== completedSession.sessionId
    ) {
      return null;
    }

    sessionToMatch.status = SESSION_STATUS.COMPLETED;
    sessionToMatch.completedSessionId = completedSession.sessionId;
    sessionToMatch.completedAt = completedSession.completedAt;
    if (completedSession.workoutId) {
      sessionToMatch.workoutId = completedSession.workoutId;
    }
    savePlan(targetPlan);
    return sessionToMatch;
  }

  return null;
}

/**
 * Computes plan adherence analytics.
 * Strictly separates plan adherence from overall workout volume/history.
 *
 * @param {Object} plan - Training plan
 * @param {Date|string} [referenceDate=new Date()] - Evaluation anchor
 * @returns {Object} Structured adherence metrics
 */
export function computePlanAdherence(plan, referenceDate = new Date()) {
  if (!plan || !Array.isArray(plan.weeks)) {
    return {
      totalPlannedSessions: 0,
      completedSessions: 0,
      missedSessions: 0,
      skippedSessions: 0,
      optionalSessions: 0,
      remainingFutureSessions: 0,
      adherenceRate: 0,
      adherencePercentage: 0
    };
  }

  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refDateStr = toDateString(isNaN(refDateObj.getTime()) ? new Date() : refDateObj);

  let totalRequiredPastOrToday = 0;
  let completedRequired = 0;
  let completedOptional = 0;
  let missed = 0;
  let skipped = 0;
  let optional = 0;
  let future = 0;

  plan.weeks.forEach(week => {
    (week.sessions || []).forEach(session => {
      if (session.sessionType === SESSION_TYPE.REST) {
        return; // Rest days do not count as training adherence targets
      }

      if (session.isOptional || session.sessionType === SESSION_TYPE.RECOVERY) {
        optional++;
        if (session.status === SESSION_STATUS.COMPLETED) {
          completedOptional++;
        }
        return;
      }

      if (session.scheduledDate > refDateStr && session.status !== SESSION_STATUS.COMPLETED) {
        future++;
        return; // Future sessions are not penalized
      }

      totalRequiredPastOrToday++;

      if (session.status === SESSION_STATUS.COMPLETED) {
        completedRequired++;
      } else if (session.status === SESSION_STATUS.MISSED) {
        missed++;
      } else if (session.status === SESSION_STATUS.SKIPPED) {
        skipped++;
      }
    });
  });

  const totalCompleted = completedRequired + completedOptional;
  const adherenceRate = totalRequiredPastOrToday > 0
    ? Math.min(1.0, Math.round((completedRequired / totalRequiredPastOrToday) * 100) / 100)
    : 1.0;

  return {
    totalPlannedSessions: totalRequiredPastOrToday,
    completedSessions: totalCompleted,
    completedRequiredSessions: completedRequired,
    completedOptionalSessions: completedOptional,
    missedSessions: missed,
    skippedSessions: skipped,
    optionalSessions: optional,
    remainingFutureSessions: future,
    adherenceRate,
    adherencePercentage: Math.round(adherenceRate * 100)
  };
}

/**
 * Bridges the Training Plan to the Adaptive Workout Generator.
 * Synthesizes session intent into a structured profile and generates
 * an individually calibrated workout via generateAdaptiveWorkout().
 *
 * @param {Object} plannedSession
 * @param {Object|null} [userProfile=null]
 * @param {Object} [options={}]
 * @returns {Object} Adaptive workout plan with attached plannedSession metadata
 */
export function generateWorkoutForPlannedSession(plannedSession, userProfile = null, options = {}) {
  if (!plannedSession) {
    throw new Error('plannedSession is required to generate workout.');
  }

  const profile = userProfile || getProfile();

  // Synthesize session-specific intent overriding general profile
  const sessionIntentProfile = {
    ...profile,
    goal: options.goal || profile.goal,
    fitnessLevel: options.fitnessLevel || profile.fitnessLevel,
    durationMinutes: plannedSession.durationMinutes || profile.durationMinutes || 30,
    workoutDuration: plannedSession.durationMinutes || profile.durationMinutes || 30,
    equipment: options.equipment || profile.equipment,
    targetMuscles: plannedSession.targetMuscles || profile.targetMuscles,
    focusAreas: plannedSession.targetMuscles || profile.focusAreas
  };

  const seed = Number.isFinite(Number(options.variationSeed))
    ? Math.max(0, Math.floor(Number(options.variationSeed)))
    : 0;

  const workout = generateAdaptiveWorkout(sessionIntentProfile, seed, {
    ...options,
    referenceDate: plannedSession.scheduledDate ? new Date(`${plannedSession.scheduledDate}T12:00:00Z`) : options.referenceDate
  });

  // Attach plan & session metadata
  workout.plannedSessionId = plannedSession.plannedSessionId;
  workout.planId = plannedSession.planId;
  workout.planVersion = plannedSession.planVersion;
  workout.scheduledDate = plannedSession.scheduledDate;

  // Mark session as READY with linked workoutId
  plannedSession.workoutId = workout.id;
  if (plannedSession.status === SESSION_STATUS.PLANNED) {
    plannedSession.status = SESSION_STATUS.READY;
  }

  registerGeneratedWorkout(workout);
  return workout;
}

/**
 * Testing helper to reset all training plans storage.
 */
export function _resetTrainingPlanStorageForTesting() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_PLANS);
    } catch (_) {}
  }
}

