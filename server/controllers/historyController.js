const Completion = require('../models/Completion');
const JournalEntry = require('../models/JournalEntry');
const PomodoroSession = require('../models/PomodoroSession');
const Habit = require('../models/Habit');
const { formatDate, getToday, subtractDays, getDateRange } = require('../utils/dateHelpers');

/**
 * GET /api/history
 * Fetch aggregated daily history for the authenticated user.
 * Supports:
 *   - startDate & endDate (YYYY-MM-DD)
 *   - range ('7d', '30d', 'all')
 *   - hasJournal ('true' / 'false')
 *   - search (string to filter journal content)
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { startDate, endDate, range, hasJournal, search } = req.query;

    const today = getToday();

    // Determine date range boundaries
    if (range === '7d') {
      endDate = today;
      startDate = subtractDays(today, 6);
    } else if (range === '30d') {
      endDate = today;
      startDate = subtractDays(today, 29);
    } else if (range === 'all') {
      endDate = today;
      // Find earliest activity date or user creation date
      const [earliestCompletion, earliestJournal, earliestSession] = await Promise.all([
        Completion.findOne({ userId }).sort({ date: 1 }).select('date').lean(),
        JournalEntry.findOne({ userId }).sort({ date: 1 }).select('date').lean(),
        PomodoroSession.findOne({ userId }).sort({ completedAt: 1 }).select('completedAt').lean(),
      ]);

      const candidateDates = [
        formatDate(req.user.createdAt || new Date()),
        earliestCompletion?.date,
        earliestJournal?.date,
        earliestSession?.completedAt ? formatDate(earliestSession.completedAt) : null,
      ].filter(Boolean);

      candidateDates.sort();
      startDate = candidateDates[0] || subtractDays(today, 30);
    } else if (!startDate || !endDate) {
      // Default to last 30 days
      endDate = today;
      startDate = subtractDays(today, 29);
    }

    // Safety checks on dates
    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // Fetch user habits
    const habits = await Habit.find({ userId }).sort({ createdAt: 1 }).lean();

    // Fetch completions within range
    const completions = await Completion.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Fetch journal entries within range
    const journalQuery = {
      userId,
      date: { $gte: startDate, $lte: endDate },
    };
    if (search && search.trim()) {
      journalQuery.content = { $regex: search.trim(), $options: 'i' };
    }
    const journals = await JournalEntry.find(journalQuery).lean();

    // Fetch pomodoro sessions within range (converted to Date timestamps)
    const sessions = await PomodoroSession.find({
      userId,
      completedAt: {
        $gte: new Date(startDate + 'T00:00:00'),
        $lte: new Date(endDate + 'T23:59:59'),
      },
    })
      .populate('habitId', 'name color')
      .sort({ completedAt: -1 })
      .lean();

    // Organize data by date map
    const completionsByDate = {};
    for (const comp of completions) {
      if (!completionsByDate[comp.date]) completionsByDate[comp.date] = [];
      completionsByDate[comp.date].push(comp);
    }

    const journalsByDate = {};
    for (const j of journals) {
      if (j.content && j.content.trim()) {
        journalsByDate[j.date] = j;
      }
    }

    const sessionsByDate = {};
    for (const s of sessions) {
      const sDate = formatDate(s.completedAt);
      if (!sessionsByDate[sDate]) sessionsByDate[sDate] = [];
      sessionsByDate[sDate].push(s);
    }

    // Generate full list of days in range
    const allDates = getDateRange(startDate, endDate);
    // Reverse chronological order (latest date first)
    allDates.reverse();

    const days = [];

    for (const date of allDates) {
      const dayCompletions = completionsByDate[date] || [];
      const dayJournal = journalsByDate[date] || null;
      const daySessions = sessionsByDate[date] || [];

      // Applicable habits for this day (habits created on or before this day, or completed on this day)
      const applicableHabits = habits.filter(
        (h) =>
          formatDate(h.createdAt) <= date ||
          dayCompletions.some((c) => c.habitId.toString() === h._id.toString())
      );

      const targetHabitList = applicableHabits.length > 0 ? applicableHabits : habits;

      const habitsDetail = targetHabitList.map((h) => {
        const comp = dayCompletions.find((c) => c.habitId.toString() === h._id.toString());
        return {
          habitId: h._id,
          name: h.name,
          color: h.color,
          category: h.category,
          completed: !!comp,
          isFreezeDay: comp?.isFreezeDay || false,
        };
      });

      const completedCount = habitsDetail.filter((h) => h.completed).length;
      const totalHabits = habitsDetail.length;
      const completionRate = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      const focusMinutes = daySessions
        .filter((s) => s.type === 'work')
        .reduce((sum, s) => sum + (s.duration || 0), 0);

      const hasActivity =
        completedCount > 0 || (dayJournal && dayJournal.content.trim().length > 0) || daySessions.length > 0;

      // If user filtered by hasJournal, skip days without journal
      if (hasJournal === 'true' && (!dayJournal || !dayJournal.content.trim())) {
        continue;
      }

      // If search query is active and search filtered journals, only show days that have matching journal
      if (search && search.trim() && !dayJournal) {
        continue;
      }

      days.push({
        date,
        completionRate,
        completedCount,
        totalHabits,
        habits: habitsDetail,
        journal: dayJournal ? dayJournal.content : '',
        focusMinutes,
        pomodoroSessions: daySessions.map((s) => ({
          _id: s._id,
          duration: s.duration,
          type: s.type,
          completedAt: s.completedAt,
          habit: s.habitId ? { name: s.habitId.name, color: s.habitId.color } : null,
        })),
        hasActivity,
      });
    }

    res.json({
      startDate,
      endDate,
      totalDays: days.length,
      days,
    });
  } catch (error) {
    next(error);
  }
};
