const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// Все роуты требуют аутентификации
router.use(authMiddleware);

// Получить общую сводку
router.get('/summary', analyticsController.getSummary);

// Получить статистику по категориям
router.get('/by-category', analyticsController.getCategoryStats);

// Получить статистику по дням
router.get('/daily', analyticsController.getDailyStats);

module.exports = router;
