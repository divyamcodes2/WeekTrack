const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/auth/signup (Rate limited: max 10 requests / 15 min per IP)
router.post(
  '/signup',
  authLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 50 })
      .withMessage('Name cannot exceed 50 characters'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email cannot exceed 100 characters'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password must be between 6 and 100 characters'),
  ],
  validate,
  authController.signup
);

// POST /api/auth/login (Rate limited: max 10 requests / 15 min per IP)
router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email cannot exceed 100 characters'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ max: 100 })
      .withMessage('Password cannot exceed 100 characters'),
  ],
  validate,
  authController.login
);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', auth, authController.getMe);

// PUT /api/auth/settings
router.put(
  '/settings',
  auth,
  [
    body('streakThreshold')
      .optional()
      .isInt({ min: 0, max: 23 })
      .withMessage('Streak threshold must be an hour between 0 and 23'),
    body('darkMode')
      .optional()
      .isBoolean()
      .withMessage('Dark mode must be a boolean'),
    body('pomodoroWork')
      .optional()
      .isInt({ min: 1, max: 120 })
      .withMessage('Pomodoro work duration must be between 1 and 120 minutes'),
    body('pomodoroBreak')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('Pomodoro break duration must be between 1 and 60 minutes'),
  ],
  validate,
  authController.updateSettings
);

module.exports = router;
