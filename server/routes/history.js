const express = require('express');
const auth = require('../middleware/auth');
const historyController = require('../controllers/historyController');

const router = express.Router();

router.use(auth);

// GET /api/history
router.get('/', historyController.getHistory);

module.exports = router;
