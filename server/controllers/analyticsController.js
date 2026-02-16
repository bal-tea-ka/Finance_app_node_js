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

// 4. Анализ бюджета (Budget vs Actual)
exports.getBudgetAnalysis = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Получаем бюджеты
        const budgetsQuery = `
            SELECT b.*, c.name as category_name 
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = $1
        `;
        const budgetsResult = await db.query(budgetsQuery, [userId]);
        const budgets = budgetsResult.rows;

        // Если бюджетов нет, возвращаем пусто
        if (budgets.length === 0) {
            return res.json({
                total_budget: 0,
                total_spent: 0,
                status: 'no_budgets',
                details: []
            });
        }

        // Считаем расходы за текущий месяц для категорий с бюджетом
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const spentQuery = `
            SELECT category_id, SUM(amount) as spent
            FROM transactions
            WHERE user_id = $1 
              AND date >= $2
              AND category_id = ANY($3)
            GROUP BY category_id
        `;
        const categoryIds = budgets.map(b => b.category_id);
        const spentResult = await db.query(spentQuery, [userId, startOfMonth, categoryIds]);
        
        const spentMap = {};
        spentResult.rows.forEach(row => {
            spentMap[row.category_id] = parseFloat(row.spent);
        });

        let totalBudget = 0;
        let totalSpent = 0;
        const details = budgets.map(budget => {
            const spent = spentMap[budget.category_id] || 0;
            const amount = parseFloat(budget.amount);
            
            totalBudget += amount;
            totalSpent += spent;

            return {
                category: budget.category_name,
                budget: amount,
                spent: spent,
                remaining: amount - spent,
                percent: amount > 0 ? (spent / amount) * 100 : 0
            };
        });

        res.json({
            total_budget: totalBudget,
            total_spent: totalSpent,
            status: totalSpent > totalBudget ? 'over_budget' : 'ok',
            details
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
