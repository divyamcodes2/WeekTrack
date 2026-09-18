const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    geminiApiKeyEncrypted: {
      type: String,
      select: false, // Don't return encrypted API key by default
    },
    geminiApiKeyLast4: {
      type: String,
      default: null,
    },
    settings: {
      streakThreshold: { type: Number, default: 20 }, // Hour (0-23) — default 8 PM
      darkMode: { type: Boolean, default: false },
      pomodoroWork: { type: Number, default: 25 }, // minutes
      pomodoroBreak: { type: Number, default: 5 }, // minutes
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
