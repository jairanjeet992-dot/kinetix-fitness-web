# Kinetix Exercise Experience & Workout Player 2.0 Architecture
**Phase 8: Technical Specification, Media Architecture & Session State Machine**

---

## 1. System Overview & State Flow

Phase 8 elevates the Kinetix workout execution layer from a linear preview mockup into an interactive, mobile-first, deterministic workout engine. It establishes an end-to-end continuous loop preserving data integrity from onboarding profile to long-term analytics:

```
PROFILE (`js/state/profile.js`)
  ↓
TRAINING PLAN (`js/data/plans.js` & `kinetix_weekly_plan`)
  ↓
PLANNED SESSION (`plannedSessionId`, `planId`, `planVersion`)
  ↓
ADAPTIVE WORKOUT (`js/engine/workout-generator.js`)
  ↓
WORKOUT PLAYER (`js/views/workout-player.js`)
  ↓
WORKOUT SESSION (`js/engine/workout-session.js`)
  ↓
PERFORMANCE LOG (per-set logged reps & weights)
  ↓
HISTORY (`js/state/workout-history.js`)
  ↓
PROGRESS & ANALYTICS (`js/views/progress.js` & `kinetix_progress_data`)
```

---

## 2. Exercise Metadata Schema

Every exercise in `/js/data/exercises.js` adheres to an enriched, backward-compatible schema:

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
  exerciseType: "strength", // "strength" | "timed"
  unilateral: false,
  defaultSets: 3,
  defaultReps: 12,
  defaultDurationSec: 40,
  defaultRestSeconds: 60,
  estimatedCaloriesPerMinute: 7.5,
  instructions: [
    "Set palms slightly wider than shoulder-width, fingers spread firmly into the ground.",
    "Maintain a rigid plank line from heels through glutes to the crown of your head.",
    "Lower chest smoothly until 2 inches above floor with elbows tucked at roughly 45 degrees.",
    "Press through the entire palm explosively back to full lockout."
  ],
  formCues: [
    "Keep core braced and spine neutral",
    "Elbows angled 45 degrees from torso",
    "Full lockout at the top of each rep"
  ],
  safetyNotes: "Avoid flaring elbows 90 degrees wide to protect anterior shoulders.",
  media: {
    type: "vector", // "vector" | "image" | "video"
    source: null,   // URL string if remote media is available
    svgType: "upper-push"
  }
}
```

### Backward Compatibility Guarantees:
- If `formCues` is omitted on legacy records, `exercises.js` automatically synthesizes concise cues from the first clause of each instruction step.
- If `safetyNotes` is omitted, safe general joint stability notes are assigned based on difficulty level.
- If `media` is null or invalid, the player and detail views fall back to the deterministic vector stage.

---

## 3. Exercise Media Architecture

Located in `/js/components/exercise-media.js`, the media engine renders movement demonstrations without external dependencies or heavy video downloads.

### 3.1 Media Types & Hierarchy
1. **Deterministic Vector Movement Visualizer (Default)**:
   - High-contrast, SVG illustrations tailored to the 12 canonical movement patterns (`horizontal-push`, `horizontal-pull`, `vertical-push`, `vertical-pull`, `squat`, `hinge`, `lunge`, `isometric`, `rotational`, `carry`, `cardio`, `mobility`).
   - Includes starting dashed silhouette, active biomechanical line, depth/trajectory guide, and dynamic pulse highlighting primary muscle nodes.
2. **Optional Image / Animated Illustration**:
   - Lazy-loaded via native HTML `loading="lazy"`.
   - Equipped with an inline `onerror` fallback that silently restores the vector SVG without breaking execution.
3. **Optional Video Loop**:
   - Optimized `<video>` tag with `playsinline loop muted autoplay`.
   - Equipped with an inline `onerror` fallback that restores vector visualization if network fails or codec is unsupported.

### 3.2 Failure Safety & Reduced Motion
- **No Blocker Rule**: Missing or failing media NEVER blocks the timer, progression, sets, reps, logging, or workout completion.
- **Prefers Reduced Motion**: When `prefers-reduced-motion: reduce` is active, CSS keyframe animations (`bioMuscleGlow` and `bioMotionDrift`) are disabled, providing a clean static diagram.

---

## 4. Workout Session State Machine (`WorkoutSession`)

Located in `/js/engine/workout-session.js`, the `WorkoutSession` class encapsulates the complete lifecycle of a workout execution.

### 4.1 State Definitions
- `'ready'`: Session initialized, steps compiled, awaiting athlete start.
- `'active'`: Active work interval (timed countdown or rep goal).
- `'paused'`: Interval paused; active timer halted and accumulated ms preserved.
- `'resting'`: Dedicated rest interval between sets or between exercises.
- `'completed'`: All work sets concluded, summary compiled, saved to history.
- `'abandoned'`: Session exited early; partial completion logged if sets were performed.

### 4.2 Multi-Set & Round Progression Blueprinting
The session automatically expands the workout into a linear array of work and rest steps:
- Warmup exercises (1 set each + 15s transition rest).
- Main exercises across configured rounds (e.g. 3 rounds of circuit intervals or straight sets).
- Rest intervals inserted after each work step (except the final step of the session).
- Cooldown exercises (1 set each).

### 4.3 Wall-Clock Timer Accuracy
To eliminate timer drift caused by mobile backgrounding, screen sleep, or throttled `setInterval`:
- Active steps record `stepStartedTimestamp = Date.now()`.
- Pausing accumulates elapsed time: `stepElapsedMs += Date.now() - stepStartedTimestamp`.
- Remaining time is calculated dynamically:
  $$\text{Remaining Sec} = \max\left(0, \left\lceil \frac{\text{Target Duration Ms} - \text{Elapsed Ms}}{1000} \right\rceil\right)$$
- When the screen wakes up or the tab is refocused, the timer immediately reconciles to the true elapsed wall-clock time.

### 4.4 Reload Recovery & Persistence
- Every state change automatically synchronizes to `localStorage.getItem('kinetix_active_session')`.
- On browser refresh or page reload, `WorkoutSession.recoverActiveSession()` re-instantiates the active session at the exact step, preserving completed logs and accumulated time.
- Storage is cleared cleanly upon completion or abandonment.

### 4.5 Duplicate Completion Protection
- Guard flag `_isCompletedOnce` prevents multiple `finishSession()` calls from duplicating history entries, double-counting minutes, or inflating streak metrics.

---

## 5. Performance Logging & Analytics Integration

Located in `/js/state/workout-history.js`:
- Each work set captures:
  - `loggedReps`: Actual reps completed (interactive touch steppers `[-] [+]`).
  - `loggedWeight`: Resistance used in user's unit preference (`kg` or `lb`).
  - `loggedDurationSec`: Actual duration spent on the set.
- Concluding a session:
  1. Inserts record into `kinetix_workout_history`.
  2. Updates `kinetix_progress_data` overview (total sessions, total minutes, estimated calories).
  3. Updates today's volume bar in Weekly Training Volume.
  4. Detects potential new Personal Records (PRs).
  5. Reconciles with `kinetix_weekly_plan`: marks scheduled day as completed with finish time and calories.

---

## 6. Integration Boundaries & Preserved Identifiers

The system guarantees that the following identifiers remain intact through the entire session lifecycle:
- `plannedSessionId`: Links completion back to the scheduled weekly plan day (e.g. `'Mon'`, `'Wed'`).
- `planId`: Training plan identifier (e.g. `'athletic-recomposition-w3'`).
- `planVersion`: Plan schema version string.
- `workoutId`: Unique workout routine ID (e.g. `'metabolic-ignition'`, `'gen-bui-26m-v0'`).
- `sessionId`: Unique runtime session UUID (`sess_<timestamp>_<random>`).
