/**
 * WORKOUT DETAIL VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { getWorkoutById } from '../data/workouts.js';
import { getExerciseById } from '../data/exercises.js';
import { formatWeight } from '../analytics/performance-tracker.js';
import { getProfile } from '../state/profile.js';
import { showExerciseDetailModal } from '../components/exercise-media.js';
import { resolveExerciseWithCoachMedia } from '../data/coach-system.js';

export function renderWorkoutDetail(container, workoutId) {
  const profile = getProfile();
  const userUnit = (profile.unit || 'kg').toLowerCase();
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

  // Resolve full exercise records, preserving any attached adaptive parameters and linking Coach Kai metadata
  const exercises = (workout.exerciseIds || []).map(id => {
    const fromRoutine = Array.isArray(workout.exercises)
      ? workout.exercises.find(e => (typeof e === 'object' && e.id === id))
      : null;
    const base = getExerciseById(id);
    if (!base) return null;
    const merged = fromRoutine ? { ...base, ...fromRoutine } : base;
    return resolveExerciseWithCoachMedia(merged);
  }).filter(Boolean);

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
            ${workout.adaptation && workout.adaptation.applied ? `
              <span class="badge" style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.4); font-weight: 600;">ADAPTED</span>
            ` : ''}
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

          <!-- Adaptive Training Intelligence Insight Banner -->
          ${workout.adaptation && workout.adaptation.applied ? `
            <div class="card" style="background: rgba(46, 204, 113, 0.06); border-color: rgba(46, 204, 113, 0.35); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-5); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #2ecc71;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Adaptive Calibration Insights
                </div>
                <span class="badge" style="background: rgba(46, 204, 113, 0.2); color: #2ecc71; font-size: 10px;">${workout.adaptation.status}</span>
              </div>
              <ul style="margin: 0; padding-left: 18px; color: var(--color-text-secondary); font-size: var(--font-size-body-sm); line-height: 1.45;">
                ${workout.adaptation.reasons.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

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
            <div class="exercise-card card-interactive" data-exercise-id="${ex.id}" role="button" tabindex="0" aria-label="View movement demonstration and form cues for ${ex.name}">
              <div class="exercise-thumb" style="background-color: var(--color-surface-secondary);">
                <span style="font-weight: 700; color: var(--color-primary); font-size: 1.125rem;">${index + 1}</span>
              </div>
              <div class="exercise-info">
                <div class="exercise-name" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span>${ex.name}</span>
                  ${ex.coach ? `
                    <span class="badge" style="background: rgba(255, 84, 46, 0.12); color: var(--color-primary); font-size: 10px; padding: 1px 6px;">
                      Coach Kai
                    </span>
                  ` : ''}
                  ${ex.targetWeightKg ? `
                    <span class="badge" style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.4); font-size: 11px;">
                      Target: ${formatWeight(ex.targetWeightKg, userUnit)}
                    </span>
                  ` : ''}
                </div>
                <div class="exercise-details">
                  <strong>${ex.targetReps || ex.defaultReps}</strong> &bull; Primary: ${ex.primaryMuscle} &bull; ${ex.equipment}
                </div>
                <div class="text-caption text-muted" style="margin-top: 4px; line-height: 1.3;">
                  ${Array.isArray(ex.instructions) ? (ex.instructions[0] || '') : (ex.instructions || '')}
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

  // Attach card click listeners to open detail modal
  container.querySelectorAll('.exercise-card[data-exercise-id]').forEach(card => {
    const openModal = () => {
      const exId = card.getAttribute('data-exercise-id');
      const exObj = exercises.find(e => e.id === exId);
      if (exObj) {
        showExerciseDetailModal(exObj);
      }
    };
    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
  });

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
