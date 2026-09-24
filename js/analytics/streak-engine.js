/**
 * STREAK CALCULATION ENGINE - KINETIX
 * Phase 4: Progress & Training Intelligence
 *
 * Deterministic streak calculation adhering to explicit calendar-day rules:
 * - A calendar day counts as a training day when at least one workout was completed on that local calendar day.
 * - Multiple workouts on the same calendar day count as one training day.
 * - Consecutive calendar days form a streak.
 * - Current streak: active consecutive training days extending to today (or yesterday).
 * - Longest streak: historical maximum consecutive training days.
 * - Date normalization: local calendar string "YYYY-MM-DD".
 * - Safe handling of: empty history, malformed timestamps, future timestamps, gaps, duplicate dates.
 */

const MS_PER_DAY = 86400000;

/**
 * Normalizes a timestamp, Date, or ISO string into a local calendar date string "YYYY-MM-DD".
 * Returns null if the input is invalid or cannot be parsed.
 */
export function toCalendarDateString(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Computes difference in calendar days between two "YYYY-MM-DD" date strings.
 * e.g., diffCalendarDays("2026-09-24", "2026-09-23") === 1
 */
export function diffCalendarDays(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 0;
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);

  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);

  return Math.round((utcA - utcB) / MS_PER_DAY);
}

/**
 * Calculates deterministic streak statistics from historical workout records.
 *
 * @param {Array} historyRecords - Array of workout history objects containing completedAt.
 * @param {Date|string} [referenceDate=new Date()] - Anchor date for current streak evaluation.
 * @returns {Object} Streak metrics { currentStreak, longestStreak, totalTrainingDays, activeToday, activeYesterday, lastTrainingDate }
 */
export function calculateStreak(historyRecords = [], referenceDate = new Date()) {
  const refDateObj = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refDateValid = !isNaN(refDateObj.getTime()) ? refDateObj : new Date();
  const todayStr = toCalendarDateString(refDateValid);

  // Compute yesterday string
  const yesterdayObj = new Date(refDateValid.getTime() - MS_PER_DAY);
  const yesterdayStr = toCalendarDateString(yesterdayObj);

  if (!Array.isArray(historyRecords) || historyRecords.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalTrainingDays: 0,
      activeToday: false,
      activeYesterday: false,
      lastTrainingDate: null,
      trainingDates: []
    };
  }

  // 1. Extract, validate, and normalize unique training days
  const dateSet = new Set();
  historyRecords.forEach(rec => {
    if (!rec || typeof rec !== 'object') return;
    const ts = rec.completedAt || rec.startedAt;
    const dateStr = toCalendarDateString(ts);
    if (!dateStr) return;

    // Discard future timestamps beyond reference date
    if (dateStr > todayStr) return;

    dateSet.add(dateStr);
  });

  const uniqueDates = Array.from(dateSet).sort(); // Ascending "YYYY-MM-DD"
  const totalTrainingDays = uniqueDates.length;

  if (totalTrainingDays === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalTrainingDays: 0,
      activeToday: false,
      activeYesterday: false,
      lastTrainingDate: null,
      trainingDates: []
    };
  }

  const activeToday = dateSet.has(todayStr);
  const activeYesterday = dateSet.has(yesterdayStr);
  const lastTrainingDate = uniqueDates[uniqueDates.length - 1];

  // 2. Compute Longest Streak (Historical Maximum)
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = diffCalendarDays(uniqueDates[i], uniqueDates[i - 1]);
    if (diff === 1) {
      currentRun++;
    } else if (diff > 1) {
      currentRun = 1;
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
  }

  // 3. Compute Current Active Streak
  // An active streak requires training on today OR yesterday.
  // If neither today nor yesterday has a workout, current streak is broken (0).
  let currentStreak = 0;

  if (activeToday || activeYesterday) {
    // Start counting backward from the anchor day (today if trained today, else yesterday)
    const anchorDateStr = activeToday ? todayStr : yesterdayStr;
    const [anchorY, anchorM, anchorD] = anchorDateStr.split('-').map(Number);
    let checkDateObj = new Date(anchorY, anchorM - 1, anchorD);

    while (true) {
      const checkStr = toCalendarDateString(checkDateObj);
      if (dateSet.has(checkStr)) {
        currentStreak++;
        // Step back 1 calendar day
        checkDateObj = new Date(checkDateObj.getTime() - MS_PER_DAY);
      } else {
        break;
      }
    }
  }

  // Safety invariant: longestStreak is at least as large as currentStreak
  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalTrainingDays,
    activeToday,
    activeYesterday,
    lastTrainingDate,
    trainingDates: uniqueDates
  };
}
