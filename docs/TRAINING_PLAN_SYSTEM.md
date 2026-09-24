# Long-Term Workout Planning & Training System

**Kinetix Fitness Web — Phase 7 Architecture & Implementation**

---

## 1. Architectural Overview & System Role

The Kinetix Long-Term Workout Planning System introduces structured, goal-aware microcycle and mesocycle training planning. It operates strictly as an architectural layer **above** the existing Adaptive Workout Generator and Guided Workout Player:

```
                  USER PROFILE & ONBOARDING
                             ↓
                       TRAINING PLAN
                             ↓
                      WEEKLY SCHEDULE
                             ↓
                      PLANNED SESSION (Intent: Muscles, Focus, Duration)
                             ↓
                 ADAPTIVE WORKOUT GENERATOR (Exercises, Weights, Reps, Rotation)
                             ↓
                      WORKOUT PLAYER (Guided Execution & Logging)
                             ↓
                    ACTUAL PERFORMANCE RECORD
                             ↓
              TRAINING INTELLIGENCE & RECONCILIATION
                             ↓
                   PLAN ADAPTATION & NEXT SESSION
```

### Architectural Invariant: Separation of Concerns
1. **The Training Plan controls STRUCTURE**:
   - Training frequency (1 to 7 days/week).
   - Microcycle layout and rest/recovery day distribution.
   - Target muscle groups and emphasis balance.
   - Calendar date assignment and missed/rescheduled session lifecycle.
2. **The Adaptive Engine controls SESSION CALIBRATION**:
   - Exercise selection and rotation.
   - Weight, rep, and set progression based on fatigue and performance history.
   - Within-session deloads, volume adjustments, and equipment bounds.
3. **The Workout Player controls REAL-TIME GUIDANCE & LOGGING**:
   - Step-by-step set execution, rest intervals, and wall-clock state recovery.
   - Authentic performance recording (`completedAt`, reps, weight).

The planner **never** generates exercises directly. It passes session intent to `generateAdaptiveWorkout()`, which calibrates and registers the executable workout.

---

## 2. Training Plan Data Models

### 2.1 TrainingPlan Model
The `TrainingPlan` model is fully deterministic and local-first:

```javascript
{
  planId: "plan-bui-4d-v1-s0",            // Deterministic identifier
  version: 1,                             // Plan version
  planVersion: 1,                         // Canonical version alias
  createdAt: "2026-06-08T00:00:00.000Z",  // Plan generation timestamp
  updatedAt: "2026-06-08T00:00:00.000Z",  // Status sync / update timestamp
  status: "ACTIVE",                       // "ACTIVE" | "ARCHIVED" | "COMPLETED"
  title: "4-Day Muscle Hypertrophy & Power",
  goal: "build-muscle",                   // Canonical goal ID
  fitnessLevel: "intermediate",           // Canonical difficulty
  trainingFrequency: 4,                   // 1 to 7 days per week
  workoutDuration: 35,                    // Session duration in minutes
  preferredWorkoutDuration: 35,
  equipment: ["bodyweight", "dumbbells"], // Normalized equipment
  focusAreas: ["chest", "back"],          // Resolved focus muscles
  totalWeeks: 4,                          // Length of mesocycle block
  currentWeek: 1,                         // Current active week
  startDate: "2026-06-08",                // UTC YYYY-MM-DD Monday of week 1
  endDate: "2026-07-05",                  // UTC YYYY-MM-DD Sunday of week 4
  profileSnapshot: { ... },               // Immutable reference profile
  recoveryContext: { ... },               // Recent fatigue context if available
  weeks: [ ... ]                          // Array of WeeklySchedule blocks
}
```

### 2.2 WeeklySchedule Model
```javascript
{
  weekNumber: 1,
  startDate: "2026-06-08",
  endDate: "2026-06-14",
  sessions: [ ... ]                       // 7 PlannedSession objects (Mon-Sun)
}
```

### 2.3 PlannedSession Model
```javascript
{
  plannedSessionId: "ps-plan-bui-4d-v1-s0-w1-d0",
  planId: "plan-bui-4d-v1-s0",
  planVersion: 1,
  weekNumber: 1,
  dayIndex: 0,                            // 0 = Mon, 1 = Tue, ..., 6 = Sun
  dayName: "Monday",
  dayShort: "Mon",
  scheduledDate: "2026-06-08",            // Calendar anchor (YYYY-MM-DD)
  sessionType: "TRAINING",                // "TRAINING" | "REST" | "RECOVERY" | "OPTIONAL"
  status: "READY",                        // Lifecycle status
  sessionName: "Upper Body Power & Focus",
  title: "Upper Body Power & Focus",
  focus: "Upper Body",
  targetFocus: "Upper Body",
  targetMuscles: ["chest", "back", "shoulders"],
  durationMinutes: 35,
  isOptional: false,
  workoutId: null,                        // Attached once generated
  completedSessionId: null,               // Attached once completed
  completedAt: null,                      // Reconciled timestamp
  originalScheduledDate: "2026-06-08",
  rescheduledToDate: null,
  skippedReason: null
}
```

---

## 3. Weekly Schedule & Frequency Rules (1–7 Days)

Kinetix deterministically builds weekly microcycles across all valid frequencies (1 to 7 days per week):

| Frequency | Training Structure | Rest / Recovery Days | Periodization Design |
|---|---|---|---|
| **1 Day / Week** | Wednesday: Full Body Foundational | 6 Rest Days (Mon, Tue, Thu, Fri, Sat, Sun) | High-yield compound stimulus ensuring full-body coverage in a single session. |
| **2 Days / Week** | Mon: Upper Body, Thu: Lower Body | 5 Rest Days (Tue, Wed, Fri, Sat, Sun) | 2–3 days recovery between sessions prevents localized fatigue accumulation. |
| **3 Days / Week** | Mon: Push, Wed: Pull, Fri: Lower Body | 4 Rest Days (Tue, Thu, Sat, Sun) | Classic push/pull/legs distribution with interleaved rest days. |
| **4 Days / Week** | Mon: Upper, Tue: Lower, Thu: Upper, Fri: Lower | 3 Rest Days (Wed, Sat, Sun) | Upper/lower split with midweek neural reset and weekend recovery. |
| **5 Days / Week** | Mon: Push, Tue: Pull, Wed: Legs, Fri: Upper, Sat: Lower | 2 Rest Days (Thu, Sun) | High-frequency bodybuilding/power split with strategic midweek pause. |
| **6 Days / Week** | Mon: Push, Tue: Pull, Wed: Legs, Thu: Push, Fri: Pull, Sat: Legs | 1 Rest Day (Sun) | Classic double PPL rotation. |
| **7 Days / Week** | Mon: Push, Tue: Pull, Wed: Active Mobility, Thu: Legs, Fri: Upper, Sat: Lower, Sun: Reset Mobility | 5 Training + 2 Active Recovery Days | **Systemic Recovery Protection**: 7 days never programs 7 heavy strength sessions. Days 2 and 6 are programmed as low-intensity mobility/reset sessions flagged `isOptional: true`. |

---

## 4. Planned vs. Actual & Zero-Fabrication Guarantees

In accordance with Kinetix Core Data Integrity rules:
1. **Planned is NOT Completed**: A planned session in the future or on today's schedule is **never** counted in workout volume, history, streaks, personal records, or training load.
2. **Rest Days Never Fake Workouts**: Scheduled rest days (`SESSION_TYPE.REST`) never generate phantom workout records or receive `SESSION_STATUS.COMPLETED`.
3. **No Timestamp Fabrication**: Missing `completedAt` timestamps strictly prevent reconciliation.
4. **Authentic Adherence Evaluation**: Adherence analytics evaluate only past and current scheduled training days. Future dates and optional recovery sessions never depress an athlete's adherence rate.

---

## 5. Planned Session Lifecycle & State Transitions

Sessions transition deterministically through defined statuses:

- `PLANNED`: Initial scheduled state for future dates.
- `READY`: Today's scheduled session awaiting athlete initiation.
- `COMPLETED`: Successfully reconciled with an authentic workout history record.
- `MISSED`: Past scheduled training session that was never completed or rescheduled.
- `SKIPPED`: Explicitly skipped by user action with recorded reason.
- `RESCHEDULED`: Moved to a new target date; preserves `originalScheduledDate` to guarantee auditability without duplicating session records.
- `CANCELLED`: Deactivated by plan adjustment.

### Status Synchronization (`syncPlanStatuses`)
When plans are retrieved against a reference calendar date:
- Past uncompleted training sessions (`scheduledDate < referenceDate`) are marked `MISSED`.
- Today's uncompleted training sessions (`scheduledDate === referenceDate`) transition from `PLANNED` to `READY`.
- Future sessions (`scheduledDate > referenceDate`) remain `PLANNED`.
- Immutable terminal states (`COMPLETED`, `SKIPPED`, `RESCHEDULED`) are strictly preserved.

---

## 6. Completed Workout Reconciliation

When a workout is completed in the Guided Workout Player:
1. `initSession(workout)` attaches `plannedSessionId` and `planId` to the active session state.
2. `completeWorkout(session, workout)` persists the history record to `kinetix_workout_history` including `plannedSessionId` and `planId`.
3. `reconcileCompletedSession(historyRecord)` is invoked:
   - Matches by direct `plannedSessionId`.
   - If missing, falls back to calendar date match (`toDateString(completedAt) === scheduledDate`) for training sessions with matching intent.
   - Marks session `status = SESSION_STATUS.COMPLETED`.
   - Records `completedSessionId = historyRecord.sessionId` and `completedAt = historyRecord.completedAt`.
   - Updates plan in storage idempotently.

---

## 7. Plan Versioning & Regeneration

When an athlete updates their profile or chooses **Regenerate Plan**:
1. Previous active plan is archived (`status = PLAN_STATUS.ARCHIVED`).
2. New plan is generated with incremented version number (`planVersion: v2, v3, ...`).
3. Historical completed workouts remain permanently linked to their original `planId` and `planVersion`.
4. Historical plan data is never deleted or mutated.

---

## 8. Plan Adherence Analytics

`computePlanAdherence(plan, referenceDate)` calculates genuine compliance metrics:

- `totalPlannedSessions`: Training sessions scheduled up to and including the reference date.
- `completedSessions`: Sessions marked `COMPLETED`.
- `missedSessions`: Past scheduled sessions marked `MISSED`.
- `skippedSessions`: Sessions explicitly marked `SKIPPED`.
- `optionalSessions`: Mobility/recovery sessions flagged `isOptional`.
- `remainingFutureSessions`: Upcoming training sessions scheduled after the reference date.
- `adherenceRate`: `completed / totalPlannedSessions` (or 1.0 when no past training sessions have elapsed).
- `adherencePercentage`: `Math.round(adherenceRate * 100)`.

---

## 9. Integration with Adaptive Workout Generator

When an athlete starts a planned session:
1. `generateWorkoutForPlannedSession(plannedSession, profile)` synthesizes target focus, target muscles, and duration intent into a focused session profile.
2. `generateAdaptiveWorkout(sessionProfile, seed, options)` generates an individually calibrated workout:
   - Selects exercises matching equipment and target muscles.
   - Modulates weight and reps via Progression and Recovery engines.
   - Rotates repetitive exercises.
3. Metadata is attached:
   ```javascript
   workout.plannedSessionId = plannedSession.plannedSessionId;
   workout.planId = plannedSession.planId;
   workout.planVersion = plannedSession.planVersion;
   workout.scheduledDate = plannedSession.scheduledDate;
   ```
4. Planned session transitions to `READY` with attached `workoutId`.
5. Workout Player loads and executes the routine.

---

## 10. Local Storage Persistence & Resilience

Stored under localStorage key:
`kinetix_training_plans`

Resilience protections:
- Malformed JSON recovery: Safely recovers with empty array or fresh active plan without throwing.
- Storage quota exceeded: Traps quota exceptions gracefully, preserving in-memory plan execution.
- Duplicate prevention: Keyed by `planId` and `plannedSessionId` with idempotent write guards.

---

---

## 11. Phase 7.1 Production Hardening & Adversarial Guarantees

Phase 7.1 introduced strict invariants and edge-case protections across the training plan lifecycle:

1. **Single Authoritative Active Plan Invariant**:
   - If storage corruption or race conditions result in multiple plans marked `status: 'ACTIVE'`, `getActivePlan()` deterministically sorts by version descending and `updatedAt` descending, retaining exactly one active plan while demoting orphaned duplicates to `ARCHIVED`.

2. **Ambiguous Completion Reconciliation Guard**:
   - Explicit matching by `plannedSessionId` is always prioritized.
   - When a fallback calendar-date lookup finds multiple candidate planned sessions on the same date, the engine **never guesses**. If none matches the completed `workoutId`, it returns `null` (explicitly unresolved) to prevent false completion attributions.
   - Reconciliations into plans explicitly target the workout's parent `planId`, ensuring workouts completed under an older version reconcile into the archived version rather than corrupting a newly regenerated active plan.

3. **Adherence Denominator & Optional Session Mathematics**:
   - Adherence calculates required training sessions vs completed required training sessions:
     `adherenceRate = Math.min(1.0, completedRequired / totalRequired)`.
   - Completing optional active recovery or mobility sessions is tracked separately (`completedOptionalSessions`) and cannot inflate the adherence percentage beyond 100%.
   - Rest days are never classified as missed sessions.

4. **Mesocycle Progression & Dynamic Week Synchronization**:
   - `syncPlanStatuses()` dynamically maps the reference date to the active week in the 4-week block (`currentWeek: 1..4`).
   - If the entire 4-week mesocycle has elapsed, the plan status is cleanly transitioned to `PLAN_STATUS.COMPLETED`.
   - UI views dynamically render the active week corresponding to the athlete's current calendar position.

5. **Multi-Reschedule Audit Trail & Collision Safety**:
   - Multiple reschedules (A → B → C) preserve the initial `originalScheduledDate` across all hops.
   - Rescheduling onto a day with an existing scheduled session preserves both sessions with unique IDs, allowing intentional multi-session catch-up without silent overwrites.

6. **Storage Sanitization & Recovery**:
   - Corrupted or partial plan objects lacking valid `weeks` arrays are discarded upon retrieval, preventing runtime exceptions.
   - Large workout histories (5,000+ records) are bounded during recovery engine fatigue checks to guarantee sub-millisecond plan generation.

---

## 12. Known Limitations & Product Decisions

1. **Multi-Mesocycle Rollover**:
   - The engine plans a 4-week mesocycle block. When week 4 concludes, the plan transitions to `COMPLETED`, prompting the athlete to review progress and regenerate for the next mesocycle block. Automatic background rollover without athlete confirmation is intentionally deferred to prevent surprise schedule resets.
2. **Single Daily Microcycle Anchor**:
   - The planner models one primary session per calendar day. Rescheduling allows coexisting sessions on the same date, but the generator does not natively plan two separate split workouts (e.g. morning cardio + evening weights) in the default microcycle template.
3. **External Calendar Export (.ics)**:
   - All session schedules, dates, and intents are fully structured and RFC 5545 compatible (`scheduledDate`, `title`, `duration`, `targetFocus`). Direct calendar sync (.ics file generation or Google/Apple calendar integration) is a separate feature.

---
