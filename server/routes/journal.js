const express = require('express');
const auth = require('../middleware/auth');
const journalController = require('../controllers/journalController');

const router = express.Router();

router.use(auth);

// PUT /api/journal/:date
router.put('/:date', journalController.upsertEntry);

// GET /api/journal/:date
router.get('/:date', journalController.getEntry);

module.exports = router;
