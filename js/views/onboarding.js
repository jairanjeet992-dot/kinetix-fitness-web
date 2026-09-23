/**
 * ONBOARDING VIEW - KINETIX
 * Phase 2: Personalized Fitness Onboarding
 *
 * 8-Step mobile-first onboarding journey collecting core fitness preferences,
 * with state persistence, validation, skip options, and edit-mode support.
 */

import { getProfile, completeOnboarding } from '../state/profile.js';

export function renderOnboarding(container, mode = 'new') {
  const isEditMode = mode === 'edit';
  const existingProfile = getProfile();

  // Wizard state initialized from existing profile
  const wizardState = {
    name: existingProfile.name || 'Athlete',
    goal: existingProfile.goal || 'Build Muscle',
    fitnessLevel: existingProfile.fitnessLevel || 'Intermediate',
    focusAreas: Array.isArray(existingProfile.focusAreas) && existingProfile.focusAreas.length > 0
      ? [...existingProfile.focusAreas]
      : ['Full Body'],
    equipment: Array.isArray(existingProfile.equipment) && existingProfile.equipment.length > 0
      ? [...existingProfile.equipment]
      : ['Dumbbells', 'Resistance Bands'],
    trainingDays: existingProfile.trainingDays || '4 days',
    workoutDuration: existingProfile.workoutDuration || '20–30 min',
    age: existingProfile.stats?.age || '',
    height: existingProfile.stats?.height || '',
    weight: existingProfile.stats?.weight || ''
  };

  // Step 0: Welcome, 1: Goal, 2: Level, 3: Focus, 4: Equipment, 5: Frequency, 6: Duration, 7: Profile Info, 8: Completion
  let currentStep = isEditMode ? 1 : 0;
  const TOTAL_QUESTION_STEPS = 7;

  function renderCurrentStep() {
    window.scrollTo({ top: 0, behavior: 'instant' });

    let stepHtml = '';
    switch (currentStep) {
      case 0:
        stepHtml = renderWelcome();
        break;
      case 1:
        stepHtml = renderGoal();
        break;
      case 2:
        stepHtml = renderLevel();
        break;
      case 3:
        stepHtml = renderFocus();
        break;
      case 4:
        stepHtml = renderEquipment();
        break;
      case 5:
        stepHtml = renderFrequency();
        break;
      case 6:
        stepHtml = renderDuration();
        break;
      case 7:
        stepHtml = renderProfileInfo();
        break;
      case 8:
        stepHtml = renderCompletion();
        break;
      default:
        currentStep = 1;
        stepHtml = renderGoal();
        break;
    }

    container.innerHTML = `
      <div class="onboarding-screen view-enter">
        <div class="onboarding-container">
          ${currentStep > 0 && currentStep <= TOTAL_QUESTION_STEPS ? renderHeader() : ''}
          <div class="onboarding-content">
            ${stepHtml}
          </div>
        </div>
      </div>
    `;

    attachStepEvents();
  }

  /* --------------------------------------------------------------------------
     Header with Step Counter and Progress Bar
     -------------------------------------------------------------------------- */
  function renderHeader() {
    const pct = Math.round((currentStep / TOTAL_QUESTION_STEPS) * 100);
    return `
      <header class="onboarding-header">
        <button type="button" class="onboarding-header-action" id="btn-onboarding-back" aria-label="Go to previous step">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div class="onboarding-progress-wrap">
          <span class="onboarding-step-label">${currentStep} of ${TOTAL_QUESTION_STEPS}</span>
          <div class="onboarding-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="onboarding-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <button type="button" class="onboarding-skip-link" id="btn-onboarding-skip-step">
          Skip
        </button>
      </header>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 0: Welcome Screen
     -------------------------------------------------------------------------- */
  function renderWelcome() {
    return `
      <div class="onboarding-welcome-hero">
        <div class="onboarding-brand-mark">K</div>
        <h1 class="onboarding-welcome-title">KINETIX</h1>
        <p class="text-h2" style="font-weight: 700; margin-bottom: var(--space-3); color: var(--color-text-primary);">
          Build a stronger version of yourself.
        </p>
        <p class="onboarding-welcome-tagline">
          Personalized workouts built around your goals, time and equipment.
        </p>

        <div class="onboarding-feature-pills">
          <span class="badge badge-primary">Dynamic Routines</span>
          <span class="badge badge-success">Smart Periodization</span>
          <span class="badge">Bodyweight & Free Weights</span>
        </div>

        <div class="onboarding-footer" style="width: 100%; max-width: 380px;">
          <button type="button" class="btn btn-primary btn-lg" id="btn-welcome-start">
            Get Started
          </button>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-welcome-skip" style="color: var(--color-text-muted);">
            Skip for now
          </button>
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 1: Goal Screen (Single Choice)
     -------------------------------------------------------------------------- */
  function renderGoal() {
    const goals = [
      { id: 'Build Muscle', title: 'Build Muscle', desc: 'Hypertrophy focused volume for lean muscular gains' },
      { id: 'Lose Fat', title: 'Lose Fat', desc: 'High-cadence metabolic intervals maximizing caloric burn' },
      { id: 'Get Stronger', title: 'Get Stronger', desc: 'Heavy compound mechanical tension and raw force output' },
      { id: 'Improve Endurance', title: 'Improve Endurance', desc: 'Aerobic ladders and sustained stamina training' },
      { id: 'Improve Fitness', title: 'Improve Fitness', desc: 'Balanced functional athleticism, power, and conditioning' },
      { id: 'Stay Active', title: 'Stay Active', desc: 'Low-impact daily movement, joint health, and vitality' }
    ];

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What is your main goal?</h1>
        <p class="onboarding-hint">Select the primary outcome you want your routines calibrated for.</p>
      </div>

      <div class="onboarding-cards-stack" role="radiogroup" aria-label="Fitness goals">
        ${goals.map(g => {
          const isSelected = wizardState.goal === g.id;
          return `
            <div class="onboarding-option-card ${isSelected ? 'is-selected' : ''}" data-goal="${g.id}" role="radio" aria-checked="${isSelected}" tabindex="0">
              <div class="onboarding-option-info">
                <div class="onboarding-option-title">${g.title}</div>
                <div class="onboarding-option-desc">${g.desc}</div>
              </div>
              <div class="onboarding-radio-dot"></div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue" ${!wizardState.goal ? 'disabled' : ''}>
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 2: Fitness Level Screen (Single Choice)
     -------------------------------------------------------------------------- */
  function renderLevel() {
    const levels = [
      { id: 'Beginner', title: 'Beginner', desc: 'New to structured training.' },
      { id: 'Intermediate', title: 'Intermediate', desc: 'Training consistently and comfortable with the basics.' },
      { id: 'Advanced', title: 'Advanced', desc: 'Experienced with structured training.' }
    ];

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What's your current fitness level?</h1>
        <p class="onboarding-hint">We will calibrate movement complexity and work-to-rest intervals to your baseline.</p>
      </div>

      <div class="onboarding-cards-stack" role="radiogroup" aria-label="Fitness levels">
        ${levels.map(l => {
          const isSelected = wizardState.fitnessLevel === l.id;
          return `
            <div class="onboarding-option-card ${isSelected ? 'is-selected' : ''}" data-level="${l.id}" role="radio" aria-checked="${isSelected}" tabindex="0">
              <div class="onboarding-option-info">
                <div class="onboarding-option-title">${l.title}</div>
                <div class="onboarding-option-desc">${l.desc}</div>
              </div>
              <div class="onboarding-radio-dot"></div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue" ${!wizardState.fitnessLevel ? 'disabled' : ''}>
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 3: Focus Areas Screen (Multiple Selection, max 3)
     -------------------------------------------------------------------------- */
  function renderFocus() {
    const areas = ['Full Body', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Mobility'];
    const count = wizardState.focusAreas.length;
    const isFullBodyActive = wizardState.focusAreas.includes('Full Body');

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What would you like to focus on?</h1>
        <p class="onboarding-hint">Choose up to 3. Selected: <strong>${count} of 3</strong></p>
      </div>

      <div class="onboarding-grid-chips">
        ${areas.map(area => {
          const isSelected = wizardState.focusAreas.includes(area);
          const isDisabled = !isSelected && count >= 3;
          return `
            <div class="onboarding-grid-item ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}" data-focus="${area}" role="checkbox" aria-checked="${isSelected}" tabindex="0">
              <span class="onboarding-grid-label">${area}</span>
              <div class="onboarding-check-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue" ${count === 0 ? 'disabled' : ''}>
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 4: Equipment Screen (Multiple Selection, "No Equipment" mutual exclusion)
     -------------------------------------------------------------------------- */
  function renderEquipment() {
    const equipmentList = [
      'No Equipment',
      'Dumbbells',
      'Barbell',
      'Kettlebell',
      'Resistance Bands',
      'Pull-up Bar',
      'Bench',
      'Cable Machine',
      'Machines',
      'TRX',
      'Medicine Ball',
      'Exercise Ball'
    ];

    const hasSelection = wizardState.equipment.length > 0;

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What equipment do you have?</h1>
        <p class="onboarding-hint">You can change this later. We'll only suggest exercises matching your gear.</p>
      </div>

      <div class="onboarding-grid-chips">
        ${equipmentList.map(eq => {
          const isSelected = wizardState.equipment.includes(eq);
          return `
            <div class="onboarding-grid-item ${isSelected ? 'is-selected' : ''}" data-equipment="${eq}" role="checkbox" aria-checked="${isSelected}" tabindex="0">
              <span class="onboarding-grid-label">${eq}</span>
              <div class="onboarding-check-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue" ${!hasSelection ? 'disabled' : ''}>
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 5: Training Frequency (Single Choice)
     -------------------------------------------------------------------------- */
  function renderFrequency() {
    const frequencies = [
      { id: '2 days', title: '2 days per week', desc: 'Gentle cadence ideal for active maintenance' },
      { id: '3 days', title: '3 days per week', desc: 'Classic full-body split with plenty of rest days' },
      { id: '4 days', title: '4 days per week', desc: 'Optimal balance of stimulus and systemic recovery' },
      { id: '5 days', title: '5 days per week', desc: 'Upper/Lower or Push/Pull target periodization' },
      { id: '6 days', title: '6 days per week', desc: 'High frequency for committed athletic regimens' },
      { id: 'Every day', title: 'Every day', desc: 'Daily habit consisting of workouts and mobility flows' }
    ];

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">How often do you want to train?</h1>
        <p class="onboarding-hint">Select your weekly target commitment.</p>
      </div>

      <div class="onboarding-cards-stack" role="radiogroup" aria-label="Training frequencies">
        ${frequencies.map(f => {
          const isSelected = wizardState.trainingDays === f.id;
          return `
            <div class="onboarding-option-card ${isSelected ? 'is-selected' : ''}" data-frequency="${f.id}" role="radio" aria-checked="${isSelected}" tabindex="0">
              <div class="onboarding-option-info">
                <div class="onboarding-option-title">${f.title}</div>
                <div class="onboarding-option-desc">${f.desc}</div>
              </div>
              <div class="onboarding-radio-dot"></div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue" ${!wizardState.trainingDays ? 'disabled' : ''}>
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 6: Workout Duration (Single Choice)
     -------------------------------------------------------------------------- */
  function renderDuration() {
    const durations = [
      { id: '5–10 min', title: '5–10 min', desc: 'Ultra-fast daily micro-routines and primers' },
      { id: '10–20 min', title: '10–20 min', desc: 'High-density efficient interval training' },
      { id: '20–30 min', title: '20–30 min', desc: 'The golden zone for conditioning & calorie burn' },
      { id: '30–45 min', title: '30–45 min', desc: 'Full progressive routines with multiple working sets' },
      { id: '45–60 min', title: '45–60 min', desc: 'Comprehensive athletic conditioning sessions' },
      { id: '60+ min', title: '60+ min', desc: 'Extended high-volume bodybuilding and endurance' }
    ];

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">How much time do you have?</h1>
        <p class="onboarding-hint">Choose your preferred routine length per session.</p>
      </div>

      <div class="onboarding-cards-stack" role="radiogroup" aria-label="Workout durations">
        ${durations.map(d => {
          const isSelected = wizardState.workoutDuration === d.id;
          return `
            <div class="onboarding-option-card ${isSelected ? 'is-selected' : ''}" data-duration="${d.id}" role="radio" aria-checked="${isSelected}" tabindex="0">
              <div class="onboarding-option-info">
                <div class="onboarding-option-title">${d.title}</div>
                <div class="onboarding-option-desc">${d.desc}</div>
              </div>
              <div class="onboarding-radio-dot"></div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue" ${!wizardState.workoutDuration ? 'disabled' : ''}>
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 7: Optional Profile Information
     -------------------------------------------------------------------------- */
  function renderProfileInfo() {
    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">Tell us a little more about you</h1>
        <p class="onboarding-hint">Helps tailor energy output estimates. All fields are optional except your name.</p>
      </div>

      <div style="background-color: var(--color-surface); padding: var(--space-5); border-radius: var(--radius-xl); border: 1px solid var(--color-border); margin-bottom: var(--space-6);">
        <div class="onboarding-form-group">
          <label class="onboarding-form-label" for="onboarding-input-name">Your Name *</label>
          <input type="text" id="onboarding-input-name" class="onboarding-input" placeholder="e.g. Alex Morgan" value="${wizardState.name}" required autocomplete="name">
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
          <div class="onboarding-form-group">
            <label class="onboarding-form-label" for="onboarding-input-age">Age</label>
            <input type="number" id="onboarding-input-age" class="onboarding-input" placeholder="28" value="${wizardState.age}" min="14" max="100">
          </div>

          <div class="onboarding-form-group">
            <label class="onboarding-form-label" for="onboarding-input-height">Height</label>
            <input type="text" id="onboarding-input-height" class="onboarding-input" placeholder="178 cm" value="${wizardState.height}">
          </div>

          <div class="onboarding-form-group">
            <label class="onboarding-form-label" for="onboarding-input-weight">Weight</label>
            <input type="text" id="onboarding-input-weight" class="onboarding-input" placeholder="74 kg" value="${wizardState.weight}">
          </div>
        </div>
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-profile-skip" style="color: var(--color-text-secondary);">
          Skip Details
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 8: Completion Summary Screen
     -------------------------------------------------------------------------- */
  function renderCompletion() {
    return `
      <div style="text-align: center; margin-bottom: var(--space-6);">
        <div style="width: 64px; height: 64px; border-radius: var(--radius-pill); background-color: var(--color-success-subtle); color: var(--color-success); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3); box-shadow: var(--shadow-sm);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 class="onboarding-question">Your Kinetix profile is ready.</h1>
        <p class="onboarding-hint">Here is your tailored training blueprint.</p>
      </div>

      <div class="onboarding-summary-card">
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Athlete Name</span>
          <span class="onboarding-summary-val">${wizardState.name || 'Athlete'}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Primary Goal</span>
          <span class="onboarding-summary-val" style="color: var(--color-primary);">${wizardState.goal}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Fitness Level</span>
          <span class="onboarding-summary-val">${wizardState.fitnessLevel}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Focus Areas</span>
          <span class="onboarding-summary-val">${wizardState.focusAreas.join(', ')}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Available Gear</span>
          <span class="onboarding-summary-val">${wizardState.equipment.slice(0, 3).join(', ')}${wizardState.equipment.length > 3 ? ` +${wizardState.equipment.length - 3} more` : ''}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Training Schedule</span>
          <span class="onboarding-summary-val">${wizardState.trainingDays}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Session Duration</span>
          <span class="onboarding-summary-val">${wizardState.workoutDuration}</span>
        </div>
      </div>

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-finish-onboarding">
          ${isEditMode ? 'Save Changes' : 'Create My Plan'}
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Event Listeners Attachment
     -------------------------------------------------------------------------- */
  function attachStepEvents() {
    // Back navigation
    const backBtn = container.querySelector('#btn-onboarding-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (currentStep > 1) {
          currentStep--;
          renderCurrentStep();
        } else if (currentStep === 1) {
          if (isEditMode) {
            window.location.hash = '#profile';
          } else {
            currentStep = 0;
            renderCurrentStep();
          }
        }
      });
    }

    // Step 0: Welcome buttons
    const welcomeStart = container.querySelector('#btn-welcome-start');
    if (welcomeStart) {
      welcomeStart.addEventListener('click', () => {
        currentStep = 1;
        renderCurrentStep();
      });
    }

    const welcomeSkip = container.querySelector('#btn-welcome-skip');
    if (welcomeSkip) {
      welcomeSkip.addEventListener('click', () => {
        completeOnboarding(wizardState);
        if (window.showToast) {
          window.showToast({ type: 'info', message: 'Welcome to Kinetix! You can customize your profile anytime.' });
        }
        window.location.hash = '#home';
      });
    }

    // Header Skip step
    const skipStep = container.querySelector('#btn-onboarding-skip-step');
    if (skipStep) {
      skipStep.addEventListener('click', () => {
        if (currentStep < TOTAL_QUESTION_STEPS) {
          currentStep++;
          renderCurrentStep();
        } else if (currentStep === TOTAL_QUESTION_STEPS) {
          currentStep = 8;
          renderCurrentStep();
        }
      });
    }

    function bindSelectAction(selector, handler) {
      container.querySelectorAll(selector).forEach(el => {
        el.addEventListener('click', () => handler(el));
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler(el);
          }
        });
      });
    }

    // Step 1: Goal cards
    bindSelectAction('[data-goal]', (card) => {
      wizardState.goal = card.getAttribute('data-goal');
      renderCurrentStep();
    });

    // Step 2: Level cards
    bindSelectAction('[data-level]', (card) => {
      wizardState.fitnessLevel = card.getAttribute('data-level');
      renderCurrentStep();
    });

    // Step 3: Focus Areas (Max 3, Full Body mutual exclusion)
    bindSelectAction('[data-focus]', (card) => {
      const item = card.getAttribute('data-focus');
      if (item === 'Full Body') {
        // If Full Body is clicked, it becomes the single focus
        wizardState.focusAreas = ['Full Body'];
      } else {
        // Remove 'Full Body' if another specific muscle is clicked
        wizardState.focusAreas = wizardState.focusAreas.filter(a => a !== 'Full Body');
        if (wizardState.focusAreas.includes(item)) {
          wizardState.focusAreas = wizardState.focusAreas.filter(a => a !== item);
        } else if (wizardState.focusAreas.length < 3) {
          wizardState.focusAreas.push(item);
        }
      }
      renderCurrentStep();
    });

    // Step 4: Equipment cards ("No Equipment" mutual exclusion)
    bindSelectAction('[data-equipment]', (card) => {
      const item = card.getAttribute('data-equipment');
      if (item === 'No Equipment') {
        wizardState.equipment = ['No Equipment'];
      } else {
        // Remove "No Equipment" if gear is added
        wizardState.equipment = wizardState.equipment.filter(eq => eq !== 'No Equipment');
        if (wizardState.equipment.includes(item)) {
          wizardState.equipment = wizardState.equipment.filter(eq => eq !== item);
        } else {
          wizardState.equipment.push(item);
        }
      }
      renderCurrentStep();
    });

    // Step 5: Frequency cards
    bindSelectAction('[data-frequency]', (card) => {
      wizardState.trainingDays = card.getAttribute('data-frequency');
      renderCurrentStep();
    });

    // Step 6: Duration cards
    bindSelectAction('[data-duration]', (card) => {
      wizardState.workoutDuration = card.getAttribute('data-duration');
      renderCurrentStep();
    });

    // Step 7: Profile Info input fields
    const nameInput = container.querySelector('#onboarding-input-name');
    const ageInput = container.querySelector('#onboarding-input-age');
    const heightInput = container.querySelector('#onboarding-input-height');
    const weightInput = container.querySelector('#onboarding-input-weight');

    function syncProfileInputs() {
      if (nameInput) wizardState.name = nameInput.value.trim() || 'Athlete';
      if (ageInput) wizardState.age = ageInput.value.trim();
      if (heightInput) wizardState.height = heightInput.value.trim();
      if (weightInput) wizardState.weight = weightInput.value.trim();
    }

    if (nameInput) nameInput.addEventListener('input', () => { wizardState.name = nameInput.value.trim(); });
    if (ageInput) ageInput.addEventListener('input', () => { wizardState.age = ageInput.value.trim(); });
    if (heightInput) heightInput.addEventListener('input', () => { wizardState.height = heightInput.value.trim(); });
    if (weightInput) weightInput.addEventListener('input', () => { wizardState.weight = weightInput.value.trim(); });

    const skipProfileBtn = container.querySelector('#btn-profile-skip');
    if (skipProfileBtn) {
      skipProfileBtn.addEventListener('click', () => {
        syncProfileInputs();
        currentStep = 8;
        renderCurrentStep();
      });
    }

    // Step Continue button (steps 1 through 7)
    const continueBtn = container.querySelector('#btn-step-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (currentStep === 7) {
          syncProfileInputs();
        }
        if (currentStep < 8) {
          currentStep++;
          renderCurrentStep();
        }
      });
    }

    // Step 8: Completion CTA
    const finishBtn = container.querySelector('#btn-finish-onboarding');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        completeOnboarding({
          name: wizardState.name || 'Athlete',
          goal: wizardState.goal,
          fitnessLevel: wizardState.fitnessLevel,
          focusAreas: wizardState.focusAreas,
          equipment: wizardState.equipment,
          trainingDays: wizardState.trainingDays,
          workoutDuration: wizardState.workoutDuration,
          stats: {
            age: wizardState.age || existingProfile.stats?.age || 28,
            height: wizardState.height ? (wizardState.height.includes('cm') ? wizardState.height : `${wizardState.height} cm`) : (existingProfile.stats?.height || '178 cm'),
            weight: wizardState.weight ? (wizardState.weight.includes('kg') ? wizardState.weight : `${wizardState.weight} kg`) : (existingProfile.stats?.weight || '74 kg'),
            bmi: existingProfile.stats?.bmi || '23.4'
          }
        });

        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: isEditMode ? 'Profile updated successfully!' : 'Your personalized fitness plan is ready!'
          });
        }

        window.location.hash = isEditMode ? '#profile' : '#home';
      });
    }
  }

  // Initial render
  renderCurrentStep();
}
