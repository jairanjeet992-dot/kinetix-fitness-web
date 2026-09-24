/**
 * HOME VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { WORKOUTS, getFeaturedWorkout, getRecommendedWorkouts, registerGeneratedWorkout } from '../data/workouts.js';
import { WEEKLY_PLAN } from '../data/plans.js';
import { getProfile } from '../state/profile.js';
import { generateWorkout } from '../engine/workout-generator.js';
import { getActiveSession, clearActiveSession } from '../state/workout-session.js';

let currentVariationSeed = 0;

export function renderHome(container) {
  const profile = getProfile();
  const recommended = getRecommendedWorkouts().slice(0, 3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const userName = profile.name || 'Athlete';
  const userInitials = userName.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase() || 'A';

  // Generate today's personalized session from workout engine
  const generatedResult = generateWorkout(profile, currentVariationSeed);
  let todayWorkout = null;
  if (generatedResult.ok) {
    todayWorkout = generatedResult;
    registerGeneratedWorkout(todayWorkout);
  } else {
    // Graceful fallback to static featured if engine cannot generate
    todayWorkout = getFeaturedWorkout();
  }

  // Personalized preview titles
  const planTitles = {
    'Build Muscle': 'Your muscle-building plan',
    'Lose Fat': 'Your fat-loss plan',
    'Get Stronger': 'Your strength-building plan',
    'Improve Endurance': 'Your endurance plan',
    'Improve Fitness': 'Your conditioning plan',
    'Stay Active': 'Your active lifestyle plan'
  };
  const planTitle = planTitles[profile.goal] || `${profile.goal} plan`;

  const focusText = Array.isArray(profile.focusAreas) && profile.focusAreas.length > 0
    ? (profile.focusAreas.includes('Full Body') ? 'Full Body' : `${profile.focusAreas.join(' & ')} focused`)
    : 'Full Body';
  const durationText = `${todayWorkout.durationMin || todayWorkout.durationMinutes || 30} min session`;
  const activeSession = getActiveSession();
  const hasActiveSession = activeSession && !activeSession.isCompleted;

  container.innerHTML = `
    <div class="view-enter">
      <!-- Top Greeting & Athlete Status -->
      <div class="home-greeting-bar">
        <div>
          <div class="text-caption text-muted">${greeting},</div>
          <h1 class="text-h1" style="margin-top: 2px;">${userName}</h1>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <div class="badge badge-primary" style="padding: 6px 12px; font-weight: 600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.5 4 4.5 6 4.5 10a4.5 4.5 0 0 1-9 0c0-4 3-6 4.5-10z"/></svg>
            ${WEEKLY_PLAN.currentStreakDays} Day Streak
          </div>
          <a href="#profile" class="home-user-avatar" aria-label="Go to Profile">
            ${userInitials}
          </a>
        </div>
      </div>

      <!-- Incomplete Workout Session Recovery Banner -->
      ${hasActiveSession ? `
        <section class="card" style="background: linear-gradient(135deg, rgba(255, 84, 46, 0.12) 0%, rgba(255, 84, 46, 0.04) 100%); border: 1px solid var(--color-primary); padding: var(--space-4) var(--space-5); margin-bottom: var(--space-5); border-radius: var(--radius-lg);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3);">
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px;">
                <span class="badge badge-warning">IN PROGRESS</span>
                <span class="text-caption text-muted">Session paused</span>
              </div>
              <h3 class="text-h3" style="color: var(--color-text-primary); margin-bottom: 2px;">
                Resume "${activeSession.workoutTitle}"?
              </h3>
              <div class="text-body-sm" style="color: var(--color-text-secondary);">
                Progress: Exercise ${activeSession.currentExerciseIndex + 1} &bull; Set ${activeSession.currentSet} of ${activeSession.totalSets}
              </div>
            </div>
            <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;">
              <a href="#player/${activeSession.workoutId}" class="btn btn-primary btn-sm" id="btn-resume-session">
                Resume Workout &rarr;
              </a>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-discard-session" style="color: var(--color-text-secondary);">
                Discard
              </button>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- Primary Action: Today's Workout Hero Card -->
      <section class="today-hero-card" id="today-hero-section" aria-labelledby="today-workout-title">
        ${!generatedResult.ok ? `
          <div class="card" style="background: rgba(255, 84, 46, 0.08); border-color: var(--color-primary); padding: var(--space-5); margin-bottom: var(--space-4);">
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); color: var(--color-primary); font-weight: 600;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Equipment Configuration Required</span>
            </div>
            <p class="text-body-sm" style="color: var(--color-text-secondary); margin-bottom: var(--space-4);">
              ${generatedResult.error}
            </p>
            <a href="#onboarding/edit" class="btn btn-primary btn-sm">Update Equipment in Profile &rarr;</a>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
            <span class="badge badge-primary">TODAY'S SESSION</span>
            <span class="badge" style="background: rgba(255,255,255,0.08);">${planTitle}</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-regenerate-workout" aria-label="Regenerate routine with alternative exercises" style="padding: 4px 10px; font-size: 13px; color: var(--color-text-secondary);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Try Another
          </button>
        </div>

        <h2 id="today-workout-title" class="text-h1" style="margin-bottom: var(--space-2); color: var(--color-text-primary);">
          ${todayWorkout.title}
        </h2>
        <p class="text-body" style="margin-bottom: var(--space-4); max-width: 540px;">
          ${focusText} sessions calibrated for ${(profile.fitnessLevel || 'intermediate').toLowerCase()} intensity &bull; ${durationText}.
        </p>

        <!-- "Why this workout?" Personalization Explanation -->
        ${todayWorkout.explanation ? `
          <div class="workout-explanation-box" style="background: var(--color-surface-secondary); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); border-left: 3px solid var(--color-primary);">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); margin-bottom: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Why this workout?
            </div>
            <div class="text-body-sm" style="color: var(--color-text-secondary); line-height: 1.45;">
              ${todayWorkout.explanation}
            </div>
          </div>
        ` : ''}

        <div style="display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-5); color: var(--color-text-secondary); font-size: var(--font-size-body-sm);">
          <span class="workout-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <strong>${todayWorkout.durationMin || todayWorkout.durationMinutes} Min</strong>
          </span>
          <span class="workout-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            ~${todayWorkout.estimatedCalories} kcal
          </span>
          <span class="workout-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            ${todayWorkout.difficulty}
          </span>
          <span class="workout-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            ${todayWorkout.exerciseIds ? todayWorkout.exerciseIds.length : todayWorkout.exercises.length} Exercises
          </span>
        </div>

        <div class="session-actions">
          <a href="#player/${todayWorkout.id}" class="btn btn-primary btn-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Start Workout
          </a>
          <a href="#workout/${todayWorkout.id}" class="btn btn-outline btn-lg">
            View Routine Details
          </a>
        </div>
      </section>

      <!-- Progress Section: Daily Adherence Summary -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <div>
            <h2 class="section-title">Weekly Momentum</h2>
            <p class="section-subtitle">Week ${WEEKLY_PLAN.weekNumber} of ${WEEKLY_PLAN.totalWeeks} &bull; ${planTitle}</p>
          </div>
          <a href="#plans" class="text-caption text-primary-color" style="font-weight: 600;">View Calendar &rarr;</a>
        </div>

        <div class="card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-4);">
            <div style="width: 58px; height: 58px; border-radius: var(--radius-pill); background-color: var(--color-primary-subtle); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-weight: 700; font-size: 1.125rem;">
              ${WEEKLY_PLAN.weeklyCompletionPercent}%
            </div>
            <div>
              <div class="text-label" style="font-size: 1rem;">5 of 7 Sessions Done</div>
              <div class="text-caption text-secondary" style="margin-top: 2px;">Rest day scheduled tomorrow</div>
            </div>
          </div>

          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center;">
            ${WEEKLY_PLAN.days.map(d => `
              <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 24px;">
                <span class="text-caption" style="font-size: 10px;">${d.dayOfWeek}</span>
                <span class="calendar-status-dot status-${d.status}"></span>
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Quick Actions Grid -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <h2 class="section-title">Quick Actions</h2>
        </div>
        <div class="quick-actions-grid">
          <a href="#player/metabolic-ignition" class="quick-action-btn">
            <div class="quick-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span>Quick HIIT</span>
          </a>
          <a href="#exercises" class="quick-action-btn">
            <div class="quick-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
            </div>
            <span>Exercise Library</span>
          </a>
          <button class="quick-action-btn" id="btn-custom-plan-quick">
            <div class="quick-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <span>Custom Routine</span>
          </button>
        </div>
      </section>

      <!-- Recommended Workouts -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <div>
            <h2 class="section-title">Recommended For You</h2>
            <p class="section-subtitle">Based on your ${(profile.fitnessLevel || 'intermediate').toLowerCase()} level &bull; ${durationText}</p>
          </div>
          <a href="#workouts" class="text-caption text-primary-color" style="font-weight: 600;">See All (${WORKOUTS.length}) &rarr;</a>
        </div>

        <div class="grid grid-cols-1 grid-tablet-2 grid-desktop-3 gap-4">
          ${recommended.map(w => `
            <article class="workout-card" data-workout-id="${w.id}">
              <div class="workout-card-visual">
                <span class="badge badge-primary workout-card-badge">${w.category}</span>
                <span class="workout-card-duration-badge">${w.durationMin} MIN</span>
                <div class="workout-visual-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                  </svg>
                  <span class="text-caption">${w.target}</span>
                </div>
              </div>
              <div class="workout-card-content">
                <h3 class="workout-card-title">${w.title}</h3>
                <p class="text-body-sm" style="line-height: 1.4;">${w.description}</p>
                <div class="workout-card-meta">
                  <span class="workout-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    ${w.estimatedCalories} kcal
                  </span>
                  <span class="workout-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${w.difficulty}
                  </span>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    </div>
  `;

  // Attach card click handlers
  container.querySelectorAll('.workout-card').forEach(card => {
    card.addEventListener('click', () => {
      const wid = card.getAttribute('data-workout-id');
      window.location.hash = `#workout/${wid}`;
    });
  });

  const regenBtn = container.querySelector('#btn-regenerate-workout');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      currentVariationSeed++;
      renderHome(container);
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Personalized routine updated with new exercise variations.'
        });
      }
    });
  }

  const customBtn = container.querySelector('#btn-custom-plan-quick');
  if (customBtn) {
    customBtn.addEventListener('click', () => {
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Custom Workout Builder will unlock in Phase 3.'
        });
      }
    });
  }

  const discardSessionBtn = container.querySelector('#btn-discard-session');
  if (discardSessionBtn) {
    discardSessionBtn.addEventListener('click', () => {
      clearActiveSession();
      renderHome(container);
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: 'Incomplete workout session discarded.'
        });
      }
    });
  }
}
