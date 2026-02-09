const { body } = require('express-validator');

const createCategoryValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Category name must be between 2 and 50 characters'),
    
    body('type')
        .notEmpty()
        .withMessage('Category type is required')
        .isIn(['income', 'expense'])
        .withMessage('Type must be either "income" or "expense"')
];

module.exports = {
    createCategoryValidation
};
