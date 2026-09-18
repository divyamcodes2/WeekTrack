const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints (login / signup).
 * Prevents brute-force credential stuffing.
 * Max 10 attempts per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
  statusCode: 429,
});

/**
 * Rate limiter for AI Coach / Insights refresh.
 * Prevents Gemini quota exhaustion.
 * Max 10 requests per hour per user.
 */
const insightsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by authenticated user ID if available, otherwise IP
    return req.user?._id?.toString() || req.user?.id?.toString() || req.ip;
  },
  message: {
    message: 'AI insights refresh limit reached. You can refresh insights up to 10 times per hour.',
  },
  statusCode: 429,
});

/**
 * General API rate limiter applied to all standard routes.
 * Max 100 requests per 15 minutes per IP.
 * Exempts uptime health checks.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health' || req.path === '/health',
  message: {
    message: 'Too many requests from this IP, please try again in a few minutes.',
  },
  statusCode: 429,
});

module.exports = {
  authLimiter,
  insightsLimiter,
  generalLimiter,
};
