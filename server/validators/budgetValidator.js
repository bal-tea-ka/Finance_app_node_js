const { body, param, query } = require('express-validator');

const createBudgetValidation = [
    body('categoryId')
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required'),
    
    body('amount')
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number'),
    
    body('period')
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('Period must be one of: daily, weekly, monthly, yearly'),
    
    body('startDate')
        .isISO8601()
        .withMessage('Start date must be in ISO 8601 format')
        .toDate(),
    
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be in ISO 8601 format')
        .toDate()
        .custom((endDate, { req }) => {
            if (endDate && req.body.startDate) {
                const start = new Date(req.body.startDate);
                const end = new Date(endDate);
                if (end <= start) {
                    throw new Error('End date must be after start date');
                }
            }
            return true;
        })
];

const updateBudgetValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid budget ID is required'),
    
    body('amount')
        .optional()
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number'),
    
    body('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('Period must be one of: daily, weekly, monthly, yearly'),
    
    body('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be in ISO 8601 format')
        .toDate(),
    
    body('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be in ISO 8601 format')
        .toDate(),
    
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];

const getBudgetsValidation = [
    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
        .toBoolean(),
    
    query('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('Period must be one of: daily, weekly, monthly, yearly')
];

const budgetIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid budget ID is required')
];

// Добавьте эти валидаторы в существующий файл budgetValidator.js

const alertIdValidation = [
    param('alertId')
        .isInt({ min: 1 })
        .withMessage('Valid alert ID is required')
];

// Валидация фильтров для получения бюджетов (улучшенная версия)
const enhancedGetBudgetsValidation = [
    query('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
        .toBoolean(),
    
    query('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'yearly'])
        .withMessage('Period must be one of: daily, weekly, monthly, yearly'),
    
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt()
];


const getAlertsValidation = [
    query('unread')
        .optional()
        .isBoolean()
        .withMessage('Unread must be a boolean')
        .toBoolean()
];


module.exports = {
    createBudgetValidation,
    updateBudgetValidation,
    getBudgetsValidation,
    budgetIdValidation,
    alertIdValidation,
    enhancedGetBudgetsValidation,
    getAlertsValidation
};


