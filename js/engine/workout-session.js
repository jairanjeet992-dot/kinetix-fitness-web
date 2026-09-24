/**
 * WORKOUT SESSION STATE MACHINE - KINETIX
 * Phase 8 & 8.1: Core Workout Session Lifecycle, Progression & Wall-Clock Accuracy (Hardened)
 *
 * Implements:
 * 1. Deterministic session state machine ('ready' | 'active' | 'paused' | 'resting' | 'completed' | 'abandoned')
 * 2. Multi-set and multi-round workout progression with work/rest intervals
 * 3. Wall-clock accurate timer reconciliation (no drift on tab backgrounding/mobile sleep)
 * 4. Automatic session persistence and seamless reload recovery
 * 5. Validated performance data logging per set (reps, weight, duration)
 * 6. Duplicate completion protection & idempotent step logging
 * 7. Planned session & adaptive workout metadata integrity
 */

import { getExerciseById } from '../data/exercises.js';
import { getWorkoutById } from '../data/workouts.js';
import { recordCompletedWorkout } from '../state/workout-history.js';

export const SESSION_STORAGE_KEY = 'kinetix_active_session';

export class WorkoutSession {
  /**
   * @param {Object} workout - The workout definition object
   * @param {Object} options - Configuration options
   */
  constructor(workout, options = {}) {
    if (!workout || typeof workout !== 'object') {
      throw new Error('[WorkoutSession] A valid workout object is required');
    }

    this.workout = workout;
    this.sessionId = typeof options.sessionId === 'string' && options.sessionId.trim()
      ? options.sessionId.trim()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.workoutId = workout.id || options.workoutId || 'workout-custom';
    this.workoutTitle = workout.title || options.workoutTitle || 'Workout Session';
    this.category = workout.category || options.category || 'Strength';

    // Integration Metadata
    this.plannedSessionId = options.plannedSessionId || workout.plannedSessionId || null;
    this.planId = options.planId || workout.planId || null;
    this.planVersion = options.planVersion || workout.planVersion || '1.0';
    this.isAdaptive = Boolean(workout.isGenerated || options.isAdaptive);
    this.adaptiveMetadata = options.adaptiveMetadata || (workout.explanation ? { explanation: workout.explanation } : null);

    // State Machine Flags
    const validStatuses = ['ready', 'active', 'paused', 'resting', 'completed', 'abandoned'];
    this.status = validStatuses.includes(options.status) ? options.status : 'ready';
    this.currentStepIndex = typeof options.currentStepIndex === 'number' && Number.isFinite(options.currentStepIndex)
      ? Math.max(0, Math.floor(options.currentStepIndex))
      : 0;
    this.workoutStartedAt = options.workoutStartedAt || new Date().toISOString();
    this.completedAt = options.completedAt || null;
    this.totalElapsedSec = typeof options.totalElapsedSec === 'number' && Number.isFinite(options.totalElapsedSec)
      ? Math.max(0, Math.floor(options.totalElapsedSec))
      : 0;

    // Wall-clock timer tracking
    this.stepStartedTimestamp = typeof options.stepStartedTimestamp === 'number' && Number.isFinite(options.stepStartedTimestamp)
      ? options.stepStartedTimestamp
      : null;
    this.stepElapsedMs = typeof options.stepElapsedMs === 'number' && Number.isFinite(options.stepElapsedMs)
      ? Math.max(0, options.stepElapsedMs)
      : 0;
    this._lastTickTimestamp = Date.now();

    // Steps Generation
    if (Array.isArray(options.steps) && options.steps.length > 0) {
      this.steps = options.steps;
    } else {
      this.steps = this._buildSteps(workout);
    }

    if (this.currentStepIndex >= this.steps.length) {
      this.currentStepIndex = Math.max(0, this.steps.length - 1);
    }

    // Performance logs
    this.completedLogs = Array.isArray(options.completedLogs) ? options.completedLogs : [];

    // Duplicate completion guard
    this._isCompletedOnce = Boolean(this.completedAt || this.status === 'completed');

    // Event listeners
    this._listeners = new Set();
    this._timerInterval = null;

    // If restoring an active or resting session, resume timer ticking
    if (this.status === 'active' || this.status === 'resting') {
      this._startTimerTicking();
    }
  }

  /**
   * Builds the linear sequence of work and rest steps from workout structure.
   * @private
   */
  _buildSteps(workout) {
    const steps = [];
    let stepCounter = 0;

    // Resolve exercises
    let exerciseList = [];
    if (Array.isArray(workout.exercises) && workout.exercises.length > 0) {
      exerciseList = workout.exercises;
    } else if (Array.isArray(workout.exerciseIds) && workout.exerciseIds.length > 0) {
      exerciseList = workout.exerciseIds.map(id => getExerciseById(id)).filter(Boolean);
    }

    if (exerciseList.length === 0) {
      // Fallback: at least one basic step so player doesn't fail
      exerciseList = [getExerciseById('push-up') || { id: 'push-up', name: 'Push-Up', defaultDurationSec: 40, defaultReps: 12 }];
    }

    // Warmup stages (1 set each)
    if (Array.isArray(workout.warmup) && workout.warmup.length > 0) {
      workout.warmup.forEach((wEx) => {
        const ex = typeof wEx === 'string' ? getExerciseById(wEx) : wEx;
        if (!ex) return;

        steps.push({
          stepId: `warmup_${ex.id}_${stepCounter++}`,
          stage: 'warmup',
          type: 'work',
          exerciseId: ex.id,
          exerciseName: ex.name,
          setNumber: 1,
          totalSets: 1,
          exerciseType: ex.exerciseType || 'timed',
          targetReps: ex.defaultReps || '10 Reps',
          targetDurationSec: ex.defaultDurationSec || 30,
          restAfterSec: 15,
          primaryMuscles: ex.primaryMuscles || ['core'],
          equipment: ex.equipment || ['bodyweight'],
          instructions: ex.instructions || [],
          formCues: ex.formCues || [],
          safetyNotes: ex.safetyNotes || '',
          completed: false
        });

        // 15s transition rest
        steps.push({
          stepId: `rest_warmup_${stepCounter++}`,
          stage: 'warmup',
          type: 'rest',
          durationSec: 15,
          nextExerciseName: exerciseList[0] ? exerciseList[0].name : 'Main Workout'
        });
      });
    }

    // Main Workout Circuit or Straight Sets
    const rounds = Math.max(1, workout.rounds || 3);
    const restBetween = workout.restBetweenExercisesSec || 30;

    for (let round = 1; round <= rounds; round++) {
      exerciseList.forEach((ex, exIndex) => {
        const isVeryLastWorkStep = (round === rounds && exIndex === exerciseList.length - 1 && (!workout.cooldown || workout.cooldown.length === 0));

        // Work step
        steps.push({
          stepId: `work_${ex.id}_r${round}_${stepCounter++}`,
          stage: 'main',
          type: 'work',
          exerciseId: ex.id,
          exerciseName: ex.name,
          setNumber: round,
          totalSets: rounds,
          exerciseType: ex.exerciseType || 'strength',
          targetReps: ex.defaultReps || 12,
          targetDurationSec: ex.defaultDurationSec || 40,
          restAfterSec: ex.defaultRestSeconds || restBetween,
          primaryMuscles: ex.primaryMuscles || ['chest'],
          equipment: ex.equipment || ['bodyweight'],
          instructions: ex.instructions || [],
          formCues: ex.formCues || [],
          safetyNotes: ex.safetyNotes || '',
          completed: false
        });

        // Rest step after work (unless it's the very last exercise of the routine)
        if (!isVeryLastWorkStep) {
          const nextEx = (exIndex < exerciseList.length - 1)
            ? exerciseList[exIndex + 1]
            : (round < rounds ? exerciseList[0] : (workout.cooldown && workout.cooldown[0] ? workout.cooldown[0] : null));

          steps.push({
            stepId: `rest_${ex.id}_r${round}_${stepCounter++}`,
            stage: 'main',
            type: 'rest',
            durationSec: ex.defaultRestSeconds || restBetween,
            nextExerciseName: nextEx ? nextEx.name : 'Next Movement',
            nextSetNumber: (exIndex === exerciseList.length - 1) ? round + 1 : round,
            nextTotalSets: rounds,
            nextPrimaryMuscle: nextEx && nextEx.primaryMuscles ? nextEx.primaryMuscles[0] : ''
          });
        }
      });
    }

    // Cooldown stages (1 set each)
    if (Array.isArray(workout.cooldown) && workout.cooldown.length > 0) {
      workout.cooldown.forEach((cEx) => {
        const ex = typeof cEx === 'string' ? getExerciseById(cEx) : cEx;
        if (!ex) return;

        steps.push({
          stepId: `cooldown_${ex.id}_${stepCounter++}`,
          stage: 'cooldown',
          type: 'work',
          exerciseId: ex.id,
          exerciseName: ex.name,
          setNumber: 1,
          totalSets: 1,
          exerciseType: 'timed',
          targetReps: ex.defaultReps || '30s',
          targetDurationSec: ex.defaultDurationSec || 30,
          restAfterSec: 0,
          primaryMuscles: ex.primaryMuscles || ['back'],
          equipment: ex.equipment || ['none'],
          instructions: ex.instructions || [],
          formCues: ex.formCues || [],
          safetyNotes: ex.safetyNotes || '',
          completed: false
        });
      });
    }

    return steps;
  }

  /**
   * Subscribes a listener callback to session state mutations.
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }
    return () => {};
  }

  /**
   * Notifies all registered listeners and persists session state.
   * @private
   */
  _emit() {
    this.persist();
    const snapshot = this.getSnapshot();
    this._listeners.forEach(fn => {
      try {
        fn(snapshot);
      } catch (err) {
        console.error('[WorkoutSession] Error in listener callback:', err);
      }
    });
  }

  /**
   * Returns current active step.
   */
  getCurrentStep() {
    return this.steps[this.currentStepIndex] || null;
  }

  /**
   * Returns next upcoming work step.
   */
  getNextWorkStep() {
    for (let i = this.currentStepIndex + 1; i < this.steps.length; i++) {
      if (this.steps[i].type === 'work') return this.steps[i];
    }
    return null;
  }

  /**
   * Computes accurate remaining seconds for current step using wall-clock timestamps.
   */
  getRemainingSec() {
    const step = this.getCurrentStep();
    if (!step) return 0;

    const targetSec = step.type === 'rest'
      ? (step.durationSec || 30)
      : (step.targetDurationSec || 40);

    if (this.status === 'paused' || this.status === 'ready') {
      const remainingMs = (targetSec * 1000) - this.stepElapsedMs;
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }

    if (this.status === 'active' || this.status === 'resting') {
      if (!this.stepStartedTimestamp) {
        this.stepStartedTimestamp = Date.now();
      }
      const activeMs = (Date.now() - this.stepStartedTimestamp) + this.stepElapsedMs;
      const remainingMs = (targetSec * 1000) - activeMs;
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }

    return 0;
  }

  /**
   * Internal interval ticker that triggers on every second.
   * Drift-proof: reconciles elapsed time via Date.now() deltas.
   * @private
   */
  _startTimerTicking() {
    this._stopTimerTicking();
    this._lastTickTimestamp = Date.now();

    this._timerInterval = setInterval(() => {
      if (this.status !== 'active' && this.status !== 'resting') {
        return;
      }

      const now = Date.now();
      const deltaSec = Math.max(1, Math.round((now - this._lastTickTimestamp) / 1000));
      this.totalElapsedSec += deltaSec;
      this._lastTickTimestamp = now;

      const remaining = this.getRemainingSec();

      if (remaining <= 0) {
        // Interval auto-progression
        const step = this.getCurrentStep();
        if (step && step.type === 'rest') {
          // Rest period expired: advance to next work step
          this.skipRest();
        } else if (step && step.exerciseType === 'timed') {
          // Timed work interval expired: complete set automatically
          this.completeCurrentSet({
            reps: step.targetReps,
            durationSec: step.targetDurationSec
          });
        } else {
          // Strength work set expired: keep at 0 until user taps Complete Set
          this._emit();
        }
      } else {
        this._emit();
      }
    }, 1000);

    if (this._timerInterval && typeof this._timerInterval.unref === 'function') {
      this._timerInterval.unref();
    }
  }

  /**
   * Stops interval ticker.
   * @private
   */
  _stopTimerTicking() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  /**
   * Starts the workout session.
   * Only transitions from 'ready' to avoid resetting timers if already active.
   */
  start() {
    if (this.status !== 'ready') return;

    this.status = 'active';
    this.stepStartedTimestamp = Date.now();
    this.stepElapsedMs = 0;
    this._lastTickTimestamp = Date.now();
    this._startTimerTicking();
    this._emit();
  }

  /**
   * Pauses the workout session.
   */
  pause() {
    if (this.status !== 'active' && this.status !== 'resting') return;

    if (this.stepStartedTimestamp) {
      this.stepElapsedMs += (Date.now() - this.stepStartedTimestamp);
      this.stepStartedTimestamp = null;
    }

    this.status = 'paused';
    this._stopTimerTicking();
    this._emit();
  }

  /**
   * Resumes the workout session.
   */
  resume() {
    if (this.status !== 'paused') return;

    const currentStep = this.getCurrentStep();
    this.status = currentStep && currentStep.type === 'rest' ? 'resting' : 'active';
    this.stepStartedTimestamp = Date.now();
    this._lastTickTimestamp = Date.now();
    this._startTimerTicking();
    this._emit();
  }

  /**
   * Toggles between play and pause.
   */
  togglePlayPause() {
    if (this.status === 'active' || this.status === 'resting') {
      this.pause();
    } else if (this.status === 'paused' || this.status === 'ready') {
      if (this.status === 'ready') {
        this.start();
      } else {
        this.resume();
      }
    }
  }

  /**
   * Records completion of the current work set and advances.
   * Hardened: validates input parameters and deduplicates logs idempotently.
   *
   * @param {Object} logData - Actual performance inputs
   */
  completeCurrentSet(logData = {}) {
    if (this.status === 'completed' || this.status === 'abandoned') {
      return;
    }

    const step = this.getCurrentStep();
    if (!step || step.type !== 'work') {
      return;
    }

    // 1. Sanitize & validate performance inputs
    let actualReps = null;
    if (logData.reps !== undefined && logData.reps !== null) {
      const parsed = typeof logData.reps === 'number' ? logData.reps : parseInt(logData.reps, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        actualReps = Math.min(500, Math.floor(parsed));
      }
    }
    if (actualReps === null) {
      const targetParsed = typeof step.targetReps === 'number' ? step.targetReps : parseInt(step.targetReps, 10);
      actualReps = Number.isFinite(targetParsed) && targetParsed >= 0 ? Math.min(500, Math.floor(targetParsed)) : 0;
    }

    let actualWeight = null;
    if (logData.weight !== undefined && logData.weight !== null && logData.weight !== '') {
      const parsedW = parseFloat(logData.weight);
      if (Number.isFinite(parsedW) && parsedW >= 0) {
        actualWeight = Math.min(1000, Math.round(parsedW * 10) / 10);
      }
    }

    let durationSpent = Math.max(1, Math.round((this.stepElapsedMs + (this.stepStartedTimestamp ? Date.now() - this.stepStartedTimestamp : 0)) / 1000));
    if (logData.durationSec !== undefined && logData.durationSec !== null) {
      const parsedD = parseInt(logData.durationSec, 10);
      if (Number.isFinite(parsedD) && parsedD > 0) {
        durationSpent = Math.min(86400, parsedD);
      }
    }

    step.completed = true;
    step.loggedReps = actualReps;
    step.loggedWeight = actualWeight;
    step.loggedDurationSec = durationSpent;

    const logEntry = {
      stepId: step.stepId,
      exerciseId: step.exerciseId,
      exerciseName: step.exerciseName,
      setNumber: step.setNumber,
      totalSets: step.totalSets,
      loggedReps: actualReps,
      loggedWeight: actualWeight,
      loggedDurationSec: durationSpent
    };

    // Deduplicate in completedLogs (update existing or append)
    const existingLogIdx = this.completedLogs.findIndex(l => l.stepId === step.stepId);
    if (existingLogIdx >= 0) {
      this.completedLogs[existingLogIdx] = logEntry;
    } else {
      this.completedLogs.push(logEntry);
    }

    // 2. Advance to next step (usually rest, or next work step)
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      const nextStep = this.getCurrentStep();

      // Reset step timer
      this.stepStartedTimestamp = Date.now();
      this.stepElapsedMs = 0;

      if (nextStep && nextStep.type === 'rest') {
        this.status = 'resting';
      } else {
        this.status = 'active';
      }

      this._emit();
    } else {
      // Completed all steps in the routine!
      this.finishSession();
    }
  }

  /**
   * Skips the current rest interval and starts the next exercise immediately.
   */
  skipRest() {
    const step = this.getCurrentStep();
    if (!step || step.type !== 'rest') return;

    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.status = 'active';
      this.stepStartedTimestamp = Date.now();
      this.stepElapsedMs = 0;
      this._emit();
    } else {
      this.finishSession();
    }
  }

  /**
   * Skips current work step to the next work step.
   */
  skipStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      const next = this.getCurrentStep();
      this.status = next && next.type === 'rest' ? 'resting' : 'active';
      this.stepStartedTimestamp = Date.now();
      this.stepElapsedMs = 0;
      this._emit();
    } else {
      this.finishSession();
    }
  }

  /**
   * Moves back to the previous work step and rolls back completed status deterministically.
   */
  previousStep() {
    if (this.currentStepIndex <= 0) return;

    // Current step completed flag rollback if work step
    const currentStep = this.getCurrentStep();
    if (currentStep && currentStep.type === 'work') {
      currentStep.completed = false;
      this.completedLogs = this.completedLogs.filter(l => l.stepId !== currentStep.stepId);
    }

    // Search backward for the preceding work step
    let targetIdx = this.currentStepIndex - 1;
    while (targetIdx > 0 && this.steps[targetIdx].type === 'rest') {
      targetIdx--;
    }

    this.currentStepIndex = Math.max(0, targetIdx);
    const prevWorkStep = this.getCurrentStep();
    if (prevWorkStep && prevWorkStep.type === 'work') {
      prevWorkStep.completed = false;
      this.completedLogs = this.completedLogs.filter(l => l.stepId !== prevWorkStep.stepId);
    }

    this.status = 'active';
    this.stepStartedTimestamp = Date.now();
    this.stepElapsedMs = 0;
    this._emit();
  }

  /**
   * Concludes the session, records progress, and clears active session from storage.
   * Includes duplicate completion protection.
   */
  finishSession() {
    this._stopTimerTicking();

    if (this._isCompletedOnce || this.status === 'completed') {
      return { ok: true, isDuplicate: true };
    }
    this._isCompletedOnce = true;
    this.status = 'completed';
    this.completedAt = new Date().toISOString();

    const totalWorkSteps = this.steps.filter(s => s.type === 'work').length;
    const completedWorkSteps = this.steps.filter(s => s.type === 'work' && s.completed).length;

    // Calculate calories burned proportional to completion
    const estCal = this.workout.estimatedCalories || 200;
    const finalCalories = Math.max(25, Math.round((completedWorkSteps / (totalWorkSteps || 1)) * estCal));
    const durationMin = Math.max(1, Math.round((this.totalElapsedSec || 60) / 60));

    const summary = {
      sessionId: this.sessionId,
      workoutId: this.workoutId,
      workoutTitle: this.workoutTitle,
      category: this.category,
      durationMin,
      totalElapsedSec: this.totalElapsedSec,
      caloriesBurned: finalCalories,
      setsCompleted: completedWorkSteps,
      totalSets: totalWorkSteps,
      plannedSessionId: this.plannedSessionId,
      planId: this.planId,
      planVersion: this.planVersion,
      isAdaptive: this.isAdaptive,
      exerciseLogs: this.completedLogs
    };

    // Record into persistent history & progress
    const result = recordCompletedWorkout(summary);

    // Clear active session from storage
    WorkoutSession.clearActiveSession();
    this._emit();

    return { ok: true, summary, historyResult: result };
  }

  /**
   * Abandons the session, saves partial progress if sets were done, and clears active storage.
   * Safe: will not overwrite an already completed session.
   */
  abandonSession() {
    if (this._isCompletedOnce || this.status === 'completed' || this.status === 'abandoned') {
      return;
    }

    this._stopTimerTicking();
    this.status = 'abandoned';

    const completedWorkSteps = this.steps.filter(s => s.type === 'work' && s.completed).length;
    if (completedWorkSteps > 0) {
      // Record partial history
      const totalWorkSteps = this.steps.filter(s => s.type === 'work').length;
      const estCal = this.workout.estimatedCalories || 200;
      const partialCalories = Math.max(15, Math.round((completedWorkSteps / (totalWorkSteps || 1)) * estCal));

      recordCompletedWorkout({
        sessionId: this.sessionId,
        workoutId: this.workoutId,
        workoutTitle: `${this.workoutTitle} (Partial)`,
        category: this.category,
        durationMin: Math.max(1, Math.round(this.totalElapsedSec / 60)),
        totalElapsedSec: this.totalElapsedSec,
        caloriesBurned: partialCalories,
        setsCompleted: completedWorkSteps,
        totalSets: totalWorkSteps,
        plannedSessionId: this.plannedSessionId,
        planId: this.planId,
        planVersion: this.planVersion,
        isAdaptive: this.isAdaptive,
        exerciseLogs: this.completedLogs
      });
    }

    WorkoutSession.clearActiveSession();
    this._emit();
  }

  /**
   * Calculates overall routine completion percentage.
   */
  getProgressPercent() {
    const workSteps = this.steps.filter(s => s.type === 'work');
    if (workSteps.length === 0) return 0;
    const completedCount = workSteps.filter(s => s.completed).length;
    return Math.min(100, Math.round((completedCount / workSteps.length) * 100));
  }

  /**
   * Serializes session to JSON for persistence.
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      workoutId: this.workoutId,
      workoutTitle: this.workoutTitle,
      category: this.category,
      plannedSessionId: this.plannedSessionId,
      planId: this.planId,
      planVersion: this.planVersion,
      isAdaptive: this.isAdaptive,
      adaptiveMetadata: this.adaptiveMetadata,
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      workoutStartedAt: this.workoutStartedAt,
      completedAt: this.completedAt,
      totalElapsedSec: this.totalElapsedSec,
      stepStartedTimestamp: this.stepStartedTimestamp,
      stepElapsedMs: this.stepElapsedMs,
      steps: this.steps,
      completedLogs: this.completedLogs,
      workout: this.workout
    };
  }

  /**
   * Returns a snapshot object for view subscribers.
   */
  getSnapshot() {
    const currentStep = this.getCurrentStep();
    const nextWorkStep = this.getNextWorkStep();
    const remainingSec = this.getRemainingSec();
    const progressPercent = this.getProgressPercent();

    const workSteps = this.steps.filter(s => s.type === 'work');
    const currentWorkStepNumber = workSteps.findIndex(s => s === currentStep) + 1;

    return {
      sessionId: this.sessionId,
      workoutId: this.workoutId,
      workoutTitle: this.workoutTitle,
      category: this.category,
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      currentStep,
      nextWorkStep,
      remainingSec,
      progressPercent,
      totalWorkSets: workSteps.length,
      completedWorkSets: workSteps.filter(s => s.completed).length,
      currentWorkStepNumber: currentWorkStepNumber > 0 ? currentWorkStepNumber : 1,
      totalElapsedSec: this.totalElapsedSec,
      completedLogs: this.completedLogs,
      isAdaptive: this.isAdaptive,
      plannedSessionId: this.plannedSessionId,
      planId: this.planId,
      planVersion: this.planVersion
    };
  }

  /**
   * Persists session snapshot to localStorage.
   */
  persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      if (this.status === 'completed' || this.status === 'abandoned') {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.toJSON()));
      }
    } catch (err) {
      console.warn('[WorkoutSession] Failed to persist active session:', err);
    }
  }

  /**
   * Recovers an active session from localStorage if one exists.
   * @returns {WorkoutSession|null}
   */
  static recoverActiveSession() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data) || !data.workoutId || data.status === 'completed' || data.status === 'abandoned') {
        return null;
      }

      // Check workout object validity
      const workout = data.workout || getWorkoutById(data.workoutId);
      if (!workout) return null;

      return new WorkoutSession(workout, data);
    } catch (err) {
      console.warn('[WorkoutSession] Corrupted active session found; clearing safely.', err);
      WorkoutSession.clearActiveSession();
      return null;
    }
  }

  /**
   * Clears any active session record from localStorage.
   */
  static clearActiveSession() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (err) {
        console.error('Failed to clear active session storage', err);
      }
    }
  }
}
