// server/controllers/analyticsController.js
const db = require('../db/db');

// 1. Общая сводка (Баланс, Приход, Расход)
exports.getSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Одним запросом считаем сумму доходов и расходов
        // CASE WHEN ... THEN ... ELSE 0 END - это аналог if/else внутри SQL
        const query = `
            SELECT 
                SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as total_income,
                SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as total_expense
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
        `;

        const result = await db.query(query, [userId]);
        const data = result.rows[0];

        // Превращаем null в 0 (если транзакций нет)
        const income = parseFloat(data.total_income || 0);
        const expense = parseFloat(data.total_expense || 0);

        res.json({
            income,
            expense,
            balance: income - expense
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// 2. Расходы по категориям (для Pie Chart)
exports.getCategoryStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT c.name, SUM(t.amount) as total
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 AND c.type = 'expense'
            GROUP BY c.name
            ORDER BY total DESC
        `;

        const result = await db.query(query, [userId]);
        
        // Postgres возвращает SUM как строку (чтобы не потерять точность), 
        // для JSON фронтенду удобнее числа
        const formatted = result.rows.map(row => ({
            name: row.name,
            total: parseFloat(row.total)
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// 3. Динамика по дням (для Line Chart)
exports.getDailyStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // DATE_TRUNC('day', date) отбрасывает время (оставляет только дату 2026-02-03 00:00:00)
        // TO_CHAR форматирует дату в строку 'YYYY-MM-DD'
        const query = `
            SELECT 
                TO_CHAR(date, 'YYYY-MM-DD') as day,
                SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as income,
                SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as expense
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            GROUP BY day
            ORDER BY day ASC
            LIMIT 30 -- Последние 30 дней с транзакциями
        `;

        const result = await db.query(query, [userId]);
        
        const formatted = result.rows.map(row => ({
            date: row.day,
            income: parseFloat(row.income),
            expense: parseFloat(row.expense)
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
