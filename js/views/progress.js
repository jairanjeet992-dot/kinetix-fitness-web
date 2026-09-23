/**
 * PROGRESS VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { PROGRESS_DATA } from '../data/progress.js';

export function renderProgress(container) {
  const maxMinutes = Math.max(...PROGRESS_DATA.weeklyActivity.map(a => a.minutes), 40);

  container.innerHTML = `
    <div class="view-enter">
      <!-- Section Title -->
      <div class="section-header">
        <div>
          <h1 class="text-h1">Performance & Analytics</h1>
          <p class="section-subtitle">Real-time physiological progress and milestone tracker</p>
        </div>
        <span class="badge badge-success">On Streak</span>
      </div>

      <!-- 4-Up High Level Overview Cards -->
      <div class="grid grid-cols-2 grid-tablet-4 gap-3" style="margin-bottom: var(--space-6);">
        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TOTAL SESSIONS</span>
          <div class="text-h1" style="color: var(--color-primary); margin-top: 4px;">
            ${PROGRESS_DATA.overview.totalWorkouts}
          </div>
          <span class="text-caption text-secondary">All-time finished</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">TRAINING TIME</span>
          <div class="text-h1" style="color: var(--color-text-primary); margin-top: 4px;">
            ${PROGRESS_DATA.overview.totalMinutes}m
          </div>
          <span class="text-caption text-secondary">16.3 total hours</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">ACTIVE STREAK</span>
          <div class="text-h1" style="color: var(--color-warning); margin-top: 4px;">
            ${PROGRESS_DATA.overview.currentStreakDays}d
          </div>
          <span class="text-caption text-secondary">Personal best: 14d</span>
        </div>

        <div class="card" style="padding: var(--space-4); text-align: center;">
          <span class="text-caption text-muted">EST. CALORIES</span>
          <div class="text-h1" style="color: var(--color-success); margin-top: 4px;">
            ${(PROGRESS_DATA.overview.caloriesBurnedTotal / 1000).toFixed(1)}k
          </div>
          <span class="text-caption text-secondary">Active expenditure</span>
        </div>
      </div>

      <!-- Weekly Activity Visualization (CSS Bar Chart) -->
      <section class="card" style="margin-bottom: var(--space-6);">
        <div class="section-header" style="margin-bottom: var(--space-2);">
          <div>
            <h2 class="text-h2">Weekly Training Volume</h2>
            <p class="section-subtitle">Minutes active per calendar day (Current Week)</p>
          </div>
          <span class="badge badge-primary">71% Adherence</span>
        </div>

        <div class="bar-chart-container" aria-label="Weekly Activity Bar Chart" role="img">
          ${PROGRESS_DATA.weeklyActivity.map(act => {
            const heightPercent = act.minutes > 0 ? Math.round((act.minutes / maxMinutes) * 100) : 6;
            let barClass = 'bar-pill';
            if (act.completed) barClass += ' is-completed';
            if (act.isToday) barClass += ' is-today';
            if (act.isRest) barClass += ' is-rest';

            return `
              <div class="bar-column">
                <span class="text-caption" style="font-size: 10px; font-weight: 600; color: ${act.isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)'};">
                  ${act.minutes > 0 ? `${act.minutes}m` : '-'}
                </span>
                <div class="${barClass}" style="height: ${heightPercent}%;" title="${act.day}: ${act.minutes}m"></div>
                <span class="bar-label" style="${act.isToday ? 'color: var(--color-primary); font-weight: 700;' : ''}">${act.day}</span>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Muscle Group Distribution & Balance -->
      <section class="card" style="margin-bottom: var(--space-6);">
        <div class="section-header" style="margin-bottom: var(--space-4);">
          <div>
            <h2 class="text-h2">Muscle Engagement Ratio</h2>
            <p class="section-subtitle">Volume distribution across anatomical focus zones</p>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          ${PROGRESS_DATA.muscleDistribution.map(m => `
            <div class="muscle-bar-row">
              <div class="muscle-bar-header">
                <span style="font-weight: 600; color: var(--color-text-primary);">${m.muscle}</span>
                <span style="font-weight: 700;">${m.percent}%</span>
              </div>
              <div class="progress-track" style="height: 10px;">
                <div class="progress-fill" style="width: ${m.percent}%; background-color: ${m.color};"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Personal Records (PRs) Cards -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <div>
            <h2 class="section-title">Personal Records</h2>
            <p class="section-subtitle">Milestones recorded throughout your Kinetix training</p>
          </div>
        </div>

        <div class="grid grid-cols-1 grid-tablet-2 gap-3">
          ${PROGRESS_DATA.personalRecords.map(pr => `
            <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span class="badge badge-primary" style="margin-bottom: 4px;">${pr.exercise}</span>
                <h3 class="text-h3">${pr.metric}</h3>
                <span class="text-caption text-muted">Achieved ${pr.dateAchieved}</span>
              </div>
              <div style="text-align: right;">
                <div class="text-h2" style="color: var(--color-text-primary); font-weight: 700;">${pr.value}</div>
                <span class="badge badge-success" style="font-size: 10px;">${pr.improved}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Recent Completed Workouts History -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <div>
            <h2 class="section-title">Workout History</h2>
            <p class="section-subtitle">Recent activity verified on this device</p>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          ${PROGRESS_DATA.recentHistory.map((item, i) => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); ${i > 0 ? 'border-top: 1px solid var(--color-border-subtle);' : ''}">
              <div style="display: flex; align-items: center; gap: var(--space-3);">
                <div style="width: 40px; height: 40px; border-radius: var(--radius-pill); background-color: var(--color-primary-subtle); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
                <div>
                  <div class="text-label" style="font-size: 0.95rem;">${item.workoutTitle}</div>
                  <div class="text-caption text-secondary">${item.date} &bull; ${item.category}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge badge-success" style="margin-bottom: 2px;">${item.status}</span>
                <div class="text-caption text-muted">${item.duration} &bull; ${item.calories} kcal</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}
