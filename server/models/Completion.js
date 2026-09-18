const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    // The calendar date this habit completion is FOR (tracked day, 'YYYY-MM-DD').
    // Distinct from record write timestamps: do not use createdAt/updatedAt for calendar calculations.
    date: {
      type: String,
      required: true,
    },
    isFreezeDay: {
      type: Boolean,
      default: false,
    },
  },
  // Record write timestamps: createdAt reflects the real-time moment the user clicked check.
  // Used strictly for real-time check-in diagnostics (e.g. same-day Best Time of Day).
  { timestamps: true }
);

// Unique compound index: one completion per habit per day per user
completionSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });
// Index for date range queries
completionSchema.index({ userId: 1, date: 1 });
// Index for habit streak lookups across dates
completionSchema.index({ userId: 1, habitId: 1 });

module.exports = mongoose.model('Completion', completionSchema);
