// server/controllers/categoryController.js
const db = require('../db/db');

// Получить все категории ТЕКУЩЕГО пользователя
exports.getAll = async (req, res) => {
    try {
        const userId = req.user.id; // <--- Вот оно! Безопасность.
        
        const query = `
            SELECT * FROM categories 
            WHERE user_id = $1 
            ORDER BY type, name
        `;
        const result = await db.query(query, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Создать новую категорию
exports.create = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, type } = req.body; // type = 'income' или 'expense'

        // Валидация
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ error: 'Type must be income or expense' });
        }

        const query = `
            INSERT INTO categories (user_id, name, type) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const result = await db.query(query, [userId, name, type]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Удалить категорию (Только свою!)
exports.delete = async (req, res) => {
    try {
        const userId = req.user.id;
        const categoryId = req.params.id;

        // Удаляем только если category_id совпадает AND user_id совпадает
        const query = 'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await db.query(query, [categoryId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Category not found or access denied' });
        }

        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
