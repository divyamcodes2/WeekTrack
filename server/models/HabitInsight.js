const mongoose = require('mongoose');

/**
 * HabitInsight Model
 * Caches AI-generated insights per habit for a user with timestamps
 * to prevent redundant Gemini API calls.
 */
const habitInsightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    riskSummary: {
      type: String,
      required: true,
    },
    suggestion: {
      type: String,
      required: true,
    },
    suggestedChange: {
      field: {
        type: String,
        default: null,
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    isAtRisk: {
      type: Boolean,
      default: true,
    },
    riskType: {
      type: String,
      enum: ['nudge', 'attention'],
      default: 'attention',
    },
    completionsCount: {
      type: Number,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index: one cached insight per habit per user
habitInsightSchema.index({ userId: 1, habitId: 1 }, { unique: true });
habitInsightSchema.index({ userId: 1, analyzedAt: -1 });

module.exports = mongoose.model('HabitInsight', habitInsightSchema);
