/**
 * EXERCISE LIBRARY - KINETIX
 * Phase 2: Exercise Database & Movement Explorer
 *
 * Full integration with the 40+ centralized exercise database,
 * multi-dimensional search & filtering, and rich modal inspection.
 */

import { EXERCISES, getExercisePlaceholderSvg, getExerciseById } from '../data/exercises.js';
import {
  EQUIPMENT_LABELS,
  CATEGORY_LABELS,
  MUSCLE_LABELS,
  FOCUS_AREA_TO_MUSCLES
} from '../data/taxonomy.js';

export function renderExerciseLibrary(container) {
  let activeMuscle = 'All';
  let activeEquipment = 'All';
  let activeCategory = 'All';
  let activeDifficulty = 'All';
  let searchQuery = '';

  const muscleChips = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Cardio', 'Mobility'];

  function filterExercises() {
    return EXERCISES.filter(ex => {
      // 1. Muscle filter
      if (activeMuscle !== 'All') {
        const canonicalFilterMuscles = FOCUS_AREA_TO_MUSCLES[activeMuscle] || [activeMuscle.toLowerCase()];
        const hasMuscle = (ex.primaryMuscles || []).some(m => canonicalFilterMuscles.includes(m)) ||
                          (ex.secondaryMuscles || []).some(m => canonicalFilterMuscles.includes(m));
        if (!hasMuscle) return false;
      }

      // 2. Equipment filter
      if (activeEquipment !== 'All') {
        if (!ex.equipment || !ex.equipment.includes(activeEquipment)) return false;
      }

      // 3. Category filter
      if (activeCategory !== 'All') {
        if (ex.category !== activeCategory) return false;
      }

      // 4. Difficulty filter
      if (activeDifficulty !== 'All') {
        if (ex.difficulty !== activeDifficulty) return false;
      }

      // 5. Text Search (name, muscles, equipment, category, movement pattern)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesCategory = ex.category.toLowerCase().includes(q);
        const matchesPattern = (ex.movementPattern || '').toLowerCase().includes(q);
        const matchesMuscles = (ex.primaryMuscles || []).some(m => m.toLowerCase().includes(q)) ||
                               (ex.secondaryMuscles || []).some(m => m.toLowerCase().includes(q));
        const matchesEquipment = (ex.equipment || []).some(eq => eq.toLowerCase().includes(q));

        if (!matchesName && !matchesCategory && !matchesPattern && !matchesMuscles && !matchesEquipment) {
          return false;
        }
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
          <p class="state-description">Try broadening your target muscle group, equipment, or category filter.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(ex => {
      const eqDisplay = (ex.equipment || [])
        .map(eq => EQUIPMENT_LABELS[eq] || eq)
        .filter(eq => eq !== 'No Equipment')
        .join(', ') || 'Bodyweight';

      const primaryDisplay = (ex.primaryMuscles || [])
        .map(m => MUSCLE_LABELS[m] || m)
        .join(', ');

      const secDisplay = (ex.secondaryMuscles || [])
        .map(m => MUSCLE_LABELS[m] || m)
        .join(', ');

      return `
        <div class="exercise-card card-interactive" data-exercise-id="${ex.id}" role="button" tabindex="0" aria-label="View details for ${ex.name}">
          <div class="exercise-thumb">
            ${getExercisePlaceholderSvg(ex.svgType || 'upper-push')}
          </div>
          <div class="exercise-info">
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-details">
              <strong>${primaryDisplay}</strong> &bull; ${eqDisplay} &bull; ${ex.defaultReps}
            </div>
            ${secDisplay ? `
              <div class="text-caption text-muted" style="margin-top: 2px;">
                Targets: ${secDisplay}
              </div>
            ` : ''}
          </div>
          <div class="exercise-action">
            <span class="badge ${ex.difficulty === 'beginner' || ex.difficulty === 'Beginner' ? 'badge-success' : ex.difficulty === 'intermediate' || ex.difficulty === 'Intermediate' ? 'badge-primary' : 'badge-dark'}">
              ${ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click to open detail modal
    listContainer.querySelectorAll('.exercise-card').forEach(card => {
      const openModal = () => {
        const exId = card.getAttribute('data-exercise-id');
        const ex = getExerciseById(exId);
        if (ex) {
          showExerciseModal(ex);
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
  }

  function showExerciseModal(ex) {
    const existingModal = document.querySelector('#exercise-detail-modal');
    if (existingModal) existingModal.remove();

    const primaryDisplay = (ex.primaryMuscles || []).map(m => MUSCLE_LABELS[m] || m).join(', ');
    const secDisplay = (ex.secondaryMuscles || []).map(m => MUSCLE_LABELS[m] || m).join(', ');
    const eqDisplay = (ex.equipment || []).map(eq => EQUIPMENT_LABELS[eq] || eq).join(', ');

    const instructionsList = Array.isArray(ex.instructions)
      ? ex.instructions.map((step, idx) => `<li style="margin-bottom: 6px;">${step}</li>`).join('')
      : `<li>${ex.instructions}</li>`;

    const modalHtml = `
      <div class="modal-backdrop is-active" id="exercise-detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-ex-title">
        <div class="modal-card view-enter" style="max-width: 540px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
            <div>
              <span class="badge badge-primary" style="margin-bottom: 6px;">${CATEGORY_LABELS[ex.category] || ex.category}</span>
              <h2 id="modal-ex-title" class="text-h2" style="margin: 0;">${ex.name}</h2>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-modal-close" aria-label="Close modal" style="font-size: 20px; line-height: 1; padding: 4px 8px;">
              &times;
            </button>
          </div>

          <!-- Media Demonstration Visual Stage -->
          <div class="player-media-stage" style="border-radius: var(--radius-md); aspect-ratio: 16 / 9; margin-bottom: var(--space-4);">
            ${getExercisePlaceholderSvg(ex.svgType || 'upper-push')}
            <span class="badge badge-dark" style="margin-top: var(--space-2); background: rgba(255, 255, 255, 0.15); color: #FFF;">
              Biomechanical Movement Demonstration
            </span>
          </div>

          <!-- Metadata Badges Strip -->
          <div class="grid grid-cols-2 grid-tablet-3 gap-2" style="margin-bottom: var(--space-4);">
            <div class="card" style="padding: var(--space-2) var(--space-3); text-align: center; background: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">DIFFICULTY</span>
              <div class="text-label" style="margin-top: 2px;">${ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1)}</div>
            </div>
            <div class="card" style="padding: var(--space-2) var(--space-3); text-align: center; background: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">DEFAULT SETS</span>
              <div class="text-label" style="margin-top: 2px;">${ex.defaultSets || 3} Sets</div>
            </div>
            <div class="card" style="padding: var(--space-2) var(--space-3); text-align: center; background: var(--color-surface-secondary); border: none;">
              <span class="text-caption text-muted">BURN RATE</span>
              <div class="text-label" style="margin-top: 2px;">~${ex.estimatedCaloriesPerMinute || 7} cal/min</div>
            </div>
          </div>

          <!-- Muscle Focus Details -->
          <div style="margin-bottom: var(--space-4);">
            <div class="text-label" style="margin-bottom: 4px;">Primary Muscle Target:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
              <span class="chip is-active" style="cursor: default;">${primaryDisplay}</span>
            </div>
            ${secDisplay ? `
              <div class="text-caption text-muted" style="margin-bottom: 4px;">Secondary Stabilizers:</div>
              <div class="text-body-sm" style="color: var(--color-text-secondary);">${secDisplay}</div>
            ` : ''}
          </div>

          <!-- Equipment Required -->
          <div style="margin-bottom: var(--space-4);">
            <div class="text-label" style="margin-bottom: 4px;">Required Equipment:</div>
            <div class="text-body-sm" style="color: var(--color-text-secondary);">${eqDisplay}</div>
          </div>

          <!-- Form & Biomechanical Instructions -->
          <div style="margin-bottom: var(--space-5);">
            <div class="text-label" style="margin-bottom: 6px;">Coaching & Technique Cues:</div>
            <ol class="text-body-sm" style="padding-left: 20px; line-height: 1.5; color: var(--color-text-secondary);">
              ${instructionsList}
            </ol>
          </div>

          <div style="text-align: right;">
            <button type="button" class="btn btn-primary" id="btn-modal-done" style="width: 100%;">Done</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.querySelector('#exercise-detail-modal');
    const closeBtn = modalEl.querySelector('#btn-modal-close');
    const doneBtn = modalEl.querySelector('#btn-modal-done');

    const closeModal = () => {
      modalEl.remove();
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };

    closeBtn.addEventListener('click', closeModal);
    doneBtn.addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
    document.addEventListener('keydown', handleEsc);
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
          <p class="section-subtitle">Biomechanically verified calisthenic and free-weight movement cues</p>
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
          placeholder="Search by movement, muscle, or gear (e.g. Squat, Chest, Dumbbell)..."
          autocomplete="off"
        >
      </div>

      <!-- Muscle Category Filter Scroll -->
      <div class="filter-pills-scroll" role="toolbar" aria-label="Target Muscles">
        ${muscleChips.map(m => `
          <button class="chip ${m === 'All' ? 'is-active' : ''}" data-muscle-chip="${m}" aria-pressed="${m === 'All'}">
            ${m}
          </button>
        `).join('')}
      </div>

      <!-- Multi-Filter Controls: Category, Equipment & Difficulty -->
      <div class="multi-filter-bar" style="margin-bottom: var(--space-5); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <select id="select-ex-category" class="filter-select" aria-label="Filter by category">
          <option value="All">Category: All</option>
          <option value="strength">Strength</option>
          <option value="hiit">HIIT</option>
          <option value="cardio">Cardio</option>
          <option value="core">Core</option>
          <option value="mobility">Mobility</option>
          <option value="warmup">Warmup</option>
          <option value="cooldown">Cooldown</option>
        </select>

        <select id="select-ex-equipment" class="filter-select" aria-label="Filter by equipment">
          <option value="All">Equipment: All</option>
          <option value="bodyweight">Bodyweight</option>
          <option value="dumbbell">Dumbbells</option>
          <option value="barbell">Barbell</option>
          <option value="kettlebell">Kettlebell</option>
          <option value="resistance-band">Resistance Band</option>
          <option value="pull-up-bar">Pull-up Bar</option>
          <option value="bench">Bench</option>
          <option value="cable">Cable Machine</option>
          <option value="machine">Machine</option>
        </select>

        <select id="select-ex-difficulty" class="filter-select" aria-label="Filter by difficulty">
          <option value="All">Difficulty: All</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
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
  const catSelect = container.querySelector('#select-ex-category');
  catSelect.addEventListener('change', (e) => {
    activeCategory = e.target.value;
    renderList();
  });

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
