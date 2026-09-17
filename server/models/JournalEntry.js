const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    content: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

// Unique: one journal entry per user per day
journalEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
