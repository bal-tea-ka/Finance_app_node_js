// server/models/Category.js
const db = require('../db/db');
const {
    CategoryError,
    CategoryNotFoundError,
    CategoryValidationError,
    ConflictError,
    DatabaseError
} = require('../utils/errors');

class Category {
    // Валидация ID
    static validateId(id, fieldName = 'ID') {
        if (!id || !Number.isInteger(id) || id <= 0) {
            throw new CategoryValidationError(`Valid ${fieldName} is required`);
        }
    }

    // Валидация данных категории
    static validateCategoryData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.name) {
            errors.push('Category name is required');
        }

        if (data.name && typeof data.name !== 'string') {
            errors.push('Category name must be a string');
        }

        if (data.name && (data.name.trim().length < 1 || data.name.length > 100)) {
            errors.push('Category name must be between 1 and 100 characters');
        }

        if (!isUpdate && !data.type) {
            errors.push('Category type is required');
        }

        if (data.type && !['income', 'expense'].includes(data.type)) {
            errors.push('Category type must be either "income" or "expense"');
        }

        if (errors.length > 0) {
            throw new CategoryValidationError('Category validation failed', errors);
        }
    }

    // Получить все категории пользователя
    static async findAll(userId, filters = {}) {
        try {
            Category.validateId(userId, 'user ID');

            let query = `
                SELECT c.*, 
                    COUNT(t.id)::int as transaction_count,
                    COALESCE(SUM(t.amount), 0) as total_amount
                FROM categories c
                LEFT JOIN transactions t ON c.id = t.category_id
                WHERE c.user_id = $1
            `;

            const params = [userId];
            let paramIndex = 2;

            // Фильтр по типу
            if (filters.type && ['income', 'expense'].includes(filters.type)) {
                query += ` AND c.type = $${paramIndex}`;
                params.push(filters.type);
                paramIndex++;
            }

            query += ' GROUP BY c.id ORDER BY c.created_at DESC';

            const result = await db.query(query, params);

            return result.rows.map(row => ({
                ...row,
                total_amount: parseFloat(row.total_amount)
            }));
        } catch (error) {
            if (error instanceof CategoryError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch categories for user ${userId}`, error);
        }
    }

    // Получить одну категорию по ID
    static async findById(categoryId, userId) {
        try {
            Category.validateId(categoryId, 'category ID');
            Category.validateId(userId, 'user ID');

            const query = `
                SELECT c.*,
                    COUNT(t.id)::int as transaction_count,
                    COALESCE(SUM(t.amount), 0) as total_amount
                FROM categories c
                LEFT JOIN transactions t ON c.id = t.category_id
                WHERE c.id = $1 AND c.user_id = $2
                GROUP BY c.id
            `;

            const result = await db.query(query, [categoryId, userId]);

            if (result.rows.length === 0) {
                throw new CategoryNotFoundError(categoryId);
            }

            return {
                ...result.rows[0],
                total_amount: parseFloat(result.rows[0].total_amount)
            };
        } catch (error) {
            if (error instanceof CategoryError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch category ${categoryId}`, error);
        }
    }

    // Создать новую категорию
    static async create(userId, data) {
        try {
            Category.validateId(userId, 'user ID');
            Category.validateCategoryData(data, false);

            const { name, type } = data;

            // Проверка на дублирование имени категории
            const duplicateCheck = await db.query(
                'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
                [userId, name.trim()]
            );

            if (duplicateCheck.rows.length > 0) {
                throw new ConflictError(`Category with name "${name}" already exists`);
            }

            const query = `
                INSERT INTO categories (user_id, name, type)
                VALUES ($1, $2, $3)
                RETURNING *
            `;

            const result = await db.query(query, [userId, name.trim(), type]);

            return result.rows[0];
        } catch (error) {
            if (error instanceof CategoryError || error instanceof ConflictError) {
                throw error;
            }
            throw new DatabaseError(`Failed to create category for user ${userId}`, error);
        }
    }

    // Обновить категорию
    static async update(categoryId, userId, data) {
        try {
            Category.validateId(categoryId, 'category ID');
            Category.validateId(userId, 'user ID');

            // Проверка существования категории
            await Category.findById(categoryId, userId);

            // Валидация данных для обновления
            Category.validateCategoryData(data, true);

            const { name, type } = data;

            // Проверка на дублирование имени при изменении
            if (name) {
                const duplicateCheck = await db.query(
                    'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
                    [userId, name.trim(), categoryId]
                );

                if (duplicateCheck.rows.length > 0) {
                    throw new ConflictError(`Category with name "${name}" already exists`);
                }
            }

            const query = `
                UPDATE categories
                SET name = COALESCE($1, name),
                    type = COALESCE($2, type)
                WHERE id = $3 AND user_id = $4
                RETURNING *
            `;

            const result = await db.query(query, [
                name ? name.trim() : null,
                type,
                categoryId,
                userId
            ]);

            return result.rows[0];
        } catch (error) {
            if (error instanceof CategoryError || error instanceof ConflictError) {
                throw error;
            }
            throw new DatabaseError(`Failed to update category ${categoryId}`, error);
        }
    }

    // Удалить категорию
    static async delete(categoryId, userId) {
        try {
            Category.validateId(categoryId, 'category ID');
            Category.validateId(userId, 'user ID');

            // Проверка существования категории
            const category = await Category.findById(categoryId, userId);

            // Проверка, есть ли транзакции с этой категорией
            if (category.transaction_count > 0) {
                throw new ConflictError(
                    `Cannot delete category with ${category.transaction_count} associated transactions. ` +
                    `Please delete or reassign transactions first.`
                );
            }

            const query = 'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id';
            const result = await db.query(query, [categoryId, userId]);

            return result.rowCount > 0;
        } catch (error) {
            if (error instanceof CategoryError || error instanceof ConflictError) {
                throw error;
            }
            throw new DatabaseError(`Failed to delete category ${categoryId}`, error);
        }
    }

    // Получить статистику по категориям
    static async getStatistics(userId, filters = {}) {
        try {
            Category.validateId(userId, 'user ID');

            const from = filters.from || null;
            const to = filters.to || null;
            const type = filters.type || null;

            const query = `
                SELECT 
                    c.id,
                    c.name,
                    c.type,
                    COUNT(t.id)::int as transaction_count,
                    COALESCE(SUM(t.amount), 0) as total_amount,
                    COALESCE(AVG(t.amount), 0) as avg_amount,
                    MAX(t.date) as last_transaction_date
                FROM categories c
                LEFT JOIN transactions t ON c.id = t.category_id
                    AND ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
                    AND ($3::timestamptz IS NULL OR t.date < $3::timestamptz)
                WHERE c.user_id = $1
                    AND ($4::text IS NULL OR c.type = $4::text)
                GROUP BY c.id, c.name, c.type
                ORDER BY total_amount DESC
            `;

            const result = await db.query(query, [userId, from, to, type]);

            return result.rows.map(row => ({
                ...row,
                total_amount: parseFloat(row.total_amount),
                avg_amount: parseFloat(row.avg_amount)
            }));
        } catch (error) {
            if (error instanceof CategoryError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get category statistics for user ${userId}`, error);
        }
    }
}

module.exports = Category;
