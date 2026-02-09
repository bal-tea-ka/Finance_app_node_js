// server/models/Analytics.js
const db = require('../db/db');
const {
    AnalyticsError,
    AnalyticsValidationError,
    DatabaseError
} = require('../utils/errors');

class Analytics {
    // Валидация ID
    static validateId(id, fieldName = 'ID') {
        if (!id || !Number.isInteger(id) || id <= 0) {
            throw new AnalyticsValidationError(`Valid ${fieldName} is required`);
        }
    }

    // Валидация фильтров дат
    static validateDateFilters(filters = {}) {
        if (filters.from && isNaN(Date.parse(filters.from))) {
            throw new AnalyticsValidationError('Invalid "from" date format');
        }

        if (filters.to && isNaN(Date.parse(filters.to))) {
            throw new AnalyticsValidationError('Invalid "to" date format');
        }

        if (filters.from && filters.to) {
            const fromDate = new Date(filters.from);
            const toDate = new Date(filters.to);
            if (toDate <= fromDate) {
                throw new AnalyticsValidationError('"to" date must be after "from" date');
            }
        }
    }

    // Получить общую сводку (доход, расход, баланс)
    static async getSummary(userId, filters = {}) {
        try {
            Analytics.validateId(userId, 'user ID');
            Analytics.validateDateFilters(filters);

            const from = filters.from || null;
            const to = filters.to || null;

            const query = `
                SELECT 
                    SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as total_expense,
                    COUNT(CASE WHEN c.type = 'income' THEN 1 END)::int as income_count,
                    COUNT(CASE WHEN c.type = 'expense' THEN 1 END)::int as expense_count
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1
                    AND ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
                    AND ($3::timestamptz IS NULL OR t.date < $3::timestamptz)
            `;

            const result = await db.query(query, [userId, from, to]);
            const data = result.rows[0];

            const income = parseFloat(data.total_income || 0);
            const expense = parseFloat(data.total_expense || 0);

            return {
                income,
                expense,
                balance: income - expense,
                incomeCount: data.income_count || 0,
                expenseCount: data.expense_count || 0,
                totalTransactions: (data.income_count || 0) + (data.expense_count || 0)
            };
        } catch (error) {
            if (error instanceof AnalyticsError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get summary for user ${userId}`, error);
        }
    }

    // Получить статистику по категориям (для круговой диаграммы)
    static async getCategoryStats(userId, filters = {}) {
        try {
            Analytics.validateId(userId, 'user ID');
            Analytics.validateDateFilters(filters);

            const from = filters.from || null;
            const to = filters.to || null;
            const type = filters.type || 'expense'; // По умолчанию показываем расходы

            if (type && !['income', 'expense'].includes(type)) {
                throw new AnalyticsValidationError('Type must be either "income" or "expense"');
            }

            const query = `
                SELECT 
                    c.id,
                    c.name,
                    c.type,
                    SUM(t.amount) as total,
                    COUNT(t.id)::int as transaction_count,
                    AVG(t.amount) as avg_amount
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1 
                    AND c.type = $2
                    AND ($3::timestamptz IS NULL OR t.date >= $3::timestamptz)
                    AND ($4::timestamptz IS NULL OR t.date < $4::timestamptz)
                GROUP BY c.id, c.name, c.type
                ORDER BY total DESC
            `;

            const result = await db.query(query, [userId, type, from, to]);

            return result.rows.map(row => ({
                categoryId: row.id,
                categoryName: row.name,
                categoryType: row.type,
                total: parseFloat(row.total),
                transactionCount: row.transaction_count,
                avgAmount: parseFloat(row.avg_amount),
                percentage: 0 // Будет рассчитано на фронтенде
            }));
        } catch (error) {
            if (error instanceof AnalyticsError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get category stats for user ${userId}`, error);
        }
    }

    // Получить динамику по дням (для линейного графика)
    static async getDailyStats(userId, filters = {}) {
        try {
            Analytics.validateId(userId, 'user ID');
            Analytics.validateDateFilters(filters);

            const from = filters.from || null;
            const to = filters.to || null;
            const limit = Math.min(Math.max(parseInt(filters.limit) || 30, 1), 365);

            const query = `
                SELECT 
                    TO_CHAR(t.date, 'YYYY-MM-DD') as day,
                    SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as income,
                    SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as expense,
                    COUNT(t.id)::int as transaction_count
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1
                    AND ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
                    AND ($3::timestamptz IS NULL OR t.date < $3::timestamptz)
                GROUP BY day
                ORDER BY day DESC
                LIMIT $4
            `;

            const result = await db.query(query, [userId, from, to, limit]);

            return result.rows.map(row => ({
                date: row.day,
                income: parseFloat(row.income),
                expense: parseFloat(row.expense),
                balance: parseFloat(row.income) - parseFloat(row.expense),
                transactionCount: row.transaction_count
            })).reverse(); // Реверсируем для хронологического порядка
        } catch (error) {
            if (error instanceof AnalyticsError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get daily stats for user ${userId}`, error);
        }
    }

    // Получить статистику по месяцам
    static async getMonthlyStats(userId, filters = {}) {
        try {
            Analytics.validateId(userId, 'user ID');

            const limit = Math.min(Math.max(parseInt(filters.limit) || 12, 1), 24);

            const query = `
                SELECT 
                    TO_CHAR(t.date, 'YYYY-MM') as month,
                    SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as income,
                    SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as expense,
                    COUNT(t.id)::int as transaction_count
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1
                GROUP BY month
                ORDER BY month DESC
                LIMIT $2
            `;

            const result = await db.query(query, [userId, limit]);

            return result.rows.map(row => ({
                month: row.month,
                income: parseFloat(row.income),
                expense: parseFloat(row.expense),
                balance: parseFloat(row.income) - parseFloat(row.expense),
                transactionCount: row.transaction_count
            })).reverse();
        } catch (error) {
            if (error instanceof AnalyticsError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get monthly stats for user ${userId}`, error);
        }
    }

    // Получить топ категорий по расходам/доходам
    static async getTopCategories(userId, filters = {}) {
        try {
            Analytics.validateId(userId, 'user ID');
            Analytics.validateDateFilters(filters);

            const from = filters.from || null;
            const to = filters.to || null;
            const type = filters.type || 'expense';
            const limit = Math.min(Math.max(parseInt(filters.limit) || 5, 1), 20);

            if (!['income', 'expense'].includes(type)) {
                throw new AnalyticsValidationError('Type must be either "income" or "expense"');
            }

            const query = `
                SELECT 
                    c.id,
                    c.name,
                    c.type,
                    SUM(t.amount) as total,
                    COUNT(t.id)::int as transaction_count
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = $1 
                    AND c.type = $2
                    AND ($3::timestamptz IS NULL OR t.date >= $3::timestamptz)
                    AND ($4::timestamptz IS NULL OR t.date < $4::timestamptz)
                GROUP BY c.id, c.name, c.type
                ORDER BY total DESC
                LIMIT $5
            `;

            const result = await db.query(query, [userId, type, from, to, limit]);

            return result.rows.map(row => ({
                categoryId: row.id,
                categoryName: row.name,
                total: parseFloat(row.total),
                transactionCount: row.transaction_count
            }));
        } catch (error) {
            if (error instanceof AnalyticsError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get top categories for user ${userId}`, error);
        }
    }
}

module.exports = Analytics;
