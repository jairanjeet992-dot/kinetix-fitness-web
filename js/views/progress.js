/**
 * PROGRESS VIEW - KINETIX
 * Phase 4: Progress & Training Intelligence
 *
 * Real-time training dashboard connected directly to verified local workout history.
 *
 * ARCHITECTURAL CONTRACT:
 * - Presentation layer only: delegates all analytics to computeProgressAnalytics().
 * - Does not perform duplicate arithmetic or mutate state.
 * - Shows honest, meaningful empty states when no workouts are completed.
 * - Displays verifiable volume, streaks, training load, muscle engagement,
 *   goal alignment, and session milestones.
 */

import { getWorkoutHistory } from '../state/workout-session.js';
import { getProfile } from '../state/profile.js';
import { computeProgressAnalytics } from '../analytics/progress-engine.js';
import { GOALS } from '../data/taxonomy.js';
import { EXERCISES } from '../data/exercises.js';

const GOAL_DISPLAY_LABELS = {
  [GOALS.BUILD_MUSCLE]: 'Build Muscle',
  [GOALS.LOSE_FAT]: 'Lose Fat',
  [GOALS.GET_STRONGER]: 'Get Stronger',
  [GOALS.IMPROVE_ENDURANCE]: 'Endurance',
  [GOALS.IMPROVE_FITNESS]: 'General Fitness',
  [GOALS.STAY_ACTIVE]: 'Stay Active',
  'other': 'Custom / General'
};

const MUSCLE_PALETTE = {
  chest: '#FF542E',
  back: '#3B82F6',
  shoulders: '#8B5CF6',
  biceps: '#EC4899',
  triceps: '#F59E0B',
  forearms: '#10B981',
  quadriceps: '#6366F1',
  hamstrings: '#14B8A6',
  glutes: '#F97316',
  calves: '#84CC16',
  core: '#06B6D4'
};

/**
 * Formats an ISO date string into a user-friendly format (e.g. "Oct 24, 2026").
 */
function formatDate(dateInput) {
  if (!dateInput) return 'Recent';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Recent';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Renders the Progress & Training Intelligence View.
 *
 * @param {HTMLElement} container - App mount element.
 */
export function renderProgress(container) {
  const history = getWorkoutHistory();
  const profile = getProfile();
  const analytics = computeProgressAnalytics(history, profile);

  if (!analytics.hasData) {
    renderEmptyState(container, profile);
    return;
  }

  renderPopulatedState(container, analytics, profile);
}

/**
 * Renders honest empty state when no completed workouts exist in history.
 */
function renderEmptyState(container, profile) {
  const goalLabel = (profile && profile.goal) ? profile.goal : 'your fitness journey';

  container.innerHTML = `
    <div class="view-enter">
      <!-- Section Title -->
      <div class="section-header">
        <div>
          <h1 class="text-h1">Performance & Analytics</h1>
          <p class="section-subtitle">Real-time training progress and training intelligence</p>
        </div>
        <span class="badge badge-secondary">Ready to Start</span>
      </div>

      <!-- Empty State Hero Card -->
      <div class="card" style="padding: var(--space-6); text-align: center; margin-bottom: var(--space-6); background: var(--color-surface);">
        <div style="width: 56px; height: 56px; border-radius: var(--radius-pill); background-color: var(--color-primary-subtle); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-4);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <h2 class="text-h2" style="margin-bottom: var(--space-2);">No Completed Workouts Yet</h2>
        <p class="text-body-sm text-secondary" style="max-width: 440px; margin: 0 auto var(--space-5);">
          Complete your first guided workout to unlock real-time volume analytics, muscle group distribution, streak tracking, and personalized training intelligence aligned with ${goalLabel}.
        </p>
        <a href="#home" class="btn btn-primary" id="btn-empty-start-workout" style="display: inline-flex; margin: 0 auto;">
          Start Your First Workout
        </a>
      </div>

      <!-- Zero-Placeholder Metrics (Clear Denotation of Unstarted State) -->
      <div class="grid grid-cols-2 grid-tablet-4 gap-3" style="margin-bottom: var(--space-6); opacity: 0.65;">
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TOTAL SESSIONS</span>
          <div class="text-h1" style="color: var(--color-text-secondary); margin-top: 4px;">0</div>
          <span class="text-caption text-secondary">Awaiting first session</span>
        </div>
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TRAINING TIME</span>
          <div class="text-h1" style="color: var(--color-text-secondary); margin-top: 4px;">0m</div>
          <span class="text-caption text-secondary">0.0 total hours</span>
        </div>
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">CURRENT STREAK</span>
          <div class="text-h1" style="color: var(--color-text-secondary); margin-top: 4px;">0d</div>
          <span class="text-caption text-secondary">Consecutive days</span>
        </div>
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TRAINING LOAD</span>
          <div class="text-h1" style="color: var(--color-text-secondary); margin-top: 4px;">0</div>
          <span class="text-caption text-secondary">Volume stimulus</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders active progress dashboard when workout history exists.
 */
function renderPopulatedState(container, analytics, profile) {
  const { overview, frequency, goals, muscles, exercises, milestones, recentActivity, strength } = analytics;

  // Max minutes for weekly chart scaling (minimum 30m)
  const maxWeeklyMinutes = Math.max(30, ...frequency.weeklyVolumeTrend.map(d => d.minutes));

  // Determine user-friendly streak badge
  const streakBadge = overview.currentStreak > 0
    ? `<span class="badge badge-success">${overview.currentStreak} Day Streak 🔥</span>`
    : `<span class="badge badge-primary">Active Athlete</span>`;

  // Goals breakdown entries
  const goalEntries = Object.entries(goals.distribution)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  container.innerHTML = `
    <div class="view-enter">
      <!-- Section Header -->
      <div class="section-header">
        <div>
          <h1 class="text-h1">Performance & Analytics</h1>
          <p class="section-subtitle">Real-time training progress and physiological metrics</p>
        </div>
        ${streakBadge}
      </div>

      <!-- High Level Overview Cards -->
      <div class="grid grid-cols-2 grid-tablet-3 gap-3" style="margin-bottom: var(--space-6);">
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TOTAL SESSIONS</span>
          <div class="text-h1" style="color: var(--color-primary); margin-top: 4px;">
            ${overview.totalWorkouts}
          </div>
          <span class="text-caption text-secondary">${frequency.weeklyWorkouts} this week</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TRAINING TIME</span>
          <div class="text-h1" style="color: var(--color-text-primary); margin-top: 4px;">
            ${overview.totalDurationMinutes}m
          </div>
          <span class="text-caption text-secondary">${(overview.totalDurationMinutes / 60).toFixed(1)} total hours</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">ACTIVE STREAK</span>
          <div class="text-h1" style="color: var(--color-warning); margin-top: 4px;">
            ${overview.currentStreak}d
          </div>
          <span class="text-caption text-secondary">Best: ${overview.longestStreak}d</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TRAINING LOAD</span>
          <div class="text-h1" style="color: var(--color-success); margin-top: 4px;">
            ${overview.recentTrainingLoad}
          </div>
          <span class="text-caption text-secondary">7-day stimulus (Total: ${overview.totalTrainingLoad})</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">VOLUME LIFTED</span>
          <div class="text-h1" style="color: var(--color-primary); margin-top: 4px;">
            ${overview.totalVolumeKg ? `${overview.totalVolumeKg.toLocaleString()} kg` : '0 kg'}
          </div>
          <span class="text-caption text-secondary">Total workload lifted</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">PERSONAL RECORDS</span>
          <div class="text-h1" style="color: #d97706; margin-top: 4px;">
            ${overview.totalPRsCount || 0}
          </div>
          <span class="text-caption text-secondary">All-time milestones</span>
        </div>
      </div>

      <!-- Personal Records (PRs) Section (Phase 5) -->
      ${strength && strength.allPRs && strength.allPRs.length > 0 ? `
        <section class="card" style="margin-bottom: var(--space-6); background: linear-gradient(135deg, var(--color-surface), rgba(245, 158, 11, 0.05)); border: 1px solid rgba(245, 158, 11, 0.25);">
          <div class="section-header" style="margin-bottom: var(--space-3);">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🏆</span>
                <h2 class="text-h2">Personal Records</h2>
              </div>
              <p class="section-subtitle">Verified maximum loads, best reps, and performance milestones</p>
            </div>
            <span class="badge badge-gold">${strength.totalPRsCount} Records</span>
          </div>

          <div class="grid grid-cols-1 grid-tablet-2 gap-3">
            ${strength.recentPRs.map(pr => {
              const ex = EXERCISES ? EXERCISES.find(e => e.id === pr.exerciseId) : null;
              const exName = ex ? ex.name : (pr.exerciseName || pr.exerciseId);
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: var(--color-surface-secondary); border-radius: var(--radius-md); border: 1px solid var(--color-border-subtle);">
                  <div>
                    <div style="font-weight: 600; color: var(--color-text-primary);">${exName}</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary);">${pr.label}</div>
                  </div>
                  <div style="text-align: right;">
                    <span class="badge badge-gold" style="font-size: 13px;">${pr.formattedValue}</span>
                    <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 2px;">${formatDate(pr.achievedAt)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Weekly Activity Visualization (Last 7 Days Bar Chart) -->
      <section class="card" style="margin-bottom: var(--space-6);">
        <div class="section-header" style="margin-bottom: var(--space-2);">
          <div>
            <h2 class="text-h2">Weekly Training Volume</h2>
            <p class="section-subtitle">Daily training minutes over the past 7 days</p>
          </div>
          <span class="badge badge-primary">${frequency.consistencyScore}% Consistency</span>
        </div>

        <div class="bar-chart-container" aria-label="Weekly Activity Bar Chart" role="img">
          ${frequency.weeklyVolumeTrend.map((dayData, idx) => {
            const isToday = idx === frequency.weeklyVolumeTrend.length - 1;
            const heightPercent = dayData.minutes > 0
              ? Math.max(12, Math.round((dayData.minutes / maxWeeklyMinutes) * 100))
              : 6;

            let barClass = 'bar-pill';
            if (dayData.count > 0) barClass += ' is-completed';
            if (isToday) barClass += ' is-today';

            return `
              <div class="bar-column">
                <span class="text-caption" style="font-size: 10px; font-weight: 600; color: ${isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)'};">
                  ${dayData.minutes > 0 ? `${dayData.minutes}m` : '-'}
                </span>
                <div class="${barClass}" style="height: ${heightPercent}%;" title="${dayData.dayName}: ${dayData.minutes} min (${dayData.count} sessions)"></div>
                <span class="bar-label" style="${isToday ? 'color: var(--color-primary); font-weight: 700;' : ''}">${dayData.dayName}</span>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Muscle Engagement Ratio (Canonical Anatomy) -->
      <section class="card" style="margin-bottom: var(--space-6);">
        <div class="section-header" style="margin-bottom: var(--space-4);">
          <div>
            <h2 class="text-h2">Muscle Engagement Ratio</h2>
            <p class="section-subtitle">Estimated volume distribution based on completed exercises</p>
          </div>
          <span class="badge badge-secondary">${muscles.mostTrainedMuscle ? `Top: ${muscles.mostTrainedMuscle.label}` : 'Estimated'}</span>
        </div>

        <div class="flex flex-col gap-3">
          ${muscles.distribution
            .filter(m => m.totalSets > 0)
            .sort((a, b) => b.totalSets - a.totalSets)
            .map(m => {
              const color = MUSCLE_PALETTE[m.muscleId] || 'var(--color-primary)';
              return `
                <div class="muscle-bar-row">
                  <div class="muscle-bar-header">
                    <span style="font-weight: 600; color: var(--color-text-primary);">${m.label}</span>
                    <span style="font-weight: 700; color: var(--color-text-secondary);">~${m.totalSets} est. sets &bull; ${m.percentage}%</span>
                  </div>
                  <div class="progress-track" style="height: 10px; background-color: var(--color-surface-secondary); border-radius: var(--radius-pill); overflow: hidden;">
                    <div class="progress-fill" style="width: ${m.percentage}%; background-color: ${color}; height: 100%; border-radius: var(--radius-pill); transition: width var(--transition-slow);"></div>
                  </div>
                </div>
              `;
            }).join('') || '<p class="text-body-sm text-muted">Complete exercises to view anatomical volume breakdown.</p>'}
        </div>
      </section>

      <!-- Goal Alignment & Frequency Breakdown -->
      <div class="grid grid-cols-1 grid-tablet-2 gap-3" style="margin-bottom: var(--space-6);">
        <!-- Goal Distribution -->
        <section class="card">
          <h2 class="text-h2" style="margin-bottom: var(--space-2);">Goal Distribution</h2>
          <p class="section-subtitle" style="margin-bottom: var(--space-4);">Alignment with target training goals</p>
          <div class="flex flex-col gap-3">
            ${goalEntries.map(([goalKey, count]) => {
              const label = GOAL_DISPLAY_LABELS[goalKey] || goalKey;
              const percent = Math.round((count / overview.totalWorkouts) * 100);
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: var(--font-size-body-sm); margin-bottom: 4px;">
                    <span style="font-weight: 600;">${label}</span>
                    <span class="text-secondary">${count} workouts (${percent}%)</span>
                  </div>
                  <div class="progress-track" style="height: 6px; background-color: var(--color-surface-secondary); border-radius: var(--radius-pill);">
                    <div class="progress-fill" style="width: ${percent}%; background-color: var(--color-primary); height: 100%; border-radius: var(--radius-pill);"></div>
                  </div>
                </div>
              `;
            }).join('') || '<p class="text-body-sm text-muted">No goal records available.</p>'}
          </div>
        </section>

        <!-- Top Exercises -->
        <section class="card">
          <h2 class="text-h2" style="margin-bottom: var(--space-2);">Most Frequent Exercises</h2>
          <p class="section-subtitle" style="margin-bottom: var(--space-4);">Movement patterns most frequently trained</p>
          <div class="flex flex-col gap-2">
            ${exercises.topExercises.map((ex, i) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) 0; ${i > 0 ? 'border-top: 1px solid var(--color-border-subtle);' : ''}">
                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <span style="font-weight: 700; color: var(--color-text-muted); width: 18px;">#${i + 1}</span>
                  <span style="font-weight: 600; color: var(--color-text-primary);">${ex.name}</span>
                </div>
                <span class="badge badge-secondary" style="font-size: 11px;">${ex.count} sessions &bull; ${ex.totalSets} sets</span>
              </div>
            `).join('') || '<p class="text-body-sm text-muted">No completed exercises recorded yet.</p>'}
          </div>
        </section>
      </div>

      <!-- Real Session Milestones (Verified Data Only) -->
      <section class="section" style="padding-top: 0; margin-bottom: var(--space-6);">
        <div class="section-header">
          <div>
            <h2 class="section-title">Session Milestones</h2>
            <p class="section-subtitle">Real performance records verified on this device</p>
          </div>
        </div>

        <div class="grid grid-cols-2 grid-tablet-4 gap-3">
          <div class="card" style="padding: var(--space-3); text-align: center;">
            <span class="text-caption text-muted">LONGEST WORKOUT</span>
            <div class="text-h2" style="color: var(--color-text-primary); margin-top: 4px;">
              ${milestones.longestDurationMinutes}m
            </div>
            <span class="text-caption text-secondary">Single session</span>
          </div>

          <div class="card" style="padding: var(--space-3); text-align: center;">
            <span class="text-caption text-muted">MAX SETS VOLUME</span>
            <div class="text-h2" style="color: var(--color-primary); margin-top: 4px;">
              ${milestones.maxSetsInSession}
            </div>
            <span class="text-caption text-secondary">Sets in one session</span>
          </div>

          <div class="card" style="padding: var(--space-3); text-align: center;">
            <span class="text-caption text-muted">PEAK TRAINING LOAD</span>
            <div class="text-h2" style="color: var(--color-success); margin-top: 4px;">
              ${milestones.highestTrainingLoad}
            </div>
            <span class="text-caption text-secondary">Single session stimulus</span>
          </div>

          <div class="card" style="padding: var(--space-3); text-align: center;">
            <span class="text-caption text-muted">LONGEST STREAK</span>
            <div class="text-h2" style="color: var(--color-warning); margin-top: 4px;">
              ${overview.longestStreak}d
            </div>
            <span class="text-caption text-secondary">Consecutive days</span>
          </div>
        </div>
      </section>

      <!-- Recent Completed Workouts History -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <div>
            <h2 class="section-title">Workout History</h2>
            <p class="section-subtitle">Recent activity verified from local storage (${recentActivity.length} of ${overview.totalWorkouts})</p>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          ${recentActivity.map((item, i) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); ${i > 0 ? 'border-top: 1px solid var(--color-border-subtle);' : ''}">
              <div style="display: flex; align-items: center; gap: var(--space-3);">
                <div style="width: 40px; height: 40px; border-radius: var(--radius-pill); background-color: var(--color-primary-subtle); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
                <div>
                  <div class="text-label" style="font-size: 0.95rem; font-weight: 600;">${item.title}</div>
                  <div class="text-caption text-secondary">${formatDate(item.completedAt)} &bull; ${item.setsCompleted} sets &bull; ${item.exercisesCompleted} exercises</div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <span class="badge badge-success" style="margin-bottom: 2px;">Completed</span>
                <div class="text-caption text-muted">${item.durationMinutes}m &bull; Load ${item.trainingLoad}${item.estimatedCalories ? ` &bull; ${item.estimatedCalories} kcal` : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}
