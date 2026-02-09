// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
    createCategoryValidation,
    updateCategoryValidation,
    categoryIdValidation,
    getCategoriesValidation
} = require('../validators/categoryValidator');

const { param } = require('express-validator');

// Все роуты требуют аутентификации
router.use(authMiddleware);

// GET /api/categories - получить все категории
router.get('/', categoryController.getAll);

// GET /api/categories/statistics - получить статистику по категориям
router.get('/statistics', categoryController.getStatistics);

// GET /api/categories/:id - получить одну категорию
router.get(
    '/:id',
    [param('id').isInt({ min: 1 }).withMessage('Valid category ID is required')],
    validateRequest,
    categoryController.getById
);

// POST /api/categories - создать новую категорию
router.post(
    '/',
    categoryValidation,
    validateRequest,
    categoryController.create
);

// PUT /api/categories/:id - обновить категорию
router.put(
    '/:id',
    [
        param('id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
        ...categoryValidation
    ],
    validateRequest,
    categoryController.update
);

// DELETE /api/categories/:id - удалить категорию
router.delete(
    '/:id',
    [param('id').isInt({ min: 1 }).withMessage('Valid category ID is required')],
    validateRequest,
    categoryController.delete
);

module.exports = router;
