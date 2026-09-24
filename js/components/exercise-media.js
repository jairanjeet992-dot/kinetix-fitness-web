/**
 * EXERCISE MEDIA & VISUALIZATION ARCHITECTURE - KINETIX
 * Phase 8: Premium Biomechanical Movement Visualization & Failure-Safe Media
 * Phase 8.1 Hardening: XSS escaping, safe protocol validation, accessible focus trap
 */

import { MUSCLE_LABELS, EQUIPMENT_LABELS, CATEGORY_LABELS } from '../data/taxonomy.js';
import { getExerciseHistory } from '../state/workout-history.js';

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
  // Disallow dangerous protocols
  if (/^(javascript|vbscript|data:(?!image\/))/i.test(trimmed)) return null;
  // Allow safe protocols or relative/asset paths
  if (/^(https?:|\/|\.\/|assets\/|images\/|data:image\/)/i.test(trimmed)) {
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

  // Base SVG wrapper styles
  const baseSvgAttrs = `viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="exercise-bio-svg" role="img" aria-label="${escapedPattern} biomechanical movement illustration"`;

  switch (safePattern) {
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
          <!-- Dumbbell/Barbell bar overhead -->
          <line x1="58" y1="18" x2="102" y2="18" stroke="rgba(255,255,255,0.6)" stroke-width="3" stroke-linecap="round"/>
          <!-- Shoulders target pulse -->
          <circle cx="70" cy="46" r="4" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <circle cx="90" cy="46" r="4" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Vertical trajectory arrow -->
          <path class="bio-motion-arrow" d="M80 34 L80 20" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'squat':
      // Squat: Hip depth below parallel, knees tracking toes, upright torso
      return `
        <svg ${baseSvgAttrs}>
          <line x1="20" y1="108" x2="140" y2="108" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Stand outline (start) -->
          <path d="M72 108 L76 72 L78 40 M78 40 L80 72 L84 108" stroke="rgba(255,255,255,0.18)" stroke-width="2" stroke-dasharray="3 3"/>
          <!-- Deep Squat Active Geometry -->
          <circle cx="70" cy="42" r="6.5" fill="currentColor"/>
          <path class="bio-path-body" d="M70 48 L76 74 L56 82 L70 108" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bio-path-body" d="M76 74 L60 84 L76 108" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Arms counter-balance forward -->
          <path class="bio-path-limb" d="M72 52 L94 56" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Target: Quadriceps & Glutes -->
          <circle cx="66" cy="80" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Depth guide line -->
          <line x1="48" y1="84" x2="96" y2="84" stroke="rgba(255,84,46,0.4)" stroke-width="1.5" stroke-dasharray="2 2"/>
          <text x="100" y="87" fill="rgba(255,255,255,0.4)" font-size="8" font-family="sans-serif">PARALLEL</text>
        </svg>
      `;

    case 'hinge':
      // Hip Hinge / Deadlift: Hips back, flat back, loaded posterior chain
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="108" x2="144" y2="108" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Hinge position -->
          <circle cx="106" cy="46" r="6.5" fill="currentColor"/>
          <path class="bio-path-body" d="M106 52 L68 64 L62 88 L72 108" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Arms hanging straight down with load -->
          <path class="bio-path-limb" d="M96 56 L96 90" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <circle cx="96" cy="94" r="5" fill="rgba(255,255,255,0.6)"/>
          <!-- Target: Hamstrings / Glutes -->
          <circle cx="64" cy="76" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Hip displacement trajectory (Hips push back) -->
          <path class="bio-motion-arrow" d="M78 62 L54 64" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'lunge':
      // Split Lunge: 90-degree front and back knee angles
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="108" x2="144" y2="108" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="76" cy="40" r="6.5" fill="currentColor"/>
          <!-- Torso upright -->
          <path class="bio-path-body" d="M76 46 L76 72" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Front leg 90 deg -->
          <path class="bio-path-body" d="M76 72 L102 74 L102 108" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Back leg 90 deg dropping toward floor -->
          <path class="bio-path-body" d="M76 72 L50 82 L50 106" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Target Quad/Glute -->
          <circle cx="90" cy="74" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Downward motion arrow -->
          <path class="bio-motion-arrow" d="M76 56 L76 68" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'isometric':
    case 'core':
    case 'rotational':
      // Plank / Core Brace: Rigid bridge, neutral spine, core locked
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="104" x2="144" y2="104" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <!-- Rigid bridge plank -->
          <circle cx="132" cy="62" r="6.5" fill="currentColor"/>
          <path class="bio-path-body" d="M32 98 L56 86 L108 72 L128 66" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Forearm support -->
          <path class="bio-path-limb" d="M118 70 L118 98 L130 98" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Feet toes planted -->
          <path class="bio-path-limb" d="M32 98 L36 102" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <!-- Core highlight -->
          <circle cx="90" cy="77" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Bracing ring indicator -->
          <circle cx="90" cy="77" r="11" stroke="rgba(255,84,46,0.3)" stroke-width="1.5" stroke-dasharray="3 2"/>
        </svg>
      `;

    case 'cardio':
      // Dynamic High Cadence (Burpee, Jump Jacks)
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="108" x2="144" y2="108" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="80" cy="30" r="6.5" fill="currentColor"/>
          <!-- Explosive extension jumping pose -->
          <path class="bio-path-body" d="M80 36 L80 68 L64 96 M80 68 L96 96" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bio-path-limb" d="M80 42 L60 26 M80 42 L100 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <!-- Full-body energy pulse -->
          <circle cx="80" cy="54" r="5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <!-- Explosive velocity arrows -->
          <path class="bio-motion-arrow" d="M54 22 L46 14 M106 22 L114 14" stroke="var(--color-primary, #FF542E)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;

    case 'mobility':
    default:
      // Mobility Stretch / Gentle Restorative Flow
      return `
        <svg ${baseSvgAttrs}>
          <line x1="16" y1="106" x2="144" y2="106" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="44" cy="74" r="6" fill="currentColor"/>
          <!-- Kneeling / child's pose decompression -->
          <path class="bio-path-body" d="M48 78 C64 80 84 88 114 96" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
          <path class="bio-path-limb" d="M48 78 L34 94 L50 102" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bio-path-limb" d="M60 82 L96 98 L114 100" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Spine decompression curve -->
          <circle cx="78" cy="85" r="4.5" class="bio-muscle-pulse" fill="var(--color-primary, #FF542E)"/>
          <path class="bio-motion-arrow" d="M64 72 C78 72 92 78 104 88" stroke="var(--color-primary, #FF542E)" stroke-width="1.8" stroke-dasharray="3 2"/>
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
 * Renders the rich Exercise Media Stage HTML with resilient fallback.
 *
 * @param {Object} exercise - Exercise record
 * @param {Object} options - Display options
 * @returns {string} Safe HTML string
 */
export function renderExerciseMedia(exercise, options = {}) {
  // Fail-safe default if exercise record is null or malformed
  const safeEx = exercise && typeof exercise === 'object' ? exercise : {
    name: 'Movement Demonstration',
    movementPattern: 'squat',
    primaryMuscles: ['core'],
    category: 'strength',
    equipment: ['bodyweight']
  };

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

  // Validate and sanitize media source URL
  const validSource = sanitizeMediaUrl(mediaDef.source);
  const hasRealVideo = mediaDef.type === 'video' && Boolean(validSource);
  const hasRealImage = (mediaDef.type === 'image' || mediaDef.type === 'animation') && Boolean(validSource);

  const escapedName = escapeHtml(safeEx.name || 'Exercise');
  const escapedPattern = escapeHtml(pattern.replace(/-/g, ' ').toUpperCase());
  const escapedMuscle = escapeHtml(primaryMuscleName);

  const cuesHtml = options.showCues ? `
    <div class="exercise-cues-drawer" id="player-cues-drawer">
      <div class="exercise-cues-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>FORM CUES</span>
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
            autoplay
            loop
            muted
            playsinline
            aria-label="${escapedName} video demonstration"
            onerror="this.style.display='none'; if (typeof this.pause === 'function') this.pause(); const fb = this.parentElement ? this.parentElement.querySelector('.exercise-media-fallback') : null; if (fb) fb.style.display='flex';"
          ></video>
          <div class="exercise-media-fallback" style="display: none;">
            ${vectorSvg}
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

      <!-- Stage Overlays: Muscle and Pattern badges -->
      <div class="exercise-media-meta-overlay">
        <span class="badge badge-dark exercise-media-pattern-badge">
          ${escapedPattern}
        </span>
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
  if (!ex || typeof ex !== 'object') return;
  if (typeof document === 'undefined') return;

  const previouslyFocused = document.activeElement;

  const existingModal = document.querySelector('#exercise-detail-modal');
  if (existingModal) existingModal.remove();

  const primaryDisplay = (ex.primaryMuscles || []).map(m => MUSCLE_LABELS[m] || m).join(', ');
  const secDisplay = (ex.secondaryMuscles || []).map(m => MUSCLE_LABELS[m] || m).join(', ');
  const eqDisplay = (ex.equipment || []).map(eq => EQUIPMENT_LABELS[eq] || eq).join(', ');

  const instructionsList = Array.isArray(ex.instructions)
    ? ex.instructions.map((step) => `<li style="margin-bottom: 6px;">${escapeHtml(step)}</li>`).join('')
    : `<li>${escapeHtml(ex.instructions || 'Perform movement with strict control.')}</li>`;

  // Fetch real performance history for this exercise
  const history = getExerciseHistory(ex.id) || { totalSets: 0, maxReps: 0, maxWeight: 0, lastPerformed: 'Never' };

  const escapedName = escapeHtml(ex.name || 'Exercise');
  const escapedCategory = escapeHtml(CATEGORY_LABELS[ex.category] || ex.category || 'Movement');
  const escapedDifficulty = escapeHtml(ex.difficulty ? ex.difficulty.charAt(0).toUpperCase() + ex.difficulty.slice(1) : 'Beginner');
  const escapedReps = escapeHtml(ex.defaultReps || '12 Reps');
  const escapedPrimary = escapeHtml(primaryDisplay || 'Core');
  const escapedSec = escapeHtml(secDisplay || '');
  const escapedEq = escapeHtml(eqDisplay || 'Bodyweight');

  const modalHtml = `
    <div class="modal-backdrop is-active" id="exercise-detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-ex-title">
      <div class="modal-card view-enter" style="max-width: 540px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
          <div>
            <span class="badge badge-primary" style="margin-bottom: 6px;">${escapedCategory}</span>
            <h2 id="modal-ex-title" class="text-h2" style="margin: 0;">${escapedName}</h2>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-modal-close" aria-label="Close modal" style="font-size: 20px; line-height: 1; padding: 4px 8px;">
            &times;
          </button>
        </div>

        <!-- Biomechanical Movement Demonstration Stage -->
        <div style="border-radius: var(--radius-md); overflow: hidden; margin-bottom: var(--space-4);">
          ${renderExerciseMedia(ex, { showCues: true })}
        </div>

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
            <div class="text-label" style="margin-top: 2px;">~${Math.round(ex.estimatedCaloriesPerMinute || 7)} cal/m</div>
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
