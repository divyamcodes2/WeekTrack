const mongoose = require('mongoose');

/**
 * Curated color palette for habits — 10 accessible colors.
 * Each color is selected for readability in both light and dark mode.
 */
const HABIT_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Blue-indigo
];

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'General',
    },
    frequency: {
      type: {
        type: String,
        enum: ['daily', 'specific_days', 'x_per_week'],
        default: 'daily',
      },
      days: {
        type: [Number], // 0=Mon, 1=Tue, ..., 6=Sun
        default: [],
      },
      timesPerWeek: {
        type: Number,
        default: 7,
        min: 1,
        max: 7,
      },
    },
    color: {
      type: String,
      default: '#4F46E5',
      validate: {
        validator: (v) => /^#[0-9A-Fa-f]{6}$/.test(v),
        message: 'Color must be a valid hex code',
      },
    },
    pomodorosRequired: {
      type: Number,
      default: 1,
      min: 1,
      max: 20,
    },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    streakFreezeUsedThisWeek: { type: Date, default: null },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast user habit lookups
habitSchema.index({ userId: 1, isArchived: 1 });

// Static: expose HABIT_COLORS for API
habitSchema.statics.HABIT_COLORS = HABIT_COLORS;

module.exports = mongoose.model('Habit', habitSchema);
