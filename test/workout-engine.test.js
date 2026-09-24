/**
 * WORKOUT ENGINE TEST SUITE - KINETIX
 * Phase 2.1: Final Hardening & Verification Suite
 *
 * Runs automated verification of:
 * 1. Database schema and canonical taxonomy compliance (including error handling)
 * 2. Five core generation scenarios across equipment, difficulty, and duration
 * 3. Exact duration fitting across 10, 15, 20, 25, 30, 35, 45, 50, 60 minutes
 * 4. Equipment edge cases (Bodyweight, Dumbbell, Barbell, Bands, Kettlebell, AND/OR/Nested)
 * 5. Deterministic regeneration and meaningful variation testing
 * 6. True persistence and reload safety (including corrupted JSON recovery)
 * 7. Safe runtime failure on invalid database state
 */

// Mock localStorage early before module operations
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, val) { this.store[key] = String(val); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; }
  };
}

import { EXERCISES, getExerciseById } from '../js/data/exercises.js';
import { validateExerciseDatabase, validateExerciseRecord } from '../js/data/exercise-validator.js';
import { generateWorkout, isEquipmentCompatible } from '../js/engine/workout-generator.js';
import { EQUIPMENT, CATEGORIES, MOVEMENT_PATTERNS, DIFFICULTIES, GOALS } from '../js/data/taxonomy.js';
import { registerGeneratedWorkout, getWorkoutById, _resetWorkoutPersistenceForTesting } from '../js/data/workouts.js';

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
console.log('====================================================');

// ------------------------------------------------------------------
// 1. EXERCISE DATABASE SCHEMA & VALIDATION TESTS
// ------------------------------------------------------------------
console.log('\nTest Suite 1: Exercise Database Schema & Validation');
const dbValidation = validateExerciseDatabase(EXERCISES);

assert(dbValidation.valid, `Exercise database passes schema validation (Errors: ${dbValidation.errors.length})`);
assert(dbValidation.totalExercises >= 40, `Exercise database contains at least 40 exercises (Found: ${dbValidation.totalExercises})`);
assert(dbValidation.errors.length === 0, `Zero schema errors detected`);

// Test validator catches all mandatory invalid conditions
const duplicateIdDb = [
  { ...EXERCISES[0], id: 'same-id' },
  { ...EXERCISES[1], id: 'same-id' }
];
const dupIdVal = validateExerciseDatabase(duplicateIdDb);
assert(!dupIdVal.valid && dupIdVal.errors.some(e => e.includes('Duplicate exercise ID')), 'Validator catches duplicate exercise IDs');

const duplicateNameDb = [
  { ...EXERCISES[0], id: 'id-1', name: 'Identical Name' },
  { ...EXERCISES[1], id: 'id-2', name: 'Identical Name' }
];
const dupNameVal = validateExerciseDatabase(duplicateNameDb);
assert(!dupNameVal.valid && dupNameVal.errors.some(e => e.includes('Duplicate exercise name')), 'Validator catches duplicate exercise names');

const invalidCategoryEx = { ...EXERCISES[0], category: 'non-existent-category' };
assert(validateExerciseRecord(invalidCategoryEx).some(e => e.includes('Invalid category')), 'Validator catches invalid category');

const invalidMuscleEx = { ...EXERCISES[0], primaryMuscles: ['fake-muscle'] };
assert(validateExerciseRecord(invalidMuscleEx).some(e => e.includes('Unknown primary muscle')), 'Validator catches invalid primary muscle');

const invalidEquipmentEx = { ...EXERCISES[0], equipment: ['unobtainium'] };
assert(validateExerciseRecord(invalidEquipmentEx).some(e => e.includes('Unknown equipment')), 'Validator catches invalid equipment identifier');

const malformedEquipmentEx = { ...EXERCISES[0], equipment: [{ any: ['fake-gear'] }] };
assert(validateExerciseRecord(malformedEquipmentEx).some(e => e.includes('Unknown ANY equipment')), 'Validator catches malformed nested equipment constraints');

const invalidPatternEx = { ...EXERCISES[0], movementPattern: 'diagonal-fly' };
assert(validateExerciseRecord(invalidPatternEx).some(e => e.includes('Invalid movementPattern')), 'Validator catches invalid movement pattern');

const invalidDiffEx = { ...EXERCISES[0], difficulty: 'master' };
assert(validateExerciseRecord(invalidDiffEx).some(e => e.includes('Invalid difficulty')), 'Validator catches invalid difficulty');

const invalidDurationEx = { ...EXERCISES[0], defaultDurationSec: -10 };
assert(validateExerciseRecord(invalidDurationEx).some(e => e.includes('defaultDurationSec must be a positive number')), 'Validator catches invalid duration');

const missingInstructionsEx = { ...EXERCISES[0], instructions: [] };
assert(validateExerciseRecord(missingInstructionsEx).some(e => e.includes('instructions must be a non-empty array')), 'Validator catches missing instructions');

// ------------------------------------------------------------------
// 2. FIVE CORE GENERATION SCENARIOS
// ------------------------------------------------------------------
console.log('\nTest Suite 2: Five Core Generation Scenarios');

const scenarios = [
  {
    name: 'Scenario 1: Beginner, Bodyweight, Full Body, 20 min',
    profile: {
      goal: 'Stay Active',
      fitnessLevel: 'Beginner',
      focusAreas: ['Full Body'],
      equipment: ['No equipment'],
      workoutDuration: '20 min'
    },
    allowedEquipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]
  },
  {
    name: 'Scenario 2: Intermediate, Dumbbell, Chest + Back, 30 min',
    profile: {
      goal: 'Build Muscle',
      fitnessLevel: 'Intermediate',
      focusAreas: ['Chest', 'Back'],
      equipment: ['Dumbbells'],
      workoutDuration: '30 min'
    },
    allowedEquipment: [EQUIPMENT.DUMBBELL, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]
  },
  {
    name: 'Scenario 3: Advanced, Barbell, Legs, 45 min',
    profile: {
      goal: 'Get Stronger',
      fitnessLevel: 'Advanced',
      focusAreas: ['Legs'],
      equipment: ['Barbell'],
      workoutDuration: '45–60 min'
    },
    allowedEquipment: [EQUIPMENT.BARBELL, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]
  },
  {
    name: 'Scenario 4: Beginner, No equipment, Core, 15 min',
    profile: {
      goal: 'Improve Fitness',
      fitnessLevel: 'Beginner',
      focusAreas: ['Core'],
      equipment: ['No equipment'],
      workoutDuration: '15 min'
    },
    allowedEquipment: [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]
  },
  {
    name: 'Scenario 5: Intermediate, Resistance Band, Full Body, 30 min',
    profile: {
      goal: 'Improve Endurance',
      fitnessLevel: 'Intermediate',
      focusAreas: ['Full Body'],
      equipment: ['Resistance Bands'],
      workoutDuration: '30 min'
    },
    allowedEquipment: [EQUIPMENT.RESISTANCE_BAND, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]
  }
];

scenarios.forEach((scenario) => {
  console.log(`\nEvaluating ${scenario.name}...`);
  const workout = generateWorkout(scenario.profile, 0);

  assert(workout.ok === true, `Workout generated successfully (ID: ${workout.id})`);
  assert(typeof workout.title === 'string' && workout.title.length > 0, `Generated deterministic title: "${workout.title}"`);
  assert(typeof workout.explanation === 'string' && workout.explanation.length > 0, `Generated explanation: "${workout.explanation}"`);

  const allExercises = [...(workout.warmup || []), ...(workout.exercises || []), ...(workout.cooldown || [])];

  // Strictly check allowed gear
  let hasDisallowedEquipment = false;
  allExercises.forEach(ex => {
    if (!isEquipmentCompatible(ex, scenario.allowedEquipment)) {
      hasDisallowedEquipment = true;
      console.error(`Disallowed gear detected in ${ex.name}: ${JSON.stringify(ex.equipment)}`);
    }
  });
  assert(!hasDisallowedEquipment, `All selected exercises strictly comply with allowed equipment`);

  // Duplicate check
  const seenIds = new Set();
  let hasDuplicate = false;
  allExercises.forEach(ex => {
    if (seenIds.has(ex.id)) hasDuplicate = true;
    seenIds.add(ex.id);
  });
  assert(!hasDuplicate, `Zero duplicate exercises in routine (Total unique: ${seenIds.size})`);

  // Reasonable duration
  const dur = workout.durationMinutes;
  assert(dur >= 5 && dur <= 65, `Calculated duration is reasonable: ${dur} min`);

  // Valid calorie estimate
  assert(workout.estimatedCalories > 0 && workout.estimatedCalories < 1000, `Estimated calories transparently computed: ~${workout.estimatedCalories} kcal`);

  // Duration accuracy report
  assert(workout.durationAccuracy && typeof workout.durationAccuracy === 'object', 'durationAccuracy metadata object present');
  assert(workout.durationAccuracy.requestedMinutes === workout.requestedDurationMin, 'durationAccuracy requestedMinutes preserved');
  assert(typeof workout.durationAccuracy.withinTolerance === 'boolean', 'durationAccuracy withinTolerance reported');

  // Backward-compatible fields
  assert(Array.isArray(workout.exerciseIds) && workout.exerciseIds.length > 0, `Backward-compatible exerciseIds array populated (${workout.exerciseIds.length} items)`);
  assert(typeof workout.rounds === 'number' && workout.rounds > 0, `Rounds property populated (${workout.rounds} rounds)`);
});

// ------------------------------------------------------------------
// 3. COMPREHENSIVE DURATION FITTING TESTS (10 to 60 minutes)
// ------------------------------------------------------------------
console.log('\nTest Suite 3: Duration Accuracy Across All Durations (10, 15, 20, 25, 30, 35, 45, 50, 60 min)');
const testDurations = [10, 15, 20, 25, 30, 35, 45, 50, 60];

testDurations.forEach(targetMins => {
  const profile = {
    goal: 'Build Muscle',
    fitnessLevel: 'Intermediate',
    focusAreas: ['Full Body'],
    equipment: ['Dumbbells'],
    durationMinutes: targetMins
  };

  const w = generateWorkout(profile, 0);

  assert(w.ok === true, `${targetMins} min routine generated successfully`);
  assert(w.requestedDurationMin === targetMins, `Requested duration preserved: ${targetMins} min`);
  assert(w.durationAccuracy && w.durationAccuracy.actualMinutes === w.durationMinutes, `Actual duration matches calculated duration: ${w.durationMinutes} min`);
  assert(w.durationAccuracy.withinTolerance === true, `Duration within ±3 min tolerance (Diff: ${w.durationAccuracy.differenceMinutes > 0 ? '+' : ''}${w.durationAccuracy.differenceMinutes}m)`);
  assert(w.rounds >= 2 && w.rounds <= 5, `Sets are sensible (${w.rounds} sets)`);
  assert(w.exercises.length >= 3 && w.exercises.length <= 8, `Exercise count is sensible (${w.exercises.length} exercises)`);
});

// Limited duration edge case (library with insufficient exercises)
const limitedDb = [EXERCISES[0], EXERCISES[1]];
const impossibleWorkout = generateWorkout({ durationMinutes: 30 }, 0, limitedDb);
assert(impossibleWorkout.ok === false, 'Gracefully handles impossible workout with insufficient exercises');

// ------------------------------------------------------------------
// 4. EQUIPMENT EDGE CASES & SEMANTICS (A through J)
// ------------------------------------------------------------------
console.log('\nTest Suite 4: Equipment Edge Cases & Semantics');

// A. Bodyweight only
const bwWk = generateWorkout({ equipment: ['bodyweight'], focusAreas: ['Full Body'], durationMinutes: 20 }, 0);
assert(bwWk.ok && bwWk.exercises.every(e => isEquipmentCompatible(e, [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE])), 'A. Bodyweight only selects compatible exercises');

// B & C. Dumbbell only vs Dumbbell + Bench
const dbOnly = generateWorkout({ equipment: ['dumbbell'], focusAreas: ['Chest'], durationMinutes: 20 }, 0);
const dbBench = generateWorkout({ equipment: ['dumbbell', 'bench'], focusAreas: ['Chest'], durationMinutes: 20 }, 0);

// Dumbbell only MUST NEVER select exercises requiring a bench
let benchUsedInDbOnly = false;
if (dbOnly.ok) {
  const allDbOnly = [...(dbOnly.warmup || []), ...dbOnly.exercises, ...(dbOnly.cooldown || [])];
  benchUsedInDbOnly = allDbOnly.some(e => {
    return e.equipment.some(req => req === EQUIPMENT.BENCH || (req && req.all && req.all.includes(EQUIPMENT.BENCH)));
  });
}
assert(!benchUsedInDbOnly, 'B. CRITICAL: Dumbbell only MUST NEVER select exercises requiring a bench');
assert(dbBench.ok, 'C. Dumbbell + Bench workout generated successfully');

// D & E. Barbell only vs Barbell + Bench
const bbOnly = generateWorkout({ equipment: ['barbell'], focusAreas: ['Chest'], durationMinutes: 20 }, 0);
let benchUsedInBbOnly = false;
if (bbOnly.ok) {
  const allBbOnly = [...(bbOnly.warmup || []), ...bbOnly.exercises, ...(bbOnly.cooldown || [])];
  benchUsedInBbOnly = allBbOnly.some(e => e.equipment.includes(EQUIPMENT.BENCH));
}
assert(!benchUsedInBbOnly, 'D. Barbell only never selects bench-requiring exercises');

// F. Resistance band only
const bandWk = generateWorkout({ equipment: ['resistance-band'], focusAreas: ['Full Body'], durationMinutes: 20 }, 0);
assert(bandWk.ok && bandWk.exercises.every(e => isEquipmentCompatible(e, [EQUIPMENT.RESISTANCE_BAND, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE])), 'F. Resistance band only routine generated');

// G. Kettlebell only
const kbCompatible = isEquipmentCompatible(
  { equipment: [EQUIPMENT.KETTLEBELL] },
  [EQUIPMENT.KETTLEBELL, EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]
);
assert(kbCompatible, 'G. Kettlebell compatibility evaluates correctly');

// H. Empty equipment
const emptyEqWk = generateWorkout({ equipment: [], focusAreas: ['Full Body'], durationMinutes: 20 }, 0);
assert(emptyEqWk.ok && emptyEqWk.exercises.every(e => isEquipmentCompatible(e, [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE])), 'H. Empty equipment defaults safely to bodyweight');

// I. Unknown equipment
const unknownEqEx = { equipment: ['antigravity-harness'] };
assert(!isEquipmentCompatible(unknownEqEx, [EQUIPMENT.DUMBBELL, EQUIPMENT.BODYWEIGHT]), 'I. Unknown equipment is rejected');

// J. Nested { any: [...] } and { all: [...] }
const anyEx = { equipment: [{ any: [EQUIPMENT.DUMBBELL, EQUIPMENT.KETTLEBELL] }] };
assert(isEquipmentCompatible(anyEx, [EQUIPMENT.DUMBBELL]), 'J1. { any: [dumbbell, kettlebell] } matches dumbbell user');
assert(isEquipmentCompatible(anyEx, [EQUIPMENT.KETTLEBELL]), 'J2. { any: [dumbbell, kettlebell] } matches kettlebell user');
assert(!isEquipmentCompatible(anyEx, [EQUIPMENT.BARBELL]), 'J3. { any: [dumbbell, kettlebell] } rejects barbell-only user');

const allEx = { equipment: [{ all: [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH] }] };
assert(!isEquipmentCompatible(allEx, [EQUIPMENT.DUMBBELL]), 'J4. { all: [dumbbell, bench] } rejects dumbbell-only user');
assert(isEquipmentCompatible(allEx, [EQUIPMENT.DUMBBELL, EQUIPMENT.BENCH]), 'J5. { all: [dumbbell, bench] } matches dumbbell+bench user');

// ------------------------------------------------------------------
// 5. DETERMINISTIC REGENERATION & VARIATION TEST
// ------------------------------------------------------------------
console.log('\nTest Suite 5: Deterministic Regeneration Quality');
const regenProfile = {
  goal: 'Build Muscle',
  fitnessLevel: 'Intermediate',
  focusAreas: ['Chest', 'Back'],
  equipment: ['Dumbbells'],
  durationMinutes: 30
};

const runA_seed0 = generateWorkout(regenProfile, 0);
const runB_seed0 = generateWorkout(regenProfile, 0);
const run_seed1 = generateWorkout(regenProfile, 1);

// 1. Same seed must produce identical workout structure
const runA_ids = runA_seed0.exercises.map(e => e.id).join(',');
const runB_ids = runB_seed0.exercises.map(e => e.id).join(',');
assert(runA_ids === runB_ids, 'Same profile + same seed produces 100% identical exercise sequence');
assert(runA_seed0.id === runB_seed0.id, 'Same profile + same seed produces identical workout ID');

// 2. Different seed must produce different variation when alternatives exist
const runSeed1_ids = run_seed1.exercises.map(e => e.id).join(',');
assert(runA_ids !== runSeed1_ids, `Different seed produces meaningful exercise variation (Seed 0 vs Seed 1 differ)`);
assert(runA_seed0.id !== run_seed1.id, `Different seed produces different routine IDs (${runA_seed0.id} vs ${run_seed1.id})`);

// ------------------------------------------------------------------
// 6. TRUE PERSISTENCE & REFRESH SAFETY TEST
// ------------------------------------------------------------------
console.log('\nTest Suite 6: True Persistence & Reload Safety');

const testWorkout = generateWorkout(regenProfile, 0);
assert(testWorkout.ok, 'Generated test workout for persistence check');

// Step 1: Register and save workout
registerGeneratedWorkout(testWorkout);

// Step 2: Verify storage contains the workout and active ID separately
const storedJson = globalThis.localStorage.getItem('kinetix_generated_workouts');
const storedActiveId = globalThis.localStorage.getItem('kinetix_active_workout_id');
assert(storedJson !== null, 'kinetix_generated_workouts saved in localStorage');
assert(storedActiveId === testWorkout.id, 'kinetix_active_workout_id tracks current workout ID separately');

// Step 3: Simulate browser reload by flushing in-memory Map and reloading from storage
_resetWorkoutPersistenceForTesting(false);

// Step 4: Retrieve workout by original ID after memory flush
const retrievedAfterReload = getWorkoutById(testWorkout.id);
assert(retrievedAfterReload !== null, 'Workout retrieved by original ID after in-memory cache flush');
assert(retrievedAfterReload && retrievedAfterReload.id === testWorkout.id, 'Retrieved workout has matching ID');
assert(retrievedAfterReload && retrievedAfterReload.title === testWorkout.title, 'Retrieved workout has matching title');
assert(retrievedAfterReload && retrievedAfterReload.exercises.length === testWorkout.exercises.length, 'Retrieved workout retains full exercise list');

// Step 5: Resolve via 'latest-generated'
const retrievedActive = getWorkoutById('latest-generated');
assert(retrievedActive && retrievedActive.id === testWorkout.id, "'latest-generated' correctly resolves active workout");

// Step 6: Corrupted JSON recovery (should not crash)
const originalWarn = console.warn;
console.warn = () => {};
globalThis.localStorage.setItem('kinetix_generated_workouts', '{corrupted json[');
_resetWorkoutPersistenceForTesting(false);
const recoveredFromCorruption = getWorkoutById('non-existent-id');
console.warn = originalWarn;
assert(recoveredFromCorruption === null, 'Corrupted JSON in localStorage handled safely without throwing');

// Step 7: Clean storage reset
_resetWorkoutPersistenceForTesting(true);

// ------------------------------------------------------------------
// 7. SAFE RUNTIME HANDLING OF INVALID DATABASE
// ------------------------------------------------------------------
console.log('\nTest Suite 7: Safe Runtime Handling of Invalid Database');
const corruptDb = [
  { id: 'corrupt-1', name: '' } // missing required fields
];
const safeResult = generateWorkout(regenProfile, 0, corruptDb);
assert(safeResult.ok === false, 'generateWorkout returns safe error object when database is invalid');
assert(typeof safeResult.error === 'string', 'generateWorkout error message provided without throwing exceptions');

// ------------------------------------------------------------------
// SUMMARY & REPORT
// ------------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 2.1 WORKOUT ENGINE HARDENING TESTS PASSED!\n');
}
