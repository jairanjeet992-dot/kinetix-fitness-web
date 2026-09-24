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
import { getExercisePlaceholderSvg, getExerciseById } from '../data/exercises.js';
import { renderExerciseMedia, showExerciseDetailModal } from '../components/exercise-media.js';
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
import {
  getExercisePerformanceHistory,
  detectPersonalRecords,
  formatWeight,
  kgToLbs,
  getPerformanceRecordsForSession
} from '../analytics/performance-tracker.js';

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
  let activeUnit = 'kg';
  const sessionUnlockedPRs = [];

  function showPRToast(pr, exerciseName) {
    if (typeof document === 'undefined') return;
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.style.borderColor = 'rgba(245, 158, 11, 0.5)';
    toast.style.background = 'linear-gradient(135deg, var(--color-surface), rgba(245, 158, 11, 0.1))';
    toast.innerHTML = `
      <span style="font-size: 20px;">🏆</span>
      <div class="toast-message">
        <div style="font-weight: 700; color: #d97706; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">New Personal Record!</div>
        <div style="font-size: 13px;"><strong>${exerciseName || 'Exercise'}</strong>: ${pr.label} (${pr.formattedValue})</div>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function stopMedia() {
    if (container && typeof container.querySelectorAll === 'function') {
      const videos = container.querySelectorAll('video');
      videos.forEach(v => {
        if (v && typeof v.pause === 'function') {
          v.pause();
        }
      });
    }
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    stopMedia();
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
    const masterEx = getExerciseById(currentEx.id) || currentEx;

    const isLastExercise = safeIdx === routine.length - 1;
    const isLastSet = session.currentSet >= currentEx.totalSets;
    const finishLabel = isLastExercise && isLastSet ? 'Finish Workout' : (isLastSet ? 'Complete Exercise' : 'Complete Set');

    // Exercise performance history & session logs for this exercise
    const exerciseHistory = getExercisePerformanceHistory(currentEx.id);
    const sessionExerciseLogs = (session.performanceLogs || [])
      .filter(l => l.exerciseId === currentEx.id)
      .sort((a, b) => a.setNumber - b.setNumber);

    // Target reps extraction
    let suggestedReps = '';
    if (typeof currentEx.targetReps === 'number') {
      suggestedReps = currentEx.targetReps;
    } else if (typeof currentEx.targetReps === 'string') {
      const match = currentEx.targetReps.match(/\b(\d+)\b/);
      if (match) suggestedReps = match[1];
    }

    // Suggested weight from previous set in this session
    let suggestedWeight = '';
    if (sessionExerciseLogs.length > 0) {
      const lastLoggedSet = sessionExerciseLogs[sessionExerciseLogs.length - 1];
      if (lastLoggedSet.weight !== null && lastLoggedSet.weight !== undefined) {
        suggestedWeight = activeUnit === lastLoggedSet.unit
          ? lastLoggedSet.weight
          : (activeUnit === 'lb' ? kgToLbs(lastLoggedSet.weightKg) : lastLoggedSet.weightKg);
      }
    }

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
          <!-- Exercise Media Visual Stage (Coach Kai / Multi-Tier Media Fallback) -->
          ${renderExerciseMedia(masterEx, { showCues: false })}

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

            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: var(--space-2); flex-wrap: wrap;">
              <h2 class="text-h1" id="player-current-title" style="margin: 0;">${currentEx.name}</h2>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-player-exercise-guide" aria-label="View Form Guide and Demonstration Standard for ${currentEx.name}" title="View Form Guide" style="padding: 4px 8px; font-size: 11px; border: 1px solid var(--color-border); border-radius: var(--radius-pill); display: inline-flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Coach Guide</span>
              </button>
            </div>

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

            <!-- Set Performance & Logging Card (Phase 5) -->
            <div class="card" style="padding: var(--space-4); background-color: var(--color-surface-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); width: 100%; max-width: 480px; margin-bottom: var(--space-4); text-align: left;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: var(--font-weight-bold); font-size: var(--font-size-body-sm); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-primary);">
                    Log Set ${session.currentSet}
                  </span>
                  <span class="badge ${session.currentSet === currentEx.totalSets ? 'badge-primary' : 'badge-dark'}" style="font-size: 11px;">
                    ${session.currentSet} of ${currentEx.totalSets}
                  </span>
                </div>

                <!-- Unit Selector -->
                <div style="display: inline-flex; border-radius: var(--radius-pill); background: var(--color-surface); padding: 2px; border: 1px solid var(--color-border);">
                  <button type="button" class="btn btn-ghost btn-sm btn-unit-toggle" data-unit="kg" style="padding: 2px 8px; height: 24px; font-size: 11px; border-radius: var(--radius-pill); ${activeUnit === 'kg' ? 'background: var(--color-primary); color: #fff; font-weight: 700;' : ''}">KG</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-unit-toggle" data-unit="lb" style="padding: 2px 8px; height: 24px; font-size: 11px; border-radius: var(--radius-pill); ${activeUnit === 'lb' ? 'background: var(--color-primary); color: #fff; font-weight: 700;' : ''}">LB</button>
                </div>
              </div>

              <!-- Previous Performance / Personal Best Pill -->
              ${exerciseHistory.hasHistory ? `
                <div style="display: flex; gap: 6px; margin-bottom: var(--space-3); flex-wrap: wrap; font-size: 11px;">
                  ${exerciseHistory.personalBests && exerciseHistory.personalBests.heaviest_weight ? `
                    <span class="badge badge-gold" title="All-Time Heaviest Weight">
                      PR: ${exerciseHistory.personalBests.heaviest_weight.formattedValue}
                    </span>
                  ` : ''}
                  ${exerciseHistory.previousPerformance ? `
                    <span class="badge" style="background: rgba(255,255,255,0.08);" title="Last Session Performance">
                      Last: ${exerciseHistory.previousPerformance.sets.slice(0, 3).map(s => s.weightKg ? `${s.weightKg}kg×${s.reps}` : (s.reps ? `${s.reps}r` : `${s.durationSeconds}s`)).join(', ')}
                    </span>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Sets Completed This Session -->
              ${sessionExerciseLogs.length > 0 ? `
                <div style="margin-bottom: var(--space-3);">
                  <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px; text-transform: uppercase; font-weight: 600;">
                    Completed This Session:
                  </div>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${sessionExerciseLogs.map(l => `
                      <span class="badge badge-success" style="font-size: 11px; padding: 3px 8px;">
                        Set ${l.setNumber}: ${l.weightKg ? `${formatWeight(l.weightKg, activeUnit)} × ${l.reps}` : (l.reps ? `${l.reps} reps` : (l.durationSeconds ? `${l.durationSeconds}s` : 'Done'))} &#10003;
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Inputs -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
                <div>
                  <label for="player-input-weight" style="display: block; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; font-weight: 500;">
                    Weight (${activeUnit.toUpperCase()})
                  </label>
                  <input type="number" id="player-input-weight" class="form-input" style="width: 100%; text-align: center; font-weight: 600; font-size: 1.1rem; padding: 8px 4px;" placeholder="Optional" min="0" step="0.5" value="${suggestedWeight}">
                </div>

                ${currentEx.isTimed ? `
                  <div>
                    <label for="player-input-duration" style="display: block; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; font-weight: 500;">
                      Duration (Seconds)
                    </label>
                    <input type="number" id="player-input-duration" class="form-input" style="width: 100%; text-align: center; font-weight: 600; font-size: 1.1rem; padding: 8px 4px;" min="1" step="1" value="${currentEx.targetDurationSec || 40}">
                  </div>
                ` : `
                  <div>
                    <label for="player-input-reps" style="display: block; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; font-weight: 500;">
                      Reps Performed
                    </label>
                    <input type="number" id="player-input-reps" class="form-input" style="width: 100%; text-align: center; font-weight: 600; font-size: 1.1rem; padding: 8px 4px;" placeholder="${suggestedReps || 10}" min="1" step="1" value="${suggestedReps}">
                  </div>
                `}
              </div>
            </div>

            <!-- Primary Action Bar -->
            <div style="width: 100%; max-width: 420px; margin-bottom: var(--space-3);">
              <button type="button" class="btn btn-primary btn-lg btn-player-complete-set" id="btn-complete-set" style="width: 100%; font-size: 1.1rem; padding: 16px 24px; box-shadow: var(--shadow-sm);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${finishLabel}
              </button>
            </div>

            <!-- Secondary Controls Row -->
            <div class="player-controls-row">
              <button type="button" class="btn btn-secondary btn-icon btn-lg" id="btn-player-prev" aria-label="Previous Set or Exercise" title="Previous" ${safeIdx === 0 && session.currentSet === 1 ? 'disabled style="opacity: 0.4;"' : ''}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
              </button>

              <button type="button" class="btn btn-secondary btn-icon btn-lg btn-player-playpause" id="btn-player-pause" aria-label="${session.isPaused ? 'Resume Session' : 'Pause Session'}" title="${session.isPaused ? 'Resume' : 'Pause'}">
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

    // Phase 5 Performance Tracking Summary
    const sessionLogs = getPerformanceRecordsForSession(session.sessionId);
    const totalVolumeKg = sessionLogs.reduce((acc, log) => acc + (log.volumeKg || 0), 0);
    const formattedVolume = `${Math.round(totalVolumeKg * 10) / 10} kg`;

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
              <span class="text-caption text-muted">VOLUME LIFTED</span>
              <div class="text-h3" style="margin-top: 2px; color: ${totalVolumeKg > 0 ? 'var(--color-primary)' : 'inherit'};">
                ${totalVolumeKg > 0 ? formattedVolume : 'Bodyweight'}
              </div>
            </div>
          </div>

          <!-- Unlocked Personal Records -->
          ${sessionUnlockedPRs.length > 0 ? `
            <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-4); background: linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(245, 158, 11, 0.12)); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-lg); text-align: left;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-3);">
                <span style="font-size: 20px;">🏆</span>
                <span style="font-weight: 700; color: #d97706; text-transform: uppercase; font-size: 13px; letter-spacing: 0.05em;">
                  Personal Records Broken (${sessionUnlockedPRs.length})
                </span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${sessionUnlockedPRs.map(pr => `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: var(--color-surface); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid rgba(245, 158, 11, 0.2);">
                    <div>
                      <div style="font-weight: 600; font-size: 14px;">${pr.exerciseName || 'Exercise'}</div>
                      <div style="font-size: 12px; color: var(--color-text-secondary);">${pr.label}</div>
                    </div>
                    <span class="badge badge-gold" style="font-size: 13px;">${pr.formattedValue}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

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
    const safeIdx = Math.min(Math.max(0, session.currentExerciseIndex || 0), routine.length - 1);
    const currentEx = routine[safeIdx];
    const masterEx = getExerciseById(currentEx.id) || currentEx;

    // Form Guide button
    const guideBtn = container.querySelector('#btn-player-exercise-guide');
    if (guideBtn) {
      guideBtn.addEventListener('click', () => {
        showExerciseDetailModal(masterEx);
      });
    }

    // Unit toggle buttons
    const unitToggles = container.querySelectorAll('.btn-unit-toggle');
    unitToggles.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const u = e.currentTarget.dataset.unit;
        if (u && (u === 'kg' || u === 'lb') && u !== activeUnit) {
          activeUnit = u;
          renderUI();
        }
      });
    });

    const completeBtn = container.querySelector('#btn-complete-set');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        let setLogData = null;
        const weightEl = container.querySelector('#player-input-weight');
        const repsEl = container.querySelector('#player-input-reps');
        const durationEl = container.querySelector('#player-input-duration');

        const rawW = weightEl ? weightEl.value.trim() : '';
        const rawR = repsEl ? repsEl.value.trim() : '';
        const rawD = durationEl ? durationEl.value.trim() : '';

        const numWeight = rawW !== '' && Number.isFinite(Number(rawW)) && Number(rawW) > 0 ? Number(rawW) : null;
        const numReps = rawR !== '' && Number.isFinite(Number(rawR)) && Number(rawR) > 0 ? Math.floor(Number(rawR)) : null;
        const numDuration = rawD !== '' && Number.isFinite(Number(rawD)) && Number(rawD) > 0
          ? Math.round(Number(rawD))
          : (currentEx && currentEx.isTimed ? currentEx.targetDurationSec : null);

        if (numWeight !== null || numReps !== null || (currentEx && currentEx.isTimed && numDuration !== null)) {
          setLogData = {
            setNumber: session.currentSet,
            weight: numWeight,
            unit: activeUnit,
            reps: numReps,
            durationSeconds: numDuration,
            completed: true,
            completedAt: new Date().toISOString()
          };

          // Detect PRs deterministically
          const candidateRecord = {
            sessionId: session.sessionId,
            workoutId: session.workoutId,
            exerciseId: currentEx.id,
            setNumber: session.currentSet,
            weight: numWeight,
            unit: activeUnit,
            reps: numReps,
            durationSeconds: numDuration,
            completedAt: setLogData.completedAt
          };
          const prs = detectPersonalRecords(candidateRecord);
          if (prs && prs.length > 0) {
            prs.forEach(pr => {
              pr.exerciseName = currentEx.name;
              sessionUnlockedPRs.push(pr);
            });
            showPRToast(prs[0], currentEx.name);
          }
        }

        session = completeSet(session, workout, setLogData);
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
