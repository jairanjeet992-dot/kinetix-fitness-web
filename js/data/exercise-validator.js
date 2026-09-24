/**
 * EXERCISE VALIDATION UTILITIES - KINETIX
 * Phase 2: Exercise Database & Workout Intelligence Engine
 *
 * Validates integrity, schema correctness, and canonical references across
 * the exercise library.
 */

import {
  ALL_CANONICAL_MUSCLES,
  ALL_CANONICAL_CATEGORIES,
  ALL_CANONICAL_EQUIPMENT,
  ALL_CANONICAL_PATTERNS,
  ALL_CANONICAL_DIFFICULTIES
} from './taxonomy.js';

/**
 * Validates a single exercise record.
 * @param {Object} exercise
 * @returns {Array<string>} list of validation errors
 */
export function validateExerciseRecord(exercise) {
  const errors = [];

  if (!exercise || typeof exercise !== 'object') {
    return ['Exercise record is not a valid object'];
  }

  // 1. ID check
  if (!exercise.id || typeof exercise.id !== 'string' || !exercise.id.trim()) {
    errors.push(`Invalid or missing ID: ${exercise.id}`);
  } else if (!/^[a-z0-9-]+$/.test(exercise.id)) {
    errors.push(`ID "${exercise.id}" should be kebab-case lowercase alphanumeric`);
  }

  // 2. Name check
  if (!exercise.name || typeof exercise.name !== 'string' || !exercise.name.trim()) {
    errors.push(`[${exercise.id}] Missing or empty name`);
  }

  // 3. Category check
  if (!exercise.category || !ALL_CANONICAL_CATEGORIES.includes(exercise.category)) {
    errors.push(`[${exercise.id}] Invalid category "${exercise.category}". Allowed: ${ALL_CANONICAL_CATEGORIES.join(', ')}`);
  }

  // 4. Movement pattern check
  if (!exercise.movementPattern || !ALL_CANONICAL_PATTERNS.includes(exercise.movementPattern)) {
    errors.push(`[${exercise.id}] Invalid movementPattern "${exercise.movementPattern}". Allowed: ${ALL_CANONICAL_PATTERNS.join(', ')}`);
  }

  // 5. Muscle checks
  if (!Array.isArray(exercise.primaryMuscles) || exercise.primaryMuscles.length === 0) {
    errors.push(`[${exercise.id}] primaryMuscles must be a non-empty array`);
  } else {
    exercise.primaryMuscles.forEach(m => {
      if (!ALL_CANONICAL_MUSCLES.includes(m)) {
        errors.push(`[${exercise.id}] Unknown primary muscle "${m}". Canonical: ${ALL_CANONICAL_MUSCLES.join(', ')}`);
      }
    });
  }

  if (Array.isArray(exercise.secondaryMuscles)) {
    exercise.secondaryMuscles.forEach(m => {
      if (!ALL_CANONICAL_MUSCLES.includes(m)) {
        errors.push(`[${exercise.id}] Unknown secondary muscle "${m}". Canonical: ${ALL_CANONICAL_MUSCLES.join(', ')}`);
      }
    });
  }

  // 6. Equipment checks
  if (!Array.isArray(exercise.equipment) || exercise.equipment.length === 0) {
    errors.push(`[${exercise.id}] equipment must be a non-empty array`);
  } else {
    exercise.equipment.forEach(req => {
      if (typeof req === 'string') {
        if (!ALL_CANONICAL_EQUIPMENT.includes(req)) {
          errors.push(`[${exercise.id}] Unknown equipment "${req}". Canonical: ${ALL_CANONICAL_EQUIPMENT.join(', ')}`);
        }
      } else if (req && Array.isArray(req.any) && req.any.length > 0) {
        req.any.forEach(eq => {
          if (!ALL_CANONICAL_EQUIPMENT.includes(eq)) {
            errors.push(`[${exercise.id}] Unknown ANY equipment "${eq}". Canonical: ${ALL_CANONICAL_EQUIPMENT.join(', ')}`);
          }
        });
      } else if (req && Array.isArray(req.all) && req.all.length > 0) {
        req.all.forEach(eq => {
          if (!ALL_CANONICAL_EQUIPMENT.includes(eq)) {
            errors.push(`[${exercise.id}] Unknown ALL equipment "${eq}". Canonical: ${ALL_CANONICAL_EQUIPMENT.join(', ')}`);
          }
        });
      } else {
        errors.push(`[${exercise.id}] Invalid equipment requirement format`);
      }
    });
  }

  // 7. Difficulty check
  if (!exercise.difficulty || !ALL_CANONICAL_DIFFICULTIES.includes(exercise.difficulty)) {
    errors.push(`[${exercise.id}] Invalid difficulty "${exercise.difficulty}". Allowed: ${ALL_CANONICAL_DIFFICULTIES.join(', ')}`);
  }

  // 8. Duration / Repetition checks
  if (typeof exercise.defaultDurationSec !== 'number' || exercise.defaultDurationSec <= 0) {
    errors.push(`[${exercise.id}] defaultDurationSec must be a positive number`);
  }

  if (exercise.defaultSets !== undefined && (typeof exercise.defaultSets !== 'number' || exercise.defaultSets <= 0)) {
    errors.push(`[${exercise.id}] defaultSets must be a positive number`);
  }

  // 9. Instructions check
  if (!Array.isArray(exercise.instructions) || exercise.instructions.length === 0) {
    errors.push(`[${exercise.id || 'unknown'}] instructions must be a non-empty array of strings`);
  } else {
    exercise.instructions.forEach((ins, idx) => {
      if (typeof ins !== 'string' || !ins.trim()) {
        errors.push(`[${exercise.id || 'unknown'}] instruction at index ${idx} must be a non-empty string`);
      }
    });
  }

  return errors;
}

/**
 * Validates an entire exercise library.
 * Checks for uniqueness and individual schema integrity.
 * @param {Array<Object>} [exerciseList=[]]
 * @returns {{ valid: boolean, totalExercises: number, errors: string[], warnings: string[] }}
 */
export function validateExerciseDatabase(exerciseList = []) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const seenNames = new Set();

  if (!Array.isArray(exerciseList) || exerciseList.length === 0) {
    return {
      valid: false,
      totalExercises: 0,
      errors: ['Exercise database is empty or not an array'],
      warnings: []
    };
  }

  exerciseList.forEach((ex, index) => {
    // Record schema validation
    const recordErrors = validateExerciseRecord(ex);
    if (recordErrors.length > 0) {
      errors.push(...recordErrors);
    }

    if (!ex || typeof ex !== 'object') {
      return;
    }

    // Uniqueness checks
    if (typeof ex.id === 'string' && ex.id.trim()) {
      if (seenIds.has(ex.id)) {
        errors.push(`Duplicate exercise ID detected: "${ex.id}"`);
      } else {
        seenIds.add(ex.id);
      }
    }

    if (typeof ex.name === 'string' && ex.name.trim()) {
      const normalizedName = ex.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        errors.push(`Duplicate exercise name detected: "${ex.name}"`);
      } else {
        seenNames.add(normalizedName);
      }
    }
  });

  return {
    valid: errors.length === 0,
    totalExercises: exerciseList.length,
    errors,
    warnings
  };
}
