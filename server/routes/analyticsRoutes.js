const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/summary', analyticsController.getSummary);
router.get('/categories', analyticsController.getCategoryStats);
router.get('/daily', analyticsController.getDailyStats);
router.get('/budget-analysis', analyticsController.getBudgetAnalysis);

module.exports = router;
