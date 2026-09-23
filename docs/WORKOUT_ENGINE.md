# Kinetix Workout Intelligence Engine & Exercise Database Architecture
**Phase 2: Technical Specification & Biomechanical Rules**

---

## 1. System Overview & Layered Architecture

The Kinetix Workout Intelligence Engine delivers personalized, deterministic, and explainable workout routines strictly using client-side JavaScript. It enforces a strict one-way architectural hierarchy:

```
DATA (Taxonomies & Exercises)
  ↓
VALIDATION (Integrity & Schema Enforcement)
  ↓
WORKOUT ENGINE (Rule-Based Candidate Selection & Periodization)
  ↓
STATE (Profile & Routine Cache)
  ↓
UI (Home, Discovery, Detail & Player Views)
```

No external fitness APIs, third-party libraries, or non-deterministic AI models are employed. Every generated routine can be audited and explained from explicit biomechanical constraints.

---

## 2. Canonical Taxonomies

To prevent duplicated terms (e.g. `chest` vs `pectorals`), all entities reference singular canonical identifiers defined in `/js/data/taxonomy.js`.

### 2.1 Muscle Taxonomy
| Canonical ID | Display Name | Associated Movement Patterns |
| :--- | :--- | :--- |
| `chest` | Chest | Horizontal Push |
| `back` | Back | Horizontal Pull, Vertical Pull |
| `shoulders` | Shoulders | Vertical Push, Lateral Abduction |
| `biceps` | Biceps | Elbow Flexion |
| `triceps` | Triceps | Elbow Extension, Overhead Extension |
| `forearms` | Forearms | Grip, Wrist Stabilization |
| `quadriceps` | Quadriceps | Squat, Lunge, Knee Extension |
| `hamstrings` | Hamstrings | Hip Hinge, Knee Flexion |
| `glutes` | Glutes | Hip Extension, Hip Thrust, Hinge |
| `calves` | Calves | Plantar Flexion |
| `core` | Core | Anti-Extension, Anti-Rotation, Bracing |

### 2.2 Category Taxonomy
- `strength`: Mechanical tension and progressive overload routines.
- `hiit`: High-density intervals with short rest periods.
- `cardio`: Aerobic capacity and continuous cyclic movements.
- `core`: Direct transverse, oblique, and rectus abdominis stabilization.
- `mobility`: Joint lubrication and active range-of-motion drills.
- `recovery`: Low-intensity fascial release and nervous system downregulation.
- `warmup`: Dynamic pre-workout neurological preparation.
- `cooldown`: Static post-workout decompression.

### 2.3 Equipment Taxonomy
Canonical equipment IDs supported across the library:
- `bodyweight`: Calisthenics requiring no auxiliary equipment.
- `dumbbell`: Pairs or single free weights.
- `barbell`: Olympic or standard barbell movements.
- `kettlebell`: Ballistic hinge and complex apparatus.
- `resistance-band`: Continuous tension elastic bands.
- `pull-up-bar`: Overhead suspension bars.
- `bench`: Flat or adjustable weight bench.
- `cable`: High/low pulley cable stations.
- `machine`: Guided resistance machines.
- `medicine-ball`: Dynamic throwing/slamming apparatus.
- `none`: Pure zero-equipment floor movements.

---

## 3. Exercise Data Model

Every exercise in `/js/data/exercises.js` complies with the following structured schema:

```javascript
{
  id: "push-up",
  name: "Push-Up",
  category: "strength",
  movementPattern: "horizontal-push",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps", "shoulders", "core"],
  equipment: ["bodyweight", "none"],
  difficulty: "beginner",
  exerciseType: "strength",
  unilateral: false,
  defaultSets: 3,
  defaultReps: 12,
  defaultDurationSec: 40,
  defaultRestSeconds: 60,
  estimatedCaloriesPerMinute: 7.5,
  instructions: [
    "Set palms slightly wider than shoulder-width...",
    "Maintain a rigid plank line from heels to crown...",
    "Lower chest until 2 inches above ground...",
    "Press explosively back to full lockout."
  ],
  media: {
    type: "placeholder",
    source: null,
    svgType: "upper-push"
  }
}
```

---

## 4. Validation Layer

The `/js/data/exercise-validator.js` utility verifies:
1. **Uniqueness**: Asserts that every exercise `id` and `name` is globally unique.
2. **Taxonomy Integrity**: Validates that all categories, muscle references, equipment IDs, difficulties, and movement patterns map to canonical definitions.
3. **Execution Metadata**: Verifies positive integers for `defaultDurationSec`, `defaultSets`, and non-empty instruction lists.
4. **Graceful Fail-Safe**: Returns `{ valid: boolean, errors: string[], warnings: string[] }` before data is consumed by the engine.

---

## 5. Workout Generation Engine

Implemented in `/js/engine/workout-generator.js`, the generator receives a normalized user profile and outputs a tailored workout.

### 5.1 Inputs
- `goal`: `"build-muscle" | "lose-fat" | "get-stronger" | "improve-endurance" | "improve-fitness" | "stay-active"`
- `fitnessLevel`: `"beginner" | "intermediate" | "advanced"`
- `targetMuscles`: array of canonical muscle IDs (or `["Full Body"]`)
- `equipment`: array of available user equipment
- `workoutDuration`: requested duration in minutes (e.g. 10, 15, 20, 25, 30, 45, 60)
- `variationSeed`: integer counter incremented upon user "Regenerate" / "Try Another" actions.

### 5.2 Strict Equipment Rules
An exercise is eligible **only** if:
1. It requires `bodyweight` or `none`, OR
2. At least one of its required equipment IDs is in the user's equipped inventory.
**Zero unselected equipment** can ever be prescribed. If fewer than 3 exercises match, the engine returns a safe diagnostic fallback prompt.

### 5.3 Movement Pattern Diversity & Duplicate Prevention
- **Zero Duplicate Exercises**: No exercise can appear more than once in the same session.
- **Pattern Diversity Limit**: Prevents overusing a single movement pattern. For sessions under 25 minutes, at most 1 exercise per pattern is allowed; for longer sessions, a maximum of 2 exercises per pattern is permitted.

### 5.4 Sequence Blueprinting
Every complete routine is organized into three distinct stages:
1. **Warmup**: 1–2 dynamic mobility movements targeting the session's muscle groups.
2. **Main Progression**:
   - Primary Compound Movement
   - Secondary Movement (antagonistic or complementary)
   - Accessory / Unilateral Movement
   - Core / Finisher
3. **Cooldown**: 1 restorative decompression stretch.

---

## 6. Mathematical Formulas

### 6.1 Accurate Duration Calculation
Duration is not hardcoded; it is computed from volume, interval tempo, rest times, and transitions:

$$\text{Warmup Time} = \sum (\text{sets} \times (\text{duration} + 15\text{s})) + \text{transitions}$$

$$\text{Main Time} = \sum (\text{sets} \times \text{exercise\_duration}) + \sum ((\text{sets} - 1) \times \text{rest\_seconds}) + \text{transitions}$$

$$\text{Cooldown Time} = \sum (\text{duration}) + \text{transitions}$$

$$\text{Total Minutes} = \text{round}\left(\frac{\text{Warmup Time} + \text{Main Time} + \text{Cooldown Time}}{60}\right)$$

### 6.2 Transparent Calorie Estimation
$$\text{Estimated Calories} = \text{round}\left(\text{Duration}_{\text{min}} \times \overline{\text{Cal/Min}} \times \text{Intensity Factor}\right)$$
- Advanced level: $\times 1.15$
- High-intensity goals (Lose Fat, Get Stronger): $\times 1.10$

---

## 7. Future Extension Points
1. **Dynamic Progression**: Tracking user RPE (Rate of Perceived Exertion) to automatically increment reps or recommend higher-difficulty progressions.
2. **History-Based Fatigue Masking**: Excluding muscles trained in the preceding 48 hours to enable Push/Pull/Legs periodization.
3. **Animated Media Asset Swapping**: Replacing SVG placeholders with webm/mp4 loop files without modifying engine or view logic.
