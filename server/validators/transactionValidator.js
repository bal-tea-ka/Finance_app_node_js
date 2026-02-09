const { body, query } = require('express-validator');

const createTransactionValidation = [
    body('categoryId')
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required'),
    
    body('amount')
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number less than 1 billion'),
    
    body('date')
        .isISO8601()
        .withMessage('Please provide a valid date in ISO 8601 format')
        .toDate(),
    
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment cannot exceed 500 characters')
];

const getTransactionsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('from')
        .optional()
        .isISO8601()
        .withMessage('From date must be in ISO 8601 format'),
    
    query('to')
        .optional()
        .isISO8601()
        .withMessage('To date must be in ISO 8601 format'),
    
    query('categoryId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer'),
    
    query('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be either "income" or "expense"')
];

module.exports = {
    createTransactionValidation,
    getTransactionsValidation
};
