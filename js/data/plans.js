/**
 * PLANS DATABASE - KINETIX
 * Phase 1: Core Information Architecture
 *
 * 7-day weekly training schedule with visual statuses:
 * completed, today, upcoming, rest.
 */

export const WEEKLY_PLAN = {
  id: "athletic-recomposition-w3",
  title: "Athletic Recomposition",
  goal: "Build functional strength & elevate metabolic conditioning",
  weekNumber: 3,
  totalWeeks: 8,
  weeklyCompletionPercent: 71,
  currentStreakDays: 6,
  days: [
    {
      dayOfWeek: "Mon",
      fullDay: "Monday",
      dateLabel: "Sep 22",
      workoutId: "upper-body-power",
      workoutTitle: "Upper Body Hypertrophy",
      focus: "Strength",
      durationMin: 32,
      status: "completed", // completed | today | upcoming | rest
      completedAt: "7:30 AM",
      caloriesBurned: 310
    },
    {
      dayOfWeek: "Tue",
      fullDay: "Tuesday",
      dateLabel: "Sep 23",
      workoutId: "spine-hip-mobility",
      workoutTitle: "Spine & Hip Flow",
      focus: "Recovery",
      durationMin: 15,
      status: "completed",
      completedAt: "6:45 PM",
      caloriesBurned: 95
    },
    {
      dayOfWeek: "Wed",
      fullDay: "Wednesday",
      dateLabel: "Sep 24",
      workoutId: "metabolic-ignition",
      workoutTitle: "Metabolic Ignition HIIT",
      focus: "HIIT",
      durationMin: 24,
      status: "today",
      completedAt: null,
      caloriesBurned: null
    },
    {
      dayOfWeek: "Thu",
      fullDay: "Thursday",
      dateLabel: "Sep 25",
      workoutId: null,
      workoutTitle: "Rest & Hydration",
      focus: "Rest Day",
      durationMin: 0,
      status: "rest",
      completedAt: null,
      caloriesBurned: null
    },
    {
      dayOfWeek: "Fri",
      fullDay: "Friday",
      dateLabel: "Sep 26",
      workoutId: "lower-body-forge",
      workoutTitle: "Lower Body Power Forge",
      focus: "Strength",
      durationMin: 30,
      status: "upcoming",
      completedAt: null,
      caloriesBurned: null
    },
    {
      dayOfWeek: "Sat",
      fullDay: "Saturday",
      dateLabel: "Sep 27",
      workoutId: "kettlebell-complex",
      workoutTitle: "Total Body Conditioning",
      focus: "Full Body",
      durationMin: 25,
      status: "upcoming",
      completedAt: null,
      caloriesBurned: null
    },
    {
      dayOfWeek: "Sun",
      fullDay: "Sunday",
      dateLabel: "Sep 28",
      workoutId: "deep-recovery",
      workoutTitle: "Active Reset & Stretch",
      focus: "Recovery",
      durationMin: 12,
      status: "upcoming",
      completedAt: null,
      caloriesBurned: null
    }
  ]
};
