/**
 * PROFILE STATE MANAGEMENT - KINETIX
 * Phase 2: Personalized Fitness Onboarding
 *
 * Centralized local profile state manager backed by localStorage.
 * Provides safe reads, updates, event notifications, and corruption recovery.
 */

const STORAGE_KEY = 'kinetix_profile_v1';

export const DEFAULT_PROFILE = {
  name: "Athlete",
  goal: "Build Muscle",
  fitnessLevel: "Intermediate",
  focusAreas: ["Full Body"],
  equipment: ["Dumbbells", "Resistance Bands"],
  trainingDays: "4 days",
  workoutDuration: "20–30 min",
  stats: {
    age: 28,
    height: "178 cm",
    weight: "74 kg",
    bmi: "23.4"
  },
  onboardingCompleted: false,
  updatedAt: new Date().toISOString()
};

/**
 * Safely retrieves profile from localStorage.
 * Recovers with default profile if missing or corrupted.
 */
export function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid profile structure in localStorage. Resetting to default.');
      return { ...DEFAULT_PROFILE };
    }
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      stats: {
        ...DEFAULT_PROFILE.stats,
        ...(parsed.stats || {})
      }
    };
  } catch (err) {
    console.warn('Failed to parse profile from localStorage. Using default profile.', err);
    return { ...DEFAULT_PROFILE };
  }
}

/**
 * Updates profile with partial fields and persists to localStorage.
 */
export function updateProfile(partial = {}) {
  const current = getProfile();
  const updated = {
    ...current,
    ...partial,
    stats: {
      ...current.stats,
      ...(partial.stats || {})
    },
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to write profile to localStorage', err);
  }

  // Dispatch global event for reactive UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kinetix:profile-updated', { detail: updated }));
  }

  return updated;
}

/**
 * Marks onboarding as complete and saves.
 */
export function completeOnboarding(profileData = {}) {
  return updateProfile({
    ...profileData,
    onboardingCompleted: true
  });
}

/**
 * Checks whether user has completed onboarding.
 */
export function hasCompletedOnboarding() {
  return Boolean(getProfile().onboardingCompleted);
}

/**
 * Resets profile to pristine uncompleted state.
 * Useful for development and manual testing.
 */
export function resetProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear profile from localStorage', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kinetix:profile-updated', { detail: { ...DEFAULT_PROFILE } }));
  }

  return { ...DEFAULT_PROFILE };
}

// Expose development reset helper on window
if (typeof window !== 'undefined') {
  window.resetProfile = resetProfile;
  window.getProfile = getProfile;
}
