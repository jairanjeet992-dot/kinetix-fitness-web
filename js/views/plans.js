/**
 * PLANS VIEW - KINETIX
 * Phase 7: Workout Planning & Long-Term Training System
 *
 * Real, interactive weekly schedule and training plan manager:
 * - Deterministic plan loading and dynamic adherence analytics
 * - Interactive 7-day schedule with explicit rest, recovery, and training states
 * - Planned session lifecycle actions (Start Session, Reschedule, Skip, Regenerate)
 * - Safe versioning display and zero-fabrication adherence reporting
 */

import {
  getActivePlan,
  computePlanAdherence,
  reschedulePlannedSession,
  skipPlannedSession,
  regeneratePlan,
  generateWorkoutForPlannedSession,
  SESSION_TYPE,
  SESSION_STATUS
} from '../state/training-plan.js';

import { getProfile } from '../state/profile.js';
import { toDateString } from '../engine/plan-generator.js';

export function renderPlans(container) {
  const profile = getProfile();
  const plan = getActivePlan();
  const adherence = computePlanAdherence(plan);
  const todayStr = toDateString(new Date());

  const currentWeek = (plan.weeks && plan.weeks[0]) || { sessions: [] };
  const sessions = currentWeek.sessions || [];

  // Default selection to today's session, or first session
  let selectedDayIndex = sessions.findIndex(s => s.scheduledDate === todayStr);
  if (selectedDayIndex === -1) selectedDayIndex = 0;

  function renderDayDetails() {
    const detailBox = container.querySelector('#plan-day-detail-card');
    if (!detailBox) return;

    const session = sessions[selectedDayIndex];
    if (!session) {
      detailBox.innerHTML = `
        <div class="card" style="padding: var(--space-6); text-align: center;">
          <p class="text-body text-secondary">No session data available for this day.</p>
        </div>
      `;
      return;
    }

    const isToday = session.scheduledDate === todayStr;

    // REST or RECOVERY Day
    if (session.sessionType === SESSION_TYPE.REST || session.sessionType === SESSION_TYPE.RECOVERY) {
      const isRecovery = session.sessionType === SESSION_TYPE.RECOVERY;
      detailBox.innerHTML = `
        <div class="state-container card" style="background-color: var(--color-surface); padding: var(--space-8) var(--space-5); text-align: center; border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
          <div class="state-icon-wrapper" style="color: ${isRecovery ? 'var(--color-primary)' : 'var(--color-text-secondary)'}; margin-bottom: var(--space-3);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="36" height="36" stroke-width="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
          </div>
          <div class="badge" style="margin-bottom: var(--space-2); background: rgba(255,255,255,0.06);">
            ${session.dayName} &bull; ${session.scheduledDate}
          </div>
          <h3 class="state-title text-h2" style="margin-bottom: var(--space-2);">
            ${isRecovery ? 'Active Mobility & Recovery Day' : 'Scheduled Rest & Neural Reset'}
          </h3>
          <p class="state-description text-body" style="max-width: 520px; margin: 0 auto var(--space-5); color: var(--color-text-secondary); line-height: 1.5;">
            ${isRecovery
              ? 'Low-intensity movement improves lymphatic clearance and parasympathetic recovery. Focus on gentle stretching, foam rolling, and walking.'
              : 'Muscular protein synthesis and central nervous system adaptation occur during complete rest. Prioritize quality sleep and nutritional recovery.'
            }
          </p>
          <div style="display: flex; justify-content: center; gap: var(--space-3); flex-wrap: wrap;">
            <a href="#workout/deep-recovery" class="btn btn-outline btn-sm">Optional: 12-Min Mobility Reset</a>
          </div>
        </div>
      `;
      return;
    }

    // TRAINING Session
    let statusBadgeClass = 'badge-primary';
    let statusLabel = 'Upcoming';
    let borderAccent = 'var(--color-primary)';

    if (session.status === SESSION_STATUS.COMPLETED) {
      statusBadgeClass = 'badge-success';
      statusLabel = '✓ Completed';
      borderAccent = 'var(--color-success)';
    } else if (session.status === SESSION_STATUS.READY || isToday) {
      statusBadgeClass = 'badge-primary';
      statusLabel = 'Scheduled Today';
      borderAccent = 'var(--color-primary)';
    } else if (session.status === SESSION_STATUS.MISSED) {
      statusBadgeClass = 'badge-error';
      statusLabel = 'Missed';
      borderAccent = 'var(--color-error, #e74c3c)';
    } else if (session.status === SESSION_STATUS.SKIPPED) {
      statusBadgeClass = 'badge-warning';
      statusLabel = 'Skipped';
      borderAccent = 'var(--color-warning, #f39c12)';
    } else if (session.status === SESSION_STATUS.RESCHEDULED) {
      statusBadgeClass = 'badge-dark';
      statusLabel = `Rescheduled to ${session.rescheduledToDate || 'another date'}`;
      borderAccent = '#3498db';
    }

    const targetMusclesLabel = Array.isArray(session.targetMuscles) && session.targetMuscles.length > 0
      ? session.targetMuscles.join(', ')
      : 'Full Body';

    detailBox.innerHTML = `
      <article class="card" style="border-left: 4px solid ${borderAccent}; padding: var(--space-6); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3); flex-wrap: wrap; gap: var(--space-2);">
          <div>
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); flex-wrap: wrap;">
              <span class="badge ${statusBadgeClass}">${statusLabel}</span>
              <span class="badge" style="background: rgba(255,255,255,0.08);">${session.targetFocus}</span>
              ${session.isOptional ? '<span class="badge badge-dark">Optional</span>' : ''}
            </div>
            <h2 class="text-h2" style="margin-top: 4px; margin-bottom: 2px;">
              ${session.sessionName || `${session.targetFocus} Session`}
            </h2>
            <p class="text-body-sm" style="color: var(--color-text-secondary); margin-top: 2px;">
              ${session.dayName} &bull; ${session.scheduledDate} ${session.completedAt ? `&bull; Finished at ${new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <span class="badge badge-dark" style="font-weight: 600;">${session.durationMinutes} MIN</span>
          </div>
        </div>

        <div style="margin-bottom: var(--space-4); background: var(--color-surface-secondary); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);">
          <div class="text-caption text-muted" style="margin-bottom: 2px;">TARGET MUSCLE GROUPS</div>
          <div class="text-body-sm" style="color: var(--color-text-primary); font-weight: 500;">
            ${targetMusclesLabel}
          </div>
        </div>

        <!-- Action Controls -->
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; margin-top: var(--space-5);">
          ${session.status === SESSION_STATUS.COMPLETED ? `
            ${session.workoutId ? `
              <a href="#workout/${session.workoutId}" class="btn btn-secondary">
                Review Workout Details
              </a>
              <button type="button" class="btn btn-outline" id="btn-repeat-planned-session">
                Repeat Workout
              </button>
            ` : `
              <div class="badge badge-success">Session Logged in History</div>
            `}
          ` : `
            <button type="button" class="btn btn-primary btn-lg" id="btn-start-planned-session" style="min-width: 180px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              ${isToday ? 'Start Today\'s Session' : 'Start This Session'}
            </button>
            <button type="button" class="btn btn-outline" id="btn-reschedule-session">
              Reschedule
            </button>
            <button type="button" class="btn btn-ghost" id="btn-skip-session" style="color: var(--color-text-secondary);">
              Skip Session
            </button>
          `}
        </div>

        <!-- Reschedule Form Modal/Inline -->
        <div id="reschedule-form-container" style="display: none; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
          <label for="reschedule-date-input" class="text-label" style="display: block; margin-bottom: var(--space-2);">Choose New Date (YYYY-MM-DD):</label>
          <div style="display: flex; gap: var(--space-2); align-items: center; max-width: 320px;">
            <input type="date" id="reschedule-date-input" class="form-input" value="${session.scheduledDate}" style="padding: 8px 12px; background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: var(--radius-sm); width: 100%;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-confirm-reschedule">Save</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-cancel-reschedule">Cancel</button>
          </div>
        </div>
      </article>
    `;

    // Hook Start Session
    const startBtn = detailBox.querySelector('#btn-start-planned-session');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        try {
          const workout = generateWorkoutForPlannedSession(session, profile);
          window.location.hash = `#player/${workout.id}`;
        } catch (err) {
          console.error('Failed to generate workout for planned session:', err);
          alert('Could not start workout: ' + err.message);
        }
      });
    }

    // Hook Repeat Workout
    const repeatBtn = detailBox.querySelector('#btn-repeat-planned-session');
    if (repeatBtn && session.workoutId) {
      repeatBtn.addEventListener('click', () => {
        window.location.hash = `#player/${session.workoutId}`;
      });
    }

    // Hook Reschedule
    const reschedBtn = detailBox.querySelector('#btn-reschedule-session');
    const reschedForm = detailBox.querySelector('#reschedule-form-container');
    const confirmResched = detailBox.querySelector('#btn-confirm-reschedule');
    const cancelResched = detailBox.querySelector('#btn-cancel-reschedule');
    const dateInput = detailBox.querySelector('#reschedule-date-input');

    if (reschedBtn && reschedForm) {
      reschedBtn.addEventListener('click', () => {
        reschedForm.style.display = reschedForm.style.display === 'none' ? 'block' : 'none';
      });
    }
    if (cancelResched && reschedForm) {
      cancelResched.addEventListener('click', () => {
        reschedForm.style.display = 'none';
      });
    }
    if (confirmResched && dateInput) {
      confirmResched.addEventListener('click', () => {
        const newDate = dateInput.value;
        if (!newDate) return;
        const res = reschedulePlannedSession(session.plannedSessionId, newDate);
        if (res) {
          renderPlans(container);
        } else {
          alert('Unable to reschedule session to this date.');
        }
      });
    }

    // Hook Skip
    const skipBtn = detailBox.querySelector('#btn-skip-session');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (confirm(`Skip scheduled ${session.targetFocus} session for ${session.scheduledDate}?`)) {
          skipPlannedSession(session.plannedSessionId, 'Athlete skipped from weekly view');
          renderPlans(container);
        }
      });
    }
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

  // Calculate schedule date range label
  const startDateLabel = sessions.length > 0 ? sessions[0].scheduledDate : 'Current Week';
  const endDateLabel = sessions.length > 0 ? sessions[sessions.length - 1].scheduledDate : '';

  container.innerHTML = `
    <div class="view-enter">
      <!-- Plan Header -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-5);">
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 6px;">
            <span class="badge badge-primary">Week ${plan.currentWeek || 1} &bull; Plan v${plan.planVersion || 1}</span>
            <span class="badge" style="background: rgba(255,255,255,0.08);">${plan.trainingFrequency} Days / Week</span>
          </div>
          <h1 class="text-h1">${plan.title || 'Weekly Training Plan'}</h1>
          <p class="section-subtitle" style="color: var(--color-text-secondary); margin-top: 4px;">
            Goal: <strong style="color: var(--color-text-primary); text-transform: capitalize;">${plan.goal || profile.goal}</strong> &bull; Focus: <strong style="color: var(--color-text-primary); text-transform: capitalize;">${(plan.focusAreas || profile.focusAreas || ['Full Body']).join(', ')}</strong>
          </p>
        </div>
        <div style="display: flex; gap: var(--space-3); align-items: center;">
          <div style="text-align: right;">
            <div class="text-h1 text-primary-color" style="font-weight: 800; font-size: 2rem; color: var(--color-primary);">
              ${adherence.adherencePercentage}%
            </div>
            <span class="text-caption text-muted">Plan Adherence</span>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="btn-regenerate-plan" title="Regenerate future training structure based on updated profile">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Regenerate Plan
          </button>
        </div>
      </div>

      <!-- Weekly Progress Summary Card -->
      <div class="card" style="margin-bottom: var(--space-5); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); padding: var(--space-4) var(--space-5); border-radius: var(--radius-lg);">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-pill); background-color: var(--color-success-subtle); color: var(--color-success); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div class="text-label" style="font-weight: 600;">Weekly Adherence Analytics</div>
            <div class="text-caption text-secondary" style="margin-top: 2px;">
              ${adherence.completedSessions} completed &bull; ${adherence.missedSessions} missed &bull; ${adherence.remainingFutureSessions} upcoming &bull; ${adherence.optionalSessions} optional
            </div>
          </div>
        </div>
        <div style="display: flex; gap: var(--space-2);">
          <span class="badge ${adherence.missedSessions === 0 ? 'badge-success' : 'badge-warning'}">
            ${adherence.missedSessions === 0 ? '✓ On Track' : `${adherence.missedSessions} Missed`}
          </span>
        </div>
      </div>

      <!-- 7-Day Mobile-Optimized Calendar Strip -->
      <div style="margin-bottom: var(--space-2); display: flex; justify-content: space-between; align-items: center;">
        <span class="text-label" style="font-weight: 600;">Weekly Schedule:</span>
        <span class="text-caption text-muted">${startDateLabel} &ndash; ${endDateLabel}</span>
      </div>

      <div class="week-calendar-strip" role="tablist" aria-label="Days of the week" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-2); margin-bottom: var(--space-5);">
        ${sessions.map((session, i) => {
          let dotStatusClass = 'status-planned';
          if (session.sessionType === SESSION_TYPE.REST || session.sessionType === SESSION_TYPE.RECOVERY) {
            dotStatusClass = 'status-rest';
          } else if (session.status === SESSION_STATUS.COMPLETED) {
            dotStatusClass = 'status-completed';
          } else if (session.status === SESSION_STATUS.READY || session.scheduledDate === todayStr) {
            dotStatusClass = 'status-ready';
          } else if (session.status === SESSION_STATUS.MISSED) {
            dotStatusClass = 'status-missed';
          } else if (session.status === SESSION_STATUS.SKIPPED) {
            dotStatusClass = 'status-skipped';
          } else if (session.status === SESSION_STATUS.RESCHEDULED) {
            dotStatusClass = 'status-rescheduled';
          }

          const dayNumber = session.scheduledDate ? session.scheduledDate.split('-')[2] : `${i + 1}`;
          const isSelected = i === selectedDayIndex;

          return `
            <button class="calendar-day-card ${isSelected ? 'is-active-day' : ''}" data-day-index="${i}" role="tab" aria-selected="${isSelected}" style="position: relative;">
              <span class="calendar-day-name">${session.dayShort || session.dayName.substr(0, 3)}</span>
              <span class="calendar-day-date">${dayNumber}</span>
              <span class="calendar-status-dot ${dotStatusClass}" title="${session.status}"></span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Selected Day Detail View -->
      <div id="plan-day-detail-card" style="margin-bottom: var(--space-6);"></div>

      <!-- Periodization Context Card -->
      <section class="card" style="background-color: var(--color-surface-secondary); border: none; padding: var(--space-5); border-radius: var(--radius-lg);">
        <h3 class="text-h3" style="margin-bottom: var(--space-2);">Deterministic Periodization & Overlap Protection</h3>
        <p class="text-body-sm" style="color: var(--color-text-secondary); line-height: 1.5;">
          Kinetix structures your weekly microcycle to distribute mechanical and metabolic load. Training sessions automatically respect systemic recovery and target muscle overlap rules before generating customized workout routines.
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

  // Attach regenerate plan button
  const regenBtn = container.querySelector('#btn-regenerate-plan');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      if (confirm('Regenerate your weekly training plan? Historical completed workouts will remain linked to previous plan versions.')) {
        regeneratePlan(profile);
        renderPlans(container);
      }
    });
  }

  // Render initial selected day
  renderDayDetails();
}
