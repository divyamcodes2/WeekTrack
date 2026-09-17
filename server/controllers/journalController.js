const JournalEntry = require('../models/JournalEntry');

/**
 * PUT /api/journal/:date
 * Upsert a journal entry for a specific date.
 */
exports.upsertEntry = async (req, res, next) => {
  try {
    const { date } = req.params;
    const { content } = req.body;

    const entry = await JournalEntry.findOneAndUpdate(
      { userId: req.user._id, date },
      { content },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ entry });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/journal/:date
 * Get journal entry for a specific date.
 */
exports.getEntry = async (req, res, next) => {
  try {
    const entry = await JournalEntry.findOne({
      userId: req.user._id,
      date: req.params.date,
    });
    res.json({ entry: entry || null });
  } catch (error) {
    next(error);
  }
};
