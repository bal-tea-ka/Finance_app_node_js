const db = require('../db/db');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError } = require('../utils/errors');

// Получить все категории пользователя
exports.getAll = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const query = `
        SELECT * FROM categories 
        WHERE user_id = $1 
        ORDER BY created_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    
    res.json({
        success: true,  // Добавьте эту строку
        categories: result.rows
    });
});

// Создать новую категорию
exports.create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, type } = req.body;
    
    const query = `
        INSERT INTO categories (user_id, name, type)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    
    const result = await db.query(query, [userId, name, type]);
    
    res.status(201).json({
        success: true,  // Добавьте эту строку
        category: result.rows[0]
    });
});

// Удалить категорию
exports.delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const categoryId = req.params.id;
    
    const query = 'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id';
    const result = await db.query(query, [categoryId, userId]);
    
    if (result.rowCount === 0) {
        throw new NotFoundError('Category not found or you do not have permission to delete it');
    }
    
    res.json({
        success: true,  // Добавьте эту строку
        message: 'Category deleted successfully'
    });
});
