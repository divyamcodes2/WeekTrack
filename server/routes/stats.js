const express = require('express');
const auth = require('../middleware/auth');
const statsController = require('../controllers/statsController');

const router = express.Router();

router.use(auth);

// GET /api/stats/overview
router.get('/overview', statsController.getOverview);

// GET /api/stats/heatmap
router.get('/heatmap', statsController.getHeatmap);

// GET /api/stats/streaks
router.get('/streaks', statsController.getStreaks);

// GET /api/stats/weekly-chart
router.get('/weekly-chart', statsController.getWeeklyChart);

module.exports = router;
