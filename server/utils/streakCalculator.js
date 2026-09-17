const Completion = require('../models/Completion');
const { formatDate, getDayOfWeek, subtractDays, getWeekStart } = require('./dateHelpers');

/**
 * Calculate current and longest streak for a habit.
 * Respects frequency rules (daily, specific days, X per week) and freeze days.
 *
 * @param {string} habitId - The habit's ObjectId
 * @param {string} userId - The user's ObjectId
 * @param {Object} frequency - The habit's frequency config { type, days, timesPerWeek }
 * @returns {Object} { currentStreak, longestStreak }
 */
async function calculateStreaks(habitId, userId, frequency) {
  // Fetch all completions for this habit, sorted by date descending
  const completions = await Completion.find({ habitId, userId })
    .sort({ date: -1 })
    .lean();

  if (completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Build a Set of completed dates for O(1) lookup
  const completedDates = new Set(completions.map((c) => c.date));
  const freezeDates = new Set(
    completions.filter((c) => c.isFreezeDay).map((c) => c.date)
  );

  const today = formatDate(new Date());

  // Determine if a date is a "required" day for this habit
  function isRequiredDay(dateStr) {
    if (frequency.type === 'daily') return true;
    if (frequency.type === 'specific_days') {
      const dayOfWeek = getDayOfWeek(dateStr);
      return frequency.days.includes(dayOfWeek);
    }
    // For 'x_per_week', every day counts — we check weekly totals differently
    return true;
  }

  // For 'x_per_week' frequency, check if the week quota was met
  function weekQuotaMet(weekStartStr) {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = formatDate(
        new Date(
          new Date(weekStartStr + 'T00:00:00').getTime() + i * 86400000
        )
      );
      if (completedDates.has(d)) count++;
    }
    return count >= frequency.timesPerWeek;
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakBroken = false;

  // Walk backwards from today
  let checkDate = today;
  const maxDaysBack = 730; // Check up to 2 years

  for (let i = 0; i < maxDaysBack; i++) {
    checkDate = subtractDays(today, i);

    if (frequency.type === 'x_per_week') {
      // For weekly frequency, check per-week
      const weekStart = getWeekStart(checkDate);
      if (weekQuotaMet(weekStart)) {
        tempStreak++;
        // Skip to the start of this week
        const weekStartDate = new Date(weekStart + 'T00:00:00');
        const todayDate = new Date(today + 'T00:00:00');
        i = Math.floor((todayDate - weekStartDate) / 86400000) + 7 - 1;
      } else if (i > 0) {
        // Don't break on current (possibly incomplete) week
        if (!streakBroken) {
          currentStreak = tempStreak;
          streakBroken = true;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
      continue;
    }

    // Daily and specific_days logic
    if (!isRequiredDay(checkDate)) {
      // Not a required day — skip, don't break streak
      continue;
    }

    if (completedDates.has(checkDate) || freezeDates.has(checkDate)) {
      tempStreak++;
    } else if (checkDate === today) {
      // Today not yet completed — don't break, just skip
      continue;
    } else {
      // Missed a required day
      if (!streakBroken) {
        currentStreak = tempStreak;
        streakBroken = true;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }

  // Final update
  if (!streakBroken) {
    currentStreak = tempStreak;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

module.exports = { calculateStreaks };
