# Progress & Training Intelligence Architecture

## Overview

The Kinetix Progress & Training Intelligence layer (Phase 4) provides deterministic, local-first analytics derived from completed workout sessions. It adheres to strict principles:

- **Local-First & Offline-Ready**: Backed entirely by `localStorage` without external API or cloud database dependencies.
- **Deterministic & Pure**: All derived metrics (streaks, training load, muscle engagement, goal distribution) are calculated in pure functions. Given the same workout history, the output is guaranteed to be identical.
- **Zero Fake Data**: When workout history is empty, the UI displays honest empty states and unstarted placeholders rather than fabricating arbitrary statistics.
- **High Performance**: Single-pass $O(N)$ linear aggregation designed to scale efficiently across 5,000+ historical session records.

---

## 1. History Record Schema

Completed workout sessions are validated and saved to `localStorage` under `kinetix_workout_history`. The schema maintains complete backward compatibility with Phase 3.1 records while providing enriched training intelligence fields:

```typescript
interface WorkoutHistoryRecord {
  // Session Identification
  sessionId: string;                 // Unique UUID/timestamp identifier
  workoutId: string;                 // Target routine ID (static or generated)
  title: string;                     // Display name
  workoutTitle: string;              // Alias for display name

  // Timestamps (ISO 8601 strings)
  startedAt: string;                 // Session initialization timestamp
  completedAt: string;               // Session completion timestamp

  // Duration
  durationSeconds: number;           // Exact elapsed wall-clock seconds
  duration: number;                  // Duration in seconds
  actualDuration: number;            // Duration in seconds
  actualDurationMinutes: number;     // Elapsed minutes (rounded to 1 decimal place)
  requestedDuration: number | null;  // User requested duration in minutes (if applicable)

  // Exercise & Set Volume
  exercisesCompleted: number;        // Count of completed exercises
  completedExerciseIds: string[];    // Array of completed canonical exercise IDs
  skippedExercises: number;          // Count of skipped exercises
  skippedExerciseIds: string[];      // Array of skipped canonical exercise IDs
  totalSets: number;                 // Total scheduled routine sets
  setsCompleted: number;             // Sets physically finished
  completedSets: number;             // Sets physically finished (alias)
  completionPercentage: number;      // 0 - 100 integer percentage

  // Workout Metadata
  workoutGoal: string;               // Canonical goal ('build-muscle', 'lose-fat', etc.)
  workoutDifficulty: string;         // 'beginner' | 'intermediate' | 'advanced'
  estimatedCalories: number;         // Caloric burn estimate based on duration and intensity
  trainingLoad: number;              // Deterministic session stimulus score
}
```

---

## 2. Streak Engine & Date Normalization

### Date Normalization Strategy
All calendar comparisons use the local calendar date string formatted as `YYYY-MM-DD`. This strategy guarantees stability across daylight savings and timezone boundaries without silent date drift.

### Streak Rules
1. **Training Day Definition**: A calendar day counts as a training day when at least one valid workout is completed on that local calendar day.
2. **Same-Day Multiple Workouts**: Completing multiple workouts on the same day counts as exactly one training day.
3. **Current Active Streak**:
   - Training today (`todayStr`) maintains the streak.
   - Training yesterday (`yesterdayStr`) maintains the streak as still active (the user has until the end of today to train).
   - If neither today nor yesterday has a recorded workout, the current streak resets to `0`.
   - The engine steps backward day-by-day from the anchor date until a missing calendar day is encountered.
4. **Longest Streak**:
   - Represents the all-time maximum consecutive calendar days trained in the user's recorded history.
   - Invariant: `longestStreak >= currentStreak`.
5. **Future Timestamps & Malformed Data**:
   - Any record with a timestamp beyond the reference date is safely excluded.
   - Corrupt or unparseable timestamps are discarded without breaking the calculation.

---

## 3. Training Load Model

The training load model provides an intuitive, deterministic indicator of workout volume and intensity:

### Formula
$$\text{trainingLoad} = \text{round}\left((\text{completedSets} \times 5 \times \text{difficultyFactor}) + (\text{durationMinutes} \times 0.5)\right)$$

### Parameters & Constants
- **Volume Factor**: `5` points per completed set.
- **Duration Factor**: `0.5` points per elapsed training minute.
- **Difficulty Multipliers**:
  - `beginner`: `1.0`
  - `intermediate`: `1.25`
  - `advanced`: `1.5`
  - `fallback`: `1.0`

### Load Tiers
- **Light** ($0 - 50$ pts): Active recovery or introductory session.
- **Moderate** ($51 - 120$ pts): Balanced training volume.
- **Challenging** ($121 - 200$ pts): Progressive overload session.
- **Intense** ($> 200$ pts): Peak stimulus session.

---

## 4. Muscle Group Analytics & Aggregation Rules

### Canonical Taxonomy
All muscle analytics reference the 11 verified canonical muscle groups defined in `js/data/taxonomy.js`:
- `chest`
- `back`
- `shoulders`
- `biceps`
- `triceps`
- `forearms`
- `quadriceps`
- `hamstrings`
- `glutes`
- `calves`
- `core`

### Aggregation Rules
1. **Primary vs. Secondary Stimulus**:
   - When an exercise is completed, its `primaryMuscles` receive direct volume attribution ($1.0 \times \text{sets}$).
   - Secondary muscles receive partial volume attribution ($0.5 \times \text{sets}$).
2. **Preventing Double-Counting**:
   - Each completed exercise is tracked in a `Set` per muscle group to prevent duplicate counting of the same exercise within a session.
   - Session-level total exercise count tracks distinct exercise IDs independently of muscle group buckets.
3. **Engagement Percentage**:
   $$\text{percentage} = \text{round}\left(\frac{\text{muscleTotalSets}}{\text{totalStimulusSetsAcrossAllMuscles}} \times 100\right)$$

---

## 5. Personal Record (PR) Foundation

Kinetix adheres strictly to honest fitness tracking:

1. **No Fabricated Lifts**: Because the current workout player records sets, repetitions, and elapsed time without manual load/weight entry, the system does not fabricate hypothetical bench press or squat numbers.
2. **Verifiable Session Milestones**: Real performance records are extracted from verified completed sessions:
   - Longest single workout duration (minutes)
   - Maximum sets volume completed in a single session
   - Peak training load achieved
   - Maximum consecutive day streak
3. **PR Data Model Interface**: `js/analytics/pr-model.js` exports `createPRRecord()` and `calculateEstimated1RM()` using the Epley formula:
   $$\text{1RM} = \text{weight} \times \left(1 + \frac{\text{reps}}{30}\right)$$
   This foundation is ready for seamless activation when user weight logging is introduced in Phase 5.

---

## 6. Data Validation & Schema Tolerance (Phase 4.1 Hardened)

The `sanitizeHistoryRecord()` function guarantees corrupt data resilience without fabricating missing information:
- **Missing / Invalid Timestamps**: Records without a valid `completedAt` timestamp are rejected safely (`null`). Current time is **never** used as a replacement for missing timestamps.
- **Missing Calories**: Calories are preserved as `null` if unrecorded. They are **never** fabricated or synthesized.
- **Missing Goal or Difficulty**: Preserved as `null`. Neutral multiplier `1.0` is used deterministically for training load when difficulty is missing or unknown.
- **Muscle Volume Attribution**: Clearly marked with `isEstimated: true`. Zero sets are attributed when completed exercise arrays are missing (prevents fake volume).
- **Corrupt Storage**: Unparseable JSON in `localStorage` logs a warning and returns an empty array `[]` rather than crashing the view.
- **Invalid Numbers**: Negative durations, negative sets, or `NaN` values are clamped to safe defaults.
- **Fatal Rejection**: Records lacking a non-empty `sessionId` string or valid `completedAt` timestamp are rejected.

---

## 7. Migration & Backward Compatibility Strategy

- **Phase 3.1 Records**: Stored records with legacy field names (`durationSeconds`, `setsCompleted`, `exercisesCompleted`, `skippedExercises`) are read and enriched on retrieval with `null` for unrecorded fields.
- **Idempotence**: No destructive database migration or key renaming is required.
- **Removal of Mock Data**: The legacy mock file `js/data/progress.js` is deprecated and contains an empty frozen object to prevent any production UI from displaying fabricated metrics.
- **Storage Keys**: `kinetix_workout_history` remains the stable storage key.

---

## 8. Limitations

1. **Local-Device Scope**: Workout history is scoped to the user's browser `localStorage`. Clearing browser data will reset history unless exported.
2. **No Weight Entry (Yet)**: 1RM calculations await user weight inputs in Phase 5.
