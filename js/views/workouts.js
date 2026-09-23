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

  // Temporary staging state while bottom sheet is open
  let tempDifficulty = activeDifficulty;
  let tempDuration = activeDuration;
  let tempEquipment = activeEquipment;

  function filterWorkouts() {
    return WORKOUTS.filter(w => {
      // Category match
      if (activeCategory !== 'All' && w.category !== activeCategory) return false;
      // Difficulty match
      if (activeDifficulty !== 'All' && w.difficulty !== activeDifficulty) return false;
      // Equipment match
      if (activeEquipment !== 'All') {
        const eq = activeEquipment.toLowerCase();
        const wEq = w.equipment.toLowerCase();
        if (eq === 'bodyweight' && wEq !== 'bodyweight') return false;
        if (eq.includes('dumbbell') && !wEq.includes('dumbbell')) return false;
        if (eq === 'kettlebell' && !wEq.includes('kettlebell')) return false;
        if (eq.includes('band') && !wEq.includes('band')) return false;
      }
      // Duration match (5-15, 15-30, 30-45, 45+)
      if (activeDuration === '5-15' && (w.durationMin < 5 || w.durationMin > 15)) return false;
      if (activeDuration === '15-30' && (w.durationMin <= 15 || w.durationMin > 30)) return false;
      if (activeDuration === '30-45' && (w.durationMin <= 30 || w.durationMin > 45)) return false;
      if (activeDuration === '45+' && w.durationMin <= 45) return false;
      // Legacy durations (<20, 20-30, 30+)
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

  function getActiveFilterCount() {
    let count = 0;
    if (activeDifficulty !== 'All') count++;
    if (activeDuration !== 'All') count++;
    if (activeEquipment !== 'All') count++;
    return count;
  }

  function updateFilterTriggerButton() {
    const triggerText = container.querySelector('#mobile-filter-btn-text');
    const count = getActiveFilterCount();
    if (triggerText) {
      triggerText.textContent = count > 0 ? `Filters • ${count} selected` : 'Filters';
    }
  }

  function updateFilterSelects() {
    const diffSelect = container.querySelector('#filter-select-difficulty');
    const durSelect = container.querySelector('#filter-select-duration');
    const eqSelect = container.querySelector('#filter-select-equipment');
    if (diffSelect) diffSelect.value = activeDifficulty;
    if (durSelect) durSelect.value = activeDuration;
    if (eqSelect) eqSelect.value = activeEquipment;
    updateFilterTriggerButton();
  }

  function updateSheetChips() {
    container.querySelectorAll('[data-sheet-filter="difficulty"]').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-value') === tempDifficulty);
    });
    container.querySelectorAll('[data-sheet-filter="duration"]').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-value') === tempDuration);
    });
    container.querySelectorAll('[data-sheet-filter="equipment"]').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-value') === tempEquipment);
    });
  }

  function openFilterSheet() {
    tempDifficulty = activeDifficulty;
    tempDuration = activeDuration;
    tempEquipment = activeEquipment;
    updateSheetChips();

    const sheet = container.querySelector('#workouts-filter-sheet');
    const backdrop = document.getElementById('modal-backdrop');
    if (sheet) {
      sheet.classList.add('is-active');
      sheet.setAttribute('aria-hidden', 'false');
    }
    if (backdrop) {
      backdrop.classList.add('is-active');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  }

  function closeFilterSheet() {
    const sheet = container.querySelector('#workouts-filter-sheet');
    const backdrop = document.getElementById('modal-backdrop');
    if (sheet) {
      sheet.classList.remove('is-active');
      sheet.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
      backdrop.classList.remove('is-active');
      backdrop.setAttribute('aria-hidden', 'true');
    }
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

      <!-- Category Filter Pills (Horizontal Scroll with subtle visual scroll affordance) -->
      <div class="filter-scroll-wrapper" id="category-scroll-wrapper">
        <div class="filter-pills-scroll" id="category-pills-scroll" role="toolbar" aria-label="Workout Categories">
          ${categories.map(c => `
            <button class="chip ${c === 'All' ? 'is-active' : ''}" data-category-pill="${c}" aria-pressed="${c === 'All'}">
              ${c}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Compact Mobile Filter Bar (< 768px) -->
      <div class="mobile-filter-bar">
        <button class="btn btn-outline btn-sm mobile-filter-trigger" id="btn-open-filter-sheet" aria-haspopup="dialog" aria-expanded="false">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span id="mobile-filter-btn-text">Filters</span>
        </button>

        <a href="#exercises" class="btn btn-ghost btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          Exercise Directory &rarr;
        </a>
      </div>

      <!-- Expanded Desktop Multi-Filter Toolbar (>= 768px) -->
      <div class="desktop-filter-bar multi-filter-bar">
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
          <option value="5-15">5–15 min</option>
          <option value="15-30">15–30 min</option>
          <option value="30-45">30–45 min</option>
          <option value="45+">45+ min</option>
        </select>

        <select id="filter-select-equipment" class="filter-select" aria-label="Filter by equipment">
          <option value="All">Equipment: All</option>
          <option value="Bodyweight">Bodyweight</option>
          <option value="Dumbbell">Dumbbell</option>
          <option value="Kettlebell">Kettlebell</option>
          <option value="Resistance Band">Resistance Band</option>
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

      <!-- Mobile Filter Bottom Sheet Dialog -->
      <div id="workouts-filter-sheet" class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title" aria-hidden="true">
        <div class="bottom-sheet-handle"></div>
        <div class="filter-sheet-header">
          <h2 class="filter-sheet-title" id="filter-sheet-title">Filter Workouts</h2>
          <button class="btn btn-ghost btn-icon btn-sm" id="btn-close-filter-sheet" aria-label="Close filters">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="filter-sheet-body">
          <!-- Difficulty -->
          <div class="filter-group">
            <span class="filter-group-label">Difficulty</span>
            <div class="filter-options-grid" id="sheet-options-difficulty">
              ${['All', 'Beginner', 'Intermediate', 'Advanced'].map(d => `
                <button type="button" class="chip ${activeDifficulty === d ? 'is-active' : ''}" data-sheet-filter="difficulty" data-value="${d}">
                  ${d}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Duration -->
          <div class="filter-group">
            <span class="filter-group-label">Duration</span>
            <div class="filter-options-grid" id="sheet-options-duration">
              ${[
                { label: 'Any', val: 'All' },
                { label: '5–15 min', val: '5-15' },
                { label: '15–30 min', val: '15-30' },
                { label: '30–45 min', val: '30-45' },
                { label: '45+ min', val: '45+' }
              ].map(item => `
                <button type="button" class="chip ${activeDuration === item.val ? 'is-active' : ''}" data-sheet-filter="duration" data-value="${item.val}">
                  ${item.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Equipment -->
          <div class="filter-group">
            <span class="filter-group-label">Equipment</span>
            <div class="filter-options-grid" id="sheet-options-equipment">
              ${[
                { label: 'All', val: 'All' },
                { label: 'Bodyweight', val: 'Bodyweight' },
                { label: 'Dumbbell', val: 'Dumbbell' },
                { label: 'Kettlebell', val: 'Kettlebell' },
                { label: 'Resistance Band', val: 'Resistance Band' }
              ].map(item => `
                <button type="button" class="chip ${activeEquipment === item.val ? 'is-active' : ''}" data-sheet-filter="equipment" data-value="${item.val}">
                  ${item.label}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="filter-sheet-footer">
          <button type="button" class="btn btn-secondary" id="btn-sheet-reset">Reset</button>
          <button type="button" class="btn btn-primary" id="btn-sheet-apply">Apply</button>
        </div>
      </div>
    </div>
  `;

  // Horizontal category scroll affordance check
  const scrollTrack = container.querySelector('#category-pills-scroll');
  const scrollWrapper = container.querySelector('#category-scroll-wrapper');
  if (scrollTrack && scrollWrapper) {
    function checkScrollAffordance() {
      const isAtEnd = scrollTrack.scrollLeft + scrollTrack.clientWidth >= scrollTrack.scrollWidth - 8;
      scrollWrapper.classList.toggle('is-scrolled-end', isAtEnd);
    }
    scrollTrack.addEventListener('scroll', checkScrollAffordance, { passive: true });
    setTimeout(checkScrollAffordance, 50);
  }

  // Mobile Bottom Sheet Event Handlers
  const openSheetBtn = container.querySelector('#btn-open-filter-sheet');
  const closeSheetBtn = container.querySelector('#btn-close-filter-sheet');
  const backdrop = document.getElementById('modal-backdrop');
  const sheetResetBtn = container.querySelector('#btn-sheet-reset');
  const sheetApplyBtn = container.querySelector('#btn-sheet-apply');

  if (openSheetBtn) {
    openSheetBtn.addEventListener('click', openFilterSheet);
  }
  if (closeSheetBtn) {
    closeSheetBtn.addEventListener('click', closeFilterSheet);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeFilterSheet);
  }

  // Keydown Escape handler for accessibility
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      closeFilterSheet();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  // Sheet Option Chips
  container.querySelectorAll('[data-sheet-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.getAttribute('data-sheet-filter');
      const val = chip.getAttribute('data-value');
      if (type === 'difficulty') tempDifficulty = val;
      if (type === 'duration') tempDuration = val;
      if (type === 'equipment') tempEquipment = val;
      updateSheetChips();
    });
  });

  // Sheet Reset
  if (sheetResetBtn) {
    sheetResetBtn.addEventListener('click', () => {
      tempDifficulty = 'All';
      tempDuration = 'All';
      tempEquipment = 'All';
      updateSheetChips();
    });
  }

  // Sheet Apply
  if (sheetApplyBtn) {
    sheetApplyBtn.addEventListener('click', () => {
      activeDifficulty = tempDifficulty;
      activeDuration = tempDuration;
      activeEquipment = tempEquipment;
      updateFilterSelects();
      closeFilterSheet();
      renderList();
    });
  }

  // Attach search listener
  const searchInput = container.querySelector('#workouts-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const spotlight = container.querySelector('#workouts-featured-spotlight');
      if (spotlight) {
        spotlight.style.display = searchQuery.trim() ? 'none' : 'block';
      }
      renderList();
    });
  }

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
  if (diffSelect) {
    diffSelect.addEventListener('change', (e) => {
      activeDifficulty = e.target.value;
      updateFilterTriggerButton();
      renderList();
    });
  }

  const durSelect = container.querySelector('#filter-select-duration');
  if (durSelect) {
    durSelect.addEventListener('change', (e) => {
      activeDuration = e.target.value;
      updateFilterTriggerButton();
      renderList();
    });
  }

  const eqSelect = container.querySelector('#filter-select-equipment');
  if (eqSelect) {
    eqSelect.addEventListener('change', (e) => {
      activeEquipment = e.target.value;
      updateFilterTriggerButton();
      renderList();
    });
  }

  // Attach featured card click
  const featuredCard = container.querySelector('#featured-workout-card');
  if (featuredCard) {
    featuredCard.addEventListener('click', () => {
      window.location.hash = `#workout/${featured.id}`;
    });
  }

  // Initial render
  updateFilterTriggerButton();
  renderList();
}
