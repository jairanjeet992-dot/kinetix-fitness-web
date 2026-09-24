/**
 * EXERCISE MEDIA & VISUALIZATION ARCHITECTURE - KINETIX
 * Phase 8: Premium Biomechanical Movement Visualization & Failure-Safe Media
 * Phase 8.1: Production Hardening (XSS escaping, protocol validation, accessible focus trap)
 * Phase 9: Kinetix Coach System, Demonstration Standards & Multi-Tier Resolution
 */

import { MUSCLE_LABELS, EQUIPMENT_LABELS, CATEGORY_LABELS } from '../data/taxonomy.js';
import { getExerciseHistory } from '../state/workout-history.js';
import { resolveExerciseWithCoachMedia, KINETIX_COACH } from '../data/coach-system.js';

/**
 * Safely escapes characters for HTML insertion.
 * @param {any} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates and sanitizes media URLs to prevent script injection and attribute breakout.
 * @param {any} url
 * @returns {string|null}
 */
export function sanitizeMediaUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  // Disallow script-capable protocols and SVG/HTML data URIs.
  if (/^(javascript|vbscript):/i.test(trimmed)) return null;

  // Only allow common raster data images. SVG data URIs are intentionally rejected
  // because SVG can contain active script/content and is not needed by the media layer.
  const safeDataImage = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(trimmed);
  if (/^data:/i.test(trimmed) && !safeDataImage) return null;

  // Allow HTTPS or local/asset paths.
  if (/^(https?:|\/|\.\/|assets\/|images\/)/i.test(trimmed) || safeDataImage) {
    return trimmed.replace(/"/g, '%22').replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
  }
  return null;
}

/**
 * Movement pattern vector artwork generator.
 * Produces clean, athletic, modern SVG diagrams representing exercise biomechanics.
 * Crash-proof and injection-proof under all inputs.
 */
export function getBiomechanicalIllustration(movementPattern = 'squat', primaryMuscles = ['quadriceps']) {
  const safePattern = typeof movementPattern === 'string' && movementPattern.trim().length > 0
    ? movementPattern.trim().toLowerCase()
    : 'squat';

  const musclesArray = Array.isArray(primaryMuscles) && primaryMuscles.length > 0
    ? primaryMuscles
    : (typeof primaryMuscles === 'string' && primaryMuscles ? [primaryMuscles] : ['core']);
  const primaryMuscle = typeof musclesArray[0] === 'string' ? musclesArray[0] : 'core';
  const escapedPattern = escapeHtml(safePattern);

  // Normalize canonical taxonomy patterns into visual families. This prevents
  // valid patterns such as cardio/mobility/rotational/carry/isometric from
  // silently falling through to the squat illustration.
  let visualPattern = safePattern;
  if (visualPattern === 'isometric') {
    visualPattern = primaryMuscle === 'core' ? 'core' : 'isolation';
  } else if (visualPattern === 'rotational') {
    visualPattern = 'rotational';
  } else if (visualPattern === 'cardio') {
    visualPattern = 'cardio';
  } else if (visualPattern === 'mobility') {
    visualPattern = 'mobility';
  } else if (visualPattern === 'carry') {
    visualPattern = 'carry';
  }

  // Base SVG wrapper styles
  const baseSvgAttrs = `viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="exercise-bio-svg" role="img" aria-label="${escapedPattern} biomechanical movement illustration"`;

  switch (visualPattern) {
    case 'horizontal-push':
      // Push-Up / Bench Press: Horizontal torso, flexing elbows, chest drive
      return `
        <svg ${baseSvgAttrs}>
          <!-- Ground line -->
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Starting dashed silhouette (Up position) -->
          <path d="M30 100 L44 88 L114 62 L128 48" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-dasharray="3 3"/>
          <circle cx="132" cy="44" r="6" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
          <!-- Active body line (Bottom press position) -->
          <path class="bio-path-body" d="M30 100 L46 95 L118 84 L134 76" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Head -->
          <circle cx="138" cy="72" r="6.5" fill="currentColor"/>
          <!-- Arms pressing from ground -->
          <path class="bio-path-limb" d="M102 100 L110 86 L118 84" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Primary muscle highlight: Chest / Triceps -->
          <circle cx="114" cy="85" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Movement trajectory arrows (Down & Up motion) -->
          <path class="bio-motion-arrow" d="M114 56 C114 68 114 74 114 78" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round" marker-end="url(#arrowhead)"/>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="var(--color-primary, #FF542E)"/>
            </marker>
          </defs>
        </svg>
      `;

    case 'horizontal-pull':
    case 'vertical-pull':
      // Rows / Pull-Ups: Gripping apparatus, pulling through back/lats
      return `
        <svg ${baseSvgAttrs}>
          <!-- Grip / Bar anchor -->
          <line x1="80" y1="16" x2="80" y2="40" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="80" cy="16" r="4" fill="rgba(255,255,255,0.4)"/>
          <!-- Torso & spine line -->
          <path class="bio-path-body" d="M80 44 L80 82 L72 106 M80 82 L88 106" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="80" cy="34" r="6.5" fill="currentColor"/>
          <!-- Pulling arms (Elbows driven back) -->
          <path class="bio-path-limb" d="M80 44 L62 58 L76 72" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bio-path-limb" d="M80 44 L98 58 L84 72" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Target Muscle: Lats / Back -->
          <circle cx="80" cy="60" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Biomechanical vector cues -->
          <path class="bio-motion-arrow" d="M60 76 L72 68 M100 76 L88 68" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'vertical-push':
      // Overhead Press / Pike Push-up: Upward vertical drive
      return `
        <svg ${baseSvgAttrs}>
          <line x1="20" y1="108" x2="140" y2="108" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Body standing upright -->
          <path class="bio-path-body" d="M80 46 L80 80 L72 106 M80 80 L88 106" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="80" cy="36" r="6.5" fill="currentColor"/>
          <!-- Arms extending overhead -->
          <path class="bio-path-limb" d="M80 48 L66 38 L68 18 M80 48 L94 38 L92 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Weights overhead -->
          <line x1="60" y1="18" x2="76" y2="18" stroke="var(--color-primary, #FF542E)" stroke-width="3" stroke-linecap="round"/>
          <line x1="84" y1="18" x2="100" y2="18" stroke="var(--color-primary, #FF542E)" stroke-width="3" stroke-linecap="round"/>
          <!-- Deltoids highlight -->
          <circle cx="70" cy="46" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <circle cx="90" cy="46" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Upward vector cue -->
          <path class="bio-motion-arrow" d="M80 32 L80 14" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'hinge':
      // Romanian Deadlift / Kettlebell Swing: Hip hinge, posterior chain load
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Hips shifted back, knees slightly bent -->
          <path class="bio-path-body" d="M52 56 L64 68 L70 102 M64 68 L78 102" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Torso inclined forward (Spine neutral) -->
          <path class="bio-path-body" d="M64 68 L108 52" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="114" cy="48" r="6.5" fill="currentColor"/>
          <!-- Arms hanging straight down with load -->
          <path class="bio-path-limb" d="M104 54 L98 84" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="98" cy="88" r="5" fill="rgba(255,255,255,0.6)"/>
          <!-- Posterior Chain Highlight: Glutes & Hamstrings -->
          <circle cx="64" cy="70" r="5.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <circle cx="68" cy="84" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Hip travel vector cue (Back & Forth) -->
          <path class="bio-motion-arrow" d="M78 68 L56 68" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'lunge':
      // Lunges / Split Squats: Split stance, 90-degree knees
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Torso upright -->
          <path class="bio-path-body" d="M76 44 L76 72" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="76" cy="34" r="6.5" fill="currentColor"/>
          <!-- Front Leg (90 degree bend) -->
          <path class="bio-path-limb" d="M76 72 L104 74 L102 104" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Rear Leg (90 degree bend, knee near ground) -->
          <path class="bio-path-limb" d="M76 72 L54 84 L52 102" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Primary Quads / Glutes Highlight -->
          <circle cx="92" cy="74" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <circle cx="76" cy="74" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Vertical descent arrow -->
          <path class="bio-motion-arrow" d="M76 48 L76 64" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'isolation':
      // Bicep Curl / Lateral Raise / Tricep Extension
      return `
        <svg ${baseSvgAttrs}>
          <line x1="20" y1="104" x2="140" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Standing Torso -->
          <path class="bio-path-body" d="M80 44 L80 82 L72 104 M80 82 L88 104" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="80" cy="34" r="6.5" fill="currentColor"/>
          <!-- Upper arm fixed at ribcage, forearm flexing upward -->
          <path class="bio-path-limb" d="M80 46 L86 64 L102 52" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Dumbbell -->
          <circle cx="104" cy="50" r="4.5" fill="rgba(255,255,255,0.6)"/>
          <!-- Bicep peak muscle pulse -->
          <circle cx="92" cy="56" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Flexion arc arrow -->
          <path class="bio-motion-arrow" d="M96 70 C102 68 104 60 102 54" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'core':
      // Planks / Dead Bugs / Russian Twists: Torso horizontal bracing
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Forearms on ground -->
          <line x1="104" y1="104" x2="118" y2="104" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="104" y1="104" x2="104" y2="84" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <!-- Rigid torso line -->
          <path class="bio-path-body" d="M34 100 L48 88 L104 84 L122 78" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="126" cy="74" r="6" fill="currentColor"/>
          <!-- Core / Abdominal Shield Pulse -->
          <circle cx="78" cy="85" r="5.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Biomechanical isometric compression markers -->
          <path d="M78 74 L78 94" stroke="var(--color-primary, #FF542E)" stroke-width="1.8" stroke-dasharray="2 2"/>
        </svg>
      `;

    case 'rotational':
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <path class="bio-path-body" d="M80 42 L80 78 L72 104 M80 78 L88 104" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="80" cy="34" r="6.5" fill="currentColor"/>
          <path class="bio-path-limb" d="M80 50 L60 64 L72 72" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path class="bio-path-limb" d="M80 50 L100 60 L88 70" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="80" cy="64" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <path class="bio-motion-arrow" d="M58 52 C48 64 54 78 68 82" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'cardio':
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <path class="bio-path-body" d="M78 48 L72 74 L62 102 M72 74 L92 98" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="82" cy="40" r="6.5" fill="currentColor"/>
          <path class="bio-path-limb" d="M76 52 L58 64 L48 54" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path class="bio-path-limb" d="M80 52 L98 62 L110 50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="68" cy="72" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <path class="bio-motion-arrow" d="M112 44 L128 34 M112 54 L132 54" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'carry':
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <path class="bio-path-body" d="M80 46 L80 80 L72 104 M80 80 L88 104" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="80" cy="36" r="6.5" fill="currentColor"/>
          <path class="bio-path-limb" d="M80 48 L62 70 L58 94 M80 48 L98 70 L102 94" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <rect x="52" y="94" width="12" height="7" rx="2" fill="rgba(255,255,255,0.6)"/>
          <rect x="96" y="94" width="12" height="7" rx="2" fill="rgba(255,255,255,0.6)"/>
          <circle cx="80" cy="62" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <path class="bio-motion-arrow" d="M116 82 L132 82" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'mobility':
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <path class="bio-path-body" d="M76 48 L76 76 L66 102 M76 76 L88 102" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="76" cy="38" r="6.5" fill="currentColor"/>
          <path class="bio-path-limb" d="M76 50 L56 54 L44 42 M76 50 L96 54 L108 42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="76" cy="62" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <path class="bio-motion-arrow" d="M40 30 C54 18 98 18 112 30" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'squat':
    default:
      // Air Squat / Goblet Squat: Deep knee and hip flexion with tall spine
      return `
        <svg ${baseSvgAttrs}>
          <!-- Ground line -->
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Squat position: Feet planted, deep knee bend, hips low -->
          <path class="bio-path-body" d="M60 76 L86 64 L102 46" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="108" cy="40" r="6.5" fill="currentColor"/>
          <!-- Legs in deep parallel flexion -->
          <path class="bio-path-limb" d="M60 76 L76 76 L72 104" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bio-path-limb" d="M60 76 L84 80 L88 104" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Primary target: Quads / Glutes -->
          <circle cx="74" cy="76" r="5.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <circle cx="60" cy="76" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Vertical power vector -->
          <path class="bio-motion-arrow" d="M86 64 L86 48" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
          <text x="100" y="87" fill="rgba(255,255,255,0.4)" font-size="8" font-family="sans-serif">PARALLEL</text>
        </svg>
      `;
  }
}

/**
 * Derives concise form cues and safety notes if not explicitly specified on the record.
 */
export function getExerciseBiomechanicalCues(exercise) {
  if (!exercise || typeof exercise !== 'object') {
    return {
      cues: ['Maintain continuous controlled tempo', 'Breathe out on exertion', 'Keep core engaged'],
      safetyNote: 'Stop immediately if sharp joint pain occurs.'
    };
  }

  // 1. If explicit formCues array exists, use it
  if (Array.isArray(exercise.formCues) && exercise.formCues.length > 0) {
    return {
      cues: exercise.formCues.filter(c => typeof c === 'string' && c.trim().length > 0),
      safetyNote: typeof exercise.safetyNotes === 'string' && exercise.safetyNotes.trim()
        ? exercise.safetyNotes.trim()
        : (exercise.safetyNote || 'Maintain controlled motion without jerking.')
    };
  }

  // 2. Otherwise safely synthesize from instructions
  const synthesizedCues = [];
  if (Array.isArray(exercise.instructions)) {
    exercise.instructions.slice(0, 3).forEach(inst => {
      if (typeof inst === 'string' && inst.trim()) {
        const shortClause = inst.split('.')[0].trim();
        if (shortClause) synthesizedCues.push(shortClause);
      }
    });
  }

  if (synthesizedCues.length === 0) {
    synthesizedCues.push('Maintain strict posture and neutral spine', 'Focus on mind-muscle contraction', 'Smooth eccentric lowering tempo');
  }

  const defaultSafety = exercise.difficulty === 'advanced'
    ? 'Ensure full warmup and joint stability before handling heavy load.'
    : 'Keep core braced and avoid arching the lower lumbar spine.';

  return {
    cues: synthesizedCues,
    safetyNote: typeof exercise.safetyNotes === 'string' && exercise.safetyNotes.trim() ? exercise.safetyNotes.trim() : defaultSafety
  };
}

/**
 * Renders the rich Exercise Media Stage HTML with multi-tier resolution fallback.
 * Multi-Tier Resolution: Coach Motion -> Poster Image -> Procedural Biomechanical SVG.
 *
 * @param {Object} exercise - Exercise record
 * @param {Object} options - Display options
 * @returns {string} Safe HTML string
 */
export function renderExerciseMedia(exercise, options = {}) {
  // Enrich exercise with Coach Kai pilot metadata if applicable
  const safeEx = resolveExerciseWithCoachMedia(
    exercise && typeof exercise === 'object' ? exercise : {
      name: 'Movement Demonstration',
      movementPattern: 'squat',
      primaryMuscles: ['core'],
      category: 'strength',
      equipment: ['bodyweight']
    }
  );

  const pattern = typeof safeEx.movementPattern === 'string' && safeEx.movementPattern.trim()
    ? safeEx.movementPattern.trim().toLowerCase()
    : 'squat';

  const primaryMuscles = Array.isArray(safeEx.primaryMuscles) && safeEx.primaryMuscles.length > 0
    ? safeEx.primaryMuscles
    : ['core'];

  const mediaDef = safeEx.media && typeof safeEx.media === 'object'
    ? safeEx.media
    : { type: 'placeholder', source: null };

  const { cues, safetyNote } = getExerciseBiomechanicalCues(safeEx);

  const rawMuscle = primaryMuscles[0];
  const primaryMuscleName = MUSCLE_LABELS[rawMuscle] || (typeof rawMuscle === 'string' ? rawMuscle : 'Core');
  const vectorSvg = getBiomechanicalIllustration(pattern, primaryMuscles);

  // Validate and sanitize media URLs
  const validSource = sanitizeMediaUrl(mediaDef.source);
  const validPoster = sanitizeMediaUrl(mediaDef.poster);
  const hasRealVideo = (mediaDef.type === 'video' || mediaDef.type === 'coach-motion') && Boolean(validSource);
  const hasRealImage = (mediaDef.type === 'image' || mediaDef.type === 'animation') && Boolean(validSource);

  const coachIdentity = safeEx.coach || (mediaDef.coachId ? KINETIX_COACH : null);
  const coachName = coachIdentity ? coachIdentity.name : 'Kinetix Coach';

  const escapedName = escapeHtml(safeEx.name || 'Exercise');
  const escapedPattern = escapeHtml(pattern.replace(/-/g, ' ').toUpperCase());
  const escapedMuscle = escapeHtml(primaryMuscleName);
  const escapedCoachName = escapeHtml(coachName);

  const cuesHtml = options.showCues ? `
    <div class="exercise-cues-drawer" id="player-cues-drawer">
      <div class="exercise-cues-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>FORM CUES</span>
        ${safeEx.demonstration && safeEx.demonstration.tempo ? `
          <span class="badge badge-dark" style="margin-left: auto; font-size: 10px;">Tempo: ${escapeHtml(safeEx.demonstration.tempo)}</span>
        ` : ''}
      </div>
      <ul class="exercise-cues-list">
        ${cues.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
      </ul>
      ${safetyNote ? `
        <div class="exercise-safety-note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>${escapeHtml(safetyNote)}</span>
        </div>
      ` : ''}
    </div>
  ` : '';

  return `
    <div class="player-media-stage ${escapeHtml(options.className || '')}" id="exercise-media-stage" role="region" aria-label="Movement Demonstration for ${escapedName}">
      <!-- Media Presentation Wrapper -->
      <div class="exercise-media-canvas" id="exercise-media-canvas">
        ${hasRealVideo ? `
          <video
            class="exercise-media-video"
            src="${validSource}"
            ${validPoster ? `poster="${validPoster}"` : ''}
            autoplay
            loop
            muted
            playsinline
            preload="none"
            aria-label="${escapedName} video demonstration by ${escapedCoachName}"
            onerror="this.style.display='none'; if (typeof this.pause === 'function') this.pause(); const fb = this.parentElement ? this.parentElement.querySelector('.exercise-media-fallback') : null; if (fb) fb.style.display='flex';"
          ></video>
          <div class="exercise-media-fallback" style="display: none;">
            ${validPoster ? `
              <img
                class="exercise-media-poster"
                src="${validPoster}"
                alt="${escapedName} demonstration poster"
                loading="lazy"
                onerror="this.style.display='none'; const vfb = this.parentElement.querySelector('.exercise-vector-fallback'); if (vfb) vfb.style.display='flex';"
              />
            ` : ''}
            <div class="exercise-vector-fallback" style="${validPoster ? 'display: none;' : ''}">
              ${vectorSvg}
            </div>
          </div>
        ` : hasRealImage ? `
          <img
            class="exercise-media-image"
            src="${validSource}"
            alt="${escapedName} movement illustration"
            loading="lazy"
            onerror="this.style.display='none'; const fb = this.parentElement ? this.parentElement.querySelector('.exercise-media-fallback') : null; if (fb) fb.style.display='flex';"
          />
          <div class="exercise-media-fallback" style="display: none;">
            ${vectorSvg}
          </div>
        ` : `
          <!-- Pure Deterministic Biomechanical Stage -->
          <div class="exercise-vector-presentation">
            ${vectorSvg}
          </div>
        `}
      </div>

      <!-- Stage Overlays: Muscle, Pattern, and Coach Badges -->
      <div class="exercise-media-meta-overlay">
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <span class="badge badge-dark exercise-media-pattern-badge">
            ${escapedPattern}
          </span>
          ${coachIdentity ? `
            <span class="badge badge-dark exercise-coach-badge" style="background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 84, 46, 0.4); color: #FFF;">
              <span style="color: var(--color-primary, #FF542E); margin-right: 4px;">●</span>${escapedCoachName}
            </span>
          ` : ''}
        </div>
        <span class="badge badge-primary exercise-media-muscle-badge">
          Target: ${escapedMuscle}
        </span>
      </div>

      ${cuesHtml}
    </div>
  `;
}

/**
 * Opens the rich Exercise Detail inspection modal.
 * Can be invoked from Exercise Library, Workout Detail, or Workout Player.
 * Hardened with focus trap, Esc closure, and focus restoration.
 *
 * @param {Object} ex - Exercise object
 */
export function showExerciseDetailModal(ex) {
  if (!ex || typeof ex !== 'object') return null;
  if (typeof document === 'undefined') return null;

  const previouslyFocused = document.activeElement;

  const existingModal = document.querySelector('#exercise-detail-modal');
  if (existingModal) existingModal.remove();

  // Enrich with Coach Kai demonstration standards
  const enrichedEx = resolveExerciseWithCoachMedia(ex);

  const primaryDisplay = (enrichedEx.primaryMuscles || []).map(m => MUSCLE_LABELS[m] || m).join(', ');
  const secDisplay = (enrichedEx.secondaryMuscles || []).map(m => MUSCLE_LABELS[m] || m).join(', ');
  const eqDisplay = (enrichedEx.equipment || []).map(eq => EQUIPMENT_LABELS[eq] || eq).join(', ');

  const instructionsList = Array.isArray(enrichedEx.instructions)
    ? enrichedEx.instructions.map((step) => `<li style="margin-bottom: 6px;">${escapeHtml(step)}</li>`).join('')
    : `<li>${escapeHtml(enrichedEx.instructions || 'Perform movement with strict control.')}</li>`;

  // Fetch real performance history for this exercise
  const history = getExerciseHistory(enrichedEx.id) || { totalSets: 0, maxReps: 0, maxWeight: 0, lastPerformed: 'Never' };

  const escapedName = escapeHtml(enrichedEx.name || 'Exercise');
  const escapedCategory = escapeHtml(CATEGORY_LABELS[enrichedEx.category] || enrichedEx.category || 'Movement');
  const escapedDifficulty = escapeHtml(enrichedEx.difficulty ? enrichedEx.difficulty.charAt(0).toUpperCase() + enrichedEx.difficulty.slice(1) : 'Beginner');
  const escapedReps = escapeHtml(enrichedEx.defaultReps || '12 Reps');
  const escapedPrimary = escapeHtml(primaryDisplay || 'Core');
  const escapedSec = escapeHtml(secDisplay || '');
  const escapedEq = escapeHtml(eqDisplay || 'Bodyweight');

  const demo = enrichedEx.demonstration;
  const coachIdentity = enrichedEx.coach;

  const modalHtml = `
    <div class="modal-backdrop is-active" id="exercise-detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-ex-title">
      <div class="modal-card view-enter" style="max-width: 540px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
          <div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
              <span class="badge badge-primary">${escapedCategory}</span>
              ${coachIdentity ? `
                <span class="badge" style="background: rgba(255, 84, 46, 0.15); color: var(--color-primary); border: 1px solid rgba(255, 84, 46, 0.35); font-size: 11px;">
                  Coach ${escapeHtml(coachIdentity.name)}
                </span>
              ` : ''}
            </div>
            <h2 id="modal-ex-title" class="text-h2" style="margin: 0;">${escapedName}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-modal-close" aria-label="Close modal" style="font-size: 20px; line-height: 1; padding: 4px 8px;">
            &times;
          </button>
        </div>

        <!-- Biomechanical Movement Demonstration Stage -->
        <div style="border-radius: var(--radius-md); overflow: hidden; margin-bottom: var(--space-4);">
          ${renderExerciseMedia(enrichedEx, { showCues: true })}
        </div>

        <!-- Coach Kai Demonstration Standard Breakdown -->
        ${demo ? `
          <div class="card" style="margin-bottom: var(--space-4); background: var(--color-surface-secondary); border: 1px solid rgba(255, 84, 46, 0.25); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
              <span style="font-weight: 700; color: var(--color-primary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                Demonstration Standard &bull; ${escapeHtml(coachIdentity ? coachIdentity.name : 'Coach Kai')}
              </span>
              <span class="badge badge-dark" style="font-size: 10px;">Tempo: ${escapeHtml(demo.tempo)}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px; line-height: 1.4; color: var(--color-text-secondary);">
              <div><strong style="color: var(--color-text-primary);">Starting Posture:</strong> ${escapeHtml(demo.startPosition)}</div>
              <div><strong style="color: var(--color-text-primary);">Movement Trajectory:</strong> ${escapeHtml(demo.movement)}</div>
              <div><strong style="color: var(--color-text-primary);">Contraction & Lockout:</strong> ${escapeHtml(demo.endPosition)}</div>
              <div style="color: var(--color-primary); margin-top: 2px;">
                <strong>Primary Form Cue:</strong> ${escapeHtml(demo.primaryFormCue)}
              </div>
              ${demo.commonMistake ? `
                <div style="color: #FFA502; margin-top: 2px; display: flex; align-items: flex-start; gap: 4px;">
                  <span>&#9888;</span>
                  <span><strong>Avoid Mistake:</strong> ${escapeHtml(demo.commonMistake)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Metadata Badges Strip -->
        <div class="grid grid-cols-3 gap-2" style="margin-bottom: var(--space-4);">
          <div class="card" style="padding: var(--space-2) var(--space-3); text-align: center; background: var(--color-surface-secondary); border: none;">
            <span class="text-caption text-muted">DIFFICULTY</span>
            <div class="text-label" style="margin-top: 2px;">${escapedDifficulty}</div>
          </div>
          <div class="card" style="padding: var(--space-2) var(--space-3); text-align: center; background: var(--color-surface-secondary); border: none;">
            <span class="text-caption text-muted">DEFAULT REPS</span>
            <div class="text-label" style="margin-top: 2px;">${escapedReps}</div>
          </div>
          <div class="card" style="padding: var(--space-2) var(--space-3); text-align: center; background: var(--color-surface-secondary); border: none;">
            <span class="text-caption text-muted">BURN RATE</span>
            <div class="text-label" style="margin-top: 2px;">~${Math.round(enrichedEx.estimatedCaloriesPerMinute || 7)} cal/m</div>
          </div>
        </div>

        <!-- Muscle Focus Details -->
        <div style="margin-bottom: var(--space-4);">
          <div class="text-label" style="margin-bottom: 4px;">Primary Target:</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
            <span class="chip is-active" style="cursor: default;">${escapedPrimary}</span>
          </div>
          ${escapedSec ? `
            <div class="text-caption text-muted" style="margin-bottom: 2px;">Secondary Stabilizers:</div>
            <div class="text-body-sm" style="color: var(--color-text-secondary);">${escapedSec}</div>
          ` : ''}
        </div>

        <!-- Equipment Required -->
        <div style="margin-bottom: var(--space-4);">
          <div class="text-label" style="margin-bottom: 4px;">Required Equipment:</div>
          <div class="text-body-sm" style="color: var(--color-text-secondary);">${escapedEq}</div>
        </div>

        <!-- Coaching Cues & Instructions -->
        <div style="margin-bottom: var(--space-5);">
          <div class="text-label" style="margin-bottom: 6px;">Step-by-Step Execution:</div>
          <ol class="text-body-sm" style="padding-left: 20px; line-height: 1.5; color: var(--color-text-secondary); margin: 0;">
            ${instructionsList}
          </ol>
        </div>

        <!-- Athlete History & PRs for this Movement -->
        <div style="margin-bottom: var(--space-5); background: var(--color-surface-secondary); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border-subtle);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span class="text-label" style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary);">Personal Performance:</span>
            ${history.totalSets > 0 ? `<span class="badge badge-success">${history.totalSets} Sets Logged</span>` : ''}
          </div>
          ${history.totalSets > 0 ? `
            <div class="text-body-sm" style="color: var(--color-text-primary);">
              Best: <strong>${history.maxReps} reps</strong> ${history.maxWeight > 0 ? `@ ${history.maxWeight} kg` : ''} &bull; Last trained ${escapeHtml(history.lastPerformed || 'Recent')}
            </div>
          ` : `
            <div class="text-caption text-muted">
              No logged training history recorded for this exercise yet.
            </div>
          `}
        </div>

        <div>
          <button type="button" class="btn btn-primary" id="btn-modal-done" style="width: 100%;">Done</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modalEl = document.querySelector('#exercise-detail-modal');
  const closeBtn = modalEl ? modalEl.querySelector('#btn-modal-close') : null;
  const doneBtn = modalEl ? modalEl.querySelector('#btn-modal-done') : null;

  const closeModal = () => {
    if (modalEl) modalEl.remove();
    document.removeEventListener('keydown', handleKeyNavigation);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  };

  const handleKeyNavigation = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }
    // Trap Tab focus inside modal
    if (e.key === 'Tab' && modalEl) {
      const focusables = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (doneBtn) doneBtn.addEventListener('click', closeModal);
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
  }
  document.addEventListener('keydown', handleKeyNavigation);

  // Focus close button on open
  if (closeBtn && typeof closeBtn.focus === 'function') {
    closeBtn.focus();
  }

  return modalEl;
}
