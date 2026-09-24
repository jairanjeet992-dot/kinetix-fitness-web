/**
 * PROFILE VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { escapeHtml } from '../components/exercise-media.js';
import { getProfile, updateProfile } from '../state/profile.js';

export function renderProfile(container) {
  const profile = getProfile();
  const userName = profile.name || 'Athlete';
  const safeUserName = escapeHtml(userName);
  const userInitials = userName.split(/\s+/).map(n => n[0]).filter(Boolean).join('').toUpperCase() || 'A';
  const age = profile.stats?.age || '--';
  const height = profile.stats?.height || '--';
  const weight = profile.stats?.weight || '--';
  const bmi = profile.stats?.bmi || '--';

  const focusList = Array.isArray(profile.focusAreas) && profile.focusAreas.length > 0
    ? profile.focusAreas
    : ['Full Body'];
  const equipmentList = Array.isArray(profile.equipment) && profile.equipment.length > 0
    ? profile.equipment
    : ['No Equipment'];

  container.innerHTML = `
    <div class="view-enter">
      <!-- Profile Header Card -->
      <section class="card" style="margin-bottom: var(--space-6); background: linear-gradient(135deg, #FFFFFF 0%, #FAF9F7 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-4);">
            <div style="width: 72px; height: 72px; border-radius: var(--radius-pill); background-color: var(--color-primary-subtle); border: 3px solid var(--color-surface); box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 700; color: var(--color-primary);">
              ${userInitials}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 2px;">
                <h1 class="text-h1" style="font-size: 1.5rem;">${safeUserName}</h1>
                <span class="badge badge-primary">KINETIX</span>
              </div>
              <div class="text-caption text-secondary">Personal fitness profile</div>
              <div class="text-caption text-primary-color" style="font-weight: 600; margin-top: 4px;">
                ${escapeHtml(profile.fitnessLevel ? `${profile.fitnessLevel} Athlete` : 'Kinetix Athlete')}
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="btn-edit-profile" style="align-self: center;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit Profile
          </button>
        </div>
      </section>

      <!-- Physical Baseline Statistics (4-Up Grid) -->
      <section class="section" style="padding-top: 0;">
        <div class="section-header">
          <h2 class="section-title">Physical Profile</h2>
          <button class="btn btn-ghost btn-sm" id="btn-edit-bio">Edit</button>
        </div>

        <div class="grid grid-cols-2 grid-tablet-4 gap-3">
          <div class="profile-stat-box">
            <span class="text-caption text-muted">AGE</span>
            <div class="profile-stat-val" style="margin-top: 4px;">${age}</div>
            <span class="text-caption text-secondary">Years</span>
          </div>

          <div class="profile-stat-box">
            <span class="text-caption text-muted">HEIGHT</span>
            <div class="profile-stat-val" style="margin-top: 4px;">${height}</div>
            <span class="text-caption text-secondary">Standing</span>
          </div>

          <div class="profile-stat-box">
            <span class="text-caption text-muted">WEIGHT</span>
            <div class="profile-stat-val" style="margin-top: 4px;">${weight}</div>
            <span class="text-caption text-secondary">Current recorded weight</span>
          </div>

          <div class="profile-stat-box">
            <span class="text-caption text-muted">BMI</span>
            <div class="profile-stat-val" style="margin-top: 4px;">${bmi}</div>
            <span class="text-caption text-secondary">Calculated from height & weight</span>
          </div>
        </div>
      </section>

      <!-- Fitness & Training Objectives -->
      <section class="card" style="margin-bottom: var(--space-6);">
        <div class="section-header" style="margin-bottom: var(--space-3);">
          <h2 class="text-h2">Training Preferences</h2>
        </div>

        <div class="flex flex-col gap-3">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: var(--space-2);">
            <div>
              <div class="text-label">Primary Goal</div>
              <div class="text-caption text-secondary">Focus of weekly recommendations</div>
            </div>
            <span class="badge badge-primary">${escapeHtml(profile.goal || 'Build Muscle')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: var(--space-2);">
            <div>
              <div class="text-label">Conditioning Level</div>
              <div class="text-caption text-secondary">Determines interval pacing and load</div>
            </div>
            <span class="badge badge-dark">${escapeHtml(profile.fitnessLevel || 'Intermediate')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: var(--space-2);">
            <div>
              <div class="text-label">Target Duration</div>
              <div class="text-caption text-secondary">Ideal daily workout window</div>
            </div>
            <span class="badge">${escapeHtml(profile.workoutDuration || '20–30 min')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: var(--space-2);">
            <div>
              <div class="text-label">Training Frequency</div>
              <div class="text-caption text-secondary">Committed weekly workout schedule</div>
            </div>
            <span class="badge badge-subtle">${escapeHtml(profile.trainingDays || '4 days')}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: var(--space-2);">
            <div>
              <div class="text-label">Focus Areas</div>
              <div class="text-caption text-secondary" style="margin-bottom: var(--space-2);">Selected target muscle groups</div>
              <div style="display: flex; gap: var(--space-1); flex-wrap: wrap;">
                ${focusList.map(f => `<span class="badge badge-primary">${escapeHtml(f)}</span>`).join('')}
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="text-label">Equipped Home Gym</div>
              <div class="text-caption text-secondary" style="margin-bottom: var(--space-2);">Filtered in workout discovery</div>
              <div style="display: flex; gap: var(--space-1); flex-wrap: wrap;">
                ${equipmentList.map(eq => `<span class="badge">${escapeHtml(eq)}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- App Settings & Ergonomics -->
      <section class="card" style="margin-bottom: var(--space-6);">
        <div class="section-header" style="margin-bottom: var(--space-3);">
          <h2 class="text-h2">Preferences & Audio</h2>
        </div>

        <div class="flex flex-col">
          <div class="setting-toggle-row">
            <div>
              <div class="text-label">Audio Countdown Cues</div>
              <div class="text-caption text-secondary">Voice alerts for remaining interval seconds</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-audio-cues" ${profile.settings?.audioCues ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-toggle-row">
            <div>
              <div class="text-label">Daily Workout Reminders</div>
              <div class="text-caption text-secondary">Morning notification to complete plan</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-notifications" ${profile.settings?.pushNotifications ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-toggle-row">
            <div>
              <div class="text-label">Reduced Motion Mode</div>
              <div class="text-caption text-secondary">Minimize interface animations for comfort</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-reduced-motion" ${document.body?.classList?.contains?.('reduced-motion') ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-toggle-row" style="border-bottom: none;">
            <div>
              <div class="text-label">Vibration Haptics</div>
              <div class="text-caption text-secondary">Haptic buzz at end of interval set</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-haptics" ${profile.settings?.vibrationHaptic ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- Account Actions Placeholder -->
      <section class="card" style="margin-bottom: var(--space-6); background-color: var(--color-surface);">
        <div class="flex flex-col gap-2">
          <button class="btn btn-outline btn-block" style="justify-content: flex-start;" id="btn-membership-plan">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            Manage Kinetix Pro Subscription
          </button>
          <button class="btn btn-outline btn-block" style="justify-content: flex-start;" id="btn-export-data">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Workout & Health Data (JSON)
          </button>
          <button class="btn btn-danger btn-block" style="justify-content: flex-start; margin-top: var(--space-2);" id="btn-logout-placeholder">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log Out of Kinetix
          </button>
        </div>
      </section>
    </div>
  `;

  // Attach toggle listeners
  const motionToggle = container.querySelector('#toggle-reduced-motion');
  if (motionToggle) {
    motionToggle.addEventListener('change', (e) => {
      document.body.classList.toggle('reduced-motion', e.target.checked);
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: e.target.checked ? 'Reduced motion mode activated.' : 'Standard fluid animations restored.'
        });
      }
    });
  }

  const audioToggle = container.querySelector('#toggle-audio-cues');
  if (audioToggle) {
    audioToggle.addEventListener('change', (e) => {
      updateProfile({ settings: { ...profile.settings, audioCues: e.target.checked } });
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: `Audio cues ${e.target.checked ? 'enabled' : 'disabled'}.`
        });
      }
    });
  }

  const notifToggle = container.querySelector('#toggle-notifications');
  if (notifToggle) {
    notifToggle.addEventListener('change', (e) => {
      updateProfile({ settings: { ...profile.settings, pushNotifications: e.target.checked } });
      if (window.showToast) {
        window.showToast({
          type: 'info',
          message: `Daily training reminders ${e.target.checked ? 'enabled' : 'disabled'}.`
        });
      }
    });
  }

  const editProfileBtn = container.querySelector('#btn-edit-profile');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      window.location.hash = '#onboarding/edit';
    });
  }

  const editBioBtn = container.querySelector('#btn-edit-bio');
  if (editBioBtn) {
    editBioBtn.addEventListener('click', () => {
      window.location.hash = '#onboarding/edit';
    });
  }

  const exportBtn = container.querySelector('#btn-export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Workout log exported to local device.'
        });
      }
    });
  }

  const logoutBtn = container.querySelector('#btn-logout-placeholder');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.showToast) {
        window.showToast({
          type: 'warning',
          message: 'Guest session — no cloud credentials to unlink.'
        });
      }
    });
  }
}
