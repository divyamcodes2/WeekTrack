require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const completionRoutes = require('./routes/completions');
const pomodoroRoutes = require('./routes/pomodoro');
const statsRoutes = require('./routes/stats');
const journalRoutes = require('./routes/journal');
const exportRoutes = require('./routes/export');
const historyRoutes = require('./routes/history');

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`WeekTrack server running on port ${PORT}`);
  });
});

module.exports = app;
