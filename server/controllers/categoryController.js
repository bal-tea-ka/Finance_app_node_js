// server/controllers/categoryController.js
const Category = require('../models/Category');
const { asyncHandler } = require('../middleware/errorHandler');

// Получить все категории пользователя
exports.getAll = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        type: req.query.type
    };

    const categories = await Category.findAll(userId, filters);

    res.json({
        success: true,
        count: categories.length,
        data: categories
    });
});

// Получить одну категорию по ID
exports.getById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id);

    const category = await Category.findById(categoryId, userId);

    res.json({
        success: true,
        data: category
    });
});

// Создать новую категорию
exports.create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, type } = req.body;

    const category = await Category.create(userId, {
        name,
        type
    });

    res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
    });
});

// Обновить категорию
exports.update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id);
    const { name, type } = req.body;

    const category = await Category.update(categoryId, userId, {
        name,
        type
    });

    res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
    });
});

// Удалить категорию
exports.delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const categoryId = parseInt(req.params.id);

    await Category.delete(categoryId, userId);

    res.json({
        success: true,
        message: 'Category deleted successfully'
    });
});

// Получить статистику по категориям
exports.getStatistics = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        from: req.query.from,
        to: req.query.to,
        type: req.query.type
    };

    const statistics = await Category.getStatistics(userId, filters);

    res.json({
        success: true,
        count: statistics.length,
        data: statistics
    });
});
