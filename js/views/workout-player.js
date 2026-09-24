/**
 * WORKOUT PLAYER 2.0 - KINETIX
 * Phase 8: Premium Mobile-First Workout Player Experience
 *
 * Implements:
 * 1. Multi-set and multi-round workout progression (Work & Rest states)
 * 2. Wall-clock accurate interval timer with zero background drift
 * 3. Deterministic biomechanical exercise visualization & cues
 * 4. Performance logging per set (reps, weights, duration)
 * 5. Automatic session persistence & seamless reload recovery
 * 6. Web Audio API synthesized interval cues (zero asset load failure)
 * 7. Accessible touch targets, keyboard navigation, and exit confirmation dialog
 * 8. Full integration with History, Plan adherence, and Progress analytics
 */

import { getWorkoutById } from '../data/workouts.js';
import { getExerciseById } from '../data/exercises.js';
import { WorkoutSession } from '../engine/workout-session.js';
import { renderExerciseMedia } from '../components/exercise-media.js';
import { getProfile } from '../state/profile.js';

// Web Audio API chime generator (self-contained, no external audio assets needed)
class WorkoutAudioCues {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 600, durationSec = 0.15) {
    if (!this.enabled) return;
    try {
      this._initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationSec);
    } catch (e) {
      // Audio autoplay restrictions or headless environment
    }
  }

  playCountdown() {
    this.playBeep(440, 0.1);
  }

  playTransition() {
    this.playBeep(880, 0.3);
  }

  playFinish() {
    this.playBeep(523.25, 0.15);
    setTimeout(() => this.playBeep(659.25, 0.15), 150);
    setTimeout(() => this.playBeep(783.99, 0.35), 300);
  }
}

const audioCues = new WorkoutAudioCues();

export function renderWorkoutPlayer(container, workoutId) {
  const profile = getProfile();
  const weightUnit = profile.weightUnit || 'kg';

  // 1. Resolve Workout
  const targetWorkoutId = workoutId || 'metabolic-ignition';
  const workout = getWorkoutById(targetWorkoutId) || getWorkoutById('metabolic-ignition');

  if (!workout) {
    container.innerHTML = `
      <div class="view-enter state-container">
        <h2 class="state-title">Workout Not Found</h2>
        <p class="state-description">The requested workout routine is unavailable.</p>
        <a href="#workouts" class="btn btn-primary btn-sm">&larr; Return to Workouts</a>
      </div>
    `;
    return;
  }

  // 2. Session Initialization or Seamless Reload Recovery
  let session = WorkoutSession.recoverActiveSession();
  if (!session || session.workoutId !== workout.id) {
    session = new WorkoutSession(workout, {
      plannedSessionId: workout.plannedSessionId || null,
      planId: workout.planId || null,
      planVersion: workout.planVersion || '1.0',
      isAdaptive: Boolean(workout.isGenerated)
    });
  }

  // Local component staging state
  let currentLoggedReps = 12;
  let currentLoggedWeight = 0;
  let unsubscribeSession = null;
  let lastAnnouncedSecond = -1;

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const remaining = (s % 60).toString().padStart(2, '0');
    return `${m}:${remaining}`;
  }

  function updateLocalLoggedValues(step) {
    if (!step || step.type !== 'work') return;
    const targetR = typeof step.targetReps === 'number'
      ? step.targetReps
      : parseInt(step.targetReps, 10) || 12;

    currentLoggedReps = step.loggedReps !== null && step.loggedReps !== undefined
      ? step.loggedReps
      : targetR;

    currentLoggedWeight = step.loggedWeight !== null && step.loggedWeight !== undefined
      ? step.loggedWeight
      : (step.equipment && (step.equipment.includes('dumbbell') || step.equipment.includes('barbell') || step.equipment.includes('kettlebell')) ? 10 : 0);
  }

  // 3. Render Master Layout
  function render() {
    const snapshot = session.getSnapshot();
    const currentStep = snapshot.currentStep;
    const nextWorkStep = snapshot.nextWorkStep;
    const remainingSec = snapshot.remainingSec;
    const isPaused = snapshot.status === 'paused';
    const isResting = snapshot.status === 'resting';
    const isCompleted = snapshot.status === 'completed';

    // Audio countdown check
    if ((snapshot.status === 'active' || isResting) && remainingSec <= 3 && remainingSec > 0 && remainingSec !== lastAnnouncedSecond) {
      lastAnnouncedSecond = remainingSec;
      audioCues.playCountdown();
    } else if (remainingSec === 0 && lastAnnouncedSecond === 1) {
      lastAnnouncedSecond = 0;
      audioCues.playTransition();
    }

    // ----------------------------------------------------
    // COMPLETED WORKOUT SUMMARY VIEW
    // ----------------------------------------------------
    if (isCompleted) {
      audioCues.playFinish();
      const summaryDuration = Math.max(1, Math.round(snapshot.totalElapsedSec / 60));
      const estCal = workout.estimatedCalories || 220;

      container.innerHTML = `
        <div class="view-enter" style="max-width: 600px; margin: 0 auto; padding-bottom: var(--space-8);">
          <div class="card player-completion-card">
            <div class="player-completion-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>

            <span class="badge badge-success" style="margin-bottom: var(--space-2);">WORKOUT COMPLETED</span>
            <h1 class="text-h1" style="margin-bottom: var(--space-2);">${workout.title}</h1>
            <p class="text-body" style="color: var(--color-text-secondary); margin-bottom: var(--space-5);">
              Outstanding effort! Your workout volume, calories, and adherence have been recorded.
            </p>

            <!-- Metrics Grid -->
            <div class="grid grid-cols-3 gap-3" style="margin-bottom: var(--space-5);">
              <div class="card" style="padding: var(--space-3); background: var(--color-surface-secondary); border: none;">
                <span class="text-caption text-muted">TIME</span>
                <div class="text-h2" style="margin-top: 2px;">${summaryDuration}m</div>
              </div>
              <div class="card" style="padding: var(--space-3); background: var(--color-surface-secondary); border: none;">
                <span class="text-caption text-muted">SETS</span>
                <div class="text-h2" style="margin-top: 2px; color: var(--color-primary);">${snapshot.completedWorkSets} / ${snapshot.totalWorkSets}</div>
              </div>
              <div class="card" style="padding: var(--space-3); background: var(--color-surface-secondary); border: none;">
                <span class="text-caption text-muted">ENERGY</span>
                <div class="text-h2" style="margin-top: 2px; color: var(--color-success);">~${estCal} cal</div>
              </div>
            </div>

            <!-- Completed Sets Breakdown -->
            <div style="text-align: left; margin-bottom: var(--space-6);">
              <h3 class="text-label" style="margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.05em;">Performance Log:</h3>
              <div class="card" style="padding: 0; overflow: hidden; border-color: var(--color-border-subtle);">
                ${snapshot.completedLogs.map((log, i) => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-size: 13px; ${i > 0 ? 'border-top: 1px solid var(--color-border-subtle);' : ''}">
                    <div>
                      <strong>${log.exerciseName}</strong>
                      <span class="text-muted">&bull; Set ${log.setNumber}</span>
                    </div>
                    <div style="font-weight: 600; color: var(--color-primary);">
                      ${log.loggedReps} reps ${log.loggedWeight ? `@ ${log.loggedWeight} ${weightUnit}` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Post Workout Navigation -->
            <div style="display: flex; gap: var(--space-3); flex-direction: column;">
              <a href="#progress" class="btn btn-primary btn-lg" id="btn-finish-go-progress">
                View in Progress & Stats &rarr;
              </a>
              <a href="#workouts" class="btn btn-secondary btn-md">
                Done — Return to Workouts
              </a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // ----------------------------------------------------
    // REST STATE VIEW
    // ----------------------------------------------------
    if (isResting && currentStep) {
      container.innerHTML = `
        <div class="view-enter" style="max-width: 600px; margin: 0 auto;">
          <!-- Top Session Status Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
            <button class="btn btn-ghost btn-sm" id="btn-player-exit" aria-label="Exit session">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Exit
            </button>
            <span class="badge badge-primary">${workout.title}</span>
            <button class="btn btn-ghost btn-sm btn-icon" id="btn-toggle-audio" aria-label="Toggle Sound Effects">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${audioCues.enabled
                  ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>'
                  : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'
                }
              </svg>
            </button>
          </div>

          <!-- Overall Routine Progress Bar -->
          <div class="progress-track" style="height: 6px; margin-bottom: var(--space-4);" aria-label="Workout Progress">
            <div class="progress-fill" style="width: ${snapshot.progressPercent}%;"></div>
          </div>

          <div class="player-container">
            <div class="player-rest-stage">
              <span class="badge player-rest-badge">REST & RECOVERY</span>
              <div class="player-timer-display" id="player-rest-timer">
                ${formatTime(remainingSec)}
              </div>
              <p class="text-body-sm" style="color: var(--color-text-secondary); margin-bottom: var(--space-4);">
                Breathe deeply through nose and prepare for the next effort.
              </p>

              <!-- Up Next Preview Card -->
              <div class="player-next-up-card">
                <span class="text-caption text-muted" style="text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;">UP NEXT:</span>
                <div class="text-h2" style="margin: 4px 0 2px;">
                  ${currentStep.nextExerciseName || (nextWorkStep ? nextWorkStep.exerciseName : 'Next Movement')}
                </div>
                <div class="text-body-sm" style="color: var(--color-text-secondary);">
                  Set ${currentStep.nextSetNumber || (nextWorkStep ? nextWorkStep.setNumber : 1)} of ${currentStep.nextTotalSets || (nextWorkStep ? nextWorkStep.totalSets : 3)}
                  ${currentStep.nextPrimaryMuscle ? `&bull; ${currentStep.nextPrimaryMuscle}` : ''}
                </div>
              </div>

              <!-- Primary Skip Rest CTA -->
              <div style="display: flex; gap: var(--space-3); width: 100%; max-width: 440px;">
                <button class="btn btn-primary btn-lg" id="btn-skip-rest" style="flex: 1;" aria-label="Skip Rest Period">
                  Skip Rest & Start &rarr;
                </button>
                <button class="btn btn-secondary btn-lg btn-icon" id="btn-player-playpause" aria-label="${isPaused ? 'Resume Rest' : 'Pause Rest'}">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    ${isPaused ? '<polygon points="5 3 19 12 5 21 5 3"></polygon>' : '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      attachRestControls();
      return;
    }

    // ----------------------------------------------------
    // ACTIVE WORK STATE VIEW
    // ----------------------------------------------------
    if (!currentStep) return;

    const currentEx = getExerciseById(currentStep.exerciseId) || {
      name: currentStep.exerciseName,
      movementPattern: 'squat',
      primaryMuscles: ['core'],
      instructions: currentStep.instructions || []
    };

    updateLocalLoggedValues(currentStep);

    const isTimed = currentStep.exerciseType === 'timed';
    const primaryMuscle = currentEx.primaryMuscles && currentEx.primaryMuscles[0]
      ? currentEx.primaryMuscles[0].toUpperCase()
      : 'FULL BODY';

    container.innerHTML = `
      <div class="view-enter" style="max-width: 600px; margin: 0 auto; padding-bottom: var(--space-8);">
        <!-- Top Session Status Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
          <button class="btn btn-ghost btn-sm" id="btn-player-exit" aria-label="Exit session">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Exit
          </button>
          <span class="badge badge-primary">${workout.title}</span>
          <button class="btn btn-ghost btn-sm btn-icon" id="btn-toggle-audio" aria-label="Toggle Sound Effects">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${audioCues.enabled
                ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>'
                : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'
              }
            </svg>
          </button>
        </div>

        <!-- Routine Progress Bar -->
        <div class="progress-track" style="height: 6px; margin-bottom: var(--space-4);" aria-label="Routine Progress">
          <div class="progress-fill" style="width: ${snapshot.progressPercent}%;"></div>
        </div>

        <!-- Main Player Card Container -->
        <div class="player-container">
          <!-- Movement Visualization Stage -->
          ${renderExerciseMedia(currentEx, { showCues: true })}

          <!-- Exercise Details & Action Panel -->
          <div style="padding: var(--space-5) var(--space-4); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2); flex-wrap: wrap; justify-content: center;">
              <span class="badge badge-primary" id="player-current-badge">
                Set ${currentStep.setNumber} of ${currentStep.totalSets}
              </span>
              <span class="badge">
                ${primaryMuscle}
              </span>
              ${currentStep.stage === 'warmup' ? '<span class="badge badge-warning">Warmup</span>' : currentStep.stage === 'cooldown' ? '<span class="badge badge-info">Cooldown</span>' : ''}
            </div>

            <h2 class="text-h1" id="player-current-title" style="margin-bottom: var(--space-1);">${currentStep.exerciseName}</h2>

            <!-- Countdown Timer or Target Reps -->
            <div class="player-timer-display" id="player-timer-text" aria-live="polite">
              ${isTimed ? formatTime(remainingSec) : `${currentLoggedReps} REPS`}
            </div>

            ${!isTimed ? `
              <!-- Performance Steppers for Reps and Weight -->
              <div class="player-perf-strip">
                <div>
                  <span class="text-caption text-muted" style="display: block; margin-bottom: 2px;">REPS COMPLETED</span>
                  <div class="player-perf-stepper">
                    <button type="button" class="player-perf-btn" id="btn-rep-minus" aria-label="Decrease reps">&minus;</button>
                    <span class="player-perf-value" id="val-logged-reps">${currentLoggedReps}</span>
                    <button type="button" class="player-perf-btn" id="btn-rep-plus" aria-label="Increase reps">&plus;</button>
                  </div>
                </div>

                ${currentStep.equipment && (currentStep.equipment.includes('dumbbell') || currentStep.equipment.includes('barbell') || currentStep.equipment.includes('kettlebell')) ? `
                  <div>
                    <span class="text-caption text-muted" style="display: block; margin-bottom: 2px;">WEIGHT (${weightUnit.toUpperCase()})</span>
                    <div class="player-perf-stepper">
                      <button type="button" class="player-perf-btn" id="btn-weight-minus" aria-label="Decrease weight">&minus;</button>
                      <span class="player-perf-value" id="val-logged-weight">${currentLoggedWeight} ${weightUnit}</span>
                      <button type="button" class="player-perf-btn" id="btn-weight-plus" aria-label="Increase weight">&plus;</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Primary Action Button: Complete Set (thumb zone) -->
            <div style="width: 100%; max-width: 440px; margin: var(--space-3) 0;">
              <button class="btn btn-primary btn-lg" id="btn-player-complete-set" style="width: 100%;" aria-label="Complete current set">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 6px;"><polyline points="20 6 9 17 4 12"/></svg>
                Complete Set
              </button>
            </div>

            <!-- Controls Row: Prev, Play/Pause, Skip -->
            <div class="player-controls-row">
              <button class="btn btn-secondary btn-icon btn-lg" id="btn-player-prev" ${snapshot.currentStepIndex <= 0 ? 'disabled' : ''} aria-label="Previous Exercise">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
              </button>

              <button class="btn btn-secondary btn-icon btn-lg" id="btn-player-playpause" aria-label="${isPaused ? 'Resume Interval' : 'Pause Interval'}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  ${isPaused ? '<polygon points="5 3 19 12 5 21 5 3"></polygon>' : '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'}
                </svg>
              </button>

              <button class="btn btn-secondary btn-icon btn-lg" id="btn-player-skip" aria-label="Skip Set">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
              </button>
            </div>

            <!-- Next Exercise Hint -->
            <div class="card" id="player-next-preview" style="padding: var(--space-2) var(--space-4); background-color: var(--color-surface-secondary); border: none; margin-top: var(--space-2); font-size: var(--font-size-body-sm); border-radius: var(--radius-pill);">
              Next: <strong>${nextWorkStep ? nextWorkStep.exerciseName : 'Finish Routine'}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    attachWorkControls();
  }

  // 4. Attach Work Controls
  function attachWorkControls() {
    // Exit button
    const exitBtn = container.querySelector('#btn-player-exit');
    if (exitBtn) exitBtn.addEventListener('click', showExitModal);

    // Audio toggle
    const audioBtn = container.querySelector('#btn-toggle-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        audioCues.enabled = !audioCues.enabled;
        render();
      });
    }

    // Complete Set
    const completeBtn = container.querySelector('#btn-player-complete-set');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        session.completeCurrentSet({
          reps: currentLoggedReps,
          weight: currentLoggedWeight,
          durationSec: session.getCurrentStep() ? session.getCurrentStep().targetDurationSec : 30
        });
      });
    }

    // Steppers for Reps
    const repMinus = container.querySelector('#btn-rep-minus');
    const repPlus = container.querySelector('#btn-rep-plus');
    const repVal = container.querySelector('#val-logged-reps');
    if (repMinus && repPlus) {
      repMinus.addEventListener('click', () => {
        if (currentLoggedReps > 1) {
          currentLoggedReps--;
          if (repVal) repVal.textContent = currentLoggedReps;
          const timerText = container.querySelector('#player-timer-text');
          if (timerText) timerText.textContent = `${currentLoggedReps} REPS`;
        }
      });
      repPlus.addEventListener('click', () => {
        currentLoggedReps++;
        if (repVal) repVal.textContent = currentLoggedReps;
        const timerText = container.querySelector('#player-timer-text');
        if (timerText) timerText.textContent = `${currentLoggedReps} REPS`;
      });
    }

    // Steppers for Weight
    const wMinus = container.querySelector('#btn-weight-minus');
    const wPlus = container.querySelector('#btn-weight-plus');
    const wVal = container.querySelector('#val-logged-weight');
    if (wMinus && wPlus) {
      wMinus.addEventListener('click', () => {
        if (currentLoggedWeight > 0) {
          currentLoggedWeight = Math.max(0, currentLoggedWeight - 2.5);
          if (wVal) wVal.textContent = `${currentLoggedWeight} ${weightUnit}`;
        }
      });
      wPlus.addEventListener('click', () => {
        currentLoggedWeight += 2.5;
        if (wVal) wVal.textContent = `${currentLoggedWeight} ${weightUnit}`;
      });
    }

    // Play/Pause
    const playPauseBtn = container.querySelector('#btn-player-playpause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        session.togglePlayPause();
      });
    }

    // Skip
    const skipBtn = container.querySelector('#btn-player-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        session.skipStep();
      });
    }

    // Previous
    const prevBtn = container.querySelector('#btn-player-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        session.previousStep();
      });
    }
  }

  // 5. Attach Rest Controls
  function attachRestControls() {
    const exitBtn = container.querySelector('#btn-player-exit');
    if (exitBtn) exitBtn.addEventListener('click', showExitModal);

    const audioBtn = container.querySelector('#btn-toggle-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        audioCues.enabled = !audioCues.enabled;
        render();
      });
    }

    const skipRestBtn = container.querySelector('#btn-skip-rest');
    if (skipRestBtn) {
      skipRestBtn.addEventListener('click', () => {
        session.skipRest();
      });
    }

    const playPauseBtn = container.querySelector('#btn-player-playpause');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        session.togglePlayPause();
      });
    }
  }

  // 6. Exit Confirmation Modal
  function showExitModal() {
    session.pause();

    const existing = document.querySelector('#player-exit-modal');
    if (existing) existing.remove();

    const modalHtml = `
      <div class="modal-backdrop is-active" id="player-exit-modal" role="dialog" aria-modal="true" aria-labelledby="modal-exit-title">
        <div class="modal-card view-enter" style="max-width: 440px; text-align: center; padding: var(--space-6);">
          <div style="width: 52px; height: 52px; border-radius: var(--radius-pill); background: rgba(255, 84, 46, 0.12); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 id="modal-exit-title" class="text-h2" style="margin-bottom: var(--space-2);">Pause or Exit Workout?</h2>
          <p class="text-body-sm" style="color: var(--color-text-secondary); margin-bottom: var(--space-5);">
            Your completed sets will be preserved in your training history. You can resume anytime or conclude today's session.
          </p>

          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <button class="btn btn-primary btn-lg" id="btn-modal-resume" style="width: 100%;">
              Resume Session
            </button>
            <button class="btn btn-secondary" id="btn-modal-save-exit" style="width: 100%;">
              Save Partial & Exit
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.querySelector('#player-exit-modal');
    const resumeBtn = modalEl.querySelector('#btn-modal-resume');
    const exitSaveBtn = modalEl.querySelector('#btn-modal-save-exit');

    const closeModal = () => {
      modalEl.remove();
      session.resume();
    };

    resumeBtn.addEventListener('click', closeModal);
    exitSaveBtn.addEventListener('click', () => {
      modalEl.remove();
      session.abandonSession();
      window.location.hash = `#workout/${workout.id}`;
    });
  }

  // 7. Keyboard Navigation (Accessibility)
  function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (session.status === 'resting') {
        session.skipRest();
      } else {
        session.completeCurrentSet({
          reps: currentLoggedReps,
          weight: currentLoggedWeight
        });
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (session.status === 'resting') {
        session.skipRest();
      } else {
        session.skipStep();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      session.previousStep();
    } else if (e.key === 'Escape') {
      showExitModal();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  // 8. Subscribe to Session Updates
  unsubscribeSession = session.subscribe(() => {
    // Check if view is still mounted
    if (!document.body.contains(container)) {
      if (unsubscribeSession) unsubscribeSession();
      document.removeEventListener('keydown', handleKeyDown);
      return;
    }
    render();
  });

  // Cleanup on hash change
  const hashHandler = () => {
    if (!window.location.hash.startsWith('#player/')) {
      if (unsubscribeSession) unsubscribeSession();
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', hashHandler);
    }
  };
  window.addEventListener('hashchange', hashHandler);

  // Start workout if ready
  if (session.status === 'ready') {
    session.start();
  } else {
    render();
  }
}
