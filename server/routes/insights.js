const express = require('express');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const insightsController = require('../controllers/insightsController');
const { insightsLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/insights - retrieve at-risk habit insights (serves 24h cache)
router.get('/', insightsController.getInsights);

// GET /api/insights/metrics - pure computation metrics for Insights page (cached)
router.get('/metrics', insightsController.getInsightsMetrics);

// POST /api/insights/refresh - force recalculation bypassing 24h cache (Rate limited: max 10/hour per user)
router.post('/refresh', insightsLimiter, insightsController.refreshInsights);

// PATCH /api/insights/:habitId/dismiss - dismiss an insight
router.patch(
  '/:habitId/dismiss',
  [param('habitId').isMongoId().withMessage('Invalid habit ID format')],
  validate,
  insightsController.dismissInsight
);

module.exports = router;
