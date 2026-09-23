/**
 * WORKOUT DETAIL VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { getWorkoutById } from '../data/workouts.js';
import { getExerciseById } from '../data/exercises.js';

export function renderWorkoutDetail(container, workoutId) {
  const workout = getWorkoutById(workoutId) || getWorkoutById('metabolic-ignition');

  if (!workout) {
    container.innerHTML = `
      <div class="view-enter state-container">
        <h2 class="state-title">Workout Not Found</h2>
        <p class="state-description">The requested workout does not exist or may have been removed.</p>
        <a href="#workouts" class="btn btn-primary btn-sm">&larr; Back to Workouts</a>
      </div>
    `;
    return;
  }

  // Resolve full exercise records
  const exercises = workout.exerciseIds.map(id => getExerciseById(id)).filter(Boolean);

  container.innerHTML = `
    <div class="view-enter">
      <!-- Back Navigation Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
        <a href="#workouts" class="btn btn-ghost btn-sm" id="detail-back-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Workouts
        </a>
        <span class="badge badge-primary">${workout.category}</span>
      </div>

      <!-- Hero Header Card -->
      <article class="card" style="margin-bottom: var(--space-5); overflow: hidden; padding: 0;">
        <div class="workout-card-visual" style="aspect-ratio: 21 / 9; max-height: 220px;">
          <div class="workout-visual-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="48" height="48">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
            </svg>
            <span class="text-caption">Dynamic Exercise Flow Demonstration</span>
          </div>
          <span class="workout-card-duration-badge" style="bottom: 12px; right: 12px;">${workout.durationMin} MIN</span>
        </div>

        <div style="padding: var(--space-6);">
          <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2); flex-wrap: wrap;">
            <span class="badge">${workout.difficulty}</span>
            <span class="badge">${workout.equipment}</span>
            <span class="badge badge-success">${workout.rounds} Rounds</span>
          </div>

          <h1 class="text-h1" style="margin-bottom: var(--space-2);">${workout.title}</h1>
          <p class="text-body-lg" style="margin-bottom: var(--space-5); max-width: 680px;">${workout.description}</p>

          <!-- Core Metric Badges Strip -->
          <div class="grid grid-cols-2 grid-tablet-4 gap-3" style="margin-bottom: var(--space-5);">
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">DURATION</span>
              <div class="text-h3" style="margin-top: 2px;">${workout.durationMin} Min</div>
            </div>
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">CALORIES</span>
              <div class="text-h3" style="margin-top: 2px;">~${workout.estimatedCalories} kcal</div>
            </div>
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">EXERCISES</span>
              <div class="text-h3" style="margin-top: 2px;">${exercises.length} Movements</div>
            </div>
            <div class="card" style="padding: var(--space-3); text-align: center; background-color: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">REST INTERVAL</span>
              <div class="text-h3" style="margin-top: 2px;">${workout.restBetweenExercisesSec}s</div>
            </div>
          </div>

          <!-- Target Muscles -->
          <div style="margin-bottom: var(--space-5);">
            <span class="text-label" style="display: block; margin-bottom: var(--space-2);">Target Muscle Groups:</span>
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              ${workout.targetMuscles.map(m => `<span class="chip is-active" style="cursor: default;">${m}</span>`).join('')}
            </div>
          </div>

          <!-- Start Workout Action -->
          <div class="session-actions">
            <a href="#player/${workout.id}" class="btn btn-primary btn-lg" id="btn-start-workout-detail">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Start Workout
            </a>
            <button class="btn btn-secondary btn-lg" id="btn-bookmark-workout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Save to Favorites
            </button>
          </div>
        </div>
      </article>

      <!-- Exercise Sequence Preview -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <div>
            <h2 class="section-title">Exercise Sequence</h2>
            <p class="section-subtitle">${workout.rounds} complete rounds &bull; ${workout.restBetweenExercisesSec}s transition rest</p>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          ${exercises.map((ex, index) => `
            <div class="exercise-card">
              <div class="exercise-thumb" style="background-color: var(--color-surface-secondary);">
                <span style="font-weight: 700; color: var(--color-primary); font-size: 1.125rem;">${index + 1}</span>
              </div>
              <div class="exercise-info">
                <div class="exercise-name">${ex.name}</div>
                <div class="exercise-details">
                  <strong>${ex.defaultReps}</strong> &bull; Primary: ${ex.primaryMuscle} &bull; ${ex.equipment}
                </div>
                <div class="text-caption text-muted" style="margin-top: 4px; line-height: 1.3;">
                  ${ex.instructions}
                </div>
              </div>
              <div class="exercise-action">
                <span class="badge">${ex.difficulty}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  // Bookmark button toast trigger
  const bookmarkBtn = container.querySelector('#btn-bookmark-workout');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: `Saved "${workout.title}" to your saved routines.`
        });
      }
    });
  }
}
