/**
 * Global centralized error handler middleware.
 * Catches all unhandled errors and returns structured JSON responses.
 * Sanitizes sensitive credentials from logs and prevents application crashes.
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'apikey',
  'geminiapikey',
  'geminiapikeyencrypted',
  'authorization',
  'cookie',
  'secret',
];

/**
 * Recursively redacts sensitive keys from log objects.
 */
function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLogging);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeForLogging(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const errorHandler = (err, req, res, next) => {
  // Determine appropriate HTTP status code
  let statusCode = err.statusCode || err.status || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
  }

  const userId = req.user?._id || req.user?.id || 'anonymous';
  const method = req.method;
  const url = req.originalUrl || req.url;

  // Server-side logging with request context
  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}] ${method} ${url} | User: ${userId} | Message:`, err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  } else {
    console.warn(`[Client Warning ${statusCode}] ${method} ${url} | User: ${userId} | Message:`, err.message);
  }

  // 1. Mongoose schema validation error
  if (err.name === 'ValidationError') {
    const messages = err.errors ? Object.values(err.errors).map((e) => e.message) : [err.message];
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  // 2. Mongoose duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'record';
    return res.status(409).json({ message: `A record with that ${field} already exists.` });
  }

  // 3. Mongoose cast error (malformed ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid resource identifier format' });
  }

  // 4. JWT authentication error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }

  // 5. Default structured JSON error response
  return res.status(statusCode).json({
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
