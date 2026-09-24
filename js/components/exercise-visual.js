/**
 * KINETIX SCALABLE EXERCISE VISUAL SYSTEM - Phase 9.3
 * Runtime-generated, mobile-first exercise thumbnails.
 */

import { getBiomechanicalIllustration, escapeHtml } from './exercise-media.js';
import { MUSCLE_LABELS } from '../data/taxonomy.js';

const PATTERN_LABELS = {
  'squat': 'SQUAT', 'horizontal-push': 'PUSH', 'vertical-push': 'PRESS',
  'horizontal-pull': 'ROW', 'vertical-pull': 'PULL', 'hinge': 'HINGE',
  'lunge': 'LUNGE', 'isolation': 'ISOLATION', 'core': 'CORE',
  'cardio': 'CARDIO', 'rotational': 'ROTATION', 'isometric': 'ISOMETRIC', 'carry': 'CARRY', 'mobility': 'MOBILITY'
};

function safePattern(exercise) {
  return typeof exercise?.movementPattern === 'string' && exercise.movementPattern.trim()
    ? exercise.movementPattern.trim().toLowerCase() : 'squat';
}

function primaryMuscle(exercise) {
  const raw = Array.isArray(exercise?.primaryMuscles) ? exercise.primaryMuscles[0] : 'core';
  return MUSCLE_LABELS[raw] || (typeof raw === 'string' ? raw : 'Core');
}

export function renderExerciseVisualThumbnail(exercise, options = {}) {
  const pattern = safePattern(exercise);
  const muscle = primaryMuscle(exercise);
  const name = escapeHtml(exercise?.name || 'Exercise');
  const label = escapeHtml(PATTERN_LABELS[pattern] || pattern.replace(/-/g, ' ').toUpperCase());
  const muscleLabel = escapeHtml(muscle);
  const movementSvg = getBiomechanicalIllustration(pattern, exercise?.primaryMuscles);
  const compact = options.compact !== false;
  const coachBadge = options.showCoach !== false ? '<span class="exercise-visual-coach">3D COACH</span>' : '';

  return `
    <div class="exercise-visual-thumbnail${compact ? ' is-compact' : ''}" role="img"
         aria-label="${name} clean 3D movement illustration">
      <div class="exercise-visual-glow" aria-hidden="true"></div>
      <div class="exercise-visual-grid" aria-hidden="true"></div>
      <div class="exercise-visual-topline">
        ${coachBadge}<span class="exercise-visual-pattern">${label}</span>
      </div>
      <div class="exercise-visual-figure" aria-hidden="true">
        <div class="exercise-visual-ring"></div>
        ${movementSvg}
      </div>
      <div class="exercise-visual-bottomline">
        <span>${muscleLabel}</span><span class="exercise-visual-dot" aria-hidden="true"></span>
      </div>
    </div>
  `;
}
