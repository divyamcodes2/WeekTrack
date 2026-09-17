const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const PomodoroSession = require('../models/PomodoroSession');
const {
  formatDate,
  getWeekStart,
  getWeekEnd,
  subtractDays,
  getDateRange,
} = require('../utils/dateHelpers');

/**
 * GET /api/stats/overview
 * Weekly/monthly completion rates, category breakdown, pomodoro summary.
 */
exports.getOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = formatDate(new Date());
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);
    const monthStart = today.slice(0, 8) + '01';

    // Active habits
    const habits = await Habit.find({ userId, isArchived: false }).lean();
    const habitCount = habits.length;

    if (habitCount === 0) {
      return res.json({
        weeklyRate: 0,
        monthlyRate: 0,
        categoryBreakdown: [],
        pomodoroStats: { today: 0, thisWeek: 0, totalMinutes: 0 },
        consistencyScore: 0,
      });
    }

    // Weekly completions
    const weeklyCompletions = await Completion.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    }).lean();

    // Monthly completions
    const monthlyCompletions = await Completion.find({
      userId,
      date: { $gte: monthStart, $lte: today },
    }).lean();

    // Weekly rate: completions / (habits × days elapsed in week)
    const daysInWeek = getDateRange(weekStart, today).length;
    const weeklyRate = Math.round(
      (weeklyCompletions.length / (habitCount * daysInWeek)) * 100
    );

    // Monthly rate
    const daysInMonth = getDateRange(monthStart, today).length;
    const monthlyRate = Math.round(
      (monthlyCompletions.length / (habitCount * daysInMonth)) * 100
    );

    // Category breakdown
    const categoryMap = {};
    habits.forEach((h) => {
      const cat = h.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, completed: 0, habits: [] };
      categoryMap[cat].total++;
      categoryMap[cat].habits.push(h._id.toString());
    });

    for (const cat of Object.keys(categoryMap)) {
      const habitIds = categoryMap[cat].habits;
      const completedCount = weeklyCompletions.filter((c) =>
        habitIds.includes(c.habitId.toString())
      ).length;
      categoryMap[cat].completed = completedCount;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, data]) => ({
        category,
        habitCount: data.total,
        completions: data.completed,
        rate: Math.round(
          (data.completed / (data.total * daysInWeek)) * 100
        ),
      })
    );

    // Pomodoro stats
    const todayStart = new Date(today + 'T00:00:00');
    const todayEnd = new Date(today + 'T23:59:59');
    const weekStartDate = new Date(weekStart + 'T00:00:00');

    const todayPomodoros = await PomodoroSession.find({
      userId,
      type: 'work',
      completedAt: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    const weekPomodoros = await PomodoroSession.find({
      userId,
      type: 'work',
      completedAt: { $gte: weekStartDate, $lte: todayEnd },
    }).lean();

    const pomodoroStats = {
      today: todayPomodoros.length,
      thisWeek: weekPomodoros.length,
      todayMinutes: todayPomodoros.reduce((sum, s) => sum + s.duration, 0),
      weekMinutes: weekPomodoros.reduce((sum, s) => sum + s.duration, 0),
    };

    // Consistency score (% of days in current week with at least 1 completion)
    const daysWithCompletions = new Set(weeklyCompletions.map((c) => c.date));
    const consistencyScore = Math.round(
      (daysWithCompletions.size / daysInWeek) * 100
    );

    res.json({
      weeklyRate,
      monthlyRate,
      categoryBreakdown,
      pomodoroStats,
      consistencyScore,
      habitCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stats/heatmap
 * Returns daily completion data for heatmap visualization.
 * Query params: habitId (optional), months (default 3)
 */
exports.getHeatmap = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { habitId, months = 3 } = req.query;
    const today = formatDate(new Date());
    const startDate = subtractDays(today, months * 30);

    const query = { userId, date: { $gte: startDate, $lte: today } };
    if (habitId) query.habitId = habitId;

    const completions = await Completion.find(query).lean();
    const habits = await Habit.find({ userId, isArchived: false }).lean();

    // Group completions by date
    const dateMap = {};
    const dates = getDateRange(startDate, today);
    const totalHabits = habitId ? 1 : habits.length;

    dates.forEach((d) => {
      dateMap[d] = { date: d, count: 0, total: totalHabits, percentage: 0 };
    });

    completions.forEach((c) => {
      if (dateMap[c.date]) {
        dateMap[c.date].count++;
      }
    });

    // Calculate percentages
    Object.values(dateMap).forEach((d) => {
      d.percentage = d.total > 0 ? Math.round((d.count / d.total) * 100) : 0;
    });

    // Also fetch pomodoro data for mini-heatmap
    const pomodoroSessions = await PomodoroSession.find({
      userId,
      type: 'work',
      completedAt: {
        $gte: new Date(startDate + 'T00:00:00'),
        $lte: new Date(today + 'T23:59:59'),
      },
    }).lean();

    const pomodoroMap = {};
    dates.forEach((d) => {
      pomodoroMap[d] = { date: d, minutes: 0 };
    });

    pomodoroSessions.forEach((s) => {
      const d = formatDate(s.completedAt);
      if (pomodoroMap[d]) {
        pomodoroMap[d].minutes += s.duration;
      }
    });

    res.json({
      heatmap: Object.values(dateMap),
      pomodoroHeatmap: Object.values(pomodoroMap),
      habitColor: habitId
        ? habits.find((h) => h._id.toString() === habitId)?.color
        : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stats/streaks
 * All habits with their streak data, sortable.
 */
exports.getStreaks = async (req, res, next) => {
  try {
    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: false,
    })
      .select('name color category currentStreak longestStreak streakFreezeUsedThisWeek')
      .sort({ currentStreak: -1 })
      .lean();

    // Calculate momentum streak (consecutive days with at least 1 completion)
    const today = formatDate(new Date());
    let momentumStreak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = subtractDays(today, i);
      if (i === 0) {
        // Today might not be done yet, check
        const todayCompletions = await Completion.countDocuments({
          userId: req.user._id,
          date: checkDate,
        });
        if (todayCompletions === 0) continue; // Skip today if nothing done
      }
      const count = await Completion.countDocuments({
        userId: req.user._id,
        date: checkDate,
      });
      if (count > 0) {
        momentumStreak++;
      } else if (i > 0) {
        break;
      }
    }

    res.json({ habits, momentumStreak });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stats/weekly-chart
 * Weekly completion data for the last 8 weeks (for line/bar chart).
 */
exports.getWeeklyChart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = formatDate(new Date());
    const habits = await Habit.find({ userId, isArchived: false }).lean();
    const habitCount = habits.length || 1;

    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = getWeekStart(subtractDays(today, i * 7));
      const weekEnd = getWeekEnd(weekStart);
      const completions = await Completion.countDocuments({
        userId,
        date: { $gte: weekStart, $lte: weekEnd },
      });
      const maxCompletions = habitCount * 7;
      weeks.push({
        week: weekStart,
        completions,
        rate: Math.round((completions / maxCompletions) * 100),
      });
    }

    res.json({ weeks });
  } catch (error) {
    next(error);
  }
};
