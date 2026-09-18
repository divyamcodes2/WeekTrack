const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const journalController = require('../controllers/journalController');

const router = express.Router();

router.use(auth);

// PUT /api/journal/:date
router.put(
  '/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('content')
      .optional()
      .isString()
      .withMessage('Content must be text')
      .isLength({ max: 500 })
      .withMessage('Journal entry cannot exceed 500 characters'),
  ],
  validate,
  journalController.upsertEntry
);

// GET /api/journal/:date
router.get(
  '/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
  ],
  validate,
  journalController.getEntry
);

module.exports = router;
