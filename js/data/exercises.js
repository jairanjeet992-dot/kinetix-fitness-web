/**
 * EXERCISE DATABASE - KINETIX
 * Phase 1: Core Information Architecture
 *
 * 14+ realistic exercise definitions with muscle focus,
 * equipment, difficulty, form cues, and original SVG visual placeholders.
 */

export const EXERCISES = [
  {
    id: "push-up",
    name: "Push-Up",
    category: "Strength",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders", "Core"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultReps: "12 Reps",
    defaultDurationSec: 40,
    instructions: "Maintain a rigid plank line from heels to crown. Lower chest until 2 inches above ground, then press explosively back to starting position.",
    svgType: "upper-push"
  },
  {
    id: "air-squat",
    name: "Bodyweight Squat",
    category: "Strength",
    primaryMuscle: "Legs",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultReps: "15 Reps",
    defaultDurationSec: 45,
    instructions: "Stand shoulder-width apart. Hips initiate downward and back as if sitting in a low chair. Keep chest tall and knees tracking over toes.",
    svgType: "lower-squat"
  },
  {
    id: "walking-lunge",
    name: "Walking Lunge",
    category: "Strength",
    primaryMuscle: "Legs",
    secondaryMuscles: ["Glutes", "Calves"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    defaultReps: "12 Reps / Leg",
    defaultDurationSec: 50,
    instructions: "Step forward decisively, lowering back knee towards floor to create dual 90-degree angles. Drive through front heel to step forward.",
    svgType: "lower-lunge"
  },
  {
    id: "forearm-plank",
    name: "Forearm Plank",
    category: "Core",
    primaryMuscle: "Core",
    secondaryMuscles: ["Shoulders", "Glutes"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultReps: "45 Sec Hold",
    defaultDurationSec: 45,
    instructions: "Rest on forearms directly under shoulders. Brace core as if anticipating impact. Maintain neutral cervical spine and level pelvis.",
    svgType: "core-plank"
  },
  {
    id: "mountain-climber",
    name: "Mountain Climber",
    category: "HIIT",
    primaryMuscle: "Core",
    secondaryMuscles: ["Shoulders", "Hip Flexors"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    defaultReps: "30 Sec",
    defaultDurationSec: 30,
    instructions: "From high plank position, drive knees alternately toward chest in rapid rhythmic piston motions while keeping hips down.",
    svgType: "cardio-run"
  },
  {
    id: "burpee",
    name: "Athletic Burpee",
    category: "HIIT",
    primaryMuscle: "Full Body",
    secondaryMuscles: ["Chest", "Legs", "Cardio"],
    equipment: "Bodyweight",
    difficulty: "Advanced",
    defaultReps: "10 Reps",
    defaultDurationSec: 40,
    instructions: "Drop into a squat, kick feet back to plank, drop chest to floor, jump feet forward, and jump upward with hands overhead.",
    svgType: "full-jump"
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    category: "Strength",
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Lower Back"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultReps: "15 Reps",
    defaultDurationSec: 40,
    instructions: "Lie supine with knees bent and feet flat. Drive through heels to elevate hips until hips, knees, and shoulders form a straight line.",
    svgType: "lower-bridge"
  },
  {
    id: "dumbbell-row",
    name: "Bent-Over Dumbbell Row",
    category: "Strength",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: "Dumbbells",
    difficulty: "Intermediate",
    defaultReps: "12 Reps",
    defaultDurationSec: 45,
    instructions: "Hinge at hips with flat back. Pull dumbbells towards lower ribs, squeezing shoulder blades together at apex of movement.",
    svgType: "upper-pull"
  },
  {
    id: "shoulder-press",
    name: "Overhead Dumbbell Press",
    category: "Strength",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest"],
    equipment: "Dumbbells",
    difficulty: "Intermediate",
    defaultReps: "10 Reps",
    defaultDurationSec: 40,
    instructions: "Hold dumbbells at shoulder height with palms facing forward. Press vertically until arms lock overhead without arching lumbar spine.",
    svgType: "upper-press"
  },
  {
    id: "bicep-curl",
    name: "Dumbbell Bicep Curl",
    category: "Strength",
    primaryMuscle: "Arms",
    secondaryMuscles: ["Forearms"],
    equipment: "Dumbbells",
    difficulty: "Beginner",
    defaultReps: "12 Reps",
    defaultDurationSec: 40,
    instructions: "Pin elbows tightly to torso. Curl weights upward with deliberate control, rotating wrists slightly outwards at the contraction peak.",
    svgType: "upper-curl"
  },
  {
    id: "tricep-dip",
    name: "Bench Tricep Dip",
    category: "Strength",
    primaryMuscle: "Arms",
    secondaryMuscles: ["Chest", "Front Delts"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultReps: "12 Reps",
    defaultDurationSec: 40,
    instructions: "Place hands on bench or sturdy chair edge. Lower hips close to bench until elbows reach 90 degrees, then extend back up.",
    svgType: "upper-dip"
  },
  {
    id: "kettlebell-swing",
    name: "Kettlebell Swing",
    category: "Full Body",
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Lower Back", "Shoulders"],
    equipment: "Kettlebell",
    difficulty: "Intermediate",
    defaultReps: "15 Reps",
    defaultDurationSec: 45,
    instructions: "Hinge violently at hips, sending weight between thighs, then snap hips forward to float kettlebell to chest height.",
    svgType: "full-swing"
  },
  {
    id: "russian-twist",
    name: "Seated Russian Twist",
    category: "Core",
    primaryMuscle: "Core",
    secondaryMuscles: ["Obliques"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    defaultReps: "20 Reps",
    defaultDurationSec: 40,
    instructions: "Sit with knees bent, lean torso back 45 degrees, lift feet slightly. Rotate ribcage smoothly from side to side.",
    svgType: "core-twist"
  },
  {
    id: "romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    category: "Strength",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"],
    equipment: "Dumbbells",
    difficulty: "Intermediate",
    defaultReps: "10 Reps",
    defaultDurationSec: 45,
    instructions: "Soft knee bend. Push hips back as dumbbells slide down shins. Stop when hamstrings are fully loaded, then contract glutes to return.",
    svgType: "lower-deadlift"
  }
];

export function getExerciseById(id) {
  return EXERCISES.find(ex => ex.id === id);
}

export function getExercisePlaceholderSvg(type) {
  return `
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="exercise-svg-icon">
      <circle cx="24" cy="10" r="5" fill="none" />
      <path d="M24 16v14" />
      <path d="M16 22l8-4 8 4" />
      <path d="M18 38l6-8 6 8" />
    </svg>
  `;
}
