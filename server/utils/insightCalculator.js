const Completion = require('../models/Completion');
const { getToday, subtractDays, getDateRange, getDayOfWeek } = require('./dateHelpers');

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Calculates rolling completion rates for a habit:
 * - Last 7 days vs previous 7 days
 * - Completion pattern across last 28 days (4 weeks)
 *
 * A habit is "at risk" if:
 * 1. Completion rate has dropped by > 30 percentage points week-over-week, OR
 * 2. Completion rate is < 40% for the last 7 days while target frequency implies it should be higher (>= 3 times/week or daily).
 */
async function calculateHabitRisk(habit, userId) {
  const today = getToday();
  const startDate28 = subtractDays(today, 27); // 28 days total (inclusive)

  // Fetch completions for this habit in the 28-day window
  const completions = await Completion.find({
    userId,
    habitId: habit._id,
    date: { $gte: startDate28, $lte: today },
  }).lean();

  const completionDates = new Set(completions.map((c) => c.date));

  // 28 days date list
  const dateList28 = getDateRange(startDate28, today);

  // Split into last 7 days and previous 7 days
  const last7Days = dateList28.slice(-7);
  const prev7Days = dateList28.slice(-14, -7);

  // Determine weekly target count
  let targetCount = 7;
  let frequencyDesc = 'daily (7 days a week)';

  if (habit.frequency?.type === 'x_per_week') {
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

  // At-risk condition:
  // 1. Completion rate has dropped by > 30 percentage points week-over-week, OR
  // 2. Completion rate is < 40% for the last 7 days while target frequency implies it should be higher (>= 3 times/week or daily).
  const droppedSignificantly = drop > 30;
  const targetImpliesHigher = targetCount >= 3;
  const criticallyLow = thisWeekRate < 40 && targetImpliesHigher;
  const isAtRisk = droppedSignificantly || criticallyLow;

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
