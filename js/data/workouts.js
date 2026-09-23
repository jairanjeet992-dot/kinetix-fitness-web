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

export function getWorkoutById(id) {
  return WORKOUTS.find(w => w.id === id);
}

export function getRecommendedWorkouts() {
  return WORKOUTS.filter(w => w.isRecommended);
}

export function getFeaturedWorkout() {
  return WORKOUTS.find(w => w.isFeatured) || WORKOUTS[0];
}
