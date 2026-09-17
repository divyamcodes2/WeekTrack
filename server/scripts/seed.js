/**
 * Seed script: creates a demo user with sample habits, completions,
 * streaks, and pomodoro sessions for development/demo purposes.
 *
 * Usage: node scripts/seed.js
 * Requires MONGODB_URI in .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const PomodoroSession = require('../models/PomodoroSession');
const JournalEntry = require('../models/JournalEntry');
const { calculateStreaks } = require('../utils/streakCalculator');
const { formatDate, subtractDays } = require('../utils/dateHelpers');

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@weektrack.com',
  password: 'demo1234',
};

const SAMPLE_HABITS = [
  {
    name: 'Morning Exercise',
    description: '30 minutes of cardio or strength training',
    category: 'Health',
    frequency: { type: 'daily', days: [], timesPerWeek: 7 },
    color: '#10B981',
    pomodorosRequired: 1,
  },
  {
    name: 'Read 30 Pages',
    description: 'Read non-fiction or technical books',
    category: 'Learning',
    frequency: { type: 'daily', days: [], timesPerWeek: 7 },
    color: '#4F46E5',
    pomodorosRequired: 2,
  },
  {
    name: 'Meditate',
    description: '10 minutes of mindfulness meditation',
    category: 'Wellness',
    frequency: { type: 'daily', days: [], timesPerWeek: 7 },
    color: '#8B5CF6',
    pomodorosRequired: 1,
  },
  {
    name: 'Practice Coding',
    description: 'Solve one algorithm problem or work on side project',
    category: 'Learning',
    frequency: { type: 'specific_days', days: [0, 1, 2, 3, 4], timesPerWeek: 5 },
    color: '#06B6D4',
    pomodorosRequired: 3,
  },
  {
    name: 'Drink 8 Glasses Water',
    description: 'Stay hydrated throughout the day',
    category: 'Health',
    frequency: { type: 'daily', days: [], timesPerWeek: 7 },
    color: '#14B8A6',
    pomodorosRequired: 1,
  },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Clean existing demo data
    const existingUser = await User.findOne({ email: DEMO_USER.email });
    if (existingUser) {
      console.log('Cleaning existing demo data...');
      await Promise.all([
        Habit.deleteMany({ userId: existingUser._id }),
        Completion.deleteMany({ userId: existingUser._id }),
        PomodoroSession.deleteMany({ userId: existingUser._id }),
        JournalEntry.deleteMany({ userId: existingUser._id }),
        User.deleteOne({ _id: existingUser._id }),
      ]);
    }

    // Create demo user
    console.log('Creating demo user...');
    const user = await User.create(DEMO_USER);

    // Create habits
    console.log('Creating sample habits...');
    const habits = [];
    for (const h of SAMPLE_HABITS) {
      const habit = await Habit.create({ ...h, userId: user._id });
      habits.push(habit);
    }

    // Generate 90 days of completions with realistic patterns
    console.log('Generating 90 days of completion data...');
    const today = formatDate(new Date());

    // Completion probabilities per habit (simulates varying consistency)
    const probabilities = [0.85, 0.7, 0.9, 0.75, 0.6];

    for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
      const date = subtractDays(today, dayOffset);
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (let i = 0; i < habits.length; i++) {
        const habit = habits[i];
        let prob = probabilities[i];

        // Lower probability on weekends for work-related habits
        if (isWeekend && habit.category === 'Learning') {
          prob *= 0.5;
        }

        // Specific days check for coding habit
        if (habit.frequency.type === 'specific_days') {
          const dow = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          if (!habit.frequency.days.includes(dow)) continue;
        }

        if (Math.random() < prob) {
          await Completion.create({
            userId: user._id,
            habitId: habit._id,
            date,
          });
        }
      }
    }

    // Compute and save streaks
    console.log('Computing streaks...');
    for (const habit of habits) {
      const { currentStreak, longestStreak } = await calculateStreaks(
        habit._id,
        user._id,
        habit.frequency
      );
      habit.currentStreak = currentStreak;
      habit.longestStreak = longestStreak;
      await habit.save();
    }

    // Generate pomodoro sessions (last 30 days)
    console.log('Generating pomodoro sessions...');
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const date = subtractDays(today, dayOffset);
      const sessionsPerDay = Math.floor(Math.random() * 6) + 1; // 1-6 sessions

      for (let s = 0; s < sessionsPerDay; s++) {
        const linkedHabit =
          Math.random() > 0.3
            ? habits[Math.floor(Math.random() * habits.length)]
            : null;

        await PomodoroSession.create({
          userId: user._id,
          habitId: linkedHabit?._id || null,
          duration: 25,
          type: 'work',
          completedAt: new Date(
            date + `T${String(9 + s * 2).padStart(2, '0')}:00:00`
          ),
        });
      }
    }

    // Generate some journal entries
    console.log('Creating journal entries...');
    const journalNotes = [
      'Great start to the day! Managed to hit all my habits before noon.',
      'Feeling a bit tired today, but still pushed through meditation and exercise.',
      'Had an amazing coding session — finally solved that recursive problem.',
      'Need to focus more on hydration. Setting phone reminders.',
      'Streak milestones are really motivating. 14 days of exercise!',
    ];

    for (let i = 0; i < 5; i++) {
      await JournalEntry.create({
        userId: user._id,
        date: subtractDays(today, i * 3),
        content: journalNotes[i],
      });
    }

    console.log('\n✅ Seed complete!');
    console.log(`   Email: ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}`);
    console.log(`   Habits: ${habits.length}`);

    const completionCount = await Completion.countDocuments({
      userId: user._id,
    });
    const sessionCount = await PomodoroSession.countDocuments({
      userId: user._id,
    });
    console.log(`   Completions: ${completionCount}`);
    console.log(`   Pomodoro sessions: ${sessionCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
