/**
 * WORKOUTS DATABASE - KINETIX
 * Phase 1: Core Information Architecture
 *
 * Realistic workout routines referencing exercises from exercises.js.
 */

export const WORKOUTS = [
  {
    id: "metabolic-ignition",
    title: "Metabolic Ignition HIIT",
    category: "HIIT",
    durationMin: 24,
    difficulty: "Intermediate",
    target: "Full Body & Cardio",
    targetMuscles: ["Core", "Chest", "Legs"],
    equipment: "Bodyweight",
    estimatedCalories: 280,
    isFeatured: true,
    isRecommended: true,
    description: "High-cadence compound intervals designed to elevate heart rate, maximize post-workout oxygen consumption, and torch calories efficiently.",
    exerciseIds: ["air-squat", "push-up", "mountain-climber", "burpee", "forearm-plank"],
    rounds: 3,
    restBetweenExercisesSec: 20
  },
  {
    id: "upper-body-power",
    title: "Upper Body Hypertrophy",
    category: "Strength",
    durationMin: 32,
    difficulty: "Intermediate",
    target: "Chest, Back & Arms",
    targetMuscles: ["Chest", "Back", "Shoulders", "Arms"],
    equipment: "Dumbbells",
    estimatedCalories: 310,
    isFeatured: false,
    isRecommended: true,
    description: "Targeted mechanical tension across pressing and pulling movement patterns to stimulate muscular growth and shoulder stability.",
    exerciseIds: ["push-up", "dumbbell-row", "shoulder-press", "bicep-curl", "tricep-dip"],
    rounds: 3,
    restBetweenExercisesSec: 45
  },
  {
    id: "core-sculpt-matrix",
    title: "Core Sculpt & Stability",
    category: "Core",
    durationMin: 18,
    difficulty: "Beginner",
    target: "Abs & Obliques",
    targetMuscles: ["Core"],
    equipment: "Bodyweight",
    estimatedCalories: 160,
    isFeatured: false,
    isRecommended: true,
    description: "An intensive circuit designed to stabilize the lumbar spine, strengthen deep transverse abdominals, and sculpt functional rotational power.",
    exerciseIds: ["forearm-plank", "mountain-climber", "russian-twist", "glute-bridge"],
    rounds: 4,
    restBetweenExercisesSec: 25
  },
  {
    id: "lower-body-forge",
    title: "Lower Body Power Forge",
    category: "Strength",
    durationMin: 30,
    difficulty: "Advanced",
    target: "Glutes & Hamstrings",
    targetMuscles: ["Legs", "Glutes", "Hamstrings"],
    equipment: "Dumbbells",
    estimatedCalories: 340,
    isFeatured: false,
    isRecommended: true,
    description: "Heavy unilateral lunges and controlled hip hinges designed to construct bulletproof knees, firm posterior chains, and explosive sprint drive.",
    exerciseIds: ["air-squat", "walking-lunge", "romanian-deadlift", "glute-bridge"],
    rounds: 4,
    restBetweenExercisesSec: 45
  },
  {
    id: "spine-hip-mobility",
    title: "Spine & Hip Flow",
    category: "Mobility",
    durationMin: 15,
    difficulty: "Beginner",
    target: "Mobility & Posture",
    targetMuscles: ["Back", "Legs", "Core"],
    equipment: "Bodyweight",
    estimatedCalories: 95,
    isFeatured: false,
    isRecommended: false,
    description: "Restorative decompression focusing on thoracic spine extension, hip capsule lubrication, and muscular tension relief after desk work.",
    exerciseIds: ["glute-bridge", "forearm-plank", "air-squat"],
    rounds: 2,
    restBetweenExercisesSec: 30
  },
  {
    id: "endurance-ladder",
    title: "Cardio Engine Builder",
    category: "Cardio",
    durationMin: 28,
    difficulty: "Intermediate",
    target: "Aerobic Capacity",
    targetMuscles: ["Full Body", "Legs"],
    equipment: "Bodyweight",
    estimatedCalories: 320,
    isFeatured: false,
    isRecommended: false,
    description: "Progressive interval ladders alternating between high-speed bodyweight calisthenics and active recovery tempos to expand VO2 max.",
    exerciseIds: ["burpee", "mountain-climber", "walking-lunge", "air-squat"],
    rounds: 3,
    restBetweenExercisesSec: 30
  },
  {
    id: "kettlebell-complex",
    title: "Total Body Conditioning",
    category: "Full Body",
    durationMin: 25,
    difficulty: "Intermediate",
    target: "Full Body & Power",
    targetMuscles: ["Glutes", "Back", "Shoulders", "Core"],
    equipment: "Kettlebell",
    estimatedCalories: 290,
    isFeatured: false,
    isRecommended: false,
    description: "Dynamic ballistic swinging paired with compound overhead complexes for an athletic, functional strength and conditioning stimulus.",
    exerciseIds: ["kettlebell-swing", "shoulder-press", "air-squat", "push-up"],
    rounds: 3,
    restBetweenExercisesSec: 35
  },
  {
    id: "deep-recovery",
    title: "Active Reset & Stretch",
    category: "Recovery",
    durationMin: 12,
    difficulty: "Beginner",
    target: "Full Body Recovery",
    targetMuscles: ["Back", "Legs", "Shoulders"],
    equipment: "Bodyweight",
    estimatedCalories: 60,
    isFeatured: false,
    isRecommended: false,
    description: "Gentle parasympathetic cool-down targeting deep fascial release, breathing mechanics, and reduced delayed onset muscle soreness.",
    exerciseIds: ["glute-bridge", "forearm-plank"],
    rounds: 2,
    restBetweenExercisesSec: 30
  }
];

// Cache for dynamically generated workouts
const generatedWorkoutsMap = new Map();
const STORAGE_KEY_WORKOUTS = 'kinetix_generated_workouts';
const STORAGE_KEY_ACTIVE_ID = 'kinetix_active_workout_id';
let activeWorkoutId = null;

function loadPersistedWorkouts() {
  try {
    if (typeof localStorage === 'undefined') return;
    const rawWorkouts = localStorage.getItem(STORAGE_KEY_WORKOUTS);
    if (rawWorkouts) {
      const parsed = JSON.parse(rawWorkouts);
      if (Array.isArray(parsed)) {
        parsed.forEach(w => {
          if (w && typeof w === 'object' && typeof w.id === 'string' && w.id.trim() && w.id !== 'latest-generated') {
            generatedWorkoutsMap.set(w.id, w);
          }
        });
      }
    }
    const rawActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    if (rawActiveId && typeof rawActiveId === 'string' && rawActiveId.trim()) {
      activeWorkoutId = rawActiveId.trim();
    }
  } catch (err) {
    console.warn("Failed to load persisted generated workouts (storage or corrupted JSON):", err);
  }
}

function persistWorkouts() {
  try {
    if (typeof localStorage === 'undefined') return;
    const workoutsArray = Array.from(generatedWorkoutsMap.values()).filter(
      w => w && typeof w === 'object' && typeof w.id === 'string' && w.id.trim() && w.id !== 'latest-generated'
    );
    localStorage.setItem(STORAGE_KEY_WORKOUTS, JSON.stringify(workoutsArray));
    if (activeWorkoutId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeWorkoutId);
    }
  } catch (err) {
    console.warn("Failed to save generated workouts to storage (quota/security):", err);
  }
}

// Load on initialization
if (typeof localStorage !== 'undefined') {
  loadPersistedWorkouts();
}

/**
 * Registers a dynamically generated workout so it can be retrieved by ID across views.
 * Only stores the actual generated workout; the latest active ID is tracked separately.
 */
export function registerGeneratedWorkout(workout) {
  if (workout && typeof workout === 'object' && typeof workout.id === 'string' && workout.id.trim()) {
    generatedWorkoutsMap.set(workout.id, workout);
    activeWorkoutId = workout.id;
    persistWorkouts();
  }
}

export function getWorkoutById(id) {
  if (!id || typeof id !== 'string') return null;

  // 1. Check static library
  const staticFound = WORKOUTS.find(w => w.id === id);
  if (staticFound) return staticFound;

  // 2. Check generated registry in memory
  if (generatedWorkoutsMap.has(id)) {
    return generatedWorkoutsMap.get(id);
  }

  // 3. Fallback: if 'latest-generated' or unresolved 'gen-*', resolve active workout
  if (id === 'latest-generated' || id.startsWith('gen-')) {
    if (activeWorkoutId && generatedWorkoutsMap.has(activeWorkoutId)) {
      return generatedWorkoutsMap.get(activeWorkoutId);
    }
  }

  // 4. Fallback: check storage directly in case memory was flushed
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_WORKOUTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const directMatch = parsed.find(w => w && w.id === id);
          if (directMatch) {
            generatedWorkoutsMap.set(directMatch.id, directMatch);
            return directMatch;
          }
          if ((id === 'latest-generated' || id.startsWith('gen-')) && activeWorkoutId) {
            const activeMatch = parsed.find(w => w && w.id === activeWorkoutId);
            if (activeMatch) {
              generatedWorkoutsMap.set(activeMatch.id, activeMatch);
              return activeMatch;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Failed reading direct localStorage fallback:", e);
  }

  return null;
}

/**
 * Clean testing helper to simulate browser reload / reinitialization.
 * Flushes in-memory registry and reloads from localStorage.
 */
export function _resetWorkoutPersistenceForTesting(clearStorage = false) {
  generatedWorkoutsMap.clear();
  activeWorkoutId = null;
  if (clearStorage && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_WORKOUTS);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    } catch (_) {}
  } else {
    loadPersistedWorkouts();
  }
}

export function getRecommendedWorkouts() {
  return WORKOUTS.filter(w => w.isRecommended);
}

export function getFeaturedWorkout() {
  return WORKOUTS.find(w => w.isFeatured) || WORKOUTS[0];
}
