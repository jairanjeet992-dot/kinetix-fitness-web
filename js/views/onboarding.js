/**
 * ONBOARDING VIEW - KINETIX
 * Phase 1.2: Onboarding UX + Data Flow
 *
 * 8-Step mobile-first onboarding journey collecting core fitness preferences,
 * with state persistence, validation, skip options, and edit-mode support.
 */

import {
  getOnboardingState,
  updateOnboardingState,
  completeOnboarding
} from '../state/profile.js';

export function renderOnboarding(container, mode = 'new') {
  const isEditMode = mode === 'edit';
  const storedState = getOnboardingState();

  // Wizard state initialized strictly from stored onboarding state without fake defaults
  const wizardState = {
    name: storedState.name || '',
    age: storedState.age ?? null,
    height: storedState.height ?? null,
    heightUnit: storedState.heightUnit || 'cm',
    weight: storedState.weight ?? null,
    weightUnit: storedState.weightUnit || 'kg',
    goal: storedState.goal || null,
    fitnessLevel: storedState.fitnessLevel || null,
    targetMuscles: Array.isArray(storedState.targetMuscles)
      ? [...storedState.targetMuscles]
      : Array.isArray(storedState.focusAreas)
      ? [...storedState.focusAreas]
      : [],
    equipment: Array.isArray(storedState.equipment) ? [...storedState.equipment] : [],
    trainingDays: storedState.trainingDays || null,
    workoutDuration: storedState.workoutDuration || null
  };

  // Step 0: Welcome, 1: Goal, 2: Level, 3: Focus, 4: Equipment, 5: Frequency, 6: Duration, 7: Profile Info, 8: Completion
  const TOTAL_QUESTION_STEPS = 7;
  let currentStep = isEditMode
    ? 1
    : (storedState.currentStep && storedState.currentStep >= 1 && storedState.currentStep <= 8)
    ? storedState.currentStep
    : 0;

  let validationErrorMessage = '';

  function saveCurrentState() {
    updateOnboardingState({
      ...wizardState,
      currentStep: currentStep
    });
  }

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
          ${currentStep > 0 ? renderHeader() : ''}
          <div class="onboarding-content">
            ${stepHtml}
          </div>
        </div>
      </div>
    `;

    attachStepEvents();
  }

  /* --------------------------------------------------------------------------
     Reusable Header Component with Step Counter, Progress Bar & Reusable Back Button
     -------------------------------------------------------------------------- */
  function renderHeader() {
    const isQuestionStep = currentStep >= 1 && currentStep <= TOTAL_QUESTION_STEPS;
    const pct = isQuestionStep
      ? Math.round((currentStep / TOTAL_QUESTION_STEPS) * 100)
      : 100;

    // Skip is only permitted on optional details (Step 7), never on required questions
    const showSkip = currentStep === 7;

    return `
      <header class="onboarding-header">
        <button type="button" class="onboarding-header-action" id="btn-onboarding-back" aria-label="Go to previous step">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div class="onboarding-progress-wrap">
          <span class="onboarding-step-label">${isQuestionStep ? `${currentStep} of ${TOTAL_QUESTION_STEPS}` : 'Summary'}</span>
          <div class="onboarding-progress-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="onboarding-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <button type="button" class="onboarding-skip-link ${showSkip ? '' : 'is-hidden'}" id="btn-onboarding-skip-step" ${showSkip ? '' : 'tabindex="-1" aria-hidden="true"'}>
          Skip
        </button>
      </header>
    `;
  }

  /* --------------------------------------------------------------------------
     Inline Validation Message Helper
     -------------------------------------------------------------------------- */
  function renderValidationBox() {
    if (!validationErrorMessage) return '';
    return `
      <div class="onboarding-validation-msg" role="alert">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${validationErrorMessage}</span>
      </div>
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
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 1: Goal Screen (Single Choice, Required)
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

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 2: Fitness Level Screen (Single Choice, Required, No Preselection)
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

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 3: Target Muscles / Focus Areas (Multi-select, max 3, Full Body mutual exclusion)
     -------------------------------------------------------------------------- */
  function renderFocus() {
    const areas = ['Full Body', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Mobility'];
    const count = wizardState.targetMuscles.length;
    const isFullBodyActive = wizardState.targetMuscles.includes('Full Body');
    const hasSpecificMuscles = count > 0 && !isFullBodyActive;

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What would you like to focus on?</h1>
        <p class="onboarding-hint">Choose up to 3. Selected: <strong>${count} of 3</strong></p>
      </div>

      <div class="onboarding-grid-chips">
        ${areas.map(area => {
          const isSelected = wizardState.targetMuscles.includes(area);
          let isDisabled = false;

          if (area === 'Full Body') {
            // Full Body is disabled if any specific muscle is selected
            isDisabled = hasSpecificMuscles;
          } else {
            // Specific muscles are disabled if Full Body is selected, or if 3 other items are already selected
            isDisabled = isFullBodyActive || (!isSelected && count >= 3);
          }

          return `
            <div class="onboarding-grid-item ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}"
                 data-focus="${area}"
                 role="checkbox"
                 aria-checked="${isSelected}"
                 aria-disabled="${isDisabled}"
                 tabindex="${isDisabled ? '-1' : '0'}">
              <span class="onboarding-grid-label">${area}</span>
              <div class="onboarding-check-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 4: Equipment Screen (Multi-select, "No Equipment" mutual exclusion)
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

    const isNoEquipment = wizardState.equipment.includes('No Equipment');
    const hasGear = wizardState.equipment.length > 0 && !isNoEquipment;

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What equipment do you have?</h1>
        <p class="onboarding-hint">You can change this later. We'll only suggest exercises matching your gear.</p>
      </div>

      <div class="onboarding-grid-chips">
        ${equipmentList.map(eq => {
          const isSelected = wizardState.equipment.includes(eq);
          let isDisabled = false;

          if (eq === 'No Equipment') {
            isDisabled = hasGear;
          } else {
            isDisabled = isNoEquipment;
          }

          return `
            <div class="onboarding-grid-item ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}"
                 data-equipment="${eq}"
                 role="checkbox"
                 aria-checked="${isSelected}"
                 aria-disabled="${isDisabled}"
                 tabindex="${isDisabled ? '-1' : '0'}">
              <span class="onboarding-grid-label">${eq}</span>
              <div class="onboarding-check-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 5: Training Frequency (Single Choice, Required)
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

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 6: Workout Duration (Single Choice, Required)
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

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 7: Personal Information (Name Required; Age, Height, Weight Optional)
     -------------------------------------------------------------------------- */
  function renderProfileInfo() {
    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">Tell us a little more about you</h1>
        <p class="onboarding-hint">Your name is required to personalize routines. Physical stats are optional.</p>
      </div>

      <div style="background-color: var(--color-surface); padding: var(--space-5); border-radius: var(--radius-xl); border: 1px solid var(--color-border); margin-bottom: var(--space-6);">
        <div class="onboarding-form-group">
          <label class="onboarding-form-label" for="onboarding-input-name">
            <span>Your Name <span style="color: var(--color-primary); font-weight: bold;">*</span></span>
          </label>
          <input type="text"
                 id="onboarding-input-name"
                 class="onboarding-input"
                 placeholder="Enter your name"
                 value="${wizardState.name || ''}"
                 required
                 autocomplete="name">
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
          <div class="onboarding-form-group">
            <label class="onboarding-form-label" for="onboarding-input-age">
              <span>Age</span>
            </label>
            <input type="number"
                   id="onboarding-input-age"
                   class="onboarding-input"
                   placeholder="Age"
                   value="${wizardState.age !== null && wizardState.age !== undefined ? wizardState.age : ''}"
                   min="14"
                   max="100">
          </div>

          <div class="onboarding-form-group">
            <label class="onboarding-form-label" for="onboarding-input-height">
              <span>Height</span>
            </label>
            <div class="onboarding-input-group">
              <input type="number"
                     id="onboarding-input-height"
                     class="onboarding-input"
                     placeholder="Height"
                     value="${wizardState.height !== null && wizardState.height !== undefined ? wizardState.height : ''}"
                     min="100"
                     max="250">
              <span class="onboarding-input-suffix">cm</span>
            </div>
          </div>

          <div class="onboarding-form-group">
            <label class="onboarding-form-label" for="onboarding-input-weight">
              <span>Weight</span>
            </label>
            <div class="onboarding-input-group">
              <input type="number"
                     id="onboarding-input-weight"
                     class="onboarding-input"
                     placeholder="Weight"
                     value="${wizardState.weight !== null && wizardState.weight !== undefined ? wizardState.weight : ''}"
                     min="30"
                     max="300">
              <span class="onboarding-input-suffix">kg</span>
            </div>
          </div>
        </div>
      </div>

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-step-continue">
          Continue
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Step 8: Completion Summary Screen
     -------------------------------------------------------------------------- */
  function renderCompletion() {
    const focusDisplay = wizardState.targetMuscles.length > 0
      ? wizardState.targetMuscles.join(', ')
      : 'Full Body';

    const equipDisplay = wizardState.equipment.length > 0
      ? (wizardState.equipment.slice(0, 3).join(', ') + (wizardState.equipment.length > 3 ? ` +${wizardState.equipment.length - 3} more` : ''))
      : 'No Equipment';

    return `
      <div style="text-align: center; margin-bottom: var(--space-6);">
        <div style="width: 64px; height: 64px; border-radius: var(--radius-pill); background-color: var(--color-success-subtle); color: var(--color-success); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3); box-shadow: var(--shadow-sm);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 class="onboarding-question">Your Kinetix profile is ready.</h1>
        <p class="onboarding-hint">Review your tailored profile before launching your plan.</p>
      </div>

      <div class="onboarding-summary-card">
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Athlete Name</span>
          <span class="onboarding-summary-val">${wizardState.name || 'Athlete'}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Primary Goal</span>
          <span class="onboarding-summary-val" style="color: var(--color-primary);">${wizardState.goal || '--'}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Fitness Level</span>
          <span class="onboarding-summary-val">${wizardState.fitnessLevel || '--'}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Focus Areas</span>
          <span class="onboarding-summary-val">${focusDisplay}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Available Gear</span>
          <span class="onboarding-summary-val">${equipDisplay}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Training Schedule</span>
          <span class="onboarding-summary-val">${wizardState.trainingDays || '--'}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Session Duration</span>
          <span class="onboarding-summary-val">${wizardState.workoutDuration || '--'}</span>
        </div>
        ${wizardState.age ? `
          <div class="onboarding-summary-row">
            <span class="onboarding-summary-key">Age</span>
            <span class="onboarding-summary-val">${wizardState.age} yrs</span>
          </div>
        ` : ''}
        ${wizardState.height ? `
          <div class="onboarding-summary-row">
            <span class="onboarding-summary-key">Height</span>
            <span class="onboarding-summary-val">${wizardState.height} cm</span>
          </div>
        ` : ''}
        ${wizardState.weight ? `
          <div class="onboarding-summary-row">
            <span class="onboarding-summary-key">Weight</span>
            <span class="onboarding-summary-val">${wizardState.weight} kg</span>
          </div>
        ` : ''}
      </div>

      ${renderValidationBox()}

      <div class="onboarding-footer">
        <button type="button" class="btn btn-primary btn-lg" id="btn-finish-onboarding">
          ${isEditMode ? 'Save Changes' : 'Create My Plan'}
        </button>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     Event Listeners Attachment & Validation Logic
     -------------------------------------------------------------------------- */
  function attachStepEvents() {
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

    function clearValidation() {
      validationErrorMessage = '';
      const msgEl = container.querySelector('.onboarding-validation-msg');
      if (msgEl) msgEl.remove();
    }

    // Header Back button (reusable across all onboarding steps)
    const backBtn = container.querySelector('#btn-onboarding-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        clearValidation();
        if (currentStep > 1) {
          currentStep--;
          saveCurrentState();
          renderCurrentStep();
        } else if (currentStep === 1) {
          if (isEditMode) {
            window.location.hash = '#profile';
          } else {
            currentStep = 0;
            saveCurrentState();
            renderCurrentStep();
          }
        }
      });
    }

    // Step 0: Welcome Get Started
    const welcomeStart = container.querySelector('#btn-welcome-start');
    if (welcomeStart) {
      welcomeStart.addEventListener('click', () => {
        currentStep = 1;
        saveCurrentState();
        renderCurrentStep();
      });
    }

    // Header Skip step (Only active on Step 7 for optional details)
    const skipStep = container.querySelector('#btn-onboarding-skip-step');
    if (skipStep && currentStep === 7) {
      skipStep.addEventListener('click', () => {
        // Name is still required before skipping optional details
        const nameInput = container.querySelector('#onboarding-input-name');
        const nameVal = nameInput ? nameInput.value.trim() : wizardState.name;
        if (!nameVal) {
          validationErrorMessage = 'Please enter your name.';
          renderCurrentStep();
          const freshNameInput = container.querySelector('#onboarding-input-name');
          if (freshNameInput) freshNameInput.focus();
          return;
        }

        wizardState.name = nameVal;
        currentStep = 8;
        saveCurrentState();
        renderCurrentStep();
      });
    }

    // Step 1: Goal cards
    bindSelectAction('[data-goal]', (card) => {
      wizardState.goal = card.getAttribute('data-goal');
      clearValidation();
      saveCurrentState();
      renderCurrentStep();
    });

    // Step 2: Level cards (Beginner, Intermediate, Advanced)
    bindSelectAction('[data-level]', (card) => {
      wizardState.fitnessLevel = card.getAttribute('data-level');
      clearValidation();
      saveCurrentState();
      renderCurrentStep();
    });

    // Step 3: Target Muscles (Max 3, Full Body mutual exclusion)
    bindSelectAction('[data-focus]', (card) => {
      if (card.classList.contains('is-disabled')) return;
      const item = card.getAttribute('data-focus');

      if (item === 'Full Body') {
        // If Full Body is selected, it becomes the sole focus; clicking again toggles off
        if (wizardState.targetMuscles.includes('Full Body')) {
          wizardState.targetMuscles = [];
        } else {
          wizardState.targetMuscles = ['Full Body'];
        }
      } else {
        // If a specific muscle is selected, remove Full Body
        wizardState.targetMuscles = wizardState.targetMuscles.filter(a => a !== 'Full Body');
        if (wizardState.targetMuscles.includes(item)) {
          wizardState.targetMuscles = wizardState.targetMuscles.filter(a => a !== item);
        } else if (wizardState.targetMuscles.length < 3) {
          wizardState.targetMuscles.push(item);
        }
      }

      clearValidation();
      saveCurrentState();
      renderCurrentStep();
    });

    // Step 4: Equipment cards ("No Equipment" mutual exclusion)
    bindSelectAction('[data-equipment]', (card) => {
      if (card.classList.contains('is-disabled')) return;
      const item = card.getAttribute('data-equipment');

      if (item === 'No Equipment') {
        if (wizardState.equipment.includes('No Equipment')) {
          wizardState.equipment = [];
        } else {
          wizardState.equipment = ['No Equipment'];
        }
      } else {
        wizardState.equipment = wizardState.equipment.filter(eq => eq !== 'No Equipment');
        if (wizardState.equipment.includes(item)) {
          wizardState.equipment = wizardState.equipment.filter(eq => eq !== item);
        } else {
          wizardState.equipment.push(item);
        }
      }

      clearValidation();
      saveCurrentState();
      renderCurrentStep();
    });

    // Step 5: Frequency cards
    bindSelectAction('[data-frequency]', (card) => {
      wizardState.trainingDays = card.getAttribute('data-frequency');
      clearValidation();
      saveCurrentState();
      renderCurrentStep();
    });

    // Step 6: Duration cards
    bindSelectAction('[data-duration]', (card) => {
      wizardState.workoutDuration = card.getAttribute('data-duration');
      clearValidation();
      saveCurrentState();
      renderCurrentStep();
    });

    // Step 7: Profile Info input fields
    const nameInput = container.querySelector('#onboarding-input-name');
    const ageInput = container.querySelector('#onboarding-input-age');
    const heightInput = container.querySelector('#onboarding-input-height');
    const weightInput = container.querySelector('#onboarding-input-weight');

    function syncProfileInputs() {
      if (nameInput) wizardState.name = nameInput.value.trim();
      if (ageInput) wizardState.age = ageInput.value.trim() ? parseInt(ageInput.value.trim(), 10) : null;
      if (heightInput) wizardState.height = heightInput.value.trim() ? parseFloat(heightInput.value.trim()) : null;
      if (weightInput) wizardState.weight = weightInput.value.trim() ? parseFloat(weightInput.value.trim()) : null;
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        wizardState.name = nameInput.value;
        if (nameInput.value.trim()) clearValidation();
      });
    }
    if (ageInput) {
      ageInput.addEventListener('input', () => {
        wizardState.age = ageInput.value.trim() ? parseInt(ageInput.value.trim(), 10) : null;
      });
    }
    if (heightInput) {
      heightInput.addEventListener('input', () => {
        wizardState.height = heightInput.value.trim() ? parseFloat(heightInput.value.trim()) : null;
      });
    }
    if (weightInput) {
      weightInput.addEventListener('input', () => {
        wizardState.weight = weightInput.value.trim() ? parseFloat(weightInput.value.trim()) : null;
      });
    }

    // Step Continue button (Steps 1 through 7)
    const continueBtn = container.querySelector('#btn-step-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        // Step-specific inline validation before advancing
        if (currentStep === 1 && !wizardState.goal) {
          validationErrorMessage = 'Please select your main goal.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 2 && !wizardState.fitnessLevel) {
          validationErrorMessage = 'Choose your training experience.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 3 && (!wizardState.targetMuscles || wizardState.targetMuscles.length === 0)) {
          validationErrorMessage = 'Choose up to 3 focus areas.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 4 && (!wizardState.equipment || wizardState.equipment.length === 0)) {
          validationErrorMessage = 'Please select your available equipment.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 5 && !wizardState.trainingDays) {
          validationErrorMessage = 'Please choose your training frequency.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 6 && !wizardState.workoutDuration) {
          validationErrorMessage = 'Please choose your workout duration.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 7) {
          syncProfileInputs();
          if (!wizardState.name || !wizardState.name.trim()) {
            validationErrorMessage = 'Please enter your name.';
            renderCurrentStep();
            const freshNameInput = container.querySelector('#onboarding-input-name');
            if (freshNameInput) freshNameInput.focus();
            return;
          }
        }

        clearValidation();
        currentStep++;
        saveCurrentState();
        renderCurrentStep();
      });
    }

    // Step 8: Completion CTA
    const finishBtn = container.querySelector('#btn-finish-onboarding');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        // Comprehensive validation of complete onboarding state
        if (!wizardState.name || !wizardState.goal || !wizardState.fitnessLevel ||
            !wizardState.targetMuscles.length || !wizardState.equipment.length ||
            !wizardState.trainingDays || !wizardState.workoutDuration) {
          validationErrorMessage = 'Please ensure all required steps are completed.';
          renderCurrentStep();
          return;
        }

        completeOnboarding({
          name: wizardState.name.trim(),
          goal: wizardState.goal,
          fitnessLevel: wizardState.fitnessLevel,
          targetMuscles: wizardState.targetMuscles,
          equipment: wizardState.equipment,
          trainingDays: wizardState.trainingDays,
          workoutDuration: wizardState.workoutDuration,
          age: wizardState.age,
          height: wizardState.height,
          heightUnit: wizardState.heightUnit || 'cm',
          weight: wizardState.weight,
          weightUnit: wizardState.weightUnit || 'kg'
        });

        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: isEditMode
              ? 'Profile updated successfully!'
              : `Welcome to Kinetix, ${wizardState.name.trim()}!`
          });
        }

        window.location.hash = isEditMode ? '#profile' : '#home';
      });
    }
  }

  // Initial render
  renderCurrentStep();
}
