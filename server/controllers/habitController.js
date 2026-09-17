const Habit = require('../models/Habit');

/**
 * GET /api/habits
 * List all active (non-archived) habits for the current user.
 */
exports.getHabits = async (req, res, next) => {
  try {
    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: false,
    }).sort({ createdAt: -1 });
    res.json({ habits });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/habits/archived
 * List all archived habits for the current user.
 */
exports.getArchivedHabits = async (req, res, next) => {
  try {
    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: true,
    }).sort({ updatedAt: -1 });
    res.json({ habits });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/habits/colors
 * Return the curated color palette.
 */
exports.getColors = (req, res) => {
  res.json({ colors: Habit.HABIT_COLORS });
};

/**
 * GET /api/habits/:id
 * Get a single habit with full detail.
 */
exports.getHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    res.json({ habit });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/habits
 * Create a new habit.
 */
exports.createHabit = async (req, res, next) => {
  try {
    const { name, description, category, frequency, color, pomodorosRequired } =
      req.body;
    const habit = await Habit.create({
      userId: req.user._id,
      name,
      description,
      category,
      frequency,
      color,
      pomodorosRequired,
    });
    res.status(201).json({ habit });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/habits/:id
 * Update an existing habit.
 */
exports.updateHabit = async (req, res, next) => {
  try {
    const { name, description, category, frequency, color, pomodorosRequired } =
      req.body;
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description, category, frequency, color, pomodorosRequired },
      { new: true, runValidators: true }
    );
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    res.json({ habit });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/habits/:id/archive
 * Toggle archive status (soft delete).
 */
exports.toggleArchive = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    habit.isArchived = !habit.isArchived;
    await habit.save();
    res.json({ habit });
  } catch (error) {
    next(error);
  }
};
