const Budget = require('../models/Budget');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ConflictError } = require('../utils/errors');

// Получить все бюджеты пользователя
exports.getAll = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const filters = {
        isActive: req.query.isActive,
        period: req.query.period
    };
    
    const budgets = await Budget.findByUserId(userId, filters);
    
    // Добавляем информацию о потраченной сумме к каждому бюджету
    const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
            const spent = await Budget.getSpentAmount(budget.id, userId);
            const remaining = budget.amount - spent;
            const percentage = (spent / budget.amount) * 100;
            
            return {
                ...budget,
                spent: parseFloat(spent.toFixed(2)),
                remaining: parseFloat(remaining.toFixed(2)),
                percentage: parseFloat(percentage.toFixed(2)),
                status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
            };
        })
    );
    
    res.json({
        success: true,
        budgets: budgetsWithSpent
    });
});

// Получить один бюджет
exports.getOne = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = req.params.id;
    
    const budget = await Budget.findById(budgetId, userId);
    
    if (!budget) {
        throw new NotFoundError('Budget not found');
    }
    
    const spent = await Budget.getSpentAmount(budgetId, userId);
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    
    res.json({
        success: true,
        budget: {
            ...budget,
            spent: parseFloat(spent.toFixed(2)),
            remaining: parseFloat(remaining.toFixed(2)),
            percentage: parseFloat(percentage.toFixed(2)),
            status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok'
        }
    });
});

// Создать бюджет
exports.create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { categoryId, amount, period, startDate, endDate } = req.body;
    
    // Проверяем, что категория принадлежит пользователю
    const db = require('../db/db');
    const categoryCheck = await db.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [categoryId, userId]
    );
    
    if (categoryCheck.rows.length === 0) {
        throw new NotFoundError('Category not found or does not belong to you');
    }
    
    // Проверяем, нет ли уже активного бюджета на эту категорию в этот период
    const existingBudget = await db.query(
        `SELECT id FROM budgets 
         WHERE user_id = $1 
         AND category_id = $2 
         AND period = $3 
         AND start_date = $4 
         AND is_active = true`,
        [userId, categoryId, period, startDate]
    );
    
    if (existingBudget.rows.length > 0) {
        throw new ConflictError('Active budget for this category and period already exists');
    }
    
    const budget = await Budget.create(userId, {
        categoryId,
        amount,
        period,
        startDate,
        endDate
    });
    
    res.status(201).json({
        success: true,
        budget
    });
});

// Обновить бюджет
exports.update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = req.params.id;
    const { amount, period, startDate, endDate, isActive } = req.body;
    
    const existingBudget = await Budget.findById(budgetId, userId);
    
    if (!existingBudget) {
        throw new NotFoundError('Budget not found');
    }
    
    const updatedBudget = await Budget.update(budgetId, userId, {
        amount,
        period,
        startDate,
        endDate,
        isActive
    });
    
    res.json({
        success: true,
        budget: updatedBudget
    });
});

// Удалить бюджет
exports.delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = req.params.id;
    
    const deleted = await Budget.delete(budgetId, userId);
    
    if (!deleted) {
        throw new NotFoundError('Budget not found');
    }
    
    res.json({
        success: true,
        message: 'Budget deleted successfully'
    });
});

// Получить статус всех бюджетов (сводка)
exports.getStatus = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const budgets = await Budget.findByUserId(userId, { isActive: true });
    
    let totalBudget = 0;
    let totalSpent = 0;
    let exceededCount = 0;
    let warningCount = 0;
    
    const statusDetails = await Promise.all(
        budgets.map(async (budget) => {
            const spent = await Budget.getSpentAmount(budget.id, userId);
            const percentage = (spent / budget.amount) * 100;
            
            totalBudget += parseFloat(budget.amount);
            totalSpent += spent;
            
            if (percentage >= 100) exceededCount++;
            else if (percentage >= 80) warningCount++;
            
            return {
                budgetId: budget.id,
                categoryName: budget.category_name,
                amount: parseFloat(budget.amount),
                spent: parseFloat(spent.toFixed(2)),
                percentage: parseFloat(percentage.toFixed(2))
            };
        })
    );
    
    res.json({
        success: true,
        summary: {
            totalBudgets: budgets.length,
            totalBudget: parseFloat(totalBudget.toFixed(2)),
            totalSpent: parseFloat(totalSpent.toFixed(2)),
            exceededCount,
            warningCount,
            okCount: budgets.length - exceededCount - warningCount
        },
        budgets: statusDetails
    });
});

// Получить уведомления о бюджетах
exports.getAlerts = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const alerts = await Budget.getUnreadAlerts(userId);
    
    res.json({
        success: true,
        alerts
    });
});

// Отметить уведомление как прочитанное
exports.markAlertAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const alertId = req.params.alertId;
    
    const alert = await Budget.markAlertAsRead(alertId, userId);
    
    if (!alert) {
        throw new NotFoundError('Alert not found');
    }
    
    res.json({
        success: true,
        alert
    });
});

// Проверить все бюджеты и создать алерты
exports.checkBudgets = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const alerts = await Budget.checkBudgets(userId);
    
    res.json({
        success: true,
        message: 'Budgets checked successfully',
        newAlerts: alerts.length,
        alerts
    });
});
