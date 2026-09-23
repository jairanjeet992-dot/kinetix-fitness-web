/**
 * WORKOUT PLAYER PREVIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { getWorkoutById } from '../data/workouts.js';
import { getExerciseById, getExercisePlaceholderSvg } from '../data/exercises.js';

export function renderWorkoutPlayer(container, workoutId) {
  const workout = getWorkoutById(workoutId) || getWorkoutById('metabolic-ignition');
  const exercises = workout.exerciseIds.map(id => getExerciseById(id)).filter(Boolean);

  let currentExIndex = 0;
  let isPaused = false;
  let remainingSec = exercises[0] ? exercises[0].defaultDurationSec : 40;
  let timerInterval = null;

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isPaused && remainingSec > 0) {
        remainingSec--;
        updateTimerDisplay();
      } else if (remainingSec <= 0) {
        // Auto advance in preview
        advanceExercise();
      }
    }, 1000);
    if (timerInterval && typeof timerInterval.unref === 'function') {
      timerInterval.unref();
    }
  }

  function updateTimerDisplay() {
    const timerText = container.querySelector('#player-timer-text');
    if (timerText) {
      timerText.textContent = formatTime(remainingSec);
    }
  }

  function advanceExercise() {
    if (currentExIndex < exercises.length - 1) {
      currentExIndex++;
      remainingSec = exercises[currentExIndex].defaultDurationSec;
      updateExerciseUI();
    } else {
      // Completed all
      clearInterval(timerInterval);
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Workout complete! Great effort today.'
        });
      }
      window.location.hash = `#workout/${workout.id}`;
    }
  }

  function updateExerciseUI() {
    const currentEx = exercises[currentExIndex];
    const nextEx = exercises[currentExIndex + 1];

    const titleEl = container.querySelector('#player-current-title');
    const badgeEl = container.querySelector('#player-current-badge');
    const instructionsEl = container.querySelector('#player-current-instructions');
    const nextEl = container.querySelector('#player-next-preview');
    const progressBar = container.querySelector('#player-overall-progress');

    if (titleEl) titleEl.textContent = currentEx.name;
    if (badgeEl) badgeEl.textContent = `Exercise ${currentExIndex + 1} of ${exercises.length} &bull; ${currentEx.primaryMuscle}`;
    if (instructionsEl) instructionsEl.textContent = currentEx.instructions;

    if (nextEl) {
      nextEl.innerHTML = nextEx
        ? `Next: <strong>${nextEx.name}</strong> (${nextEx.defaultReps})`
        : `<strong>Final Exercise!</strong> Push through to finish.`;
    }

    if (progressBar) {
      const pct = Math.round(((currentExIndex) / exercises.length) * 100);
      progressBar.style.width = `${pct}%`;
    }

    updateTimerDisplay();
  }

  const currentEx = exercises[currentExIndex];

  container.innerHTML = `
    <div class="view-enter">
      <!-- Player Navigation Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
        <button class="btn btn-ghost btn-sm" id="btn-player-exit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          Exit Session
        </button>
        <span class="badge badge-primary">${workout.title}</span>
        <span class="badge badge-success">Preview Mode</span>
      </div>

      <!-- Overall Routine Progress Bar -->
      <div class="progress-track" style="height: 6px; margin-bottom: var(--space-4);">
        <div id="player-overall-progress" class="progress-fill" style="width: 10%;"></div>
      </div>

      <!-- Player Main Card Container -->
      <div class="player-container">
        <!-- Media Demonstration Stage -->
        <div class="player-media-stage">
          ${getExercisePlaceholderSvg(currentEx.svgType)}
          <div class="text-caption" style="color: rgba(255, 255, 255, 0.7); letter-spacing: 0.05em; text-transform: uppercase;">
            Interactive Movement Visual Stage
          </div>
          <span class="badge badge-dark" style="margin-top: var(--space-2); background: rgba(255, 255, 255, 0.15); color: #FFF;">
            Form Cue: Keep core braced and spine neutral
          </span>
        </div>

        <!-- Exercise Info & Countdown -->
        <div style="padding: var(--space-6); text-align: center; display: flex; flex-direction: column; align-items: center;">
          <span class="badge badge-primary" id="player-current-badge" style="margin-bottom: var(--space-2);">
            Exercise 1 of ${exercises.length} &bull; ${currentEx.primaryMuscle}
          </span>
          <h2 class="text-h1" id="player-current-title">${currentEx.name}</h2>
          <p class="text-body-sm" id="player-current-instructions" style="max-width: 500px; margin-top: 4px; color: var(--color-text-secondary);">
            ${currentEx.instructions}
          </p>

          <!-- Large Countdown Display -->
          <div class="player-timer-display" id="player-timer-text">
            ${formatTime(remainingSec)}
          </div>

          <!-- Next Exercise Indicator -->
          <div class="card" id="player-next-preview" style="padding: var(--space-2) var(--space-4); background-color: var(--color-surface-secondary); border: none; margin-bottom: var(--space-4); font-size: var(--font-size-body-sm); border-radius: var(--radius-pill);">
            Next: <strong>${exercises[1] ? exercises[1].name : 'Finish'}</strong>
          </div>

          <!-- Controls Bar -->
          <div class="player-controls-row">
            <button class="btn btn-secondary btn-icon btn-lg" id="btn-player-prev" aria-label="Previous Exercise">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
            </button>

            <button class="btn btn-primary btn-icon" id="btn-player-playpause" aria-label="Play or Pause" style="width: 64px; height: 64px;">
              <svg id="icon-playpause" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            </button>

            <button class="btn btn-secondary btn-icon btn-lg" id="btn-player-skip" aria-label="Skip to Next Exercise">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
            </button>
          </div>

          <div class="text-caption text-muted">
            Tap Skip to preview next interval &bull; Play/Pause to control preview timer
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach controls
  const playPauseBtn = container.querySelector('#btn-player-playpause');
  const playPauseIcon = container.querySelector('#icon-playpause');
  playPauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
      playPauseIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
      if (window.showToast) {
        window.showToast({ type: 'info', message: 'Timer paused' });
      }
    } else {
      playPauseIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
      if (window.showToast) {
        window.showToast({ type: 'info', message: 'Timer resumed' });
      }
    }
  });

  const skipBtn = container.querySelector('#btn-player-skip');
  skipBtn.addEventListener('click', () => {
    advanceExercise();
  });

  const prevBtn = container.querySelector('#btn-player-prev');
  prevBtn.addEventListener('click', () => {
    if (currentExIndex > 0) {
      currentExIndex--;
      remainingSec = exercises[currentExIndex].defaultDurationSec;
      updateExerciseUI();
    }
  });

  const exitBtn = container.querySelector('#btn-player-exit');
  exitBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    window.location.hash = `#workout/${workout.id}`;
  });

  // Start preview interval countdown
  startTimer();

  // Clean up interval if user navigates away
  window.addEventListener('hashchange', () => {
    clearInterval(timerInterval);
  }, { once: true });
}
