/**
 * PHASE 9.3 — SCALABLE EXERCISE VISUAL SYSTEM
 */
import { renderExerciseVisualThumbnail } from '../js/components/exercise-visual.js';
import { getBiomechanicalIllustration, sanitizeMediaUrl } from '../js/components/exercise-media.js';
import { EXERCISES } from '../js/data/exercises.js';

let total=0, passed=0, failed=0;
function assert(condition,message){total++; if(condition){passed++;}else{failed++; console.error('FAIL:',message);}}
console.log('PHASE 9.3 — SCALABLE EXERCISE VISUAL SYSTEM');
assert(EXERCISES.length >= 40,'Exercise catalog remains populated');
assert(EXERCISES.every(ex=>typeof ex.id==='string'&&ex.id&&typeof ex.name==='string'&&ex.name),'Every exercise has id and name');
const rendered=EXERCISES.map(ex=>renderExerciseVisualThumbnail(ex));
assert(rendered.every(html=>html.includes('exercise-visual-thumbnail')),'Every exercise receives visual shell');
assert(rendered.every(html=>html.includes('exercise-bio-svg')),'Every exercise receives deterministic movement layer');
assert(rendered.every(html=>html.includes('3D COACH')),'Every exercise receives consistent 3D Coach marker');
assert(rendered.every(html=>html.includes('aria-label=')),'Every visual is accessible');

const squatSvg = getBiomechanicalIllustration('squat', ['quadriceps']);
const canonicalVisualCases = [
  ['horizontal-push', ['chest']],
  ['horizontal-pull', ['back']],
  ['vertical-push', ['shoulders']],
  ['vertical-pull', ['back']],
  ['squat', ['quadriceps']],
  ['hinge', ['hamstrings']],
  ['lunge', ['quadriceps']],
  ['rotational', ['core']],
  ['isometric', ['biceps']],
  ['isometric', ['core']],
  ['carry', ['forearms']],
  ['cardio', ['calves']],
  ['mobility', ['shoulders']]
];
canonicalVisualCases.forEach(([pattern, muscles]) => {
  const svg = getBiomechanicalIllustration(pattern, muscles);
  assert(svg.includes('exercise-bio-svg'), `Canonical pattern ${pattern} returns a valid SVG`);
  if (pattern !== 'squat') {
    assert(svg !== squatSvg, `Canonical pattern ${pattern} does not silently fall back to squat`);
  }
});


assert(Boolean(sanitizeMediaUrl('data:image/png;base64,AAAA')), 'Raster data image URLs remain supported');
assert(sanitizeMediaUrl('data:image/svg+xml;base64,PHN2Zy8+') === null, 'SVG data URLs are rejected');
assert(sanitizeMediaUrl('javascript:alert(1)') === null, 'JavaScript media URLs are rejected');

const special=renderExerciseVisualThumbnail({id:'xss',name:'<script>alert(1)</script>',movementPattern:'squat',primaryMuscles:['quadriceps']});
assert(!special.includes('<script>alert(1)</script>'),'Exercise name is escaped');
assert(special.includes('&lt;script&gt;'),'Escaped exercise name remains representable');
console.log(`PHASE 9.3 SUMMARY: TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
if(failed) process.exit(1);
