const express = require('express');
const { body } = require('express-validator');
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
router.get('/:id', habitController.getHabit);

// POST /api/habits
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Habit name is required'),
    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex code'),
  ],
  validate,
  habitController.createHabit
);

// PUT /api/habits/:id
router.put('/:id', habitController.updateHabit);

// PATCH /api/habits/:id/archive
router.patch('/:id/archive', habitController.toggleArchive);

module.exports = router;
