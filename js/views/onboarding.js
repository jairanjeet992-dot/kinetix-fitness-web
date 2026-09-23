/**
 * ONBOARDING VIEW - KINETIX
 * Phase 1.3: Premium Onboarding Interactions
 *
 * 10-Step mobile-first onboarding journey with dedicated interactive
 * height and weight pickers, animated progress, live SVG silhouettes & dials,
 * and zero fake defaults.
 */

import {
  getOnboardingState,
  updateOnboardingState,
  completeOnboarding,
  formatHeight,
  formatWeight
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

  // Flow Order:
  // Step 0: Welcome
  // Step 1: Goal
  // Step 2: Fitness Level
  // Step 3: Focus Areas (Target Muscles)
  // Step 4: Equipment
  // Step 5: Training Frequency
  // Step 6: Workout Duration
  // Step 7: Height (Dedicated Interactive Picker)
  // Step 8: Weight (Dedicated Interactive Picker)
  // Step 9: Personal Details (Name required, Age optional)
  // Step 10: Completion Summary
  const TOTAL_QUESTION_STEPS = 9;
  let currentStep = isEditMode
    ? 1
    : (storedState.currentStep && storedState.currentStep >= 1 && storedState.currentStep <= 10)
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
        stepHtml = renderHeight();
        break;
      case 8:
        stepHtml = renderWeight();
        break;
      case 9:
        stepHtml = renderPersonalDetails();
        break;
      case 10:
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
     Reusable Header Component with Animated Progress Bar & Reusable Back Button
     -------------------------------------------------------------------------- */
  function renderHeader() {
    const isQuestionStep = currentStep >= 1 && currentStep <= TOTAL_QUESTION_STEPS;
    const pct = isQuestionStep
      ? Math.round((currentStep / TOTAL_QUESTION_STEPS) * 100)
      : 100;

    // Skip is only allowed on optional details (Step 9), never on required questions
    const showSkip = currentStep === 9;

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
     Step 1: Goal Screen (Single Choice, Required, Zero Preselection)
     -------------------------------------------------------------------------- */
  function renderGoal() {
    const goals = [
      { id: 'Build Muscle', title: 'Build Muscle', desc: 'Build lean muscle and size' },
      { id: 'Lose Fat', title: 'Lose Fat', desc: 'Burn calories and improve conditioning' },
      { id: 'Get Stronger', title: 'Get Stronger', desc: 'Build strength and power' },
      { id: 'Improve Endurance', title: 'Improve Endurance', desc: 'Improve stamina and work capacity' },
      { id: 'Improve Fitness', title: 'Improve Fitness', desc: 'Build balanced overall fitness' },
      { id: 'Stay Active', title: 'Stay Active', desc: 'Move more and stay healthy' }
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
     Step 2: Fitness Level Screen (Single Choice, Required, Zero Preselection)
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
            isDisabled = hasSpecificMuscles;
          } else {
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
     Step 7: Height Experience (Interactive Silhouette & Unit Picker)
     -------------------------------------------------------------------------- */
  function renderHeight() {
    const unit = wizardState.heightUnit || 'cm';
    const currentHeightCm = wizardState.height !== null ? wizardState.height : 175;
    const hasSelection = wizardState.height !== null;

    // Conversions
    const totalInches = Math.round(currentHeightCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    const displayNum = unit === 'ft'
      ? `${feet}' ${inches}"`
      : `${Math.round(currentHeightCm)}`;
    const displayUnit = unit === 'ft' ? '' : 'cm';

    // Scale calculation (120 cm -> 0.85, 220 cm -> 1.15)
    const normalizedH = Math.max(120, Math.min(220, currentHeightCm));
    const scaleRatio = (normalizedH - 120) / (220 - 120);
    const scaleY = (0.85 + scaleRatio * 0.30).toFixed(3);
    const markerBottom = Math.round(15 + scaleRatio * 125);

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">How tall are you?</h1>
        <p class="onboarding-hint">We'll use this to personalize your training estimates.</p>
      </div>

      <div class="interactive-picker-card">
        <!-- Unit Toggle -->
        <div class="interactive-unit-toggle" role="group" aria-label="Height units">
          <button type="button" class="interactive-unit-btn ${unit === 'cm' ? 'is-active' : ''}" id="btn-unit-cm">
            Centimeters (cm)
          </button>
          <button type="button" class="interactive-unit-btn ${unit === 'ft' ? 'is-active' : ''}" id="btn-unit-ft">
            Feet & Inches (ft/in)
          </button>
        </div>

        <!-- SVG Silhouette Visual -->
        <div class="interactive-height-visual" aria-hidden="true">
          <div class="interactive-height-marker" style="bottom: ${markerBottom}px;"></div>
          <svg class="interactive-silhouette" viewBox="0 0 100 240" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: scaleY(${scaleY});">
            <!-- Athletic gender-neutral geometric silhouette -->
            <circle cx="50" cy="24" r="16" fill="var(--color-surface-secondary)" stroke="var(--color-border-strong)" stroke-width="2"/>
            <path d="M46 40h8v8h-8z" fill="var(--color-surface-secondary)"/>
            <path d="M26 48 C32 46, 68 46, 74 48 C80 50, 78 78, 76 100 C74 122, 68 132, 66 142 L34 142 C32 132, 26 122, 24 100 C22 78, 20 50, 26 48 Z" fill="var(--color-surface-secondary)" stroke="var(--color-border-strong)" stroke-width="2" stroke-linejoin="round"/>
            <path d="M24 52 C18 68, 14 100, 16 130 C17 138, 22 138, 23 130 C25 106, 27 76, 28 60" fill="var(--color-surface-secondary)" stroke="var(--color-border-strong)" stroke-width="1.5"/>
            <path d="M76 52 C82 68, 86 100, 84 130 C83 138, 78 138, 77 130 C75 106, 73 76, 72 60" fill="var(--color-surface-secondary)" stroke="var(--color-border-strong)" stroke-width="1.5"/>
            <path d="M35 142 L33 234 C33 238, 43 238, 44 234 L48 165 L52 165 L56 234 C57 238, 67 238, 67 234 L65 142 Z" fill="var(--color-surface-secondary)" stroke="var(--color-border-strong)" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Stepper & Value Display -->
        <div class="interactive-value-row">
          <button type="button" class="interactive-step-btn" id="btn-height-minus" aria-label="Decrease height">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          <div class="interactive-value-display">
            <span class="interactive-number" id="height-readout-num">${hasSelection ? displayNum : '--'}</span>
            ${hasSelection && displayUnit ? `<span class="interactive-unit-label">${displayUnit}</span>` : ''}
          </div>

          <button type="button" class="interactive-step-btn" id="btn-height-plus" aria-label="Increase height">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- Range Slider -->
        <div class="interactive-slider-wrap">
          <input type="range"
                 class="interactive-slider"
                 id="height-slider"
                 min="120"
                 max="220"
                 step="1"
                 value="${currentHeightCm}"
                 aria-label="Height adjustment slider"
                 aria-valuemin="120"
                 aria-valuemax="220"
                 aria-valuenow="${currentHeightCm}">
          <div class="interactive-slider-ticks">
            <span>${unit === 'ft' ? "3' 11\"" : '120 cm'}</span>
            <span>${unit === 'ft' ? "5' 7\"" : '170 cm'}</span>
            <span>${unit === 'ft' ? "7' 3\"" : '220 cm'}</span>
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
     Step 8: Weight Experience (Interactive Scale Dial & Unit Picker)
     -------------------------------------------------------------------------- */
  function renderWeight() {
    const unit = wizardState.weightUnit || 'kg';
    const currentWeightKg = wizardState.weight !== null ? wizardState.weight : 70;
    const hasSelection = wizardState.weight !== null;

    // Display calculations
    const displayNum = unit === 'lb'
      ? `${Math.round(currentWeightKg * 2.20462)}`
      : `${Math.round(currentWeightKg)}`;
    const displayUnit = unit;

    // Dial gauge angle calculation (30 kg -> -90 deg, 200 kg -> +90 deg)
    const normalizedW = Math.max(30, Math.min(200, currentWeightKg));
    const weightRatio = (normalizedW - 30) / (200 - 30);
    const needleAngle = Math.round(-90 + weightRatio * 180);
    // Gauge stroke-dashoffset: total arc is approx 220, offset shrinks as weight increases
    const dashOffset = Math.round(220 - weightRatio * 220);

    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What's your weight?</h1>
        <p class="onboarding-hint">We'll use this to calibrate interval workloads and energy expenditure.</p>
      </div>

      <div class="interactive-picker-card">
        <!-- Unit Toggle -->
        <div class="interactive-unit-toggle" role="group" aria-label="Weight units">
          <button type="button" class="interactive-unit-btn ${unit === 'kg' ? 'is-active' : ''}" id="btn-weight-unit-kg">
            Kilograms (kg)
          </button>
          <button type="button" class="interactive-unit-btn ${unit === 'lb' ? 'is-active' : ''}" id="btn-weight-unit-lb">
            Pounds (lb)
          </button>
        </div>

        <!-- SVG Scale Dial Visual -->
        <div class="interactive-weight-visual" aria-hidden="true">
          <svg class="interactive-weight-svg" viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 95 A 70 70 0 0 1 160 95" stroke="var(--color-border)" stroke-width="8" stroke-linecap="round"/>
            <path d="M20 95 A 70 70 0 0 1 160 95" stroke="var(--color-primary)" stroke-width="8" stroke-linecap="round" stroke-dasharray="220" stroke-dashoffset="${dashOffset}"/>
            <circle cx="90" cy="95" r="8" fill="var(--color-text-primary)"/>
            <circle cx="90" cy="95" r="3" fill="#FFFFFF"/>
            <line x1="90" y1="95" x2="90" y2="40" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round" style="transform-origin: 90px 95px; transform: rotate(${needleAngle}deg); transition: transform 0.15s ease-out;"/>
          </svg>
        </div>

        <!-- Stepper & Value Display -->
        <div class="interactive-value-row">
          <button type="button" class="interactive-step-btn" id="btn-weight-minus" aria-label="Decrease weight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>

          <div class="interactive-value-display">
            <span class="interactive-number" id="weight-readout-num">${hasSelection ? displayNum : '--'}</span>
            ${hasSelection ? `<span class="interactive-unit-label">${displayUnit}</span>` : ''}
          </div>

          <button type="button" class="interactive-step-btn" id="btn-weight-plus" aria-label="Increase weight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- Range Slider -->
        <div class="interactive-slider-wrap">
          <input type="range"
                 class="interactive-slider"
                 id="weight-slider"
                 min="30"
                 max="200"
                 step="1"
                 value="${currentWeightKg}"
                 aria-label="Weight adjustment slider"
                 aria-valuemin="30"
                 aria-valuemax="200"
                 aria-valuenow="${currentWeightKg}">
          <div class="interactive-slider-ticks">
            <span>${unit === 'lb' ? '66 lb' : '30 kg'}</span>
            <span>${unit === 'lb' ? '253 lb' : '115 kg'}</span>
            <span>${unit === 'lb' ? '440 lb' : '200 kg'}</span>
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
     Step 9: Personal Details (Name Required; Age Optional)
     -------------------------------------------------------------------------- */
  function renderPersonalDetails() {
    return `
      <div class="onboarding-title-area">
        <h1 class="onboarding-question">What should we call you?</h1>
        <p class="onboarding-hint">Your name is used for personal greetings. Age is optional.</p>
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

        <div class="onboarding-form-group" style="margin-bottom: 0;">
          <label class="onboarding-form-label" for="onboarding-input-age">
            <span>Age <span class="text-caption text-muted">(Optional)</span></span>
          </label>
          <input type="number"
                 id="onboarding-input-age"
                 class="onboarding-input"
                 placeholder="Age"
                 value="${wizardState.age !== null && wizardState.age !== undefined ? wizardState.age : ''}"
                 min="14"
                 max="100">
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
     Step 10: Completion Summary Screen
     -------------------------------------------------------------------------- */
  function renderCompletion() {
    const focusDisplay = wizardState.targetMuscles.length > 0
      ? wizardState.targetMuscles.join(', ')
      : 'Full Body';

    const equipDisplay = wizardState.equipment.length > 0
      ? (wizardState.equipment.slice(0, 3).join(', ') + (wizardState.equipment.length > 3 ? ` +${wizardState.equipment.length - 3} more` : ''))
      : 'No Equipment';

    const formattedHeightVal = wizardState.height ? formatHeight(wizardState.height, wizardState.heightUnit) : '--';
    const formattedWeightVal = wizardState.weight ? formatWeight(wizardState.weight, wizardState.weightUnit) : '--';

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
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Height</span>
          <span class="onboarding-summary-val">${formattedHeightVal}</span>
        </div>
        <div class="onboarding-summary-row">
          <span class="onboarding-summary-key">Weight</span>
          <span class="onboarding-summary-val">${formattedWeightVal}</span>
        </div>
        ${wizardState.age ? `
          <div class="onboarding-summary-row">
            <span class="onboarding-summary-key">Age</span>
            <span class="onboarding-summary-val">${wizardState.age} yrs</span>
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
     Event Listeners Attachment & Interactive Logic
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

    // Header Back button (reusable across all steps)
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

    // Header Skip step (Only active on Step 9 for optional age)
    const skipStep = container.querySelector('#btn-onboarding-skip-step');
    if (skipStep && currentStep === 9) {
      skipStep.addEventListener('click', () => {
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
        currentStep = 10;
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

    // Step 2: Level cards
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
        if (wizardState.targetMuscles.includes('Full Body')) {
          wizardState.targetMuscles = [];
        } else {
          wizardState.targetMuscles = ['Full Body'];
        }
      } else {
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

    // Step 7: Height Experience (Interactive Slider & Steppers)
    if (currentStep === 7) {
      const heightSlider = container.querySelector('#height-slider');
      const unitCmBtn = container.querySelector('#btn-unit-cm');
      const unitFtBtn = container.querySelector('#btn-unit-ft');
      const heightMinus = container.querySelector('#btn-height-minus');
      const heightPlus = container.querySelector('#btn-height-plus');

      function updateHeightUI(valCm) {
        wizardState.height = valCm;
        clearValidation();
        saveCurrentState();

        const unit = wizardState.heightUnit || 'cm';
        const readout = container.querySelector('#height-readout-num');
        const unitLabel = container.querySelector('.interactive-unit-label');
        const silhouette = container.querySelector('.interactive-silhouette');
        const marker = container.querySelector('.interactive-height-marker');

        if (readout) {
          if (unit === 'ft') {
            const totalInches = Math.round(valCm / 2.54);
            const f = Math.floor(totalInches / 12);
            const i = totalInches % 12;
            readout.textContent = `${f}' ${i}"`;
            if (unitLabel) unitLabel.textContent = '';
          } else {
            readout.textContent = `${Math.round(valCm)}`;
            if (unitLabel) unitLabel.textContent = 'cm';
          }
        }

        if (heightSlider) {
          heightSlider.value = valCm;
          heightSlider.setAttribute('aria-valuenow', valCm);
        }

        const normalizedH = Math.max(120, Math.min(220, valCm));
        const scaleRatio = (normalizedH - 120) / (220 - 120);
        if (silhouette) {
          silhouette.style.transform = `scaleY(${(0.85 + scaleRatio * 0.30).toFixed(3)})`;
        }
        if (marker) {
          marker.style.bottom = `${Math.round(15 + scaleRatio * 125)}px`;
        }
      }

      if (heightSlider) {
        heightSlider.addEventListener('input', (e) => {
          updateHeightUI(parseInt(e.target.value, 10));
        });
      }

      if (heightMinus) {
        heightMinus.addEventListener('click', () => {
          const cur = wizardState.height !== null ? wizardState.height : 175;
          const stepDelta = wizardState.heightUnit === 'ft' ? 2.54 : 1;
          const next = Math.max(120, Math.round(cur - stepDelta));
          updateHeightUI(next);
        });
      }

      if (heightPlus) {
        heightPlus.addEventListener('click', () => {
          const cur = wizardState.height !== null ? wizardState.height : 175;
          const stepDelta = wizardState.heightUnit === 'ft' ? 2.54 : 1;
          const next = Math.min(220, Math.round(cur + stepDelta));
          updateHeightUI(next);
        });
      }

      if (unitCmBtn) {
        unitCmBtn.addEventListener('click', () => {
          wizardState.heightUnit = 'cm';
          saveCurrentState();
          renderCurrentStep();
        });
      }

      if (unitFtBtn) {
        unitFtBtn.addEventListener('click', () => {
          wizardState.heightUnit = 'ft';
          saveCurrentState();
          renderCurrentStep();
        });
      }
    }

    // Step 8: Weight Experience (Interactive Scale Slider & Steppers)
    if (currentStep === 8) {
      const weightSlider = container.querySelector('#weight-slider');
      const unitKgBtn = container.querySelector('#btn-weight-unit-kg');
      const unitLbBtn = container.querySelector('#btn-weight-unit-lb');
      const weightMinus = container.querySelector('#btn-weight-minus');
      const weightPlus = container.querySelector('#btn-weight-plus');

      function updateWeightUI(valKg) {
        wizardState.weight = valKg;
        clearValidation();
        saveCurrentState();

        const unit = wizardState.weightUnit || 'kg';
        const readout = container.querySelector('#weight-readout-num');
        const unitLabel = container.querySelector('.interactive-unit-label');
        const line = container.querySelector('.interactive-weight-svg line');
        const arc = container.querySelectorAll('.interactive-weight-svg path')[1];

        if (readout) {
          if (unit === 'lb') {
            readout.textContent = `${Math.round(valKg * 2.20462)}`;
            if (unitLabel) unitLabel.textContent = 'lb';
          } else {
            readout.textContent = `${Math.round(valKg)}`;
            if (unitLabel) unitLabel.textContent = 'kg';
          }
        }

        if (weightSlider) {
          weightSlider.value = valKg;
          weightSlider.setAttribute('aria-valuenow', valKg);
        }

        const normalizedW = Math.max(30, Math.min(200, valKg));
        const weightRatio = (normalizedW - 30) / (200 - 30);
        const needleAngle = Math.round(-90 + weightRatio * 180);
        const dashOffset = Math.round(220 - weightRatio * 220);

        if (line) {
          line.style.transform = `rotate(${needleAngle}deg)`;
        }
        if (arc) {
          arc.setAttribute('stroke-dashoffset', dashOffset);
        }
      }

      if (weightSlider) {
        weightSlider.addEventListener('input', (e) => {
          updateWeightUI(parseInt(e.target.value, 10));
        });
      }

      if (weightMinus) {
        weightMinus.addEventListener('click', () => {
          const cur = wizardState.weight !== null ? wizardState.weight : 70;
          const stepDelta = wizardState.weightUnit === 'lb' ? (1 / 2.20462) : 1;
          const next = Math.max(30, Math.round(cur - stepDelta));
          updateWeightUI(next);
        });
      }

      if (weightPlus) {
        weightPlus.addEventListener('click', () => {
          const cur = wizardState.weight !== null ? wizardState.weight : 70;
          const stepDelta = wizardState.weightUnit === 'lb' ? (1 / 2.20462) : 1;
          const next = Math.min(200, Math.round(cur + stepDelta));
          updateWeightUI(next);
        });
      }

      if (unitKgBtn) {
        unitKgBtn.addEventListener('click', () => {
          wizardState.weightUnit = 'kg';
          saveCurrentState();
          renderCurrentStep();
        });
      }

      if (unitLbBtn) {
        unitLbBtn.addEventListener('click', () => {
          wizardState.weightUnit = 'lb';
          saveCurrentState();
          renderCurrentStep();
        });
      }
    }

    // Step 9: Personal Details inputs
    if (currentStep === 9) {
      const nameInput = container.querySelector('#onboarding-input-name');
      const ageInput = container.querySelector('#onboarding-input-age');

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
    }

    // Step Continue button (Steps 1 through 9)
    const continueBtn = container.querySelector('#btn-step-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (currentStep === 1 && !wizardState.goal) {
          validationErrorMessage = 'Choose your main goal.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 2 && !wizardState.fitnessLevel) {
          validationErrorMessage = 'Choose your fitness level.';
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

        if (currentStep === 7 && wizardState.height === null) {
          validationErrorMessage = 'Enter your height.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 8 && wizardState.weight === null) {
          validationErrorMessage = 'Enter your weight.';
          renderCurrentStep();
          return;
        }

        if (currentStep === 9) {
          const nameInput = container.querySelector('#onboarding-input-name');
          const ageInput = container.querySelector('#onboarding-input-age');
          if (nameInput) wizardState.name = nameInput.value.trim();
          if (ageInput) wizardState.age = ageInput.value.trim() ? parseInt(ageInput.value.trim(), 10) : null;

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

    // Step 10: Completion CTA
    const finishBtn = container.querySelector('#btn-finish-onboarding');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        if (!wizardState.name || !wizardState.goal || !wizardState.fitnessLevel ||
            !wizardState.targetMuscles.length || !wizardState.equipment.length ||
            !wizardState.trainingDays || !wizardState.workoutDuration ||
            wizardState.height === null || wizardState.weight === null) {
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
          height: wizardState.height,
          heightUnit: wizardState.heightUnit || 'cm',
          weight: wizardState.weight,
          weightUnit: wizardState.weightUnit || 'kg',
          age: wizardState.age
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
