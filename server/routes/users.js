const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// PUT /api/users/gemini-key - Save/update Gemini API key
router.put(
  '/gemini-key',
  [
    body('apiKey')
      .trim()
      .notEmpty()
      .withMessage('API key is required')
      .isString()
      .withMessage('API key must be a valid string')
      .isLength({ min: 10, max: 200 })
      .withMessage('API key must be between 10 and 200 characters'),
  ],
  validate,
  userController.saveGeminiKey
);

// GET /api/users/gemini-key/status - Check if user has a key saved
router.get('/gemini-key/status', userController.getGeminiKeyStatus);

// DELETE /api/users/gemini-key - Remove Gemini API key
router.delete('/gemini-key', userController.deleteGeminiKey);

module.exports = router;
