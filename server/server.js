require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const completionRoutes = require('./routes/completions');
const pomodoroRoutes = require('./routes/pomodoro');
const statsRoutes = require('./routes/stats');
const journalRoutes = require('./routes/journal');
const exportRoutes = require('./routes/export');
const historyRoutes = require('./routes/history');
const insightsRoutes = require('./routes/insights');
const usersRoutes = require('./routes/users');

const app = express();

// ─── Security & Performance Middleware ───────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());

// ─── Middleware ───────────────────────────────────────────
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://week-track.vercel.app',
];
const envOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim()).filter(Boolean)
  : [];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ─── Health Check Endpoint (Item 7) ─────────────────────────
// Placed before rate limiters so uptime monitors never get blocked
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── General Rate Limiter (Item 1) ──────────────────────────
app.use('/api', generalLimiter);

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/users', usersRoutes);

// ─── Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const { isEncryptionConfigured } = require('./utils/crypto');

connectDB().then(() => {
  if (!isEncryptionConfigured()) {
    console.warn('⚠️  [SECURITY WARNING] ENCRYPTION_SECRET is not set in environment variables. Falling back to internal secret key.');
  }
  app.listen(PORT, () => {
    console.log(`WeekTrack server running on port ${PORT}`);
  });
});

module.exports = app;
