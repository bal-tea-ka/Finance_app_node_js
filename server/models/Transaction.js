// server/models/Transaction.js
const db = require('../db/db');
const {
    TransactionError,
    TransactionNotFoundError,
    TransactionValidationError,
    DatabaseError
} = require('../utils/errors');

class Transaction {
    // Валидация ID
    static validateId(id, fieldName = 'ID') {
        if (!id || !Number.isInteger(id) || id <= 0) {
            throw new TransactionValidationError(`Valid ${fieldName} is required`);
        }
    }

    // Валидация данных транзакции
    static validateTransactionData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.categoryId) {
            errors.push('Category ID is required');
        }

        if (data.categoryId && (!Number.isInteger(data.categoryId) || data.categoryId <= 0)) {
            errors.push('Category ID must be a positive integer');
        }

        if (!isUpdate && data.amount === undefined) {
            errors.push('Amount is required');
        }

        if (data.amount !== undefined) {
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0 || amount > 999999999.99) {
                errors.push('Amount must be a positive number up to 999999999.99');
            }
        }

        if (!isUpdate && !data.date) {
            errors.push('Date is required');
        }

        if (data.date && !(data.date instanceof Date) && isNaN(Date.parse(data.date))) {
            errors.push('Date must be a valid date');
        }

        if (data.comment && typeof data.comment !== 'string') {
            errors.push('Comment must be a string');
        }

        if (data.comment && data.comment.length > 500) {
            errors.push('Comment must not exceed 500 characters');
        }

        if (errors.length > 0) {
            throw new TransactionValidationError('Transaction validation failed', errors);
        }
    }

    // Получить все транзакции с фильтрами и пагинацией
    static async findAll(userId, filters = {}) {
        try {
            Transaction.validateId(userId, 'user ID');

            const page = Math.max(parseInt(filters.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(filters.limit) || 10, 1), 100);
            const offset = (page - 1) * limit;

            const from = filters.from || null;
            const to = filters.to || null;
            const categoryId = filters.categoryId ? Number(filters.categoryId) : null;
            const type = filters.type || null;
            const qRaw = (filters.q || '').trim();
            const q = qRaw.length ? `%${qRaw}%` : null;

            const whereSql = `
                WHERE t.user_id = $1
                    AND ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
                    AND ($3::timestamptz IS NULL OR t.date <  $3::timestamptz)
                    AND ($4::int IS NULL OR t.category_id = $4::int)
                    AND ($5::text IS NULL OR c.type = $5::text)
                    AND ($6::text IS NULL OR t.comment ILIKE $6::text)
            `;

            const paramsBase = [userId, from, to, categoryId, type, q];

            // Запрос для получения транзакций
            const itemsQuery = `
                SELECT t.*, c.name as category_name, c.type as category_type
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                ${whereSql}
                ORDER BY t.date DESC
                LIMIT $7 OFFSET $8
            `;
            const itemsParams = [...paramsBase, limit, offset];
            const itemsResult = await db.query(itemsQuery, itemsParams);

            // Запрос для подсчета общего количества
            const totalQuery = `
                SELECT COUNT(*)::int AS total
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                ${whereSql}
            `;
            const totalResult = await db.query(totalQuery, paramsBase);
            const total = Number(totalResult.rows[0]?.total ?? 0);

            return {
                items: itemsResult.rows,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            if (error instanceof TransactionError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch transactions for user ${userId}`, error);
        }
    }

    // Получить одну транзакцию по ID
    static async findById(transactionId, userId) {
        try {
            Transaction.validateId(transactionId, 'transaction ID');
            Transaction.validateId(userId, 'user ID');

            const query = `
                SELECT t.*, c.name as category_name, c.type as category_type
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.id = $1 AND t.user_id = $2
            `;

            const result = await db.query(query, [transactionId, userId]);

            if (result.rows.length === 0) {
                throw new TransactionNotFoundError(transactionId);
            }

            return result.rows[0];
        } catch (error) {
            if (error instanceof TransactionError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch transaction ${transactionId}`, error);
        }
    }

    // Создать новую транзакцию
    static async create(userId, data) {
        try {
            Transaction.validateId(userId, 'user ID');
            Transaction.validateTransactionData(data, false);

            const { categoryId, amount, date, comment } = data;

            // Проверка существования категории
            const categoryCheck = await db.query(
                'SELECT id, type FROM categories WHERE id = $1 AND user_id = $2',
                [categoryId, userId]
            );

            if (categoryCheck.rows.length === 0) {
                throw new TransactionValidationError(
                    `Category with ID ${categoryId} not found or does not belong to user`
                );
            }

            const query = `
                INSERT INTO transactions (user_id, category_id, amount, date, comment)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const result = await db.query(query, [
                userId,
                categoryId,
                amount,
                date,
                comment || null
            ]);

            // Получаем полную информацию о транзакции с категорией
            return await Transaction.findById(result.rows[0].id, userId);
        } catch (error) {
            if (error instanceof TransactionError) {
                throw error;
            }
            throw new DatabaseError(`Failed to create transaction for user ${userId}`, error);
        }
    }

    // Обновить транзакцию
    static async update(transactionId, userId, data) {
        try {
            Transaction.validateId(transactionId, 'transaction ID');
            Transaction.validateId(userId, 'user ID');

            // Проверка существования транзакции
            await Transaction.findById(transactionId, userId);

            // Валидация данных для обновления
            Transaction.validateTransactionData(data, true);

            const { categoryId, amount, date, comment } = data;

            // Если меняется категория, проверяем её существование
            if (categoryId) {
                const categoryCheck = await db.query(
                    'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
                    [categoryId, userId]
                );

                if (categoryCheck.rows.length === 0) {
                    throw new TransactionValidationError(
                        `Category with ID ${categoryId} not found or does not belong to user`
                    );
                }
            }

            const query = `
                UPDATE transactions
                SET category_id = COALESCE($1, category_id),
                    amount = COALESCE($2, amount),
                    date = COALESCE($3, date),
                    comment = COALESCE($4, comment)
                WHERE id = $5 AND user_id = $6
                RETURNING *
            `;

            const result = await db.query(query, [
                categoryId,
                amount,
                date,
                comment,
                transactionId,
                userId
            ]);

            return await Transaction.findById(result.rows[0].id, userId);
        } catch (error) {
            if (error instanceof TransactionError) {
                throw error;
            }
            throw new DatabaseError(`Failed to update transaction ${transactionId}`, error);
        }
    }

    // Удалить транзакцию
    static async delete(transactionId, userId) {
        try {
            Transaction.validateId(transactionId, 'transaction ID');
            Transaction.validateId(userId, 'user ID');

            // Проверка существования транзакции
            await Transaction.findById(transactionId, userId);

            const query = 'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id';
            const result = await db.query(query, [transactionId, userId]);

            return result.rowCount > 0;
        } catch (error) {
            if (error instanceof TransactionError) {
                throw error;
            }
            throw new DatabaseError(`Failed to delete transaction ${transactionId}`, error);
        }
    }

    // Получить статистику по транзакциям пользователя
    static async getStatistics(userId, filters = {}) {
        try {
            Transaction.validateId(userId, 'user ID');

            const from = filters.from || null;
            const to = filters.to || null;

            const query = `
                SELECT 
                    COUNT(*)::int as total_count,
                    SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as total_expense,
                    AVG(CASE WHEN c.type = 'expense' THEN t.amount END) as avg_expense,
                    MAX(t.amount) as max_transaction,
                    MIN(t.amount) as min_transaction
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1
                    AND ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
                    AND ($3::timestamptz IS NULL OR t.date < $3::timestamptz)
            `;

            const result = await db.query(query, [userId, from, to]);
            const data = result.rows[0];

            return {
                totalCount: data.total_count || 0,
                totalIncome: parseFloat(data.total_income || 0),
                totalExpense: parseFloat(data.total_expense || 0),
                balance: parseFloat(data.total_income || 0) - parseFloat(data.total_expense || 0),
                avgExpense: parseFloat(data.avg_expense || 0),
                maxTransaction: parseFloat(data.max_transaction || 0),
                minTransaction: parseFloat(data.min_transaction || 0)
            };
        } catch (error) {
            if (error instanceof TransactionError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get statistics for user ${userId}`, error);
        }
    }
}

module.exports = Transaction;
