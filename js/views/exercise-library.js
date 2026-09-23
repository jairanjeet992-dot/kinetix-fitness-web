/**
 * EXERCISE LIBRARY PREVIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { EXERCISES, getExercisePlaceholderSvg } from '../data/exercises.js';

export function renderExerciseLibrary(container) {
  let activeMuscle = 'All';
  let activeEquipment = 'All';
  let activeDifficulty = 'All';
  let searchQuery = '';

  const muscles = ['All', 'Chest', 'Legs', 'Back', 'Core', 'Shoulders', 'Arms', 'Glutes', 'Full Body'];

  function filterExercises() {
    return EXERCISES.filter(ex => {
      if (activeMuscle !== 'All' && ex.primaryMuscle !== activeMuscle) return false;
      if (activeEquipment !== 'All' && ex.equipment !== activeEquipment) return false;
      if (activeDifficulty !== 'All' && ex.difficulty !== activeDifficulty) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesMuscle = ex.primaryMuscle.toLowerCase().includes(q);
        const matchesEq = ex.equipment.toLowerCase().includes(q);
        if (!matchesName && !matchesMuscle && !matchesEq) return false;
      }
      return true;
    });
  }

  function renderList() {
    const listContainer = container.querySelector('#exercises-grid');
    const countBadge = container.querySelector('#exercises-count-badge');
    const filtered = filterExercises();

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Exercises`;
    }

    if (!listContainer) return;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="state-container" style="grid-column: 1 / -1; margin-top: var(--space-4);">
          <div class="state-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28" height="28" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 class="state-title">No Exercises Matched</h3>
          <p class="state-description">Try broadening your target muscle group or equipment filter.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(ex => `
      <div class="exercise-card card-interactive" data-exercise-id="${ex.id}">
        <div class="exercise-thumb">
          ${getExercisePlaceholderSvg(ex.svgType)}
        </div>
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-details">
            <strong>${ex.primaryMuscle}</strong> &bull; ${ex.equipment} &bull; ${ex.defaultReps}
          </div>
          <div class="text-caption text-muted" style="margin-top: 2px;">
            Targets: ${ex.secondaryMuscles.join(', ')}
          </div>
        </div>
        <div class="exercise-action">
          <span class="badge ${ex.difficulty === 'Beginner' ? 'badge-success' : ex.difficulty === 'Intermediate' ? 'badge-primary' : 'badge-dark'}">
            ${ex.difficulty}
          </span>
        </div>
      </div>
    `).join('');

    // Attach card click to show details
    listContainer.querySelectorAll('.exercise-card').forEach(card => {
      card.addEventListener('click', () => {
        const exId = card.getAttribute('data-exercise-id');
        const ex = EXERCISES.find(e => e.id === exId);
        if (ex && window.showToast) {
          window.showToast({
            type: 'info',
            message: `${ex.name}: ${ex.instructions}`
          });
        }
      });
    });
  }

  container.innerHTML = `
    <div class="view-enter">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
        <a href="#workouts" class="btn btn-ghost btn-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Workouts
        </a>
        <span class="badge badge-primary" id="exercises-count-badge">${EXERCISES.length} Exercises</span>
      </div>

      <div class="section-header">
        <div>
          <h1 class="text-h1">Movement & Form Library</h1>
          <p class="section-subtitle">Calisthenic and free-weight movement cues calibrated for optimal biomechanics</p>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-wrapper">
        <svg class="search-icon-left" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          id="exercise-search-input"
          class="search-input"
          placeholder="Search by movement name (e.g. Squat, Plank, Lunge)..."
          autocomplete="off"
        >
      </div>

      <!-- Muscle Category Filter Scroll -->
      <div class="filter-pills-scroll" role="toolbar" aria-label="Target Muscles">
        ${muscles.map(m => `
          <button class="chip ${m === 'All' ? 'is-active' : ''}" data-muscle-chip="${m}" aria-pressed="${m === 'All'}">
            ${m}
          </button>
        `).join('')}
      </div>

      <!-- Equipment & Difficulty Dropdowns -->
      <div class="multi-filter-bar" style="margin-bottom: var(--space-5);">
        <select id="select-ex-equipment" class="filter-select" aria-label="Filter by equipment">
          <option value="All">Equipment: All</option>
          <option value="Bodyweight">Bodyweight</option>
          <option value="Dumbbells">Dumbbells</option>
          <option value="Kettlebell">Kettlebell</option>
        </select>

        <select id="select-ex-difficulty" class="filter-select" aria-label="Filter by difficulty">
          <option value="All">Difficulty: All</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      <!-- Exercises List Grid -->
      <div class="grid grid-cols-1 grid-tablet-2 gap-3" id="exercises-grid"></div>
    </div>
  `;

  // Attach search listener
  const searchInput = container.querySelector('#exercise-search-input');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  // Attach muscle chip listeners
  container.querySelectorAll('[data-muscle-chip]').forEach(chip => {
    chip.addEventListener('click', () => {
      activeMuscle = chip.getAttribute('data-muscle-chip');
      container.querySelectorAll('[data-muscle-chip]').forEach(c => {
        const isMatch = c.getAttribute('data-muscle-chip') === activeMuscle;
        c.classList.toggle('is-active', isMatch);
        c.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      });
      renderList();
    });
  });

  // Attach dropdown listeners
  const eqSelect = container.querySelector('#select-ex-equipment');
  eqSelect.addEventListener('change', (e) => {
    activeEquipment = e.target.value;
    renderList();
  });

  const diffSelect = container.querySelector('#select-ex-difficulty');
  diffSelect.addEventListener('change', (e) => {
    activeDifficulty = e.target.value;
    renderList();
  });

  // Initial render
  renderList();
}
