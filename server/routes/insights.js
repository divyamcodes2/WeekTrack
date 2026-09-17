const express = require('express');
const auth = require('../middleware/auth');
const insightsController = require('../controllers/insightsController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/insights - retrieve at-risk habit insights
router.get('/', insightsController.getInsights);

// GET /api/insights/metrics - pure computation metrics for Insights page
router.get('/metrics', insightsController.getInsightsMetrics);

// POST /api/insights/refresh - force recalculation bypassing 24h cache
router.post('/refresh', insightsController.refreshInsights);

// PATCH /api/insights/:habitId/dismiss - dismiss an insight
router.patch('/:habitId/dismiss', insightsController.dismissInsight);

module.exports = router;
