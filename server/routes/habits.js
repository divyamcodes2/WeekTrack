const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const habitController = require('../controllers/habitController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/habits/colors — must be before /:id
router.get('/colors', habitController.getColors);

// GET /api/habits/archived
router.get('/archived', habitController.getArchivedHabits);

// GET /api/habits
router.get('/', habitController.getHabits);

// GET /api/habits/:id
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid habit ID format')],
  validate,
  habitController.getHabit
);

// Habit validation rules
const habitValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Habit name is required')
    .isLength({ max: 100 })
    .withMessage('Habit name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex code'),
  body('frequency.type')
    .optional()
    .isIn(['daily', 'specific_days', 'x_per_week'])
    .withMessage('Frequency type must be daily, specific_days, or x_per_week'),
  body('frequency.days')
    .optional()
    .isArray()
    .withMessage('Frequency days must be an array of day indexes'),
  body('frequency.timesPerWeek')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('timesPerWeek must be between 1 and 7'),
  body('pomodorosRequired')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Pomodoros required must be between 1 and 20'),
];

// POST /api/habits
router.post('/', habitValidationRules, validate, habitController.createHabit);

// PUT /api/habits/:id
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid habit ID format'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Habit name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Habit name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Description cannot exceed 300 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Category cannot exceed 50 characters'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex code'),
    body('frequency.type')
      .optional()
      .isIn(['daily', 'specific_days', 'x_per_week'])
      .withMessage('Frequency type must be daily, specific_days, or x_per_week'),
    body('frequency.days')
      .optional()
      .isArray()
      .withMessage('Frequency days must be an array of day indexes'),
    body('frequency.timesPerWeek')
      .optional()
      .isInt({ min: 1, max: 7 })
      .withMessage('timesPerWeek must be between 1 and 7'),
    body('pomodorosRequired')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Pomodoros required must be between 1 and 20'),
  ],
  validate,
  habitController.updateHabit
);

// PATCH /api/habits/:id/archive
router.patch(
  '/:id/archive',
  [param('id').isMongoId().withMessage('Invalid habit ID format')],
  validate,
  habitController.toggleArchive
);

module.exports = router;
