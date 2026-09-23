/**
 * WORKOUTS DISCOVERY VIEW - KINETIX
 * Phase 1: Core Information Architecture
 */

import { WORKOUTS, getFeaturedWorkout } from '../data/workouts.js';

export function renderWorkouts(container) {
  let activeCategory = 'All';
  let activeDifficulty = 'All';
  let activeDuration = 'All';
  let activeEquipment = 'All';
  let searchQuery = '';

  const categories = ['All', 'Strength', 'HIIT', 'Cardio', 'Mobility', 'Core', 'Full Body', 'Recovery'];

  function filterWorkouts() {
    return WORKOUTS.filter(w => {
      // Category match
      if (activeCategory !== 'All' && w.category !== activeCategory) return false;
      // Difficulty match
      if (activeDifficulty !== 'All' && w.difficulty !== activeDifficulty) return false;
      // Equipment match
      if (activeEquipment !== 'All' && w.equipment !== activeEquipment) return false;
      // Duration match
      if (activeDuration === '<20' && w.durationMin >= 20) return false;
      if (activeDuration === '20-30' && (w.durationMin < 20 || w.durationMin > 30)) return false;
      if (activeDuration === '30+' && w.durationMin < 30) return false;
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = w.title.toLowerCase().includes(q);
        const matchesDesc = w.description.toLowerCase().includes(q);
        const matchesTarget = w.target.toLowerCase().includes(q);
        const matchesCategory = w.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTarget && !matchesCategory) return false;
      }
      return true;
    });
  }

  function renderList() {
    const listContainer = container.querySelector('#workouts-cards-grid');
    const countBadge = container.querySelector('#workouts-count-badge');
    const filtered = filterWorkouts();

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Workouts`;
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
          <h3 class="state-title">No Workouts Found</h3>
          <p class="state-description">Try adjusting your category, duration, or equipment filters to see more routines.</p>
          <button class="btn btn-secondary btn-sm" id="btn-reset-filters">Reset All Filters</button>
        </div>
      `;

      const resetBtn = listContainer.querySelector('#btn-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          activeCategory = 'All';
          activeDifficulty = 'All';
          activeDuration = 'All';
          activeEquipment = 'All';
          searchQuery = '';
          const searchInput = container.querySelector('#workouts-search-input');
          if (searchInput) searchInput.value = '';
          updateCategoryPills();
          updateFilterSelects();
          renderList();
        });
      }
      return;
    }

    listContainer.innerHTML = filtered.map(w => `
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
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <h3 class="workout-card-title">${w.title}</h3>
          </div>
          <p class="text-body-sm" style="margin-bottom: var(--space-3); line-height: 1.4;">${w.description}</p>
          <div class="workout-card-meta">
            <span class="workout-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              ${w.estimatedCalories} kcal
            </span>
            <span class="workout-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${w.difficulty}
            </span>
            <span class="workout-meta-item" style="margin-left: auto;">
              <span class="badge" style="font-size: 11px;">${w.equipment}</span>
            </span>
          </div>
        </div>
      </article>
    `).join('');

    listContainer.querySelectorAll('.workout-card').forEach(card => {
      card.addEventListener('click', () => {
        const wid = card.getAttribute('data-workout-id');
        window.location.hash = `#workout/${wid}`;
      });
    });
  }

  function updateCategoryPills() {
    container.querySelectorAll('[data-category-pill]').forEach(pill => {
      const cat = pill.getAttribute('data-category-pill');
      if (cat === activeCategory) {
        pill.classList.add('is-active');
        pill.setAttribute('aria-pressed', 'true');
      } else {
        pill.classList.remove('is-active');
        pill.setAttribute('aria-pressed', 'false');
      }
    });
  }

  function updateFilterSelects() {
    const diffSelect = container.querySelector('#filter-select-difficulty');
    const durSelect = container.querySelector('#filter-select-duration');
    const eqSelect = container.querySelector('#filter-select-equipment');
    if (diffSelect) diffSelect.value = activeDifficulty;
    if (durSelect) durSelect.value = activeDuration;
    if (eqSelect) eqSelect.value = activeEquipment;
  }

  const featured = getFeaturedWorkout();

  container.innerHTML = `
    <div class="view-enter">
      <!-- Section Title & Meta -->
      <div class="section-header">
        <div>
          <h1 class="text-h1">Explore Workouts</h1>
          <p class="section-subtitle">Targeted training sessions for every fitness goal and timeframe</p>
        </div>
        <span class="badge badge-primary" id="workouts-count-badge">${WORKOUTS.length} Workouts</span>
      </div>

      <!-- Search Input -->
      <div class="search-wrapper">
        <svg class="search-icon-left" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          id="workouts-search-input"
          class="search-input"
          placeholder="Search by routine, muscle, or goal (e.g. HIIT, Core, Dumbbells)..."
          autocomplete="off"
        >
      </div>

      <!-- Category Filter Pills (Horizontal Scroll) -->
      <div class="filter-pills-scroll" role="toolbar" aria-label="Workout Categories">
        ${categories.map(c => `
          <button class="chip ${c === 'All' ? 'is-active' : ''}" data-category-pill="${c}" aria-pressed="${c === 'All'}">
            ${c}
          </button>
        `).join('')}
      </div>

      <!-- Multi-Filter Toolbar -->
      <div class="multi-filter-bar">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="text-caption text-muted" style="font-weight: 600;">FILTERS:</span>
        </div>

        <select id="filter-select-difficulty" class="filter-select" aria-label="Filter by difficulty">
          <option value="All">Difficulty: All</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select id="filter-select-duration" class="filter-select" aria-label="Filter by duration">
          <option value="All">Duration: Any</option>
          <option value="<20">&lt; 20 Min</option>
          <option value="20-30">20–30 Min</option>
          <option value="30+">30+ Min</option>
        </select>

        <select id="filter-select-equipment" class="filter-select" aria-label="Filter by equipment">
          <option value="All">Equipment: All</option>
          <option value="Bodyweight">Bodyweight Only</option>
          <option value="Dumbbells">Dumbbells</option>
          <option value="Kettlebell">Kettlebell</option>
        </select>

        <a href="#exercises" class="btn btn-ghost btn-sm" style="margin-left: auto;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          Exercise Directory &rarr;
        </a>
      </div>

      <!-- Featured Spotlight (shown when no specific search is active) -->
      <div id="workouts-featured-spotlight" style="margin-bottom: var(--space-5);">
        <div class="text-caption text-muted" style="font-weight: 700; letter-spacing: 0.05em; margin-bottom: var(--space-2);">FEATURED ROUTINE</div>
        <div class="card card-interactive" id="featured-workout-card" data-workout-id="${featured.id}" style="border-left: 4px solid var(--color-primary);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-2);">
            <div>
              <span class="badge badge-primary" style="margin-bottom: 6px;">Staff Pick</span>
              <h3 class="text-h2" style="margin-bottom: 4px;">${featured.title}</h3>
              <p class="text-body-sm" style="max-width: 600px;">${featured.description}</p>
            </div>
            <div style="display: flex; gap: var(--space-2); align-items: center;">
              <span class="badge">${featured.durationMin} MIN</span>
              <span class="badge badge-success">${featured.estimatedCalories} kcal</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Grid -->
      <div class="grid grid-cols-1 grid-tablet-2 grid-desktop-3 gap-4" id="workouts-cards-grid"></div>
    </div>
  `;

  // Attach search listener
  const searchInput = container.querySelector('#workouts-search-input');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    const spotlight = container.querySelector('#workouts-featured-spotlight');
    if (spotlight) {
      spotlight.style.display = searchQuery.trim() ? 'none' : 'block';
    }
    renderList();
  });

  // Attach category pill clicks
  container.querySelectorAll('[data-category-pill]').forEach(pill => {
    pill.addEventListener('click', () => {
      activeCategory = pill.getAttribute('data-category-pill');
      updateCategoryPills();
      renderList();
    });
  });

  // Attach dropdown filters
  const diffSelect = container.querySelector('#filter-select-difficulty');
  diffSelect.addEventListener('change', (e) => {
    activeDifficulty = e.target.value;
    renderList();
  });

  const durSelect = container.querySelector('#filter-select-duration');
  durSelect.addEventListener('change', (e) => {
    activeDuration = e.target.value;
    renderList();
  });

  const eqSelect = container.querySelector('#filter-select-equipment');
  eqSelect.addEventListener('change', (e) => {
    activeEquipment = e.target.value;
    renderList();
  });

  // Attach featured card click
  const featuredCard = container.querySelector('#featured-workout-card');
  if (featuredCard) {
    featuredCard.addEventListener('click', () => {
      window.location.hash = `#workout/${featured.id}`;
    });
  }

  // Initial render
  renderList();
}
