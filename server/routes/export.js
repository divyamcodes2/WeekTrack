const express = require('express');
const auth = require('../middleware/auth');
const exportController = require('../controllers/exportController');

const router = express.Router();

router.use(auth);

// GET /api/export/json
router.get('/json', exportController.exportJSON);

// GET /api/export/csv
router.get('/csv', exportController.exportCSV);

module.exports = router;
