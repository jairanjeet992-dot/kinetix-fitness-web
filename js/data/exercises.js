/**
 * EXERCISE DATABASE - KINETIX
 * Phase 2: Centralized Exercise Model & Taxonomy Integration
 *
 * 46+ high-quality exercises across all movement patterns, muscle groups,
 * and equipment options with structured metadata, biomechanical cues, and visual placeholders.
 */

import {
  MUSCLES,
  CATEGORIES,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  DIFFICULTIES
} from './taxonomy.js';

export const EXERCISES = [
  // ==========================================
  // CHEST / HORIZONTAL PUSH
  // ==========================================
  {
    id: "push-up",
    name: "Push-Up",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PUSH,
    primaryMuscles: [MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SHOULDERS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 7.5,
    instructions: [
      "Set palms slightly wider than shoulder-width, fingers spread firmly into the ground.",
      "Maintain a rigid plank line from heels through glutes to the crown of your head.",
      "Lower chest smoothly until 2 inches above floor with elbows tucked at roughly 45 degrees.",
      "Press through the entire palm explosively back to full lockout."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-push" }
  },
  {
    id: "incline-push-up",
    name: "Incline Push-Up",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PUSH,
    primaryMuscles: [MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.BENCH, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 6.0,
    instructions: [
      "Place hands on an elevated bench or sturdy platform, arms straight.",
      "Keep body in a tight plank line without sagging hips.",
      "Lower chest towards the bench edge with controlled tempo.",
      "Press back up to initial arm extension."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-push" }
  },
  {
    id: "diamond-push-up",
    name: "Diamond Push-Up",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PUSH,
    primaryMuscles: [MUSCLES.TRICEPS, MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 8.0,
    instructions: [
      "Place index fingers and thumbs together under chest to form a diamond aperture.",
      "Lower chest slowly until it gently grazes knuckles.",
      "Drive upward powerfully focusing on full triceps extension."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-push" }
  },
  {
    id: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PUSH,
    primaryMuscles: [MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 45,
    defaultRestSeconds: 75,
    estimatedCaloriesPerMinute: 7.0,
    instructions: [
      "Lie supine on bench with dumbbells positioned above chest, wrists neutral.",
      "Retract scapulae and plant feet firmly into the floor.",
      "Lower dumbbells with control until weights reach mid-chest level.",
      "Press dumbbells upward in a slight arc until arms are extended."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },
  {
    id: "dumbbell-chest-fly",
    name: "Dumbbell Chest Fly",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PUSH,
    primaryMuscles: [MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 45,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 6.5,
    instructions: [
      "Lie back on flat bench with dumbbells extended above chest, palms facing each other.",
      "Maintain a slight fixed elbow bend throughout the entire repetition.",
      "Open arms wide in a wide hugging arc until chest muscles feel a deep stretch.",
      "Squeeze pectorals to draw dumbbells back to the vertical starting position."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },
  {
    id: "barbell-bench-press",
    name: "Barbell Bench Press",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PUSH,
    primaryMuscles: [MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.BARBELL, EQUIPMENT.BENCH],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 4,
    defaultReps: 8,
    defaultDurationSec: 40,
    defaultRestSeconds: 90,
    estimatedCaloriesPerMinute: 8.0,
    instructions: [
      "Grip barbell slightly wider than shoulder-width with wrists straight.",
      "Unrack bar over chest, brace core, and pin shoulder blades into bench.",
      "Lower bar smoothly to touch sternum at mid-chest line.",
      "Drive heels into floor and press bar vertically back to lockout."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },

  // ==========================================
  // BACK / PULLING
  // ==========================================
  {
    id: "pull-up",
    name: "Pull-Up",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PULL,
    primaryMuscles: [MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.SHOULDERS, MUSCLES.CORE],
    equipment: [EQUIPMENT.PULL_UP_BAR],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 8,
    defaultDurationSec: 40,
    defaultRestSeconds: 90,
    estimatedCaloriesPerMinute: 8.5,
    instructions: [
      "Grasp bar with an overhand grip wider than shoulders, hanging with straight arms.",
      "Engage lats by pulling shoulder blades down before bending elbows.",
      "Pull chest toward bar until chin clears bar height smoothly.",
      "Lower body with control back to a dead hang position."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },
  {
    id: "chin-up",
    name: "Chin-Up",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PULL,
    primaryMuscles: [MUSCLES.BACK, MUSCLES.BICEPS],
    secondaryMuscles: [MUSCLES.FOREARMS, MUSCLES.CORE],
    equipment: [EQUIPMENT.PULL_UP_BAR],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 8,
    defaultDurationSec: 40,
    defaultRestSeconds: 90,
    estimatedCaloriesPerMinute: 8.0,
    instructions: [
      "Grip overhead bar with palms facing inward towards face (supinated grip).",
      "Pull body upward driving elbows down toward ribcage.",
      "Bring chin over bar with strong biceps and lat peak contraction.",
      "Lower slowly under muscular control."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },
  {
    id: "dumbbell-row",
    name: "Bent-Over Dumbbell Row",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PULL,
    primaryMuscles: [MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 45,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 7.0,
    instructions: [
      "Hinge forward at hips with flat back and knees softly unlocked.",
      "Hold dumbbells hanging naturally below shoulders.",
      "Pull dumbbells toward lower ribcage, leading with elbows.",
      "Squeeze rhomboids at the top before extending arms back down."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },
  {
    id: "single-arm-dumbbell-row",
    name: "Single-Arm Dumbbell Row",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PULL,
    primaryMuscles: [MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.CORE],
    equipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: true,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 45,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 6.8,
    instructions: [
      "Support knee and hand on flat bench with neutral spine parallel to floor.",
      "Grasp dumbbell in free hand and pull weight toward hip crest.",
      "Keep torso level without twisting shoulders at top.",
      "Lower dumbbell under deliberate control."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },
  {
    id: "resistance-band-row",
    name: "Resistance Band Seated Row",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PULL,
    primaryMuscles: [MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.RESISTANCE_BAND],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 15,
    defaultDurationSec: 45,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 5.8,
    instructions: [
      "Sit with legs extended, looping band around feet arches.",
      "Hold handles with tall spine and retracted shoulders.",
      "Row handles into abdomen, contracting middle back blades.",
      "Release resistance smoothly without rounding lower back."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PULL,
    primaryMuscles: [MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.SHOULDERS],
    equipment: [{ any: [EQUIPMENT.CABLE, EQUIPMENT.MACHINE] }],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 6.5,
    instructions: [
      "Sit securely at station with thighs snug under leg pads.",
      "Grip wide bar with overhand grip and lean back slightly.",
      "Draw bar down toward upper chest while pulling elbows back.",
      "Extend arms steadily under control back to overhead stretch."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },
  {
    id: "barbell-row",
    name: "Bent-Over Barbell Row",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HORIZONTAL_PULL,
    primaryMuscles: [MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.BICEPS, MUSCLES.HAMSTRINGS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BARBELL],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 4,
    defaultReps: 8,
    defaultDurationSec: 45,
    defaultRestSeconds: 90,
    estimatedCaloriesPerMinute: 8.2,
    instructions: [
      "Hinge hips back at 45-degree angle with barbell hanging below knees.",
      "Pull bar into lower stomach, skimming shins and thighs.",
      "Squeeze shoulder blades tightly at apex.",
      "Lower with controlled resistance without letting lower back round."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-pull" }
  },

  // ==========================================
  // SHOULDERS / VERTICAL PUSH
  // ==========================================
  {
    id: "shoulder-press",
    name: "Overhead Dumbbell Press",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PUSH,
    primaryMuscles: [MUSCLES.SHOULDERS],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.CORE],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 6.8,
    instructions: [
      "Stand or sit tall holding dumbbells at collarbone height, palms facing forward.",
      "Brace core and glutes to prevent lumbar overextension.",
      "Press dumbbells directly overhead until arms lock out vertically.",
      "Lower slowly back to ear level."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },
  {
    id: "barbell-overhead-press",
    name: "Barbell Standing Overhead Press",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PUSH,
    primaryMuscles: [MUSCLES.SHOULDERS],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BARBELL],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 4,
    defaultReps: 6,
    defaultDurationSec: 40,
    defaultRestSeconds: 90,
    estimatedCaloriesPerMinute: 7.8,
    instructions: [
      "Rest bar on front deltoids with hands outside shoulders.",
      "Squeeze glutes and tuck chin as bar drives upward in vertical path.",
      "Push head slightly forward through arms as bar clears forehead.",
      "Lock bar directly above center of skull."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },
  {
    id: "lateral-raise",
    name: "Dumbbell Lateral Raise",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.SHOULDERS],
    secondaryMuscles: [MUSCLES.TRICEPS],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 5.5,
    instructions: [
      "Stand tall with dumbbells resting at sides, palms facing inward.",
      "Raise arms out to sides with slight elbow bend until parallel with floor.",
      "Lead movement with elbows rather than wrists.",
      "Control descent without using swinging body momentum."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },
  {
    id: "pike-push-up",
    name: "Pike Push-Up",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PUSH,
    primaryMuscles: [MUSCLES.SHOULDERS],
    secondaryMuscles: [MUSCLES.TRICEPS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 7.0,
    instructions: [
      "Assume downward dog position with hips elevated high in inverted V.",
      "Lower crown of head diagonally forward between fingertips.",
      "Press through palms to drive body back upward along inverted angle.",
      "Keep core braced and heels light."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-push" }
  },

  // ==========================================
  // ARMS: BICEPS & TRICEPS & FOREARMS
  // ==========================================
  {
    id: "bicep-curl",
    name: "Dumbbell Bicep Curl",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.BICEPS],
    secondaryMuscles: [MUSCLES.FOREARMS],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 5.5,
    instructions: [
      "Pin elbows against ribcage with dumbbells held at sides.",
      "Curl weights upward while supinating wrists (palms face shoulders at apex).",
      "Squeeze biceps firmly at top without swinging elbows forward.",
      "Lower smoothly along same curved track."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-curl" }
  },
  {
    id: "hammer-curl",
    name: "Dumbbell Hammer Curl",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.BICEPS, MUSCLES.FOREARMS],
    secondaryMuscles: [MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 5.5,
    instructions: [
      "Hold dumbbells with neutral grip (palms facing inward throughout).",
      "Curl weights upward toward anterior shoulders.",
      "Target brachialis and forearm muscles through full range.",
      "Lower under strict control without momentum."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-curl" }
  },
  {
    id: "resistance-band-bicep-curl",
    name: "Resistance Band Bicep Curl",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.BICEPS],
    secondaryMuscles: [MUSCLES.FOREARMS],
    equipment: [EQUIPMENT.RESISTANCE_BAND],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 15,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 5.2,
    instructions: [
      "Step on middle of band, holding handles with arms straight at sides.",
      "Keep elbows anchored and curl handles upward toward shoulders.",
      "Squeeze at peak tension against continuous elastic resistance.",
      "Control eccentric descent to starting point."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-curl" }
  },
  {
    id: "tricep-dip",
    name: "Bench Tricep Dip",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.VERTICAL_PUSH,
    primaryMuscles: [MUSCLES.TRICEPS],
    secondaryMuscles: [MUSCLES.CHEST, MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.BENCH, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 6.5,
    instructions: [
      "Place palms on edge of bench with fingers forward and feet flat on floor.",
      "Slide pelvis off edge and lower hips vertically by bending elbows.",
      "Stop when upper arms are parallel to floor (90 degree angle).",
      "Press through heels of hands to lockout triceps."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-dip" }
  },
  {
    id: "overhead-triceps-extension",
    name: "Dumbbell Overhead Triceps Extension",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.TRICEPS],
    secondaryMuscles: [MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 5.8,
    instructions: [
      "Cup dumbbell vertically with both hands overhead, arms fully extended.",
      "Keep upper arms stationary next to ears as you bend elbows.",
      "Lower weight behind head until forearms pass parallel.",
      "Contract triceps to extend arms back to overhead position."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-dip" }
  },

  // ==========================================
  // LEGS: QUADRICEPS, HAMSTRINGS, CALVES
  // ==========================================
  {
    id: "air-squat",
    name: "Bodyweight Squat",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.SQUAT,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CALVES, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 15,
    defaultDurationSec: 45,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 7.5,
    instructions: [
      "Stand with feet shoulder-width apart, toes turned slightly out.",
      "Initiate by hinging hips back and bending knees concurrently.",
      "Descend until thighs break parallel with floor, keeping torso proud.",
      "Drive through whole foot to stand back tall."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-squat" }
  },
  {
    id: "goblet-squat",
    name: "Dumbbell Goblet Squat",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.SQUAT,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CORE],
    equipment: [{ any: [EQUIPMENT.DUMBBELL, EQUIPMENT.KETTLEBELL] }],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 45,
    defaultRestSeconds: 75,
    estimatedCaloriesPerMinute: 8.0,
    instructions: [
      "Hold dumbbell vertically against center of chest, elbows tucked.",
      "Drop into a deep squat between knees, keeping spine upright.",
      "Track knees outward in line with second toes.",
      "Push floor away powerfully through midfoot and heels."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-squat" }
  },
  {
    id: "barbell-back-squat",
    name: "Barbell Back Squat",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.SQUAT,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CALVES, MUSCLES.CORE],
    equipment: [EQUIPMENT.BARBELL],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 4,
    defaultReps: 6,
    defaultDurationSec: 45,
    defaultRestSeconds: 120,
    estimatedCaloriesPerMinute: 9.5,
    instructions: [
      "Rest barbell firmly across upper trapezius with hands securing bar.",
      "Take a deep diaphragmatic breath, brace core, and break at hips and knees.",
      "Squat down to hip crease below kneecap crease with upright chest.",
      "Drive aggressively out of bottom hole back to standing stance."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-squat" }
  },
  {
    id: "walking-lunge",
    name: "Walking Lunge",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.LUNGE,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CALVES],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: true,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 50,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 8.0,
    instructions: [
      "Step forward smoothly, lowering rear knee until hovering 1 inch from floor.",
      "Form dual 90-degree angles in both lead and trailing legs.",
      "Drive through front heel to step forward into alternating step.",
      "Maintain tall posture with hips square."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-lunge" }
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.LUNGE,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CALVES],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: true,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 45,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 7.2,
    instructions: [
      "Step backward with one leg and lower back knee toward ground.",
      "Keep majority of body weight balanced on stationary lead foot.",
      "Drive through lead heel to return to upright standing position.",
      "Alternate legs each repetition."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-lunge" }
  },
  {
    id: "dumbbell-lunge",
    name: "Dumbbell Walking Lunge",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.LUNGE,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.FOREARMS],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: true,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 50,
    defaultRestSeconds: 75,
    estimatedCaloriesPerMinute: 8.5,
    instructions: [
      "Hold dumbbells hanging naturally at sides with tall chest.",
      "Lunge forward with measured stride, lowering rear knee smoothly.",
      "Drive through lead foot to step forward into continuous walking rhythm.",
      "Keep core tight to eliminate lateral spine sway."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-lunge" }
  },
  {
    id: "romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HINGE,
    primaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.BACK, MUSCLES.CORE],
    equipment: [EQUIPMENT.DUMBBELL],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 45,
    defaultRestSeconds: 75,
    estimatedCaloriesPerMinute: 7.5,
    instructions: [
      "Hold dumbbells in front of thighs with slight unlock in knees.",
      "Hinge hips backward as if pushing a door closed behind you.",
      "Trace dumbbells along shins until hamstrings reach high stretch tension.",
      "Squeeze glutes to return hips forward to standing vertical."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-deadlift" }
  },
  {
    id: "barbell-deadlift",
    name: "Barbell Conventional Deadlift",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HINGE,
    primaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.GLUTES, MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.FOREARMS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BARBELL],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 4,
    defaultReps: 5,
    defaultDurationSec: 45,
    defaultRestSeconds: 120,
    estimatedCaloriesPerMinute: 10.0,
    instructions: [
      "Step under bar with midfoot beneath it, shins one inch away.",
      "Hinge to grip bar, set flat back, and pull slack out with tight lats.",
      "Push floor away with legs, pulling bar straight up shin contact path.",
      "Lock out standing tall by contracting glutes, then reverse hinge."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-deadlift" }
  },
  {
    id: "calf-raise",
    name: "Standing Calf Raise",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.CALVES],
    secondaryMuscles: [MUSCLES.QUADRICEPS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 18,
    defaultDurationSec: 40,
    defaultRestSeconds: 45,
    estimatedCaloriesPerMinute: 5.0,
    instructions: [
      "Stand tall with balls of feet on floor or raised ledge.",
      "Elevate heels as high as possible, contracting gastrocnemius muscles.",
      "Hold apex contraction for one second count.",
      "Lower heels slowly past neutral into a calf stretch."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-squat" }
  },

  // ==========================================
  // GLUTES
  // ==========================================
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HINGE,
    primaryMuscles: [MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 15,
    defaultDurationSec: 40,
    defaultRestSeconds: 45,
    estimatedCaloriesPerMinute: 6.0,
    instructions: [
      "Lie supine with knees bent at 90 degrees and feet flat, hip-distance apart.",
      "Drive through heels to raise hips until knees, hips, and shoulders align.",
      "Hard peak glute squeeze at top for two full seconds.",
      "Lower hips gently back down without relaxing abdominal brace."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-bridge" }
  },
  {
    id: "hip-thrust",
    name: "Barbell Hip Thrust",
    category: CATEGORIES.STRENGTH,
    movementPattern: MOVEMENT_PATTERNS.HINGE,
    primaryMuscles: [MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.QUADRICEPS],
    equipment: [EQUIPMENT.BARBELL, EQUIPMENT.BENCH],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 45,
    defaultRestSeconds: 90,
    estimatedCaloriesPerMinute: 8.0,
    instructions: [
      "Position upper back across bench edge with padded barbell over hip crease.",
      "Plant feet shoulder-width, knees stacked directly over ankles at top.",
      "Drive through heels to extend hips horizontally, tucking chin to chest.",
      "Squeeze glutes fully at lockout before lowering hips down."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-bridge" }
  },
  {
    id: "kettlebell-swing",
    name: "Kettlebell Swing",
    category: CATEGORIES.HIIT,
    movementPattern: MOVEMENT_PATTERNS.HINGE,
    primaryMuscles: [MUSCLES.GLUTES, MUSCLES.HAMSTRINGS],
    secondaryMuscles: [MUSCLES.BACK, MUSCLES.SHOULDERS, MUSCLES.CORE],
    equipment: [EQUIPMENT.KETTLEBELL],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 15,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 10.5,
    instructions: [
      "Hinge hips back and hike kettlebell between upper thighs.",
      "Snap hips forward explosively, contracting glutes to propel bell to chest height.",
      "Let kettlebell float momentarily at chest level without lifting with arms.",
      "Guide weight back through hips in continuous fluid cycle."
    ],
    media: { type: "placeholder", source: null, svgType: "full-swing" }
  },

  // ==========================================
  // CORE & ABDOMINALS
  // ==========================================
  {
    id: "forearm-plank",
    name: "Forearm Plank",
    category: CATEGORIES.CORE,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.CORE],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.GLUTES],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 3,
    defaultReps: "45s",
    defaultDurationSec: 45,
    defaultRestSeconds: 45,
    estimatedCaloriesPerMinute: 5.5,
    instructions: [
      "Place forearms on floor with elbows aligned directly under shoulders.",
      "Tuck pelvis under slightly, squeezing glutes and pulling belly button to spine.",
      "Hold rigid bridge without allowing lower back to sag or hips to pike.",
      "Breathe steadily throughout the static isometric hold."
    ],
    media: { type: "placeholder", source: null, svgType: "core-plank" }
  },
  {
    id: "side-plank",
    name: "Side Plank",
    category: CATEGORIES.CORE,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.CORE],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.GLUTES],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "timed",
    unilateral: true,
    defaultSets: 3,
    defaultReps: "30s",
    defaultDurationSec: 30,
    defaultRestSeconds: 45,
    estimatedCaloriesPerMinute: 5.5,
    instructions: [
      "Lie on one side with forearm under shoulder and feet stacked or staggered.",
      "Elevate hips so body forms a diagonal straight beam from ankle to head.",
      "Brace obliques firmly and reach opposite arm straight upward.",
      "Hold position steady then switch to opposite side."
    ],
    media: { type: "placeholder", source: null, svgType: "core-plank" }
  },
  {
    id: "dead-bug",
    name: "Dead Bug",
    category: CATEGORIES.CORE,
    movementPattern: MOVEMENT_PATTERNS.ISOMETRIC,
    primaryMuscles: [MUSCLES.CORE],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.QUADRICEPS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 12,
    defaultDurationSec: 40,
    defaultRestSeconds: 45,
    estimatedCaloriesPerMinute: 5.0,
    instructions: [
      "Lie supine with arms pointing at ceiling and knees bent at 90 degrees above hips.",
      "Flatten lumbar spine completely against floor with zero gap.",
      "Extend opposite arm and leg away slowly without arching back.",
      "Return to starting center and switch diagonal limbs."
    ],
    media: { type: "placeholder", source: null, svgType: "core-twist" }
  },
  {
    id: "russian-twist",
    name: "Seated Russian Twist",
    category: CATEGORIES.CORE,
    movementPattern: MOVEMENT_PATTERNS.ROTATIONAL,
    primaryMuscles: [MUSCLES.CORE],
    secondaryMuscles: [MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 20,
    defaultDurationSec: 40,
    defaultRestSeconds: 45,
    estimatedCaloriesPerMinute: 6.5,
    instructions: [
      "Sit with knees bent, heels light on floor, leaning torso backward 45 degrees.",
      "Clasp hands at center chest, engaging abdominal wall.",
      "Rotate ribcage from side to side in controlled cadence.",
      "Initiate rotation from core rather than merely flinging arms."
    ],
    media: { type: "placeholder", source: null, svgType: "core-twist" }
  },
  {
    id: "mountain-climber",
    name: "Mountain Climber",
    category: CATEGORIES.HIIT,
    movementPattern: MOVEMENT_PATTERNS.CARDIO,
    primaryMuscles: [MUSCLES.CORE],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.CALVES, MUSCLES.QUADRICEPS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 3,
    defaultReps: "30s",
    defaultDurationSec: 30,
    defaultRestSeconds: 30,
    estimatedCaloriesPerMinute: 11.0,
    instructions: [
      "Start in a tall high plank with shoulders stacked directly over wrists.",
      "Drive knees alternately toward chest in rapid rhythmic piston motions.",
      "Keep hips down and level without bouncing up and down.",
      "Maintain active shoulder push into the ground."
    ],
    media: { type: "placeholder", source: null, svgType: "cardio-run" }
  },

  // ==========================================
  // CARDIO & HIIT
  // ==========================================
  {
    id: "burpee",
    name: "Athletic Burpee",
    category: CATEGORIES.HIIT,
    movementPattern: MOVEMENT_PATTERNS.CARDIO,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.CHEST],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.CALVES, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.ADVANCED,
    exerciseType: "strength",
    unilateral: false,
    defaultSets: 3,
    defaultReps: 10,
    defaultDurationSec: 40,
    defaultRestSeconds: 60,
    estimatedCaloriesPerMinute: 12.5,
    instructions: [
      "Drop into a deep squat placing palms flat on floor in front of toes.",
      "Kick feet back into plank and lower chest to touch floor in one fluid drop.",
      "Press chest up, snap feet forward under hips, and leap vertically with hands overhead.",
      "Land softly on balls of feet and immediately initiate next repetition."
    ],
    media: { type: "placeholder", source: null, svgType: "full-jump" }
  },
  {
    id: "jumping-jack",
    name: "Jumping Jack",
    category: CATEGORIES.CARDIO,
    movementPattern: MOVEMENT_PATTERNS.CARDIO,
    primaryMuscles: [MUSCLES.CALVES],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.QUADRICEPS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 3,
    defaultReps: "45s",
    defaultDurationSec: 45,
    defaultRestSeconds: 30,
    estimatedCaloriesPerMinute: 8.5,
    instructions: [
      "Stand with feet together and arms resting at your sides.",
      "Jump feet outward laterally while sweeping arms overhead to touch.",
      "Spring back to starting position on balls of feet in rhythmic bounce.",
      "Keep breathing steady and core lightly braced."
    ],
    media: { type: "placeholder", source: null, svgType: "cardio-run" }
  },
  {
    id: "high-knees",
    name: "High Knees",
    category: CATEGORIES.CARDIO,
    movementPattern: MOVEMENT_PATTERNS.CARDIO,
    primaryMuscles: [MUSCLES.QUADRICEPS, MUSCLES.CALVES],
    secondaryMuscles: [MUSCLES.CORE, MUSCLES.GLUTES],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.INTERMEDIATE,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 3,
    defaultReps: "30s",
    defaultDurationSec: 30,
    defaultRestSeconds: 30,
    estimatedCaloriesPerMinute: 11.5,
    instructions: [
      "Run on the spot driving knees alternately up to waist height.",
      "Pump opposite arms dynamically in synchrony with leg strike.",
      "Stay springy on the forefoot with minimal ground contact time.",
      "Maintain tall athletic torso alignment."
    ],
    media: { type: "placeholder", source: null, svgType: "cardio-run" }
  },

  // ==========================================
  // WARMUP & MOBILITY & COOLDOWN
  // ==========================================
  {
    id: "arm-circles",
    name: "Dynamic Arm Circles",
    category: CATEGORIES.WARMUP,
    movementPattern: MOVEMENT_PATTERNS.MOBILITY,
    primaryMuscles: [MUSCLES.SHOULDERS],
    secondaryMuscles: [MUSCLES.BACK, MUSCLES.CHEST],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 2,
    defaultReps: "30s",
    defaultDurationSec: 30,
    defaultRestSeconds: 15,
    estimatedCaloriesPerMinute: 3.5,
    instructions: [
      "Stand with arms extended parallel to floor at shoulder height.",
      "Rotate arms in controlled forward circles, gradually expanding circle radius.",
      "Reverse rotation backward to loosen shoulder capsules and thoracic spine.",
      "Maintain upright posture with ribs down."
    ],
    media: { type: "placeholder", source: null, svgType: "upper-press" }
  },
  {
    id: "cat-cow",
    name: "Cat-Cow Flow",
    category: CATEGORIES.MOBILITY,
    movementPattern: MOVEMENT_PATTERNS.MOBILITY,
    primaryMuscles: [MUSCLES.BACK, MUSCLES.CORE],
    secondaryMuscles: [MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 2,
    defaultReps: "45s",
    defaultDurationSec: 45,
    defaultRestSeconds: 15,
    estimatedCaloriesPerMinute: 3.0,
    instructions: [
      "Begin on all fours with hands under shoulders and knees beneath hips.",
      "Inhale, dropping belly down while lifting gaze and tailbone toward sky (Cow).",
      "Exhale, rounding spine upward, tucking chin toward chest and pelvis under (Cat).",
      "Transition between postures continuously with natural breath cadence."
    ],
    media: { type: "placeholder", source: null, svgType: "core-plank" }
  },
  {
    id: "worlds-greatest-stretch",
    name: "World's Greatest Stretch",
    category: CATEGORIES.WARMUP,
    movementPattern: MOVEMENT_PATTERNS.MOBILITY,
    primaryMuscles: [MUSCLES.HAMSTRINGS, MUSCLES.GLUTES, MUSCLES.BACK],
    secondaryMuscles: [MUSCLES.SHOULDERS, MUSCLES.CORE],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: true,
    defaultSets: 2,
    defaultReps: "40s",
    defaultDurationSec: 40,
    defaultRestSeconds: 15,
    estimatedCaloriesPerMinute: 4.0,
    instructions: [
      "Step into a long forward lunge with both hands on floor inside front foot.",
      "Rotate lead arm upward toward ceiling, opening thoracic chest cavity.",
      "Reach back down and rock hips backward into a hamstring stretch.",
      "Switch sides and repeat the dynamic sequence."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-lunge" }
  },
  {
    id: "childs-pose",
    name: "Child's Pose Decompression",
    category: CATEGORIES.COOLDOWN,
    movementPattern: MOVEMENT_PATTERNS.MOBILITY,
    primaryMuscles: [MUSCLES.BACK, MUSCLES.GLUTES],
    secondaryMuscles: [MUSCLES.SHOULDERS],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: false,
    defaultSets: 1,
    defaultReps: "60s",
    defaultDurationSec: 60,
    defaultRestSeconds: 0,
    estimatedCaloriesPerMinute: 2.5,
    instructions: [
      "Kneel on floor with big toes touching and knees opened wide.",
      "Sink hips back over heels while creeping arms forward on floor.",
      "Rest forehead gently on ground and lengthen through lats.",
      "Take deep diaphragmatic breaths to downregulate nervous system."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-bridge" }
  },
  {
    id: "standing-quad-stretch",
    name: "Standing Quadriceps Stretch",
    category: CATEGORIES.COOLDOWN,
    movementPattern: MOVEMENT_PATTERNS.MOBILITY,
    primaryMuscles: [MUSCLES.QUADRICEPS],
    secondaryMuscles: [MUSCLES.GLUTES],
    equipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    difficulty: DIFFICULTIES.BEGINNER,
    exerciseType: "timed",
    unilateral: true,
    defaultSets: 1,
    defaultReps: "30s",
    defaultDurationSec: 30,
    defaultRestSeconds: 0,
    estimatedCaloriesPerMinute: 2.5,
    instructions: [
      "Stand on one leg, grabbing ankle of opposite leg behind your glutes.",
      "Keep knees aligned together and tuck pelvis forward slightly.",
      "Breathe into the front thigh stretch without arching lower back.",
      "Hold for duration then switch sides."
    ],
    media: { type: "placeholder", source: null, svgType: "lower-squat" }
  }
];

// Enrich each exercise with backward-compatible properties so existing views work seamlessly
EXERCISES.forEach(ex => {
  // primaryMuscle display string (e.g. "Chest")
  if (!ex.primaryMuscle && ex.primaryMuscles && ex.primaryMuscles.length > 0) {
    const raw = ex.primaryMuscles[0];
    ex.primaryMuscle = raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  // defaultReps display string
  if (typeof ex.defaultReps === 'number') {
    ex.defaultReps = `${ex.defaultReps} Reps`;
  }
  // svgType for visual placeholders
  if (!ex.svgType && ex.media && ex.media.svgType) {
    ex.svgType = ex.media.svgType;
  }
  // Form cues and safety notes backward-compatible enrichment
  if (!ex.formCues) {
    ex.formCues = ex.instructions && ex.instructions.length > 0
      ? ex.instructions.slice(0, 3).map(i => i.split('.')[0].trim()).filter(Boolean)
      : ['Maintain strict form', 'Control the movement'];
  }
  if (!ex.safetyNotes) {
    ex.safetyNotes = ex.difficulty === 'advanced'
      ? 'Ensure full joint stability before loading heavy.'
      : 'Maintain a braced core and controlled tempo.';
  }
});

/**
 * Retrieves an exercise record by ID.
 */
export function getExerciseById(id) {
  if (!id) return null;
  return EXERCISES.find(ex => ex.id === id) || null;
}

/**
 * Retrieves exercises matching a filter function.
 */
export function getExercisesByFilter(filterFn) {
  if (typeof filterFn !== 'function') return [...EXERCISES];
  return EXERCISES.filter(filterFn);
}

/**
 * Returns an inline SVG placeholder for the exercise icon.
 */
export function getExercisePlaceholderSvg(type) {
  return `
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="exercise-svg-icon" aria-hidden="true">
      <circle cx="24" cy="10" r="5" fill="none" />
      <path d="M24 16v14" />
      <path d="M16 22l8-4 8 4" />
      <path d="M18 38l6-8 6 8" />
    </svg>
  `;
}
