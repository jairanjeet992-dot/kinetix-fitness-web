/**
 * PLANS VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { WEEKLY_PLAN } from '../data/plans.js';
import { getWeeklyPlan } from '../state/workout-history.js';
import { getWorkoutById } from '../data/workouts.js';

export function renderPlans(container) {
  const weeklyPlan = getWeeklyPlan() || WEEKLY_PLAN;
  let selectedDayIndex = weeklyPlan.days.findIndex(d => d.status === 'today');
  if (selectedDayIndex === -1) selectedDayIndex = 0;

  function renderDayDetails() {
    const detailBox = container.querySelector('#plan-day-detail-card');
    const day = weeklyPlan.days[selectedDayIndex];
    if (!detailBox) return;

    if (day.status === 'rest') {
      detailBox.innerHTML = `
        <div class="state-container" style="background-color: var(--color-surface); padding: var(--space-8) var(--space-4);">
          <div class="state-icon-wrapper" style="color: var(--color-text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="32" height="32" stroke-width="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
          </div>
          <h3 class="state-title">Scheduled Rest & Recovery</h3>
          <p class="state-description">
            Muscles rebuild and adapt during rest periods. Prioritize 7–9 hours of sleep, optimal hydration, and gentle mobility.
          </p>
          <a href="#workout/deep-recovery" class="btn btn-outline btn-sm">Optional: 12-Min Active Reset</a>
        </div>
      `;
      return;
    }

    const workout = getWorkoutById(day.workoutId);
    detailBox.innerHTML = `
      <article class="card" style="border-left: 4px solid ${day.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
              <span class="badge ${day.status === 'completed' ? 'badge-success' : 'badge-primary'}">
                ${day.status === 'completed' ? '✓ Completed' : day.status === 'today' ? 'Scheduled Today' : 'Upcoming'}
              </span>
              <span class="badge">${day.focus}</span>
            </div>
            <h3 class="text-h2">${day.workoutTitle}</h3>
            <p class="text-body-sm" style="color: var(--color-text-secondary); margin-top: 2px;">
              ${day.fullDay} &bull; ${day.dateLabel} ${day.completedAt ? `(Finished at ${day.completedAt})` : ''}
            </p>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <span class="badge badge-dark">${day.durationMin} MIN</span>
            ${day.caloriesBurned ? `<span class="badge badge-success">${day.caloriesBurned} kcal</span>` : ''}
          </div>
        </div>

        <p class="text-body" style="margin-bottom: var(--space-5);">
          ${workout ? workout.description : 'Targeted daily regimen optimized for muscle recovery and metabolic conditioning.'}
        </p>

        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          ${day.status === 'completed' ? `
            <a href="#workout/${day.workoutId}" class="btn btn-secondary">
              Review Workout Details
            </a>
            <a href="#player/${day.workoutId}" class="btn btn-outline">
              Repeat Workout
            </a>
          ` : `
            <a href="#player/${day.workoutId}" class="btn btn-primary btn-lg" style="flex: 1; max-width: 240px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Start Session
            </a>
            <a href="#workout/${day.workoutId}" class="btn btn-outline btn-lg">
              Preview Exercises
            </a>
          `}
        </div>
      </article>
    `;
  }

  function updateCalendarSelection() {
    container.querySelectorAll('.calendar-day-card').forEach((el, index) => {
      if (index === selectedDayIndex) {
        el.classList.add('is-active-day');
        el.setAttribute('aria-selected', 'true');
      } else {
        el.classList.remove('is-active-day');
        el.setAttribute('aria-selected', 'false');
      }
    });
  }

  container.innerHTML = `
    <div class="view-enter">
      <!-- Plan Header -->
      <div class="section-header">
        <div>
          <div class="badge badge-primary" style="margin-bottom: 6px;">Week ${weeklyPlan.weekNumber} of ${weeklyPlan.totalWeeks}</div>
          <h1 class="text-h1">${weeklyPlan.title}</h1>
          <p class="section-subtitle">${weeklyPlan.goal}</p>
        </div>
        <div style="text-align: right;">
          <div class="text-h2 text-primary-color" style="font-weight: 700;">${weeklyPlan.weeklyCompletionPercent}%</div>
          <span class="text-caption text-muted">Weekly Score</span>
        </div>
      </div>

      <!-- Weekly Progress Summary Card -->
      <div class="card" style="margin-bottom: var(--space-5); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-pill); background-color: var(--color-success-subtle); color: var(--color-success); display: flex; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div class="text-label">Weekly Adherence On Track</div>
            <div class="text-caption text-secondary">5 sessions completed, 1 today, 1 rest day scheduled</div>
          </div>
        </div>
        <div class="badge badge-primary" style="padding: 6px 12px;">
          ${weeklyPlan.currentStreakDays} Day Streak Active
        </div>
      </div>

      <!-- 7-Day Mobile-Optimized Calendar Strip -->
      <div style="margin-bottom: var(--space-2); display: flex; justify-content: space-between; align-items: center;">
        <span class="text-label">Weekly Schedule (Tap any day to preview):</span>
        <span class="text-caption text-muted">Sep 22 &ndash; Sep 28</span>
      </div>

      <div class="week-calendar-strip" role="tablist" aria-label="Days of the week">
        ${weeklyPlan.days.map((day, i) => `
          <button class="calendar-day-card ${i === selectedDayIndex ? 'is-active-day' : ''}" data-day-index="${i}" role="tab" aria-selected="${i === selectedDayIndex}">
            <span class="calendar-day-name">${day.dayOfWeek}</span>
            <span class="calendar-day-date">${day.dateLabel.split(' ')[1]}</span>
            <span class="calendar-status-dot status-${day.status}" title="${day.status}"></span>
          </button>
        `).join('')}
      </div>

      <!-- Selected Day Detail View -->
      <div id="plan-day-detail-card" style="margin-bottom: var(--space-6);"></div>

      <!-- Plan Philosophy Card -->
      <section class="card" style="background-color: var(--color-surface-secondary); border: none;">
        <h3 class="text-h3" style="margin-bottom: var(--space-2);">Why Periodization Works</h3>
        <p class="text-body-sm" style="color: var(--color-text-secondary); line-height: 1.5;">
          The Kinetix protocol alternates heavy mechanical tension with metabolic intervals and dedicated neural recovery windows to ensure steady hormonal adaptation without burnout.
        </p>
      </section>
    </div>
  `;

  // Attach day selector clicks
  container.querySelectorAll('.calendar-day-card').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDayIndex = parseInt(btn.getAttribute('data-day-index'), 10);
      updateCalendarSelection();
      renderDayDetails();
    });
  });

  // Render initial selected day
  renderDayDetails();
}
