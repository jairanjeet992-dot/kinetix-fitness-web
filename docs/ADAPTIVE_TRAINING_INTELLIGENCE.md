# Phase 6: Adaptive Training Intelligence
Kinetix Fitness Web Architecture & Specification

## 1. Overview & Primary Objective

Phase 6 introduces the first real, deterministic **Adaptive Training Intelligence layer** for Kinetix. The system closes the loop between logged performance and future workout generation without relying on external cloud APIs or black-box generative models:

```
PROFILE
  ↓
WORKOUT
  ↓
WORKOUT SESSION (Player)
  ↓
PERFORMANCE DATA (Set logs: weight, reps, duration, completedAt)
  ↓
TRAINING INTELLIGENCE (Recovery, Muscle Overlap, Progressive Overload, Rotation)
  ↓
ADAPTATION RECOMMENDATION
  ↓
NEXT WORKOUT (Calibrated parameters & exercises)
  ↓
NEW PERFORMANCE DATA
```

The system is 100% deterministic, explainable, and local-first.

---

## 2. Architecture & Separation of Concerns

The adaptive system maintains strict architectural separation:

- **Performance Data** (`js/analytics/performance-tracker.js`): Canonical localStorage persistence of validated set records.
- **Recovery Engine** (`js/analytics/recovery-engine.js`): Pure, non-medical heuristics evaluating training density, consecutive training days, trailing 7-day load, and muscle overlap within a 48-hour window.
- **Progression Engine** (`js/analytics/progression-engine.js`): Conservative progressive overload recommendations, deload calculations, and exercise staleness/rotation detection.
- **Training Intelligence Orchestrator** (`js/analytics/training-intelligence.js`): Synthesizes recovery and progression signals into unified, evidence-based recommendations with explicit confidence tiers.
- **Adaptive Workout Generator** (`js/engine/adaptive-workout-generator.js`): Safe overlay on top of `generateWorkout()`. Generates a baseline routine first, applies safe calibrations, verifies constraints, and falls back to baseline on any validation failure.
- **UI Presentation** (`js/views/home.js`, `js/views/workout-detail.js`): Displays clear "ADAPTED" badges, structured insight cards detailing exact deterministic reasons, and inline target weights/reps.

---

## 3. Recovery Engine Specification

### System States (Non-Medical Heuristics)
The recovery engine classifies user recovery into one of five system states:

1. `READY`: Optimal recovery window (>= 2 days rest, balanced recent load). Prime condition for overload.
2. `NORMAL`: Regular daily cadence (1 day rest, moderate load). Proceed with baseline routine.
3. `REDUCE_VOLUME`: High localized fatigue (muscle overlap within 48h) or high trailing 7-day training load (>= 200 pts). Calibrates volume by reducing rounds or trimming accessories.
4. `RECOVERY_RECOMMENDED`: High density (>= 3 consecutive days) or < 12 hours since last session. Strongly recommends active rest or significant volume deload.
5. `INSUFFICIENT_DATA`: History has 0 valid completed sessions. Maintains baseline parameters.

### Muscle Overlap Analysis
Tracks canonical muscle groups (`chest`, `back`, `shoulders`, `quads`, `hamstrings`, `glutes`, `biceps`, `triceps`, `core`, `calves`, `forearms`) across a trailing 48-hour window. Detects overlapping exposure between recently completed sessions and proposed upcoming routines, preventing localized muscle overtraining.

---

## 4. Progression Engine & Progressive Overload

### Conservative Overload Rules
- **Multi-Session Verification**: Requires at least 2 consistent, successfully completed sessions hitting target reps before recommending any weight or rep increase. A single successful session is never enough to trigger an increase.
- **Gradual Increments**:
  - **Dumbbells**: +2.0 kg per increment (~4.4 lbs).
  - **Barbell**: +2.5 kg per increment (standard 2x 1.25kg plate pair).
  - **Bodyweight**: +2 reps per increment (clamped to max 30 reps).
  - **Timed Exercises**: +10 seconds duration (clamped to max 120s).
- **Safe Deload (~10%)**: When target reps are severely missed across consecutive sessions (< 50% hit rate), recommends a conservative ~10% weight reduction (rounded to 0.5kg) to restore movement quality.
- **Stable Performance**: Recommends `MAINTAIN` when performance is on track, solidifying technique before further loading.

---

## 5. Exercise Rotation & Staleness Prevention

- **Staleness Detection**: Detects when an exercise has been performed in 3 or more consecutive workouts.
- **Biomechanical Substitution**: Replaces the stale exercise with an equipment-compatible alternative sharing the same primary muscle focus and movement pattern (e.g. horizontal push, vertical pull, squat, hinge).
- **Safety**: If no alternative matches user equipment or routine constraints, rotation safely preserves the original exercise.

---

## 6. Adaptation Safety & Fallback Guarantees

Every adaptation is protected by runtime validation guards:
1. Baseline workout is generated first and preserved independently.
2. All adapted exercises must exist in `EXERCISES` and match user equipment.
3. Routine must contain at least 1 exercise and maintain at least 2 rounds.
4. Recalculates duration and preserves total time within requested tolerances.
5. **Fallback Invariant**: If any error or constraint violation occurs during adaptation, the system catches the failure and safely returns the valid, original baseline workout.

---

## 7. Evidence-Based Confidence Tiers

Confidence levels are backed strictly by verifiable data points:
- `INSUFFICIENT_DATA`: 0 valid history records and 0 performance logs.
- `LOW`: 2–3 workouts, or < 6 logged sets.
- `MODERATE`: 4–7 workouts with regular performance logs.
- `HIGH`: 8+ completed workouts with 15+ logged sets across multiple exercises.

---

## 8. Performance Data Integrity (Phase 5.1 Standards Maintained)

- Zero data fabrication: Missing weights remain `null`. Bodyweight exercises never invent artificial weights.
- Zero timestamp fabrication: Missing `completedAt` timestamps are rejected; `new Date().toISOString()` is never used as a historical fallback.
- Idempotency & deduplication: Duplicate batch logs sharing `(sessionId, exerciseId, setNumber)` are prevented from corrupting progression or PR tracking.

---

## 9. Known Limitations

- **Local-Only Storage**: All history and performance records reside in browser `localStorage`. Cache clearing will reset training intelligence to baseline.
- **Equipment Specificity**: Dumbbell increments assume standard pairs; specialized micro-plates or variable resistance bands use normalized default step sizes.
- **Non-Medical**: Readiness scores and recovery states are algorithmic heuristics for volume modulation and do not measure physiological recovery (HRV, sleep, soreness).
