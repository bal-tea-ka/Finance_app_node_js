// server/validators/transactionValidator.js
const { body, param, query } = require('express-validator');

const createTransactionValidation = [
    body('categoryId')
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required'),
    
    body('amount')
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number between 0.01 and 999999999.99'),
    
    body('date')
        .isISO8601()
        .withMessage('Date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)')
        .toDate(),
    
    body('comment')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Comment must not exceed 500 characters')
        .trim()
        .escape()
];

// Для PUT/PATCH - все поля optional
const updateTransactionValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid transaction ID is required'),
    
    body('categoryId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required'),
    
    body('amount')
        .optional()
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number between 0.01 and 999999999.99'),
    
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be in ISO 8601 format')
        .toDate(),
    
    body('comment')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Comment must not exceed 500 characters')
        .trim()
        .escape()
];

// Валидация для фильтров GET /transactions
const getTransactionsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    query('categoryId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Category ID must be a positive integer')
        .toInt(),
    
    query('from', 'Invalid from date')
        .optional()
        .isISO8601()
        .toDate(),
    
    query('to', 'Invalid to date')
        .optional()
        .isISO8601()
        .toDate()
        .custom((to, { req }) => {
            if (req.query.from && to) {
                if (new Date(to) <= new Date(req.query.from)) {
                    throw new Error('"to" date must be after "from" date');
                }
            }
            return true;
        })
];

const transactionIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid transaction ID is required')
];

module.exports = {
    createTransactionValidation,
    updateTransactionValidation,
    getTransactionsValidation,
    transactionIdValidation
};
