/**
 * PROGRESS DATABASE - KINETIX
 * Phase 1: Core Information Architecture
 *
 * User statistics, weekly activity bar metrics, muscle balance,
 * personal records, and completed workout logs.
 */

export const PROGRESS_DATA = {
  overview: {
    totalWorkouts: 42,
    totalMinutes: 980,
    currentStreakDays: 6,
    weeklyCompletionPercent: 71,
    caloriesBurnedTotal: 9650
  },
  weeklyActivity: [
    { day: "Mon", minutes: 32, completed: true, label: "32m" },
    { day: "Tue", minutes: 15, completed: true, label: "15m" },
    { day: "Wed", minutes: 24, completed: true, isToday: true, label: "Today" },
    { day: "Thu", minutes: 0, completed: false, isRest: true, label: "Rest" },
    { day: "Fri", minutes: 30, completed: false, isUpcoming: true, label: "30m" },
    { day: "Sat", minutes: 25, completed: false, isUpcoming: true, label: "25m" },
    { day: "Sun", minutes: 12, completed: false, isUpcoming: true, label: "12m" }
  ],
  muscleDistribution: [
    { muscle: "Legs & Glutes", percent: 34, color: "var(--color-primary)" },
    { muscle: "Core & Abdominals", percent: 26, color: "var(--color-warning)" },
    { muscle: "Chest & Shoulders", percent: 22, color: "var(--color-success)" },
    { muscle: "Back & Pull", percent: 18, color: "var(--color-info)" }
  ],
  personalRecords: [
    {
      metric: "Longest Plank",
      value: "2m 45s",
      exercise: "Forearm Plank",
      dateAchieved: "Sep 18, 2026",
      improved: "+20s"
    },
    {
      metric: "Unbroken Push-Ups",
      value: "35 Reps",
      exercise: "Push-Up",
      dateAchieved: "Sep 14, 2026",
      improved: "+5 Reps"
    },
    {
      metric: "Burpee Sprint (2 min)",
      value: "32 Reps",
      exercise: "Athletic Burpee",
      dateAchieved: "Sep 10, 2026",
      improved: "+4 Reps"
    },
    {
      metric: "Max Active Streak",
      value: "14 Days",
      exercise: "All Routines",
      dateAchieved: "Aug 2026",
      improved: "All-time"
    }
  ],
  recentHistory: [
    {
      workoutTitle: "Upper Body Hypertrophy",
      date: "Yesterday at 7:30 AM",
      duration: "32 min",
      calories: 310,
      category: "Strength",
      status: "Completed"
    },
    {
      workoutTitle: "Spine & Hip Flow",
      date: "Sep 21 at 6:45 PM",
      duration: "15 min",
      calories: 95,
      category: "Recovery",
      status: "Completed"
    },
    {
      workoutTitle: "Metabolic Ignition HIIT",
      date: "Sep 19 at 8:00 AM",
      duration: "24 min",
      calories: 280,
      category: "HIIT",
      status: "Completed"
    },
    {
      workoutTitle: "Lower Body Power Forge",
      date: "Sep 17 at 7:15 AM",
      duration: "30 min",
      calories: 340,
      category: "Strength",
      status: "Completed"
    }
  ]
};
