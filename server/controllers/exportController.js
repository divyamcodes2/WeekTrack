const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const PomodoroSession = require('../models/PomodoroSession');
const JournalEntry = require('../models/JournalEntry');

/**
 * GET /api/export/json
 * Export all user data as JSON.
 */
exports.exportJSON = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [habits, completions, sessions, journals] = await Promise.all([
      Habit.find({ userId }).lean(),
      Completion.find({ userId }).lean(),
      PomodoroSession.find({ userId }).lean(),
      JournalEntry.find({ userId }).lean(),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      user: { name: req.user.name, email: req.user.email },
      habits,
      completions,
      pomodoroSessions: sessions,
      journalEntries: journals,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=weektrack-export.json'
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/export/csv
 * Export completions as CSV.
 */
exports.exportCSV = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const habits = await Habit.find({ userId }).lean();
    const completions = await Completion.find({ userId })
      .sort({ date: 1 })
      .lean();

    const habitMap = {};
    habits.forEach((h) => {
      habitMap[h._id.toString()] = h.name;
    });

    // CSV header
    let csv = 'Date,Habit,Category,Completed,Freeze Day\n';

    completions.forEach((c) => {
      const habit = habits.find(
        (h) => h._id.toString() === c.habitId.toString()
      );
      csv += `${c.date},"${habitMap[c.habitId.toString()] || 'Unknown'}","${habit?.category || ''}",Yes,${c.isFreezeDay ? 'Yes' : 'No'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=weektrack-export.csv'
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
