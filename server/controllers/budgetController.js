// server/controllers/budgetController.js
const Budget = require('../models/Budget');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Получить все бюджеты пользователя
 * GET /api/budgets
 */
const getBudgets = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Предполагается, что authMiddleware добавляет user в req
    const { isActive, period } = req.query;

    const filters = {};
    if (isActive !== undefined) filters.isActive = isActive;
    if (period) filters.period = period;

    const budgets = await Budget.findByUserId(userId, filters);

    res.status(200).json({
        success: true,
        count: budgets.length,
        data: budgets
    });
});

/**
 * Получить один бюджет по ID
 * GET /api/budgets/:id
 */
const getBudgetById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = parseInt(req.params.id);

    const budget = await Budget.findById(budgetId, userId);

    res.status(200).json({
        success: true,
        data: budget
    });
});

/**
 * Создать новый бюджет
 * POST /api/budgets
 */
const createBudget = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { categoryId, amount, period, startDate, endDate } = req.body;

    const budget = await Budget.create(userId, {
        categoryId,
        amount,
        period,
        startDate,
        endDate
    });

    res.status(201).json({
        success: true,
        message: 'Budget created successfully',
        data: budget
    });
});

/**
 * Обновить бюджет
 * PUT /api/budgets/:id
 */
const updateBudget = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = parseInt(req.params.id);
    const { amount, period, startDate, endDate, isActive } = req.body;

    const budget = await Budget.update(budgetId, userId, {
        amount,
        period,
        startDate,
        endDate,
        isActive
    });

    res.status(200).json({
        success: true,
        message: 'Budget updated successfully',
        data: budget
    });
});

/**
 * Удалить бюджет
 * DELETE /api/budgets/:id
 */
const deleteBudget = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = parseInt(req.params.id);

    await Budget.delete(budgetId, userId);

    res.status(200).json({
        success: true,
        message: 'Budget deleted successfully'
    });
});

/**
 * Получить статистику по бюджету (потраченная сумма)
 * GET /api/budgets/:id/spent
 */
const getBudgetSpent = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = parseInt(req.params.id);

    const budget = await Budget.findById(budgetId, userId);
    const spent = await Budget.getSpentAmount(budgetId, userId);
    const percentage = (spent / budget.amount) * 100;

    res.status(200).json({
        success: true,
        data: {
            budgetId: budget.id,
            budgetAmount: budget.amount,
            spent,
            remaining: budget.amount - spent,
            percentage: Math.round(percentage * 100) / 100,
            status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
        }
    });
});

/**
 * Получить непрочитанные алерты
 * GET /api/budgets/alerts/unread
 */
const getUnreadAlerts = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const alerts = await Budget.getUnreadAlerts(userId);

    res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts
    });
});

/**
 * Отметить алерт как прочитанный
 * PATCH /api/budgets/alerts/:alertId/read
 */
const markAlertAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const alertId = parseInt(req.params.alertId);

    const alert = await Budget.markAlertAsRead(alertId, userId);

    res.status(200).json({
        success: true,
        message: 'Alert marked as read',
        data: alert
    });
});

/**
 * Проверить все бюджеты пользователя
 * POST /api/budgets/check
 */
const checkBudgets = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const alerts = await Budget.checkBudgets(userId);

    res.status(200).json({
        success: true,
        message: 'Budgets checked successfully',
        alertsCreated: alerts.length,
        data: alerts
    });
});

module.exports = {
    getBudgets,
    getBudgetById,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetSpent,
    getUnreadAlerts,
    markAlertAsRead,
    checkBudgets
};
