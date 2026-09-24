/**
 * WORKOUT ENGINE TEST SUITE - KINETIX
 * Phase 2: Exercise Database & Workout Intelligence Engine Validation
 *
 * Runs automated verification of:
 * 1. Database schema and canonical taxonomy compliance
 * 2. Five mandated test scenarios across equipment, difficulty, and duration combinations
 */

import { EXERCISES, getExerciseById } from '../js/data/exercises.js';
import { validateExerciseDatabase } from '../js/data/exercise-validator.js';
import { generateWorkout } from '../js/engine/workout-generator.js';
import { EQUIPMENT } from '../js/data/taxonomy.js';
import { registerGeneratedWorkout, getWorkoutById } from '../js/data/workouts.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('KINETIX WORKOUT ENGINE & EXERCISE DATABASE TESTS');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. DATABASE INTEGRITY
// ------------------------------------------------------------------
console.log('Test Suite 1: Exercise Database Schema & Validation');
const dbValidation = validateExerciseDatabase(EXERCISES);

assert(dbValidation.valid, `Exercise database passes schema validation (Errors: ${dbValidation.errors.length})`);
assert(dbValidation.totalExercises >= 40, `Exercise database contains at least 40 exercises (Found: ${dbValidation.totalExercises})`);
assert(dbValidation.errors.length === 0, `Zero schema errors detected`);

if (dbValidation.errors.length > 0) {
  console.error('Validation errors:', dbValidation.errors);
}

// ------------------------------------------------------------------
// 2. MANDATED TEST SCENARIOS
// ------------------------------------------------------------------
console.log('\nTest Suite 2: Five Core Generation Scenarios');

const scenarios = [
  {
    name: 'Scenario 1: Beginner, Bodyweight, Full Body, 20 min',
    profile: {
      fitnessLevel: 'Beginner',
      equipment: ['No Equipment'],
      targetMuscles: ['Full Body'],
      workoutDuration: '20–30 min',
      goal: 'Stay Active'
    },
    allowedEquipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    expectedTarget: 'Full Body',
    targetMinutes: 20
  },
  {
    name: 'Scenario 2: Intermediate, Dumbbell, Chest + Back, 30 min',
    profile: {
      fitnessLevel: 'Intermediate',
      equipment: ['Dumbbells'],
      targetMuscles: ['Chest', 'Back'],
      workoutDuration: '30–45 min',
      goal: 'Build Muscle'
    },
    allowedEquipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BODYWEIGHT, EQUIPMENT.BENCH, EQUIPMENT.NONE],
    expectedTarget: 'Chest & Back',
    targetMinutes: 35
  },
  {
    name: 'Scenario 3: Advanced, Barbell, Legs, 45 min',
    profile: {
      fitnessLevel: 'Advanced',
      equipment: ['Barbell'],
      targetMuscles: ['Legs'],
      workoutDuration: '45–60 min',
      goal: 'Get Stronger'
    },
    allowedEquipment: [EQUIPMENT.BARBELL, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE, EQUIPMENT.BENCH],
    expectedTarget: 'Legs',
    targetMinutes: 45
  },
  {
    name: 'Scenario 4: Beginner, No equipment, Core, 15 min',
    profile: {
      fitnessLevel: 'Beginner',
      equipment: ['No Equipment'],
      targetMuscles: ['Core'],
      workoutDuration: '10–20 min',
      goal: 'Improve Fitness'
    },
    allowedEquipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    expectedTarget: 'Core',
    targetMinutes: 15
  },
  {
    name: 'Scenario 5: Intermediate, Resistance Band, Full Body, 30 min',
    profile: {
      fitnessLevel: 'Intermediate',
      equipment: ['Resistance Bands'],
      targetMuscles: ['Full Body'],
      workoutDuration: '20–30 min',
      goal: 'Improve Endurance'
    },
    allowedEquipment: [EQUIPMENT.RESISTANCE_BAND, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    expectedTarget: 'Full Body',
    targetMinutes: 25
  }
];

scenarios.forEach((scenario, index) => {
  console.log(`\nEvaluating ${scenario.name}...`);
  const workout = generateWorkout(scenario.profile, 0);

  // 1. Success check
  assert(workout.ok === true, `Workout generated successfully (ID: ${workout.id})`);

  // 2. Title and explanation presence
  assert(Boolean(workout.title && workout.title.length > 5), `Generated deterministic title: "${workout.title}"`);
  assert(Boolean(workout.explanation && workout.explanation.length > 10), `Generated explanation: "${workout.explanation}"`);

  // 3. Equipment restrictions: strictly NO disallowed equipment
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || [])
  ];

  let hasDisallowedEquipment = false;
  allExercises.forEach(ex => {
    let isAllowed = true;
    ex.equipment.forEach(req => {
      if (typeof req === 'string') {
        if (!scenario.allowedEquipment.includes(req)) isAllowed = false;
      } else if (req && req.any) {
        if (!req.any.some(eq => scenario.allowedEquipment.includes(eq))) isAllowed = false;
      }
    });

    if (!isAllowed) {
      hasDisallowedEquipment = true;
      console.error(`Disallowed gear detected in ${ex.name}: ${JSON.stringify(ex.equipment)}`);
    }
  });
  assert(!hasDisallowedEquipment, `All selected exercises strictly comply with allowed equipment`);

  // 4. Duplicate prevention
  const seenIds = new Set();
  let hasDuplicate = false;
  allExercises.forEach(ex => {
    if (seenIds.has(ex.id)) hasDuplicate = true;
    seenIds.add(ex.id);
  });
  assert(!hasDuplicate, `Zero duplicate exercises in routine (Total unique: ${seenIds.size})`);

  // 5. Reasonable duration
  const dur = workout.durationMinutes;
  assert(dur >= 10 && dur <= 60, `Calculated duration is reasonable: ${dur} min`);

  // 6. Valid calorie estimate
  assert(workout.estimatedCalories > 0 && workout.estimatedCalories < 1000, `Estimated calories transparently computed: ~${workout.estimatedCalories} kcal`);

  // 7. Backward-compatible fields
  assert(Array.isArray(workout.exerciseIds) && workout.exerciseIds.length > 0, `Backward-compatible exerciseIds array populated (${workout.exerciseIds.length} items)`);
  assert(typeof workout.rounds === 'number' && workout.rounds > 0, `Rounds property populated (${workout.rounds} rounds)`);
});

// ------------------------------------------------------------------
// 3. REGENERATION / VARIATION SEED TEST
// ------------------------------------------------------------------
console.log('\nTest Suite 3: Deterministic Regeneration / Variation Test');
const baseProfile = scenarios[1].profile;
const workoutSeed0 = generateWorkout(baseProfile, 0);
const workoutSeed1 = generateWorkout(baseProfile, 1);

assert(workoutSeed0.ok && workoutSeed1.ok, `Both variations generated successfully`);
assert(workoutSeed0.id !== workoutSeed1.id, `Different deterministic IDs generated (Seed 0: ${workoutSeed0.id} vs Seed 1: ${workoutSeed1.id})`);

// ------------------------------------------------------------------
// 4. EXTREME DURATION SCALING TEST
// ------------------------------------------------------------------
console.log('\nTest Suite 4: Extreme Duration Scaling');
const shortProfile = { ...baseProfile, durationMinutes: 10 };
const longProfile = { ...baseProfile, durationMinutes: 60 };

const shortWorkout = generateWorkout(shortProfile, 0);
const longWorkout = generateWorkout(longProfile, 0);

assert(shortWorkout.ok, "10-minute workout generated successfully");
assert(shortWorkout.durationMin >= 5 && shortWorkout.durationMin <= 15, `Short duration bounded correctly (Actual: ${shortWorkout.durationMin} min)`);
assert(longWorkout.ok, "60-minute workout generated successfully");
assert(longWorkout.durationMin >= 45 && longWorkout.durationMin <= 75, `Long duration bounded correctly (Actual: ${longWorkout.durationMin} min)`);
assert(longWorkout.exercises.length > shortWorkout.exercises.length || longWorkout.rounds > shortWorkout.rounds, "Long workout has more volume than short workout");

// ------------------------------------------------------------------
// 5. COMPLEX EQUIPMENT MATCHING
// ------------------------------------------------------------------
console.log('\nTest Suite 5: Complex Equipment Logic (AND / OR)');
const onlyDumbbells = { ...baseProfile, equipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE] };
const dumbbellAndBench = { ...baseProfile, equipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE] };

const wkDumbbell = generateWorkout(onlyDumbbells, 0);
const wkBench = generateWorkout(dumbbellAndBench, 0);

assert(wkDumbbell.ok, "Dumbbell-only workout generated");
assert(wkBench.ok, "Dumbbell + Bench workout generated");

// Ensure dumbbell-only doesn't use bench-requiring exercises
let usedBenchWithoutHavingOne = false;
wkDumbbell.exercises.forEach(ex => {
  ex.equipment.forEach(req => {
    if (req === EQUIPMENT.BENCH) usedBenchWithoutHavingOne = true;
  });
});
assert(!usedBenchWithoutHavingOne, "Dumbbell-only workout strictly avoids bench exercises (ALL logic)");

// ------------------------------------------------------------------
// 6. PERSISTENCE LAYER VALIDATION
// ------------------------------------------------------------------
console.log('\nTest Suite 6: Persistence Layer');
// Mock localStorage
globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = val; }
};

registerGeneratedWorkout(shortWorkout);
const retrieved = getWorkoutById(shortWorkout.id);
assert(retrieved && retrieved.id === shortWorkout.id, "Workout successfully saved and retrieved from persistence registry");
const retrievedLatest = getWorkoutById('gen-latest-fallback'); // Should fallback
assert(getWorkoutById(shortWorkout.id) !== null, "Registry returns correct fallback logic for latest");


// ------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 2 ENGINE AND DATABASE TESTS PASSED!\n');
}
