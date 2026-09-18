const Completion = require('../models/Completion');
const { getToday, getWeekStart, subtractDays, getDateRange, getDayOfWeek } = require('./dateHelpers');

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Calculates rolling completion rates for a habit and determines at-risk status.
 *
 * A habit is "on-track" (healthy) ONLY if:
 * - For daily / specific_days: 100% of the elapsed scheduled days this calendar week are completed (0 missed days).
 * - For x_per_week: Target has been met or pace is maintained with remaining days.
 *
 * A habit is "at risk" (triggers AI Coach) if:
 * 1. Even a single scheduled day has been missed (missedElapsedThisWeek >= 1), OR
 * 2. Completion rate has dropped week-over-week (drop > 15 percentage points), OR
 * 3. Rolling completion rate is critically low (< 40%).
 */
async function calculateHabitRisk(habit, userId) {
  const today = getToday();
  const weekStart = getWeekStart(today);
  const startDate28 = subtractDays(today, 27); // 28 days total (inclusive)

  // Fetch completions for this habit in the 28-day window
  const completions = await Completion.find({
    userId,
    habitId: habit._id,
    date: { $gte: startDate28, $lte: today },
  }).lean();

  const completionDates = new Set(completions.map((c) => c.date));

  // Determine required/scheduled days helper
  const isRequiredDay = (dateStr) => {
    if (habit.frequency?.type === 'specific_days') {
      const days = habit.frequency.days || [];
      return days.includes(getDayOfWeek(dateStr));
    }
    return true;
  };

  // 28 days date list
  const dateList28 = getDateRange(startDate28, today);

  // Split into last 7 days and previous 7 days
  const last7Days = dateList28.slice(-7);
  const prev7Days = dateList28.slice(-14, -7);

  // Determine weekly target count
  let targetCount = 7;
  let frequencyDesc = 'daily (7 days a week)';
  const isXPerWeek = habit.frequency?.type === 'x_per_week';

  if (isXPerWeek) {
    targetCount = habit.frequency.timesPerWeek || 7;
    frequencyDesc = `${targetCount} times per week`;
  } else if (habit.frequency?.type === 'specific_days') {
    const days = habit.frequency.days || [];
    targetCount = days.length || 7;
    const names = days.map((d) => DAY_NAMES[d] || d).join(', ');
    frequencyDesc = `on specific days: ${names || 'all days'}`;
  }

  // Count completions in windows
  const thisWeekCompleted = last7Days.filter((d) => completionDates.has(d)).length;
  const prevWeekCompleted = prev7Days.filter((d) => completionDates.has(d)).length;

  const thisWeekRate = Math.min(100, Math.round((thisWeekCompleted / targetCount) * 100));
  const prevWeekRate = Math.min(100, Math.round((prevWeekCompleted / targetCount) * 100));
  const drop = prevWeekRate - thisWeekRate;

  // Calendar week elapsed days up to today (e.g. Mon through Fri = 5 days)
  const elapsedDaysThisWeek = getDateRange(weekStart, today).filter(isRequiredDay);
  const completedElapsedThisWeek = elapsedDaysThisWeek.filter((d) => completionDates.has(d)).length;
  const missedElapsedThisWeek = elapsedDaysThisWeek.length - completedElapsedThisWeek;

  // 1. Everything is OK when NO days are skipped (all elapsed scheduled days so far are completed)
  const noDaysSkipped = elapsedDaysThisWeek.length > 0 && missedElapsedThisWeek === 0;

  // 2. Sensitive trigger: at-risk if even a SINGLE day is missed so far this week, OR week-over-week drop, OR low completion rate
  const droppedSignificantly = drop > 20;
  const criticallyLow = thisWeekRate < 40 && targetCount >= 3;
  const isAtRisk = !noDaysSkipped || droppedSignificantly || criticallyLow;

  // 3. Differentiate between a single missed day (gentle momentum nudge) vs true struggle (needs attention)
  const isSingleMiss = isAtRisk && (missedElapsedThisWeek === 1 && !droppedSignificantly && !criticallyLow);
  const riskType = isSingleMiss ? 'nudge' : 'attention';

  // Day-by-day pattern for the 4 weeks (28 days)
  const pattern28 = dateList28.map((d) => {
    const dayIdx = getDayOfWeek(d);
    return {
      date: d,
      dayName: DAY_NAMES[dayIdx],
      completed: completionDates.has(d),
    };
  });

  return {
    isAtRisk,
    isSingleMiss,
    riskType,
    missedElapsedThisWeek,
    droppedSignificantly,
    criticallyLow,
    thisWeekCompleted,
    prevWeekCompleted,
    targetCount,
    thisWeekRate,
    prevWeekRate,
    drop,
    frequencyDesc,
    pattern28,
  };
}

module.exports = {
  calculateHabitRisk,
};
