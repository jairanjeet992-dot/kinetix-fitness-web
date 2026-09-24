/**
 * WORKOUT PLAYER - KINETIX
 * Phase 3: Real Guided Workout Session Engine
 *
 * Full-fidelity guided workout player supporting:
 * - Deterministic static and generated workouts
 * - Rep-based vs time-based exercises
 * - Multi-set progression and automated rest intervals
 * - Session state persistence and reload/crash recovery
 * - Workout completion summary and history logging
 * - Safe exit confirmation and incomplete session recovery
 */

import { getWorkoutById } from '../data/workouts.js';
import { getExercisePlaceholderSvg } from '../data/exercises.js';
import {
  initSession,
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  recoverSession,
  pauseSession,
  resumeSession,
  completeSet,
  skipRest,
  skipExercise,
  previousExercise,
  completeWorkout,
  getRoutineItems,
  calculateWorkoutProgress
} from '../state/workout-session.js';

/**
 * Formats seconds into MM:SS display.
 */
function formatTime(sec) {
  const safeSec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(safeSec / 60).toString().padStart(2, '0');
  const s = (safeSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Formats duration in seconds to human-readable string (e.g., "32 min" or "45s").
 */
function formatDuration(sec) {
  const safeSec = Math.max(0, Math.floor(sec || 0));
  const mins = Math.round(safeSec / 60);
  if (mins >= 1) return `${mins} min`;
  return `${safeSec}s`;
}

/**
 * Primary entry point for rendering the Guided Workout Player.
 */
export function renderWorkoutPlayer(container, workoutId) {
  if (!container) return;

  // 1. Clean up any existing timer running on this container
  if (typeof container._kinetixStopTimer === 'function') {
    container._kinetixStopTimer();
    container._kinetixStopTimer = null;
  }

  // 1. Resolve Workout
  if (!workoutId) {
    renderMissingWorkout(container, 'No workout ID was provided.');
    return;
  }

  const workout = getWorkoutById(workoutId);
  if (!workout) {
    renderMissingWorkout(container, `Workout "${workoutId}" could not be found.`);
    return;
  }

  const routine = getRoutineItems(workout);
  if (!routine || routine.length === 0) {
    renderMissingWorkout(container, 'The requested workout contains no valid exercises.');
    return;
  }

  // 2. Resolve Active Session
  let session = getActiveSession();

  // If there's an ongoing session for a DIFFERENT workout, prompt the user
  if (session && session.workoutId !== workout.id && !session.isCompleted) {
    renderSessionConflictModal(container, workout, session, () => {
      clearActiveSession();
      session = initSession(workout);
      startPlayerView(container, workout, routine, session);
    });
    return;
  }

  // If there's an existing session for THIS workout, recover it
  if (session && session.workoutId === workout.id) {
    session = recoverSession(session, workout);
  } else {
    session = initSession(workout);
  }

  startPlayerView(container, workout, routine, session);
}

/**
 * Renders the active workout player view and manages state/timers.
 */
function startPlayerView(container, workout, routine, initialSession) {
  let session = initialSession;
  let timerInterval = null;
  let ticksSinceLastSave = 0;
  let isAdvancing = false;

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  container._kinetixStopTimer = stopTimer;

  function startTimer() {
    stopTimer();
    if (!session || session.isCompleted || session.isPaused) return;

    timerInterval = setInterval(() => {
      if (!session || session.isCompleted || session.isPaused) {
        stopTimer();
        return;
      }

      session.elapsedSeconds = (session.elapsedSeconds || 0) + 1;
      ticksSinceLastSave++;

      const currentEx = routine[session.currentExerciseIndex] || routine[0];

      if (session.phase === 'REST') {
        session.remainingSeconds = Math.max(0, (session.remainingSeconds || 0) - 1);
        const timerEl = container.querySelector('#player-timer-text');
        if (timerEl) {
          timerEl.textContent = formatTime(session.remainingSeconds);
        }

        if (session.remainingSeconds <= 0) {
          if (isAdvancing) return;
          isAdvancing = true;
          // Rest timer expired -> auto advance to next exercise/set
          session = skipRest(session, workout);
          renderUI();
          isAdvancing = false;
          return;
        }
      } else if (session.phase === 'EXERCISE' && currentEx.isTimed) {
        session.remainingSeconds = Math.max(0, (session.remainingSeconds || 0) - 1);
        const timerEl = container.querySelector('#player-timer-text');
        if (timerEl) {
          timerEl.textContent = formatTime(session.remainingSeconds);
        }

        if (session.remainingSeconds <= 0) {
          if (isAdvancing) return;
          isAdvancing = true;
          // Timed exercise interval expired -> auto complete set
          session = completeSet(session, workout);
          renderUI();
          isAdvancing = false;
          return;
        }
      }

      // Checkpoint save to localStorage periodically
      if (ticksSinceLastSave >= 4) {
        ticksSinceLastSave = 0;
        session.lastTickAt = Date.now();
        saveActiveSession(session);
      }
    }, 1000);

    if (timerInterval && typeof timerInterval.unref === 'function') {
      timerInterval.unref();
    }
  }

  function renderUI() {
    if (!session) return;

    if (session.isCompleted) {
      stopTimer();
      renderCompletionScreen();
      return;
    }

    if (session.phase === 'REST') {
      renderRestPhase();
    } else {
      renderExercisePhase();
    }

    startTimer();
  }

  // --- RENDER EXERCISE PHASE ---
  function renderExercisePhase() {
    const progress = calculateWorkoutProgress(session, routine);
    const safeIdx = Math.min(Math.max(0, session.currentExerciseIndex || 0), routine.length - 1);
    const currentEx = routine[safeIdx];
    const nextEx = routine[safeIdx + 1];

    const isLastExercise = safeIdx === routine.length - 1;
    const isLastSet = session.currentSet >= currentEx.totalSets;
    const finishLabel = isLastExercise && isLastSet ? 'Finish Workout' : (isLastSet ? 'Complete Exercise' : 'Complete Set');

    container.innerHTML = `
      <div class="view-enter" style="max-width: 780px; margin: 0 auto; padding-bottom: var(--space-8);">
        <!-- Top Session Navigation Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); gap: var(--space-2); flex-wrap: wrap;">
          <button type="button" class="btn btn-ghost btn-sm" id="btn-player-exit" aria-label="Exit Workout Session">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Exit
          </button>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="badge badge-primary">${workout.title}</span>
            <span class="badge ${session.isPaused ? 'badge-warning' : 'badge-success'}">
              ${session.isPaused ? 'Paused' : currentEx.stage === 'warmup' ? 'Warmup' : currentEx.stage === 'cooldown' ? 'Cooldown' : 'Active'}
            </span>
          </div>
        </div>

        <!-- Routine Progress Strip -->
        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: var(--font-size-body-sm); color: var(--color-text-secondary);">
            <span>Exercise <strong>${progress.exerciseIndex}</strong> of <strong>${progress.totalExercises}</strong></span>
            <span>Overall: <strong>${progress.overallPercent}%</strong></span>
          </div>
          <div class="progress-track" style="height: 8px;">
            <div id="player-overall-progress" class="progress-fill" style="width: ${progress.overallPercent}%;"></div>
          </div>
        </div>

        <!-- Player Card Container -->
        <div class="player-container">
          <!-- Exercise Media Visual Stage -->
          <div class="player-media-stage">
            ${getExercisePlaceholderSvg(currentEx.svgType)}
            <div class="text-caption" style="color: rgba(255, 255, 255, 0.75); letter-spacing: 0.05em; text-transform: uppercase;">
              ${currentEx.equipment} &bull; ${currentEx.primaryMuscle}
            </div>
            <span class="badge badge-dark" style="margin-top: var(--space-2); background: rgba(255, 255, 255, 0.15); color: #FFF;">
              Difficulty: ${currentEx.difficulty}
            </span>
          </div>

          <!-- Exercise Details & Action Center -->
          <div style="padding: var(--space-5) var(--space-6); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div style="display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-2); flex-wrap: wrap; justify-content: center;">
              <span class="badge badge-primary" id="player-current-badge">
                Exercise ${safeIdx + 1} of ${routine.length}
              </span>
              <span class="badge badge-success" id="player-set-badge">
                Set ${session.currentSet} of ${currentEx.totalSets}
              </span>
            </div>

            <h2 class="text-h1" id="player-current-title" style="margin-bottom: var(--space-2);">${currentEx.name}</h2>

            <!-- Reps or Timer Display -->
            ${currentEx.isTimed ? `
              <div class="player-timer-display" id="player-timer-text" aria-live="off">
                ${formatTime(session.remainingSeconds)}
              </div>
              <div class="text-caption text-muted" style="margin-bottom: var(--space-3);">
                Target: ${currentEx.targetDurationSec} Seconds Interval
              </div>
            ` : `
              <div class="player-reps-display" id="player-reps-text">
                ${typeof currentEx.targetReps === 'number' ? `${currentEx.targetReps} REPS` : currentEx.targetReps.toString().toUpperCase()}
              </div>
              <div class="text-caption text-muted" style="margin-bottom: var(--space-3);">
                Target: ${currentEx.targetReps} per set
              </div>
            `}

            <!-- Instructions -->
            <ul class="player-instruction-list">
              ${currentEx.instructions.map(inst => `<li>${inst}</li>`).join('')}
            </ul>

            <!-- Upcoming Preview -->
            <div class="card" id="player-next-preview" style="padding: var(--space-2) var(--space-4); background-color: var(--color-surface-secondary); border: none; margin-bottom: var(--space-4); font-size: var(--font-size-body-sm); border-radius: var(--radius-pill); max-width: 480px; width: 100%;">
              ${nextEx
                ? `Next: <strong>${nextEx.name}</strong> (${nextEx.isTimed ? `${nextEx.targetDurationSec}s` : nextEx.targetReps})`
                : `<strong>Final Exercise!</strong> Complete all sets to finish routine.`}
            </div>

            <!-- Primary Action Bar -->
            <div style="width: 100%; max-width: 420px; margin-bottom: var(--space-3);">
              <button type="button" class="btn btn-primary btn-lg" id="btn-complete-set" style="width: 100%; font-size: 1.1rem; padding: 16px 24px; box-shadow: var(--shadow-sm);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${finishLabel}
              </button>
            </div>

            <!-- Secondary Controls Row -->
            <div class="player-controls-row">
              <button type="button" class="btn btn-secondary btn-icon btn-lg" id="btn-player-prev" aria-label="Previous Set or Exercise" title="Previous" ${safeIdx === 0 && session.currentSet === 1 ? 'disabled style="opacity: 0.4;"' : ''}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
              </button>

              <button type="button" class="btn btn-secondary btn-icon btn-lg" id="btn-player-pause" aria-label="${session.isPaused ? 'Resume Session' : 'Pause Session'}" title="${session.isPaused ? 'Resume' : 'Pause'}">
                ${session.isPaused ? `
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                ` : `
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                `}
              </button>

              <button type="button" class="btn btn-secondary btn-icon btn-lg" id="btn-player-skip" aria-label="Skip Current Exercise" title="Skip Exercise">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
              </button>
            </div>

            <div class="text-caption text-muted">
              ${session.isPaused ? 'Session is paused. Tap Play to resume workout.' : 'Tap Complete Set when finished &bull; Pause anytime'}
            </div>
          </div>
        </div>
      </div>
    `;

    attachExerciseControls();
  }

  // --- RENDER REST PHASE ---
  function renderRestPhase() {
    const progress = calculateWorkoutProgress(session, routine);
    const safeIdx = Math.min(Math.max(0, session.currentExerciseIndex || 0), routine.length - 1);
    const upcomingEx = routine[safeIdx];

    container.innerHTML = `
      <div class="view-enter" style="max-width: 780px; margin: 0 auto; padding-bottom: var(--space-8);">
        <!-- Top Session Navigation Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); gap: var(--space-2); flex-wrap: wrap;">
          <button type="button" class="btn btn-ghost btn-sm" id="btn-player-exit" aria-label="Exit Workout Session">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Exit
          </button>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="badge badge-primary">${workout.title}</span>
            <span class="badge badge-warning">Rest Interval</span>
          </div>
        </div>

        <!-- Routine Progress Strip -->
        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: var(--font-size-body-sm); color: var(--color-text-secondary);">
            <span>Exercise <strong>${progress.exerciseIndex}</strong> of <strong>${progress.totalExercises}</strong></span>
            <span>Overall: <strong>${progress.overallPercent}%</strong></span>
          </div>
          <div class="progress-track" style="height: 8px;">
            <div class="progress-fill" style="width: ${progress.overallPercent}%;"></div>
          </div>
        </div>

        <!-- Rest Card Container -->
        <div class="player-container">
          <div class="player-rest-stage">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: var(--space-2);">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div class="text-caption" style="color: rgba(255, 255, 255, 0.8); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">
              Active Recovery
            </div>
            <span class="badge" style="margin-top: var(--space-2); background: rgba(255, 255, 255, 0.15); color: #FFF;">
              Breathe deeply and rehydrate
            </span>
          </div>

          <div style="padding: var(--space-6); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <span class="badge badge-warning" style="margin-bottom: var(--space-2);">
              REST PERIOD
            </span>

            <div class="player-timer-display" id="player-timer-text" aria-live="off" style="color: var(--color-warning);">
              ${formatTime(session.remainingSeconds)}
            </div>

            <!-- Up Next Box -->
            <div class="card" style="padding: var(--space-3) var(--space-4); background-color: var(--color-surface-secondary); border: 1px solid var(--color-border); margin: var(--space-3) 0 var(--space-5); max-width: 460px; width: 100%; border-radius: var(--radius-lg);">
              <div class="text-caption text-muted" style="margin-bottom: 2px;">UP NEXT</div>
              <div class="text-h3" style="color: var(--color-text-primary); margin-bottom: 2px;">
                ${upcomingEx.name}
              </div>
              <div class="text-body-sm" style="color: var(--color-text-secondary);">
                Set ${session.currentSet} of ${upcomingEx.totalSets} &bull; ${upcomingEx.isTimed ? `${upcomingEx.targetDurationSec}s` : upcomingEx.targetReps}
              </div>
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: var(--space-3); width: 100%; max-width: 420px; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-primary btn-lg" id="btn-skip-rest" style="flex: 1; min-width: 160px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="margin-right: 6px;"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                Skip Rest
              </button>

              <button type="button" class="btn btn-secondary btn-lg" id="btn-rest-pause">
                ${session.isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    attachRestControls();
  }

  // --- RENDER COMPLETION SCREEN ---
  function renderCompletionScreen() {
    const totalExercises = routine.length;
    const completedCount = (session.completedExercises || []).length;
    const setsCount = session.completedSets || 0;
    const durationMin = Math.max(1, Math.round((session.elapsedSeconds || 1) / 60));
    const estCalories = workout.estimatedCalories || Math.round((session.elapsedSeconds / 60) * 7.5);
    const completedTimeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    container.innerHTML = `
      <div class="view-enter" style="max-width: 640px; margin: 0 auto; padding: var(--space-4) var(--space-4) var(--space-8);">
        <div class="player-summary-card">
          <!-- Celebration Badge -->
          <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(34, 197, 94, 0.12); color: var(--color-success); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>

          <span class="badge badge-success" style="margin-bottom: var(--space-2);">WORKOUT COMPLETE</span>
          <h1 class="text-h1" style="margin-bottom: var(--space-2);">${workout.title}</h1>
          <p class="text-body" style="color: var(--color-text-secondary); margin-bottom: var(--space-6);">
            Phenomenal performance! You showed up, executed the movements, and logged another high-caliber training session.
          </p>

          <!-- Metrics Strip -->
          <div class="grid grid-cols-2 grid-tablet-4 gap-3" style="margin-bottom: var(--space-6);">
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">DURATION</span>
              <div class="text-h3" style="margin-top: 2px;">${durationMin} Min</div>
            </div>
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">COMPLETED</span>
              <div class="text-h3" style="margin-top: 2px;">${completedCount} / ${totalExercises}</div>
            </div>
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">TOTAL SETS</span>
              <div class="text-h3" style="margin-top: 2px;">${setsCount} Sets</div>
            </div>
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">CALORIES</span>
              <div class="text-h3" style="margin-top: 2px;">~${estCalories} kcal</div>
            </div>
          </div>

          <div class="text-caption text-muted" style="margin-bottom: var(--space-5);">
            Completed today at ${completedTimeString} &bull; Calorie burn is estimated based on movement intensity
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-lg" id="btn-summary-done" style="min-width: 180px;">
              Done
            </button>
            <a href="#workout/${workout.id}" class="btn btn-secondary btn-lg" id="btn-summary-details">
              View Routine
            </a>
          </div>
        </div>
      </div>
    `;

    const doneBtn = container.querySelector('#btn-summary-done');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        clearActiveSession();
        window.location.hash = '#home';
      });
    }
  }

  // --- ATTACH EXERCISE CONTROLS ---
  function attachExerciseControls() {
    const completeBtn = container.querySelector('#btn-complete-set');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        session = completeSet(session, workout);
        renderUI();
      });
    }

    const pauseBtn = container.querySelector('#btn-player-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (session.isPaused) {
          session = resumeSession(session);
        } else {
          session = pauseSession(session);
        }
        renderUI();
      });
    }

    const skipBtn = container.querySelector('#btn-player-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        session = skipExercise(session, workout);
        renderUI();
      });
    }

    const prevBtn = container.querySelector('#btn-player-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        session = previousExercise(session, workout);
        renderUI();
      });
    }

    const exitBtn = container.querySelector('#btn-player-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        showExitConfirmationModal();
      });
    }
  }

  // --- ATTACH REST CONTROLS ---
  function attachRestControls() {
    const skipRestBtn = container.querySelector('#btn-skip-rest');
    if (skipRestBtn) {
      skipRestBtn.addEventListener('click', () => {
        session = skipRest(session, workout);
        renderUI();
      });
    }

    const pauseRestBtn = container.querySelector('#btn-rest-pause');
    if (pauseRestBtn) {
      pauseRestBtn.addEventListener('click', () => {
        if (session.isPaused) {
          session = resumeSession(session);
        } else {
          session = pauseSession(session);
        }
        renderUI();
      });
    }

    const exitBtn = container.querySelector('#btn-player-exit');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        showExitConfirmationModal();
      });
    }
  }

  // --- EXIT CONFIRMATION MODAL ---
  function showExitConfirmationModal() {
    const existing = document.querySelector('#modal-player-exit');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-player-exit';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-exit-title');

    modal.innerHTML = `
      <div class="modal-card">
        <h2 id="modal-exit-title" class="text-h2" style="margin-bottom: var(--space-2);">Leave Workout?</h2>
        <p class="text-body" style="color: var(--color-text-secondary); margin-bottom: var(--space-5);">
          Your progress (Exercise ${session.currentExerciseIndex + 1}, Set ${session.currentSet}) will be saved. You can resume right where you left off.
        </p>

        <div style="display: flex; gap: var(--space-3); justify-content: flex-end; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-modal-cancel">
            Continue Workout
          </button>
          <button type="button" class="btn btn-primary" id="btn-modal-exit">
            Exit Session
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector('#btn-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.remove();
      });
    }

    const confirmBtn = modal.querySelector('#btn-modal-exit');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        modal.remove();
        stopTimer();
        saveActiveSession(session);
        window.location.hash = `#workout/${workout.id}`;
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // Clean up interval when leaving player view
  window.addEventListener('hashchange', () => {
    stopTimer();
    const existingModal = document.querySelector('#modal-player-exit');
    if (existingModal) existingModal.remove();
  }, { once: true });

  // Initial render
  renderUI();
}

/**
 * Renders user-friendly state when the requested workout is missing or invalid.
 */
function renderMissingWorkout(container, message) {
  container.innerHTML = `
    <div class="view-enter state-container" style="max-width: 520px; margin: var(--space-8) auto; text-align: center; padding: var(--space-6);">
      <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(255, 84, 46, 0.12); color: var(--color-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h2 class="state-title text-h2" style="margin-bottom: var(--space-2);">Workout Not Found</h2>
      <p class="state-description text-body" style="color: var(--color-text-secondary); margin-bottom: var(--space-5);">
        ${message || 'The requested workout routine is not available.'}
      </p>
      <a href="#workouts" class="btn btn-primary btn-md">
        &larr; Browse Workouts
      </a>
    </div>
  `;
}

/**
 * Handles active session conflict when navigating to a different workout.
 */
function renderSessionConflictModal(container, newWorkout, activeSession, onDiscardAndStart) {
  container.innerHTML = `
    <div class="view-enter state-container" style="max-width: 560px; margin: var(--space-8) auto; padding: var(--space-6);">
      <div class="card" style="padding: var(--space-6); text-align: center;">
        <span class="badge badge-warning" style="margin-bottom: var(--space-3);">UNFINISHED SESSION</span>
        <h2 class="text-h2" style="margin-bottom: var(--space-2);">Resume Previous Workout?</h2>
        <p class="text-body" style="color: var(--color-text-secondary); margin-bottom: var(--space-5);">
          You already have an active workout in progress: <strong>"${activeSession.workoutTitle || 'Active Session'}"</strong>.
          Would you like to resume your existing workout or discard it to start <strong>"${newWorkout.title}"</strong>?
        </p>

        <div style="display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap;">
          <a href="#player/${activeSession.workoutId}" class="btn btn-primary btn-md">
            Resume "${activeSession.workoutTitle || 'Previous'}"
          </a>
          <button type="button" class="btn btn-secondary btn-md" id="btn-conflict-discard">
            Discard & Start "${newWorkout.title}"
          </button>
        </div>
      </div>
    </div>
  `;

  const discardBtn = container.querySelector('#btn-conflict-discard');
  if (discardBtn) {
    discardBtn.addEventListener('click', () => {
      onDiscardAndStart();
    });
  }
}
