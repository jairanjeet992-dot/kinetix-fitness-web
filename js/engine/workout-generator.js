/**
 * WORKOUT INTELLIGENCE ENGINE - KINETIX
 * Phase 2: Deterministic Rule-Based Workout Generator
 *
 * Implements a clean layered generator adhering to:
 * - Equipment restrictions (strictly zero unselected gear)
 * - Goal periodization (reps, rest intervals, exercise pacing)
 * - Fitness level scaling (movement complexity & volume)
 * - Muscle balance and movement pattern diversity
 * - Explicit calculated duration & transparent calorie estimates
 * - Deterministic variation (seed rotation on Regenerate)
 */

import { EXERCISES, getExerciseById } from '../data/exercises.js';
import {
  MUSCLES,
  CATEGORIES,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  DIFFICULTIES,
  GOALS,
  normalizeGoal,
  normalizeDifficulty,
  normalizeEquipmentList,
  FOCUS_AREA_TO_MUSCLES
} from '../data/taxonomy.js';
import { validateExerciseDatabase } from '../data/exercise-validator.js';

let dbValidated = false;
let dbValid = true;

/**
 * Normalizes input profile from onboarding or user settings.
 */
export function normalizeProfile(rawProfile = {}) {
  const goal = normalizeGoal(rawProfile.goal);
  const fitnessLevel = normalizeDifficulty(rawProfile.fitnessLevel);

  // Normalize target muscles
  let rawTargets = rawProfile.targetMuscles || rawProfile.focusAreas || ['Full Body'];
  if (typeof rawTargets === 'string') rawTargets = [rawTargets];

  const canonicalMuscles = new Set();
  rawTargets.forEach(t => {
    const mapped = FOCUS_AREA_TO_MUSCLES[t] || FOCUS_AREA_TO_MUSCLES[t.toLowerCase()];
    if (mapped) {
      mapped.forEach(m => canonicalMuscles.add(m));
    }
  });

  if (canonicalMuscles.size === 0) {
    FOCUS_AREA_TO_MUSCLES['Full Body'].forEach(m => canonicalMuscles.add(m));
  }

  // Normalize equipment
  const equipment = normalizeEquipmentList(rawProfile.equipment);

  // Normalize duration in minutes
  let durationMinutes = 30;
  if (typeof rawProfile.workoutDuration === 'number') {
    durationMinutes = rawProfile.workoutDuration;
  } else if (typeof rawProfile.durationMinutes === 'number') {
    durationMinutes = rawProfile.durationMinutes;
  } else {
    const rawDur = String(rawProfile.workoutDuration || '').toLowerCase();
    if (rawDur.includes('5–10') || rawDur.includes('5-10')) durationMinutes = 10;
    else if (rawDur.includes('10–20') || rawDur.includes('10-20')) durationMinutes = 15;
    else if (rawDur.includes('20–30') || rawDur.includes('20-30')) durationMinutes = 25;
    else if (rawDur.includes('30–45') || rawDur.includes('30-45')) durationMinutes = 35;
    else if (rawDur.includes('45–60') || rawDur.includes('45-60')) durationMinutes = 50;
    else if (rawDur.includes('60+')) durationMinutes = 60;
  }

  return {
    goal,
    fitnessLevel,
    targetMuscles: Array.from(canonicalMuscles),
    rawTargets,
    equipment,
    durationMinutes
  };
}

/**
 * Checks whether an exercise is compatible with the user's available equipment.
 * An exercise is valid if ALL of its required equipment constraints are met by the user's gear.
 */
export function isEquipmentCompatible(exercise, userEquipment) {
  if (!exercise || !Array.isArray(exercise.equipment)) return false;
  if (!Array.isArray(userEquipment)) return false;

  return exercise.equipment.every(req => {
    if (typeof req === 'string') {
      return userEquipment.includes(req);
    } else if (req && Array.isArray(req.any)) {
      return req.any.some(eq => userEquipment.includes(eq));
    } else if (req && Array.isArray(req.all)) {
      return req.all.every(eq => userEquipment.includes(eq));
    }
    return false;
  });
}

/**
 * Computes a matching score for candidate exercises.
 */
function scoreExercise(exercise, profile, variationSeed = 0) {
  let score = 0;

  // 1. Target Muscle Relevance
  const primaryMatch = exercise.primaryMuscles.some(m => profile.targetMuscles.includes(m));
  const secondaryMatch = (exercise.secondaryMuscles || []).some(m => profile.targetMuscles.includes(m));

  if (primaryMatch) score += 30;
  if (secondaryMatch) score += 10;

  // 2. Goal Alignment
  switch (profile.goal) {
    case GOALS.BUILD_MUSCLE:
    case GOALS.GET_STRONGER:
      if (exercise.category === CATEGORIES.STRENGTH) score += 20;
      if (exercise.movementPattern === MOVEMENT_PATTERNS.SQUAT ||
          exercise.movementPattern === MOVEMENT_PATTERNS.HORIZONTAL_PUSH ||
          exercise.movementPattern === MOVEMENT_PATTERNS.HORIZONTAL_PULL ||
          exercise.movementPattern === MOVEMENT_PATTERNS.HINGE) score += 15;
      break;

    case GOALS.LOSE_FAT:
      if (exercise.category === CATEGORIES.HIIT || exercise.category === CATEGORIES.CARDIO) score += 25;
      if (exercise.category === CATEGORIES.STRENGTH) score += 15;
      break;

    case GOALS.IMPROVE_ENDURANCE:
      if (exercise.category === CATEGORIES.CARDIO || exercise.category === CATEGORIES.HIIT) score += 25;
      if (exercise.exerciseType === 'timed') score += 10;
      break;

    case GOALS.IMPROVE_FITNESS:
      if (exercise.category === CATEGORIES.STRENGTH || exercise.category === CATEGORIES.CORE) score += 15;
      break;

    case GOALS.STAY_ACTIVE:
      if (exercise.difficulty === DIFFICULTIES.BEGINNER) score += 15;
      if (exercise.category === CATEGORIES.MOBILITY || exercise.category === CATEGORIES.STRENGTH) score += 15;
      break;
  }

  // 3. Fitness Level Calibration
  if (exercise.difficulty === profile.fitnessLevel) {
    score += 20;
  } else if (
    (profile.fitnessLevel === DIFFICULTIES.INTERMEDIATE && (exercise.difficulty === DIFFICULTIES.BEGINNER || exercise.difficulty === DIFFICULTIES.ADVANCED)) ||
    (profile.fitnessLevel === DIFFICULTIES.ADVANCED && exercise.difficulty === DIFFICULTIES.INTERMEDIATE) ||
    (profile.fitnessLevel === DIFFICULTIES.BEGINNER && exercise.difficulty === DIFFICULTIES.INTERMEDIATE)
  ) {
    score += 10;
  } else if (profile.fitnessLevel === DIFFICULTIES.BEGINNER && exercise.difficulty === DIFFICULTIES.ADVANCED) {
    // Discourage advanced moves for beginners
    score -= 30;
  }

  // 4. Deterministic Seed Offset (rotates ranking predictably on Regenerate)
  if (variationSeed > 0) {
    // Generate deterministic perturbation based on exercise ID characters and seed
    let hash = 0;
    for (let i = 0; i < exercise.id.length; i++) {
      hash = (hash * 31 + exercise.id.charCodeAt(i)) & 0xffffffff;
    }
    const seedOffset = Math.abs((hash + variationSeed * 17) % 15);
    score += seedOffset;
  }

  return score;
}

/**
 * Deterministically constructs a descriptive title.
 */
function generateWorkoutTitle(profile, mainExercises, durationMinutes) {
  const goalNames = {
    [GOALS.BUILD_MUSCLE]: 'Hypertrophy',
    [GOALS.GET_STRONGER]: 'Power Forge',
    [GOALS.LOSE_FAT]: 'Conditioning',
    [GOALS.IMPROVE_ENDURANCE]: 'Endurance Engine',
    [GOALS.IMPROVE_FITNESS]: 'Total Body Athlete',
    [GOALS.STAY_ACTIVE]: 'Active Vitality'
  };

  const focusLabel = Array.isArray(profile.rawTargets) && profile.rawTargets.length > 0
    ? (profile.rawTargets.includes('Full Body') ? 'Full Body' : profile.rawTargets.slice(0, 2).join(' & '))
    : 'Full Body';

  const goalName = goalNames[profile.goal] || 'Session';

  if (durationMinutes <= 15) {
    return `${focusLabel} ${durationMinutes}-Min Express`;
  }

  return `${focusLabel} ${goalName}`;
}

/**
 * Builds user-facing "Why this workout?" explanation.
 */
function generateExplanation(profile, durationMinutes) {
  const focusStr = Array.isArray(profile.rawTargets) && profile.rawTargets.length > 0
    ? profile.rawTargets.join(' and ')
    : 'balanced full body';

  const gearLabels = {
    [EQUIPMENT.BODYWEIGHT]: 'bodyweight movements',
    [EQUIPMENT.DUMBBELL]: 'dumbbells',
    [EQUIPMENT.BARBELL]: 'barbell complexes',
    [EQUIPMENT.KETTLEBELL]: 'kettlebells',
    [EQUIPMENT.RESISTANCE_BAND]: 'resistance bands',
    [EQUIPMENT.NONE]: 'zero equipment'
  };

  const activeGear = profile.equipment
    .filter(eq => eq !== EQUIPMENT.BODYWEIGHT && eq !== EQUIPMENT.NONE)
    .map(eq => gearLabels[eq] || eq);

  const gearText = activeGear.length > 0
    ? `using ${activeGear.join(', ')}`
    : 'using bodyweight calisthenics';

  const goalPhrases = {
    [GOALS.BUILD_MUSCLE]: 'maximize muscular tension and hypertrophy',
    [GOALS.GET_STRONGER]: 'develop foundational strength and force production',
    [GOALS.LOSE_FAT]: 'sustain elevated metabolic rate and calorie burn',
    [GOALS.IMPROVE_ENDURANCE]: 'boost aerobic endurance and stamina',
    [GOALS.IMPROVE_FITNESS]: 'build balanced, functional overall fitness',
    [GOALS.STAY_ACTIVE]: 'deliver accessible daily movement and joint health'
  };

  const goalText = goalPhrases[profile.goal] || 'deliver progressive training';

  return `Calibrated for your ${focusStr} focus ${gearText}, dialed in for a ${durationMinutes}-minute session to ${goalText}.`;
}

/**
 * Primary Workout Generation Engine.
 *
 * @param {Object} rawProfile - User profile from onboarding or settings
 * @param {number} variationSeed - Deterministic seed for regeneration (0, 1, 2...)
 * @returns {Object} Structured workout plan or safe fallback error object
 */
export function generateWorkout(rawProfile = {}, variationSeed = 0) {
  if (!dbValidated) {
    const dbValidation = validateExerciseDatabase(EXERCISES);
    dbValid = dbValidation.valid;
    dbValidated = true;
    if (!dbValid) {
      console.error("KINETIX SYSTEM ERROR: Exercise database validation failed.", dbValidation.errors);
    }
  }

  if (!dbValid) {
    return {
      ok: false,
      error: "System configuration error: Exercise database is invalid. Please contact support."
    };
  }

  const profile = normalizeProfile(rawProfile);

  // 1. Filter all exercises strictly by equipment compatibility
  const eligibleExercises = EXERCISES.filter(ex => isEquipmentCompatible(ex, profile.equipment));

  // If equipment restriction produces fewer than 3 exercises, return safe fallback
  if (eligibleExercises.length < 3) {
    return {
      ok: false,
      error: "Not enough exercises match your current equipment and focus. Try adding another equipment option to generate a complete routine."
    };
  }

  // 2. Separate into candidate pools
  const warmupsPool = eligibleExercises.filter(ex => ex.category === CATEGORIES.WARMUP || ex.category === CATEGORIES.MOBILITY);
  const cooldownsPool = eligibleExercises.filter(ex => ex.category === CATEGORIES.COOLDOWN || ex.category === CATEGORIES.MOBILITY || ex.category === CATEGORIES.RECOVERY);
  const mainPool = eligibleExercises.filter(ex => ex.category !== CATEGORIES.WARMUP && ex.category !== CATEGORIES.COOLDOWN);

  // Score main candidates
  const scoredMain = mainPool.map(ex => ({
    exercise: ex,
    score: scoreExercise(ex, profile, variationSeed)
  })).sort((a, b) => b.score - a.score);

  // 3. Initial Guess for target slot counts and sets based on duration
  let targetMainCount = 4;
  let defaultSets = 3;
  let restBetweenSec = 60;
  let warmupTarget = profile.durationMinutes >= 30 ? 2 : 1;

  if (profile.durationMinutes <= 10) {
    targetMainCount = 3; defaultSets = 2; restBetweenSec = 30; warmupTarget = 1;
  } else if (profile.durationMinutes <= 15) {
    targetMainCount = 4; defaultSets = 2; restBetweenSec = 40; warmupTarget = 1;
  } else if (profile.durationMinutes <= 25) {
    targetMainCount = 4; defaultSets = 3; restBetweenSec = 50; warmupTarget = 1;
  } else if (profile.durationMinutes <= 40) {
    targetMainCount = 5; defaultSets = 3; restBetweenSec = 60; warmupTarget = 2;
  } else {
    targetMainCount = 6; defaultSets = 4; restBetweenSec = 75; warmupTarget = 2;
  }

  // Goal-based rest adjustments
  if (profile.goal === GOALS.GET_STRONGER) restBetweenSec = Math.max(restBetweenSec, 90);
  if (profile.goal === GOALS.LOSE_FAT || profile.goal === GOALS.IMPROVE_ENDURANCE) {
    restBetweenSec = Math.min(restBetweenSec, 35);
    if (profile.durationMinutes >= 20) {
      targetMainCount = Math.max(targetMainCount, 5);
      defaultSets = Math.max(defaultSets, 3);
    }
  }

  const MAX_ATTEMPTS = 5;
  let selectedMain = [];
  let selectedWarmup = [];
  let selectedCooldown = [];
  let calculatedDurationMinutes = 0;
  let totalDurationSec = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    selectedMain = [];
    const usedExerciseIds = new Set();
    const usedPatterns = new Map();

    // Select Main
    for (const item of scoredMain) {
      const ex = item.exercise;
      if (usedExerciseIds.has(ex.id)) continue;

      const maxPatternAllowance = targetMainCount <= 3 ? 1 : 2;
      const currentPatternCount = usedPatterns.get(ex.movementPattern) || 0;
      if (currentPatternCount >= maxPatternAllowance) continue;

      selectedMain.push(ex);
      usedExerciseIds.add(ex.id);
      usedPatterns.set(ex.movementPattern, currentPatternCount + 1);

      if (selectedMain.length >= targetMainCount) break;
    }

    if (selectedMain.length < 3) {
      for (const item of scoredMain) {
        const ex = item.exercise;
        if (!usedExerciseIds.has(ex.id)) {
          selectedMain.push(ex);
          usedExerciseIds.add(ex.id);
          if (selectedMain.length >= 3) break;
        }
      }
    }

    // Select Warmup
    selectedWarmup = [];
    const scoredWarmups = warmupsPool.map(ex => ({
      exercise: ex,
      score: scoreExercise(ex, profile, variationSeed)
    })).sort((a, b) => b.score - a.score);

    for (const item of scoredWarmups) {
      if (!usedExerciseIds.has(item.exercise.id)) {
        selectedWarmup.push(item.exercise);
        usedExerciseIds.add(item.exercise.id);
        if (selectedWarmup.length >= warmupTarget) break;
      }
    }

    // Select Cooldown
    selectedCooldown = [];
    const scoredCooldowns = cooldownsPool.map(ex => ({
      exercise: ex,
      score: scoreExercise(ex, profile, variationSeed)
    })).sort((a, b) => b.score - a.score);

    for (const item of scoredCooldowns) {
      if (!usedExerciseIds.has(item.exercise.id)) {
        selectedCooldown.push(item.exercise);
        usedExerciseIds.add(item.exercise.id);
        break;
      }
    }

    // Calculate duration
    const transitionSec = 15;
    totalDurationSec = 0;

    selectedWarmup.forEach(w => {
      totalDurationSec += (w.defaultDurationSec || 30) + 15 + transitionSec;
    });

    selectedMain.forEach(m => {
      const exDuration = m.defaultDurationSec || 40;
      totalDurationSec += (defaultSets * exDuration) + ((defaultSets - 1) * restBetweenSec) + transitionSec;
    });

    selectedCooldown.forEach(c => {
      totalDurationSec += (c.defaultDurationSec || 45) + transitionSec;
    });

    calculatedDurationMinutes = Math.max(5, Math.round(totalDurationSec / 60));
    const diff = calculatedDurationMinutes - profile.durationMinutes;

    // Use sensible tolerance (3 minutes)
    if (Math.abs(diff) <= 3) {
      break;
    }

    // Adjust for next iteration
    if (diff > 3) {
      if (defaultSets > 2) defaultSets--;
      else if (targetMainCount > 3) targetMainCount--;
      else if (restBetweenSec > 30 && profile.goal !== GOALS.GET_STRONGER) restBetweenSec -= 10;
      else break;
    } else {
      if (targetMainCount < 8) targetMainCount++;
      else if (defaultSets < 5) defaultSets++;
      else if (restBetweenSec < 90) restBetweenSec += 10;
      else break;
    }
  }

  // 8. Calculate Transparent Calorie Estimate
  let totalCalPerMin = 0;
  const allInRoutine = [...selectedWarmup, ...selectedMain, ...selectedCooldown];
  allInRoutine.forEach(ex => {
    totalCalPerMin += (ex.estimatedCaloriesPerMinute || 7.0);
  });
  const avgCalPerMin = totalCalPerMin / (allInRoutine.length || 1);

  // Intensity factor based on fitness level and goal
  let intensity = 1.0;
  if (profile.fitnessLevel === DIFFICULTIES.ADVANCED) intensity += 0.15;
  if (profile.goal === GOALS.LOSE_FAT || profile.goal === GOALS.GET_STRONGER) intensity += 0.1;
  const estimatedCalories = Math.round(calculatedDurationMinutes * avgCalPerMin * intensity);

  // 9. Generate Deterministic Title and Explanation
  const title = generateWorkoutTitle(profile, selectedMain, profile.durationMinutes);
  const explanation = generateExplanation(profile, calculatedDurationMinutes);

  // All exercise IDs in presentation order
  const allExerciseIds = [
    ...selectedWarmup.map(w => w.id),
    ...selectedMain.map(m => m.id),
    ...selectedCooldown.map(c => c.id)
  ];

  // Unique deterministic ID for this generated routine
  const id = `gen-${profile.goal.slice(0, 3)}-${calculatedDurationMinutes}m-v${variationSeed}`;

  return {
    ok: true,
    id,
    title,
    category: profile.goal === GOALS.LOSE_FAT ? 'HIIT' : 'Strength',
    target: profile.rawTargets && profile.rawTargets.length > 0 ? profile.rawTargets.join(' & ') : 'Full Body',
    targetMuscles: profile.rawTargets || ['Full Body'],
    difficulty: profile.fitnessLevel.charAt(0).toUpperCase() + profile.fitnessLevel.slice(1),
    durationMin: calculatedDurationMinutes,
    durationMinutes: calculatedDurationMinutes,
    requestedDurationMin: profile.durationMinutes,
    equipment: profile.equipment.includes(EQUIPMENT.DUMBBELL)
      ? 'Dumbbells'
      : profile.equipment.includes(EQUIPMENT.BARBELL)
      ? 'Barbell'
      : profile.equipment.includes(EQUIPMENT.RESISTANCE_BAND)
      ? 'Resistance Bands'
      : 'Bodyweight',
    rounds: defaultSets,
    restBetweenExercisesSec: restBetweenSec,
    warmup: selectedWarmup,
    exercises: selectedMain,
    cooldown: selectedCooldown,
    exerciseIds: allExerciseIds,
    estimatedCalories,
    description: explanation,
    explanation,
    isGenerated: true,
    variationSeed
  };
}
