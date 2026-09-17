const PomodoroSession = require('../models/PomodoroSession');
const Completion = require('../models/Completion');
const Habit = require('../models/Habit');
const { calculateStreaks } = require('../utils/streakCalculator');
const { formatDate } = require('../utils/dateHelpers');

/**
 * POST /api/pomodoro
 * Log a completed pomodoro session.
 * If linked to a habit, check if pomodorosRequired threshold met → auto-complete.
 */
exports.createSession = async (req, res, next) => {
  try {
    const { habitId, duration, type } = req.body;

    const session = await PomodoroSession.create({
      userId: req.user._id,
      habitId: habitId || null,
      duration,
      type,
      completedAt: new Date(),
    });

    let autoCompleted = false;

    // Auto-complete habit if linked and threshold met
    if (habitId && type === 'work') {
      const habit = await Habit.findOne({
        _id: habitId,
        userId: req.user._id,
      });

      if (habit) {
        const today = formatDate(new Date());
        const startOfDay = new Date(today + 'T00:00:00');
        const endOfDay = new Date(today + 'T23:59:59');

        // Count work sessions for this habit today
        const todayCount = await PomodoroSession.countDocuments({
          userId: req.user._id,
          habitId,
          type: 'work',
          completedAt: { $gte: startOfDay, $lte: endOfDay },
        });

        if (todayCount >= habit.pomodorosRequired) {
          // Auto-create completion if not already exists
          const existing = await Completion.findOne({
            userId: req.user._id,
            habitId,
            date: today,
          });

          if (!existing) {
            await Completion.create({
              userId: req.user._id,
              habitId,
              date: today,
            });

            // Recompute streaks
            const { currentStreak, longestStreak } = await calculateStreaks(
              habitId,
              req.user._id,
              habit.frequency
            );
            habit.currentStreak = currentStreak;
            habit.longestStreak = longestStreak;
            await habit.save();
            autoCompleted = true;
          }
        }
      }
    }

    res.status(201).json({ session, autoCompleted });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pomodoro
 * Get pomodoro sessions for a date range.
 * Query params: startDate, endDate
 */
exports.getSessions = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { userId: req.user._id };

    if (startDate && endDate) {
      query.completedAt = {
        $gte: new Date(startDate + 'T00:00:00'),
        $lte: new Date(endDate + 'T23:59:59'),
      };
    }

    const sessions = await PomodoroSession.find(query)
      .sort({ completedAt: -1 })
      .populate('habitId', 'name color')
      .lean();

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};
