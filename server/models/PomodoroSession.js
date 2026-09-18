const mongoose = require('mongoose');

const pomodoroSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      default: null, // Optional: linked to a specific habit
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ['work', 'break'],
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for date range + user queries
pomodoroSessionSchema.index({ userId: 1, completedAt: -1 });
pomodoroSessionSchema.index({ userId: 1, habitId: 1, completedAt: -1 });
pomodoroSessionSchema.index({ userId: 1, type: 1, completedAt: -1 });

module.exports = mongoose.model('PomodoroSession', pomodoroSessionSchema);
