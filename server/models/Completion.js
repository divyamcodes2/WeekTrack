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
    date: {
      type: String, // Stored as 'YYYY-MM-DD' for easy querying
      required: true,
    },
    isFreezeDay: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Unique compound index: one completion per habit per day per user
completionSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });
// Index for date range queries
completionSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Completion', completionSchema);
