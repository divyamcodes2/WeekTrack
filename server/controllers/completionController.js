const Completion = require('../models/Completion');
const Habit = require('../models/Habit');
const { calculateStreaks } = require('../utils/streakCalculator');
const { getWeekStart, formatDate } = require('../utils/dateHelpers');
const { invalidateMetricsCache } = require('./insightsController');

/**
 * POST /api/completions
 * Toggle completion for a habit on a specific date.
 * Recomputes streaks after each toggle.
 */
exports.toggleCompletion = async (req, res, next) => {
  try {
    const { habitId, date } = req.body;

    // Verify habit belongs to user
    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.user._id,
    });
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Check if completion exists
    const existing = await Completion.findOne({
      userId: req.user._id,
      habitId,
      date,
    });

    let completion;
    let action;

    if (existing) {
      // Remove completion (untoggle)
      await Completion.deleteOne({ _id: existing._id });
      action = 'removed';
      completion = null;
    } else {
      // Create completion
      completion = await Completion.create({
        userId: req.user._id,
        habitId,
        date,
      });
      action = 'added';
    }

    // Recompute streaks
    const { currentStreak, longestStreak } = await calculateStreaks(
      habitId,
      req.user._id,
      habit.frequency
    );

    // Update cached streak values on habit
    habit.currentStreak = currentStreak;
    habit.longestStreak = longestStreak;
    await habit.save();

    // Invalidate user-scoped insights metrics cache so data stays immediately in sync
    invalidateMetricsCache(req.user._id);

    res.json({
      action,
      completion,
      streak: { currentStreak, longestStreak },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/completions
 * Get completions for a date range.
 * Query params: startDate, endDate (both 'YYYY-MM-DD')
 */
exports.getCompletions = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: 'startDate and endDate are required' });
    }

    const completions = await Completion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    res.json({ completions });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/completions/freeze
 * Apply a streak freeze for a habit on a specific date.
 * Max 1 freeze per habit per week (resets Monday).
 */
exports.applyFreeze = async (req, res, next) => {
  try {
    const { habitId, date } = req.body;

    const habit = await Habit.findOne({
      _id: habitId,
      userId: req.user._id,
    });
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Check if freeze already used this week
    const weekStart = getWeekStart(date);
    if (habit.streakFreezeUsedThisWeek) {
      const usedWeekStart = getWeekStart(
        formatDate(habit.streakFreezeUsedThisWeek)
      );
      if (usedWeekStart === weekStart) {
        return res
          .status(400)
          .json({ message: 'Streak freeze already used this week' });
      }
    }

    // Check if completion already exists for this date
    const existing = await Completion.findOne({
      userId: req.user._id,
      habitId,
      date,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: 'Day already completed, no freeze needed' });
    }

    // Create freeze completion
    await Completion.create({
      userId: req.user._id,
      habitId,
      date,
      isFreezeDay: true,
    });

    // Mark freeze as used
    habit.streakFreezeUsedThisWeek = new Date(date + 'T00:00:00');
    await habit.save();

    // Recompute streaks
    const { currentStreak, longestStreak } = await calculateStreaks(
      habitId,
      req.user._id,
      habit.frequency
    );
    habit.currentStreak = currentStreak;
    habit.longestStreak = longestStreak;
    await habit.save();

    // Invalidate user-scoped insights metrics cache so data stays immediately in sync
    invalidateMetricsCache(req.user._id);

    res.json({
      message: 'Streak freeze applied',
      streak: { currentStreak, longestStreak },
    });
  } catch (error) {
    next(error);
  }
};
