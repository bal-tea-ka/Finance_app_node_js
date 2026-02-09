// server/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Все роуты требуют аутентификации
router.use(authMiddleware);

// GET /api/analytics/summary - общая сводка
router.get('/summary', analyticsController.getSummary);

// GET /api/analytics/categories - статистика по категориям
router.get('/categories', analyticsController.getCategoryStats);

// GET /api/analytics/daily - динамика по дням
router.get('/daily', analyticsController.getDailyStats);

// GET /api/analytics/monthly - динамика по месяцам
router.get('/monthly', analyticsController.getMonthlyStats);

// GET /api/analytics/top-categories - топ категорий
router.get('/top-categories', analyticsController.getTopCategories);

module.exports = router;
