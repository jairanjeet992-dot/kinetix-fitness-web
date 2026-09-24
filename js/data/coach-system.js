/**
 * KINETIX COACH SYSTEM & MEDIA ARCHITECTURE
 * Phase 9: Unified Visual Identity, Consistency System & Demonstration Standards
 *
 * Establishes:
 * 1. Fictional Digital Coach Specification ("Coach Kai")
 * 2. Backward-Compatible Media Schema & Provenance Tracking
 * 3. Deterministic Demonstration Standards (Start, Movement, End, Tempo, Form Cues)
 * 4. Multi-Tier Resolution Chain (Coach Media -> Poster -> SVG Fallback)
 * 5. Metadata Validation & Consistency Auditor
 */

import { escapeHtml, sanitizeMediaUrl } from '../components/exercise-media.js';

/**
 * Authoritative Kinetix Coach Identity Specification.
 * Original fictional identity designed for biomechanical clarity and visual consistency.
 */
export const KINETIX_COACH = {
  id: 'coach-kai',
  coachId: 'coach-kai',
  name: 'Coach Kai',
  title: 'Lead Biomechanics & Movement Specialist',
  organization: 'Kinetix Fitness Systems',
  type: 'digital-fictional', // Original fictional digital identity
  visualIdentity: 'Athletic, focused, minimalist technical presentation',
  fictionalEntity: true,
  noRealPersonCloned: true,
  genderPresentation: 'athletic-neutral',
  agePresentation: '28-32',
  bodyProportions: 'athletic-balanced',
  outfit: 'Matte Charcoal high-performance compression top and tights with Ember Red seam piping (#FF542E)',
  footwear: 'Minimalist zero-drop black athletic training shoes with amber sole accents',
  accessories: 'None (bare wrists and neck to prevent visual distraction during joint movement)',
  cameraAngle: 'Eye-level / 45-degree isometric demonstration',
  background: 'Dark graphite studio (#1A1A1E to #0E0E10)',
  lighting: 'Three-point rim lighting with high contrast on major muscular insertions',
  framing: '16:9 full-body athletic framing',
  distanceFromCamera: '3.2 meters',
  visualStyle: 'Clean digital motion render with dark studio setting',
  colorTreatment: 'Dark mode neutral backdrop with #FF542E biomechanical highlights',
  provenancePolicy: 'Strict commercial proprietary (Kinetix Digital Motion Lab)',
  visualProfile: {
    presentation: 'athletic-neutral',
    approximateAge: '28-32',
    heightCm: 178,
    proportions: 'athletic-balanced',
    outfit: {
      top: 'Matte Charcoal high-performance compression top with Ember Red seam piping (#FF542E)',
      bottom: 'Matte Charcoal technical compression shorts/tights',
      footwear: 'Minimalist zero-drop black athletic training shoes with amber sole accents',
      accessories: 'None (bare wrists and neck to prevent visual distraction during joint movement)'
    },
    studioSetting: {
      background: 'Dark minimalist studio gradient (Radial #1A1A1E to #0E0E10)',
      groundPlane: 'Neutral grey studio floor with subtle perspective depth markers',
      lighting: 'Three-point rim lighting with high contrast on major muscular insertions',
      framing: '16:9 widescreen, fixed elevation at 1.1m (approx athlete center of mass)',
      distanceMeters: 3.2
    }
  },
  demonstrationGuidelines: {
    tempoNotation: 'eccentric-pause-concentric-pause (e.g., 3-0-1-0)',
    cadence: 'Deliberate, rhythmic repetitions allowing continuous visual breakdown',
    targetMusclePulseColor: '#FF542E',
    audioCueType: 'synthesized-rhythm'
  }
};

/**
 * Registry of approved Kinetix Coach Identities.
 */
export const COACH_REGISTRY = {
  'coach-kai': KINETIX_COACH
};

/**
 * The 8 Representative Pilot Exercise IDs across distinct movement patterns.
 */
export const PILOT_EXERCISE_IDS = [
  'air-squat',         // Squat (Knee-dominant lower)
  'push-up',           // Push (Horizontal upper push)
  'pull-up',           // Pull (Vertical upper pull)
  'romanian-deadlift', // Hinge (Hip-dominant posterior)
  'walking-lunge',     // Lunge (Unilateral dynamic lower)
  'bicep-curl',        // Isolation (Single-joint elbow flexion)
  'forearm-plank',     // Core (Isometric anterior stabilization)
  'jumping-jack'       // Timed / Cardio (Full-body dynamic plyometric)
];

/**
 * Canonical Pilot Demonstration Standards & Media Assets.
 * Follows strict provenance, zero unlicensed web ripping, and unified Coach Kai identity.
 */
export const PILOT_COACH_MEDIA = {
  'air-squat': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/air-squat.mp4',
    poster: 'assets/media/coach-kai/air-squat-poster.webp',
    thumbnail: 'assets/media/coach-kai/air-squat-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 4.0,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_sq_001',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'squat',
      startPosition: 'Feet shoulder-width apart, toes turned outward 15–30°, upright torso, arms balanced forward.',
      movement: 'Simultaneously hinge hips down and back while flexing knees, keeping weight centered midfoot.',
      endPosition: 'Hip crease breaks below the top of the patella, maintaining a neutral lumbar curvature.',
      tempo: '3-0-1-0',
      primaryTarget: 'Quadriceps, Gluteus Maximus',
      primaryFormCue: 'Track knees directly over middle toes; maintain proud chest throughout descent.',
      commonMistake: 'Knees collapsing inward (valgus collapse) or heels elevating from the floor.'
    }
  },

  'push-up': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/push-up.mp4',
    poster: 'assets/media/coach-kai/push-up-poster.webp',
    thumbnail: 'assets/media/coach-kai/push-up-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 3.5,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_pu_002',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'horizontal-push',
      startPosition: 'Hands slightly wider than shoulder-width, fingers spread, rigid straight-line plank from heels to crown.',
      movement: 'Lower chest smoothly toward floor with elbows tucked at roughly 45° to the ribcage.',
      endPosition: 'Chest hovers 1–2 inches above floor; elbows past 90° flexion; core braced rigid.',
      tempo: '2-0-1-0',
      primaryTarget: 'Pectoralis Major, Anterior Deltoids, Triceps Brachii',
      primaryFormCue: 'Screw hands firmly into ground to engage lats and stabilize shoulder capsules.',
      commonMistake: 'Sagging lower back, flaring elbows out perpendicular (90°), or craning neck forward.'
    }
  },

  'pull-up': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/pull-up.mp4',
    poster: 'assets/media/coach-kai/pull-up-poster.webp',
    thumbnail: 'assets/media/coach-kai/pull-up-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 4.0,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_pl_003',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'vertical-pull',
      startPosition: 'Overhand grip slightly wider than shoulders, arms fully extended in an active dead hang.',
      movement: 'Depress and retract scapulae, drive elbows down and back to hoist chest toward the bar.',
      endPosition: 'Chin clears the bar cleanly without cervical extension; chest touches or nears bar height.',
      tempo: '2-1-1-1',
      primaryTarget: 'Latissimus Dorsi, Biceps, Rhomboids, Lower Trapezius',
      primaryFormCue: 'Think about driving your elbows into your back pockets rather than curling with arms.',
      commonMistake: 'Kicking legs or kipping body for momentum; rounding shoulders forward at the top.'
    }
  },

  'romanian-deadlift': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/romanian-deadlift.mp4',
    poster: 'assets/media/coach-kai/romanian-deadlift-poster.webp',
    thumbnail: 'assets/media/coach-kai/romanian-deadlift-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 4.2,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_rdl_004',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'hinge',
      startPosition: 'Stand tall with feet hip-width, weights resting against anterior thighs, shoulders pinned back.',
      movement: 'Unlock knees slightly and push hips straight backward as if closing a door behind you.',
      endPosition: 'Weights reach mid-shin with maximum tension felt along hamstrings and glutes; spine neutral.',
      tempo: '3-1-1-0',
      primaryTarget: 'Hamstrings (Biceps Femoris), Gluteus Maximus, Erector Spinae',
      primaryFormCue: 'Keep dumbbells brushing along thighs and shins; movement is purely horizontal hip travel.',
      commonMistake: 'Squatting with knee bend rather than hinging hips; rounding thoracic or lumbar spine.'
    }
  },

  'walking-lunge': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/walking-lunge.mp4',
    poster: 'assets/media/coach-kai/walking-lunge-poster.webp',
    thumbnail: 'assets/media/coach-kai/walking-lunge-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 3.8,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_wl_005',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'lunge',
      startPosition: 'Stand tall with feet together, hands on hips or holding dumbbells at sides.',
      movement: 'Step forward deliberately, planting heel-to-toe and lowering trailing knee straight down.',
      endPosition: 'Both knees achieve approximately 90° angles; trailing knee hovers 1 inch above floor.',
      tempo: '2-0-1-0',
      primaryTarget: 'Quadriceps, Gluteus Medius & Maximus, Adductors',
      primaryFormCue: 'Keep torso vertical with equal weight distribution between front heel and back ball of foot.',
      commonMistake: 'Taking too short a stride causing forward knee shearing over toes; leaning torso forward.'
    }
  },

  'bicep-curl': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/bicep-curl.mp4',
    poster: 'assets/media/coach-kai/bicep-curl-poster.webp',
    thumbnail: 'assets/media/coach-kai/bicep-curl-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 3.2,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_bc_006',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'isolation',
      startPosition: 'Stand tall with dumbbells at sides, arms extended, palms facing forward or neutral.',
      movement: 'Pin elbows to ribcage and flex elbows upward, supinating wrists as weights ascend.',
      endPosition: 'Full bicep contraction at shoulder height without moving elbows forward or backward.',
      tempo: '2-1-1-0',
      primaryTarget: 'Biceps Brachii, Brachialis, Forearm Flexors',
      primaryFormCue: 'Keep elbows locked at sides; isolate tension without using torso sway or hip drive.',
      commonMistake: 'Swinging torso for momentum; shifting elbows forward to cheat mechanical tension.'
    }
  },

  'forearm-plank': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/forearm-plank.mp4',
    poster: 'assets/media/coach-kai/forearm-plank-poster.webp',
    thumbnail: 'assets/media/coach-kai/forearm-plank-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 4.0,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_fp_007',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'core',
      startPosition: 'Forearms on floor with elbows directly under shoulders, feet hip-width apart.',
      movement: 'Engage core, squeeze glutes, press forearms firmly into ground, and hold rigid line.',
      endPosition: 'Continuous isometric hold with neutral pelvis, active lats, and flat thoracic spine.',
      tempo: 'Isometric hold (continuous tension)',
      primaryTarget: 'Rectus Abdominis, Transverse Abdominis, Internal & External Obliques',
      primaryFormCue: 'Pull elbows toward toes isometrically to maximize deep abdominal recruitment.',
      commonMistake: 'Hyperextending lumbar spine (sagging hips); piking glutes into the air.'
    }
  },

  'jumping-jack': {
    coachId: 'coach-kai',
    type: 'coach-motion',
    source: 'assets/media/coach-kai/jumping-jack.mp4',
    poster: 'assets/media/coach-kai/jumping-jack-poster.webp',
    thumbnail: 'assets/media/coach-kai/jumping-jack-thumb.webp',
    aspectRatio: '16:9',
    durationSec: 2.4,
    loop: true,
    provenance: {
      assetId: 'kinetix_kai_jj_008',
      creator: 'Kinetix Digital Motion Lab',
      license: 'Proprietary Kinetix Commercial Motion Asset',
      commercialUse: true,
      version: '1.0.0',
      date: '2026-09-24'
    },
    demonstration: {
      movementPattern: 'timed',
      startPosition: 'Stand tall with feet together, arms resting relaxed at sides.',
      movement: 'Jump feet outward slightly wider than shoulder-width while sweeping arms overhead.',
      endPosition: 'Hands clap or meet above head, feet wide; immediately spring back to start position.',
      tempo: 'Continuous rhythmic cadence (~60 bpm)',
      primaryTarget: 'Cardiovascular System, Calves (Gastrocnemius), Deltoids',
      primaryFormCue: 'Land softly on balls of feet with knees slightly unlocked to absorb joint impact.',
      commonMistake: 'Stiff-legged heavy heel landing; flailing arms without full shoulder range.'
    }
  }
};

/**
 * Validates a single coach media object.
 *
 * @param {Object} media - Media record to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCoachMedia(media) {
  const errors = [];

  if (!media || typeof media !== 'object') {
    return { valid: false, errors: ['Media definition is missing or not an object'] };
  }

  // 1. Coach Identity Validation
  if (!media.coachId || typeof media.coachId !== 'string') {
    errors.push('Missing coach identity: coachId is required');
  } else if (!COACH_REGISTRY[media.coachId]) {
    errors.push(`Unrecognized coachId "${media.coachId}". Must be registered in COACH_REGISTRY`);
  }

  // 2. Media Type Validation
  const validTypes = ['coach-motion', 'video', 'animation', 'image', 'placeholder'];
  if (!media.type || !validTypes.includes(media.type)) {
    errors.push(`Invalid media type "${media.type}". Allowed: ${validTypes.join(', ')}`);
  }

  // 3. Aspect Ratio Validation
  const validRatios = ['16:9', '4:3', '1:1'];
  if (media.aspectRatio && !validRatios.includes(media.aspectRatio)) {
    errors.push(`Inconsistent aspect ratio "${media.aspectRatio}". Standard: 16:9`);
  }

  // 4. URL Validation & Sanitization
  if (media.source && !sanitizeMediaUrl(media.source)) {
    errors.push(`Media source URL "${media.source}" is malformed or uses an unsafe protocol`);
  }
  if (media.poster && !sanitizeMediaUrl(media.poster)) {
    errors.push(`Media poster URL "${media.poster}" is malformed or uses an unsafe protocol`);
  }
  if (media.thumbnail && !sanitizeMediaUrl(media.thumbnail)) {
    errors.push(`Media thumbnail URL "${media.thumbnail}" is malformed or uses an unsafe protocol`);
  }

  // 5. Provenance Validation (if non-placeholder)
  if (media.type !== 'placeholder') {
    if (!media.provenance || typeof media.provenance !== 'object') {
      errors.push('Missing provenance metadata block for coach media');
    } else {
      if (!media.provenance.assetId || typeof media.provenance.assetId !== 'string') {
        errors.push('Missing unique assetId in provenance');
      }
      if (!media.provenance.license || typeof media.provenance.license !== 'string') {
        errors.push('Missing license description in provenance');
      }
      if (typeof media.provenance.commercialUse !== 'boolean') {
        errors.push('commercialUse must be a boolean in provenance');
      }
    }
  }

  // 6. Demonstration Standard Validation
  if (media.demonstration && typeof media.demonstration === 'object') {
    const demo = media.demonstration;
    if (!demo.startPosition || typeof demo.startPosition !== 'string') {
      errors.push('Demonstration standard requires a startPosition description');
    }
    if (!demo.movement || typeof demo.movement !== 'string') {
      errors.push('Demonstration standard requires a movement description');
    }
    if (!demo.endPosition || typeof demo.endPosition !== 'string') {
      errors.push('Demonstration standard requires an endPosition description');
    }
    if (!demo.primaryFormCue || typeof demo.primaryFormCue !== 'string') {
      errors.push('Demonstration standard requires a primaryFormCue');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates consistency across the entire Pilot Coach Registry.
 * Guarantees unified coach identity, zero duplicate asset IDs, and 100% demonstration coverage.
 *
 * @param {Object} [registry=PILOT_COACH_MEDIA]
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePilotConsistency(registry = PILOT_COACH_MEDIA) {
  const errors = [];
  const seenAssetIds = new Set();
  const targetCoachId = KINETIX_COACH.coachId;

  PILOT_EXERCISE_IDS.forEach(exId => {
    const media = registry[exId];
    if (!media) {
      errors.push(`Pilot exercise "${exId}" is missing from coach media registry`);
      return;
    }

    const val = validateCoachMedia(media);
    if (!val.valid) {
      val.errors.forEach(err => errors.push(`[${exId}] ${err}`));
    }

    // Unified coach identity check
    if (media.coachId !== targetCoachId) {
      errors.push(`[${exId}] Coach identity mismatch: "${media.coachId}" != "${targetCoachId}"`);
    }

    // Aspect ratio consistency check
    if (media.aspectRatio !== '16:9') {
      errors.push(`[${exId}] Non-standard aspect ratio: "${media.aspectRatio}". Expected 16:9`);
    }

    // Duplicate asset ID check
    if (media.provenance && media.provenance.assetId) {
      if (seenAssetIds.has(media.provenance.assetId)) {
        errors.push(`Duplicate assetId detected: "${media.provenance.assetId}" on exercise "${exId}"`);
      } else {
        seenAssetIds.add(media.provenance.assetId);
      }
    }
  });

  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    totalPilotAssets: PILOT_EXERCISE_IDS.length,
    checkedCount: PILOT_EXERCISE_IDS.length,
    errors
  };
}

/**
 * Resolves coach media for an exercise, falling back safely if exercise is not in pilot.
 *
 * @param {Object} exercise - Exercise definition
 * @returns {Object} Enriched exercise with coach media or backward-compatible fallback
 */
export function resolveExerciseWithCoachMedia(exercise) {
  if (!exercise || typeof exercise !== 'object') return exercise;

  // If exercise is one of the pilot exercises, link pilot media
  if (PILOT_COACH_MEDIA[exercise.id]) {
    const pilotMedia = PILOT_COACH_MEDIA[exercise.id];
    return {
      ...exercise,
      media: {
        ...pilotMedia,
        // Preserve any custom svgType fallback if specified
        svgType: exercise.svgType || (exercise.media && exercise.media.svgType) || pilotMedia.demonstration.movementPattern
      },
      coach: KINETIX_COACH,
      demonstration: pilotMedia.demonstration
    };
  }

  // Non-pilot exercise: preserve existing media or fallback
  if (!exercise.media) {
    return {
      ...exercise,
      media: { type: 'placeholder', source: null }
    };
  }

  return exercise;
}

/**
 * Audits the 8 Pilot Exercises against real asset availability, metadata validity,
 * and decision gate criteria.
 *
 * @param {Function} [fileExistsFn] - Optional filesystem existence checker
 * @returns {Object} Full audit report with classification per exercise
 */
export function auditPilotAssets(fileExistsFn = null) {
  const audit = {
    totalExercises: PILOT_EXERCISE_IDS.length,
    coachId: KINETIX_COACH.coachId,
    decisionGateSummary: {
      READY: 0,
      NEEDS_ASSET: 0,
      NEEDS_VISUAL_FIX: 0,
      NEEDS_CODE_FIX: 0
    },
    exercises: {}
  };

  PILOT_EXERCISE_IDS.forEach(id => {
    const media = PILOT_COACH_MEDIA[id];
    const validation = validateCoachMedia(media);

    let hasVideoFile = false;
    let hasPosterFile = false;
    let hasThumbnailFile = false;

    if (typeof fileExistsFn === 'function') {
      try {
        hasVideoFile = Boolean(fileExistsFn(media.source));
        hasPosterFile = Boolean(fileExistsFn(media.poster));
        hasThumbnailFile = Boolean(fileExistsFn(media.thumbnail));
      } catch (e) {
        hasVideoFile = false;
        hasPosterFile = false;
        hasThumbnailFile = false;
      }
    }

    let decisionGate = 'READY';
    if (!validation.valid) {
      decisionGate = 'NEEDS_CODE_FIX';
    } else if (!hasVideoFile || !hasPosterFile) {
      decisionGate = 'NEEDS_ASSET';
    }

    audit.decisionGateSummary[decisionGate] = (audit.decisionGateSummary[decisionGate] || 0) + 1;

    audit.exercises[id] = {
      id,
      assetId: media.provenance ? media.provenance.assetId : null,
      pattern: media.demonstration.movementPattern,
      source: media.source,
      poster: media.poster,
      thumbnail: media.thumbnail,
      hasVideoFile,
      hasPosterFile,
      hasThumbnailFile,
      validation,
      decisionGate
    };
  });

  audit.overallStatus = audit.decisionGateSummary.NEEDS_ASSET > 0
    ? 'ARCHITECTURE READY — VISUAL ASSETS NOT YET FINALIZED'
    : (audit.decisionGateSummary.NEEDS_CODE_FIX > 0 ? 'NEEDS_CODE_FIX' : 'PILOT_READY_FOR_ROLLOUT');

  return audit;
}

