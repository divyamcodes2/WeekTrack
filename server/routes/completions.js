const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const completionController = require('../controllers/completionController');

const router = express.Router();

router.use(auth);

// POST /api/completions — toggle completion
router.post(
  '/',
  [
    body('habitId').notEmpty().withMessage('habitId is required'),
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be YYYY-MM-DD'),
  ],
  validate,
  completionController.toggleCompletion
);

// GET /api/completions?startDate=&endDate=
router.get('/', completionController.getCompletions);

// POST /api/completions/freeze
router.post(
  '/freeze',
  [
    body('habitId').notEmpty().withMessage('habitId is required'),
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be YYYY-MM-DD'),
  ],
  validate,
  completionController.applyFreeze
);

module.exports = router;
