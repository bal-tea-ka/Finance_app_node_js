// server/validators/categoryValidator.js
const { body, param, query } = require('express-validator');

const createCategoryValidation = [
    body('name')
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Category name must be between 1 and 100 characters')
        .trim()
        .escape(),
    
    body('type')
        .isIn(['income', 'expense'])
        .withMessage('Type must be "income" or "expense"')
];

const updateCategoryValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required'),
    
    body('name')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category name must be between 1 and 100 characters')
        .trim()
        .escape(),
    
    body('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be "income" or "expense"')
];

const categoryIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Valid category ID is required')
];

const getCategoriesValidation = [
    query('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be "income" or "expense"')
];

module.exports = {
    createCategoryValidation,
    updateCategoryValidation,
    categoryIdValidation,
    getCategoriesValidation
};
