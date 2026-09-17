const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const pomodoroController = require('../controllers/pomodoroController');

const router = express.Router();

router.use(auth);

// POST /api/pomodoro
router.post(
  '/',
  [
    body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('type').isIn(['work', 'break']).withMessage('Type must be work or break'),
  ],
  validate,
  pomodoroController.createSession
);

// GET /api/pomodoro?startDate=&endDate=
router.get('/', pomodoroController.getSessions);

module.exports = router;
