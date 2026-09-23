/**
 * PROFILE DATABASE - KINETIX
 * Phase 1: Core Information Architecture
 *
 * User profile, physical baselines, training preferences, and UI settings.
 */

export const USER_PROFILE = {
  name: "Alex Morgan",
  handle: "@alex.athlete",
  membershipTier: "Kinetix Pro Athlete",
  joinedDate: "Member since June 2026",
  stats: {
    age: 28,
    height: "178 cm",
    weight: "74.5 kg",
    bmi: "23.5"
  },
  fitness: {
    primaryGoal: "Lean Muscle & Conditioning",
    fitnessLevel: "Intermediate",
    availableEquipment: ["Dumbbells", "Resistance Band", "Pull-Up Bar"],
    preferredDuration: "25–35 Min",
    trainingDaysPerWeek: 5
  },
  settings: {
    pushNotifications: true,
    audioCues: true,
    vibrationHaptic: true,
    reducedMotion: false,
    soundEffects: true,
    autoPlayNextInterval: true
  }
};
