/**
 * CANONICAL TAXONOMY - KINETIX
 * Phase 2: Exercise Database & Workout Intelligence Engine
 *
 * Defines standard internal identifiers, display labels,
 * and normalizers for muscles, equipment, categories, movement patterns, and difficulties.
 */

// 1. Primary & Secondary Muscle Groups (Canonical IDs)
export const MUSCLES = {
  CHEST: 'chest',
  BACK: 'back',
  SHOULDERS: 'shoulders',
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
  FOREARMS: 'forearms',
  QUADRICEPS: 'quadriceps',
  HAMSTRINGS: 'hamstrings',
  GLUTES: 'glutes',
  CALVES: 'calves',
  CORE: 'core'
};

export const ALL_CANONICAL_MUSCLES = Object.values(MUSCLES);

export const MUSCLE_LABELS = {
  [MUSCLES.CHEST]: 'Chest',
  [MUSCLES.BACK]: 'Back',
  [MUSCLES.SHOULDERS]: 'Shoulders',
  [MUSCLES.BICEPS]: 'Biceps',
  [MUSCLES.TRICEPS]: 'Triceps',
  [MUSCLES.FOREARMS]: 'Forearms',
  [MUSCLES.QUADRICEPS]: 'Quadriceps',
  [MUSCLES.HAMSTRINGS]: 'Hamstrings',
  [MUSCLES.GLUTES]: 'Glutes',
  [MUSCLES.CALVES]: 'Calves',
  [MUSCLES.CORE]: 'Core'
};

// Maps user onboarding / UI focus areas to canonical muscle groups
export const FOCUS_AREA_TO_MUSCLES = {
  'Full Body': ALL_CANONICAL_MUSCLES,
  'full-body': ALL_CANONICAL_MUSCLES,
  'Chest': [MUSCLES.CHEST],
  'chest': [MUSCLES.CHEST],
  'Back': [MUSCLES.BACK],
  'back': [MUSCLES.BACK],
  'Shoulders': [MUSCLES.SHOULDERS],
  'shoulders': [MUSCLES.SHOULDERS],
  'Arms': [MUSCLES.BICEPS, MUSCLES.TRICEPS, MUSCLES.FOREARMS],
  'arms': [MUSCLES.BICEPS, MUSCLES.TRICEPS, MUSCLES.FOREARMS],
  'biceps': [MUSCLES.BICEPS],
  'triceps': [MUSCLES.TRICEPS],
  'Legs': [MUSCLES.QUADRICEPS, MUSCLES.HAMSTRINGS, MUSCLES.CALVES],
  'legs': [MUSCLES.QUADRICEPS, MUSCLES.HAMSTRINGS, MUSCLES.CALVES],
  'quadriceps': [MUSCLES.QUADRICEPS],
  'hamstrings': [MUSCLES.HAMSTRINGS],
  'calves': [MUSCLES.CALVES],
  'Glutes': [MUSCLES.GLUTES],
  'glutes': [MUSCLES.GLUTES],
  'Core': [MUSCLES.CORE],
  'core': [MUSCLES.CORE],
  'Cardio': [MUSCLES.QUADRICEPS, MUSCLES.CALVES, MUSCLES.CORE],
  'cardio': [MUSCLES.QUADRICEPS, MUSCLES.CALVES, MUSCLES.CORE],
  'Mobility': [MUSCLES.BACK, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES, MUSCLES.SHOULDERS],
  'mobility': [MUSCLES.BACK, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES, MUSCLES.SHOULDERS]
};

// 2. Exercise Categories
export const CATEGORIES = {
  STRENGTH: 'strength',
  HIIT: 'hiit',
  CARDIO: 'cardio',
  MOBILITY: 'mobility',
  CORE: 'core',
  RECOVERY: 'recovery',
  WARMUP: 'warmup',
  COOLDOWN: 'cooldown'
};

export const ALL_CANONICAL_CATEGORIES = Object.values(CATEGORIES);

export const CATEGORY_LABELS = {
  [CATEGORIES.STRENGTH]: 'Strength',
  [CATEGORIES.HIIT]: 'HIIT',
  [CATEGORIES.CARDIO]: 'Cardio',
  [CATEGORIES.MOBILITY]: 'Mobility',
  [CATEGORIES.CORE]: 'Core',
  [CATEGORIES.RECOVERY]: 'Recovery',
  [CATEGORIES.WARMUP]: 'Warmup',
  [CATEGORIES.COOLDOWN]: 'Cooldown'
};

// 3. Equipment Types (Canonical IDs)
export const EQUIPMENT = {
  BODYWEIGHT: 'bodyweight',
  DUMBBELL: 'dumbbell',
  BARBELL: 'barbell',
  KETTLEBELL: 'kettlebell',
  RESISTANCE_BAND: 'resistance-band',
  PULL_UP_BAR: 'pull-up-bar',
  BENCH: 'bench',
  CABLE: 'cable',
  MACHINE: 'machine',
  MEDICINE_BALL: 'medicine-ball',
  NONE: 'none'
};

export const ALL_CANONICAL_EQUIPMENT = Object.values(EQUIPMENT);

export const EQUIPMENT_LABELS = {
  [EQUIPMENT.BODYWEIGHT]: 'Bodyweight',
  [EQUIPMENT.DUMBBELL]: 'Dumbbell',
  [EQUIPMENT.BARBELL]: 'Barbell',
  [EQUIPMENT.KETTLEBELL]: 'Kettlebell',
  [EQUIPMENT.RESISTANCE_BAND]: 'Resistance Band',
  [EQUIPMENT.PULL_UP_BAR]: 'Pull-up Bar',
  [EQUIPMENT.BENCH]: 'Bench',
  [EQUIPMENT.CABLE]: 'Cable Machine',
  [EQUIPMENT.MACHINE]: 'Machine',
  [EQUIPMENT.MEDICINE_BALL]: 'Medicine Ball',
  [EQUIPMENT.NONE]: 'No Equipment'
};

// Normalizes user profile equipment string array into canonical equipment IDs
export function normalizeEquipmentList(equipmentInput = []) {
  if (!Array.isArray(equipmentInput) || equipmentInput.length === 0) {
    return [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE];
  }

  const map = {
    'no equipment': [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    'none': [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    'bodyweight': [EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE],
    'dumbbells': [EQUIPMENT.DUMBBELL],
    'dumbbell': [EQUIPMENT.DUMBBELL],
    'barbell': [EQUIPMENT.BARBELL],
    'kettlebell': [EQUIPMENT.KETTLEBELL],
    'resistance bands': [EQUIPMENT.RESISTANCE_BAND],
    'resistance band': [EQUIPMENT.RESISTANCE_BAND],
    'resistance-band': [EQUIPMENT.RESISTANCE_BAND],
    'pull-up bar': [EQUIPMENT.PULL_UP_BAR],
    'pull-up-bar': [EQUIPMENT.PULL_UP_BAR],
    'bench': [EQUIPMENT.BENCH],
    'cable machine': [EQUIPMENT.CABLE],
    'cable': [EQUIPMENT.CABLE],
    'machines': [EQUIPMENT.MACHINE],
    'machine': [EQUIPMENT.MACHINE],
    'medicine ball': [EQUIPMENT.MEDICINE_BALL],
    'medicine-ball': [EQUIPMENT.MEDICINE_BALL],
    'trx': [EQUIPMENT.BODYWEIGHT], // fallback to bodyweight suspension
    'exercise ball': [EQUIPMENT.BODYWEIGHT]
  };

  const canonicalSet = new Set([EQUIPMENT.BODYWEIGHT, EQUIPMENT.NONE]);

  equipmentInput.forEach(rawItem => {
    const key = String(rawItem).trim().toLowerCase();
    if (map[key]) {
      map[key].forEach(id => canonicalSet.add(id));
    } else if (ALL_CANONICAL_EQUIPMENT.includes(key)) {
      canonicalSet.add(key);
    }
  });

  return Array.from(canonicalSet);
}

// 4. Movement Patterns
export const MOVEMENT_PATTERNS = {
  HORIZONTAL_PUSH: 'horizontal-push',
  HORIZONTAL_PULL: 'horizontal-pull',
  VERTICAL_PUSH: 'vertical-push',
  VERTICAL_PULL: 'vertical-pull',
  SQUAT: 'squat',
  HINGE: 'hinge',
  LUNGE: 'lunge',
  ROTATIONAL: 'rotational',
  ISOMETRIC: 'isometric',
  CARRY: 'carry',
  CARDIO: 'cardio',
  MOBILITY: 'mobility'
};

export const ALL_CANONICAL_PATTERNS = Object.values(MOVEMENT_PATTERNS);

// 5. Difficulties
export const DIFFICULTIES = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
};

export const ALL_CANONICAL_DIFFICULTIES = Object.values(DIFFICULTIES);

// 6. User Goals (Canonical IDs & Display Names)
export const GOALS = {
  BUILD_MUSCLE: 'build-muscle',
  LOSE_FAT: 'lose-fat',
  GET_STRONGER: 'get-stronger',
  IMPROVE_ENDURANCE: 'improve-endurance',
  IMPROVE_FITNESS: 'improve-fitness',
  STAY_ACTIVE: 'stay-active'
};

export function normalizeGoal(goalString) {
  if (!goalString) return GOALS.BUILD_MUSCLE;
  const s = goalString.trim().toLowerCase().replace(/\s+/g, '-');
  if (Object.values(GOALS).includes(s)) return s;

  if (s.includes('muscle')) return GOALS.BUILD_MUSCLE;
  if (s.includes('fat') || s.includes('lose')) return GOALS.LOSE_FAT;
  if (s.includes('strong')) return GOALS.GET_STRONGER;
  if (s.includes('endurance') || s.includes('stamina')) return GOALS.IMPROVE_ENDURANCE;
  if (s.includes('fitness') || s.includes('conditioning')) return GOALS.IMPROVE_FITNESS;
  if (s.includes('active')) return GOALS.STAY_ACTIVE;

  return GOALS.BUILD_MUSCLE;
}

export function normalizeDifficulty(diffString) {
  if (!diffString) return DIFFICULTIES.BEGINNER;
  const s = diffString.trim().toLowerCase();
  if (Object.values(DIFFICULTIES).includes(s)) return s;
  return DIFFICULTIES.BEGINNER;
}
