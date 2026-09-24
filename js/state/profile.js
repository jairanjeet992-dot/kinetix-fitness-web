/**
 * ONBOARDING & PROFILE STATE MANAGEMENT - KINETIX
 * Phase 1.2: Onboarding UX + Data Flow
 *
 * Centralized onboarding state manager backed by localStorage.
 * Implements strict zero-fake-defaults, step persistence, safe recovery,
 * and seamless event emission for views.
 */

export const STORAGE_KEY = 'kinetix_onboarding';
export const LEGACY_STORAGE_KEY = 'kinetix_profile_v1';

export const INITIAL_ONBOARDING_STATE = {
  name: "",
  age: null,
  height: null,
  heightUnit: "cm",
  weight: null,
  weightUnit: "kg",
  goal: null,
  fitnessLevel: null,
  targetMuscles: [],
  equipment: [],
  trainingDays: null,
  workoutDuration: null,
  currentStep: 0,
  onboardingCompleted: false,
  updatedAt: null
};

/**
 * Safely parses JSON from localStorage with graceful fallback.
 */
function safeGetStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (err) {
    console.warn(`Failed to parse ${key} from localStorage. Recovering safely.`, err);
    return null;
  }
}

/**
 * Safely writes JSON to localStorage.
 */
function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write ${key} to localStorage:`, err);
  }
}

/**
 * Calculates BMI from height (cm) and weight (kg).
 */
export function calculateBmi(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return '';
  const meters = h / 100;
  const val = w / (meters * meters);
  return isFinite(val) ? val.toFixed(1) : '';
}

/**
 * Retrieves the complete centralized onboarding state.
 */
export function getOnboardingState() {
  let stored = null;
  const rawPrimary = localStorage.getItem(STORAGE_KEY);
  if (rawPrimary !== null) {
    stored = safeGetStorage(STORAGE_KEY);
  } else {
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy !== null) {
      stored = safeGetStorage(LEGACY_STORAGE_KEY);
    }
  }

  if (!stored) {
    return { ...INITIAL_ONBOARDING_STATE };
  }

  // Handle migration from legacy focusAreas to targetMuscles
  const targetMuscles = Array.isArray(stored.targetMuscles)
    ? stored.targetMuscles
    : Array.isArray(stored.focusAreas)
    ? stored.focusAreas
    : [];

  return {
    ...INITIAL_ONBOARDING_STATE,
    ...stored,
    targetMuscles,
    equipment: Array.isArray(stored.equipment) ? stored.equipment : []
  };
}

/**
 * Updates the onboarding state with partial fields and persists.
 */
export function updateOnboardingState(partial = {}) {
  const current = getOnboardingState();
  const updated = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString()
  };

  // Ensure targetMuscles and focusAreas stay synced
  if (Array.isArray(updated.targetMuscles)) {
    updated.focusAreas = [...updated.targetMuscles];
  } else if (Array.isArray(updated.focusAreas)) {
    updated.targetMuscles = [...updated.focusAreas];
  }

  safeSetStorage(STORAGE_KEY, updated);
  safeSetStorage(LEGACY_STORAGE_KEY, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kinetix:onboarding-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('kinetix:profile-updated', { detail: updated }));
  }

  return updated;
}

/**
 * Marks onboarding as complete and persists profile.
 */
export function completeOnboarding(finalData = {}) {
  return updateOnboardingState({
    ...finalData,
    onboardingCompleted: true
  });
}

/**
 * Checks whether user has completed onboarding.
 */
export function hasCompletedOnboarding() {
  return Boolean(getOnboardingState().onboardingCompleted);
}

/**
 * Resets profile and onboarding state back to pristine.
 */
export function resetProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }

  const resetState = { ...INITIAL_ONBOARDING_STATE };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kinetix:onboarding-updated', { detail: resetState }));
    window.dispatchEvent(new CustomEvent('kinetix:profile-updated', { detail: resetState }));
  }

  return resetState;
}

/**
 * Formats canonical height (cm) for display according to unit preference.
 */
export function formatHeight(heightCm, unit = 'cm') {
  const h = parseFloat(heightCm);
  if (!h || h <= 0) return '';
  if (unit === 'ft') {
    const totalInches = Math.round(h / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}' ${inches}"`;
  }
  return `${Math.round(h)} cm`;
}

/**
 * Formats canonical weight (kg) for display according to unit preference.
 */
export function formatWeight(weightKg, unit = 'kg') {
  const w = parseFloat(weightKg);
  if (!w || w <= 0) return '';
  if (unit === 'lb') {
    const lb = Math.round(w * 2.20462);
    return `${lb} lb`;
  }
  return `${Math.round(w)} kg`;
}

/**
 * Backwards-compatible profile accessor for views (Home, Profile, etc.).
 */
export function getProfile() {
  const s = getOnboardingState();
  const hNum = s.height ? parseFloat(s.height) : null;
  const wNum = s.weight ? parseFloat(s.weight) : null;
  const bmi = (hNum && wNum) ? calculateBmi(hNum, wNum) : '';

  return {
    ...s,
    name: s.name ? s.name.trim() : '',
    goal: s.goal || null,
    fitnessLevel: s.fitnessLevel || null,
    focusAreas: s.targetMuscles || [],
    equipment: s.equipment || [],
    trainingDays: s.trainingDays || null,
    workoutDuration: s.workoutDuration || null,
    stats: {
      age: s.age !== null && s.age !== undefined && s.age !== '' ? s.age : '',
      height: s.height ? formatHeight(s.height, s.heightUnit || 'cm') : '',
      weight: s.weight ? formatWeight(s.weight, s.weightUnit || 'kg') : '',
      bmi: bmi
    }
  };
}

export const resetOnboarding = resetProfile;

export function updateProfile(partial) {
  return updateOnboardingState(partial);
}

// Global debug helpers
if (typeof window !== 'undefined') {
  window.resetProfile = resetProfile;
  window.resetOnboarding = resetOnboarding;
  window.getProfile = getProfile;
  window.getOnboardingState = getOnboardingState;
}
