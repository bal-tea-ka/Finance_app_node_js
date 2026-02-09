// server/routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
    createBudgetValidation,
    updateBudgetValidation,
    getBudgetsValidation,
    budgetIdValidation
} = require('../validators/budgetValidator');

// Все роуты требуют аутентификации
router.use(authMiddleware);

// GET /api/budgets - получить все бюджеты с фильтрами
router.get(
    '/',
    getBudgetsValidation,
    validateRequest,
    budgetController.getBudgets
);

// GET /api/budgets/alerts/unread - получить непрочитанные алерты
router.get(
    '/alerts/unread',
    budgetController.getUnreadAlerts
);

// POST /api/budgets/check - проверить бюджеты
router.post(
    '/check',
    budgetController.checkBudgets
);

// GET /api/budgets/:id - получить один бюджет
router.get(
    '/:id',
    budgetIdValidation,
    validateRequest,
    budgetController.getBudgetById
);

// GET /api/budgets/:id/spent - получить статистику по бюджету
router.get(
    '/:id/spent',
    budgetIdValidation,
    validateRequest,
    budgetController.getBudgetSpent
);

// POST /api/budgets - создать новый бюджет
router.post(
    '/',
    createBudgetValidation,
    validateRequest,
    budgetController.createBudget
);

// PUT /api/budgets/:id - обновить бюджет
router.put(
    '/:id',
    updateBudgetValidation,
    validateRequest,
    budgetController.updateBudget
);

// DELETE /api/budgets/:id - удалить бюджет
router.delete(
    '/:id',
    budgetIdValidation,
    validateRequest,
    budgetController.deleteBudget
);

// PATCH /api/budgets/alerts/:alertId/read - отметить алерт как прочитанный
router.patch(
    '/alerts/:alertId/read',
    budgetController.markAlertAsRead
);

module.exports = router;
