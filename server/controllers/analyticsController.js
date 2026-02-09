// server/controllers/analyticsController.js
const Analytics = require('../models/Analytics');
const { asyncHandler } = require('../middleware/errorHandler');

// Получить общую сводку (баланс, приход, расход)
exports.getSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        from: req.query.from,
        to: req.query.to
    };

    const summary = await Analytics.getSummary(userId, filters);

    res.json({
        success: true,
        data: summary
    });
});

// Получить статистику по категориям (для круговой диаграммы)
exports.getCategoryStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        from: req.query.from,
        to: req.query.to,
        type: req.query.type || 'expense'
    };

    const stats = await Analytics.getCategoryStats(userId, filters);

    // Рассчитываем процентное соотношение
    const total = stats.reduce((sum, item) => sum + item.total, 0);
    const statsWithPercentage = stats.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.total / total) * 10000) / 100 : 0
    }));

    res.json({
        success: true,
        count: statsWithPercentage.length,
        total,
        data: statsWithPercentage
    });
});

// Получить динамику по дням (для линейного графика)
exports.getDailyStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit
    };

    const stats = await Analytics.getDailyStats(userId, filters);

    res.json({
        success: true,
        count: stats.length,
        data: stats
    });
});

// Получить статистику по месяцам
exports.getMonthlyStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        limit: req.query.limit
    };

    const stats = await Analytics.getMonthlyStats(userId, filters);

    res.json({
        success: true,
        count: stats.length,
        data: stats
    });
});

// Получить топ категорий
exports.getTopCategories = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        from: req.query.from,
        to: req.query.to,
        type: req.query.type || 'expense',
        limit: req.query.limit
    };

    const topCategories = await Analytics.getTopCategories(userId, filters);

    res.json({
        success: true,
        count: topCategories.length,
        data: topCategories
    });
});
