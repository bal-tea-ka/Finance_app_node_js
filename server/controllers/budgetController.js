// server/controllers/budgetController.js
const db = require('../db/db');
const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Get all budgets for the user
exports.getAll = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const period = req.query.period || 'month'; // default to month

    // We also want to see how much is spent for this category in the current period
    // For 'month', we look at transactions in the current month.
    
    // 1. Get budgets
    const budgetsQuery = `
        SELECT b.*, c.name as category_name, c.type as category_type
        FROM budgets b
        JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = $1 AND b.period = $2
    `;
    const budgetsResult = await db.query(budgetsQuery, [userId, period]);
    const budgets = budgetsResult.rows;

    // 2. Calculate spent amount for each budget in the current period
    // We can do this with a separate query or a join. A join is more efficient but requires date logic in SQL.
    // Let's use a subquery or join.
    
    // Simplest approach: Get total spent per category for the current month
    const currentDate = new Date();
    // Start of month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    // End of month
    // We can just use "date >= startOfMonth"

    const spentQuery = `
        SELECT category_id, SUM(amount) as spent
        FROM transactions
        WHERE user_id = $1 
          AND date >= $2
          AND type = 'expense' -- assuming budgets are for expenses
        GROUP BY category_id
    `;
    // Note: 'type' column might be in categories table, transactions usually rely on category type.
    // Let's check transactionController... 
    // It joins categories c. c.type = 'expense'.
    
    const spentQueryCorrect = `
        SELECT t.category_id, SUM(t.amount) as spent
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 
          AND t.date >= $2
          AND c.type = 'expense'
        GROUP BY t.category_id
    `;

    const spentResult = await db.query(spentQueryCorrect, [userId, startOfMonth]);
    const spentMap = {};
    spentResult.rows.forEach(row => {
        spentMap[row.category_id] = parseFloat(row.spent);
    });

    // 3. Merge data
    const finalData = budgets.map(budget => ({
        ...budget,
        spent: spentMap[budget.category_id] || 0,
        amount: parseFloat(budget.amount),
        remaining: parseFloat(budget.amount) - (spentMap[budget.category_id] || 0)
    }));

    res.json(finalData);
});

// Create a budget
exports.create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { categoryId, amount, period = 'month' } = req.body;

    // Validate
    if (!categoryId || !amount) {
        throw new ValidationError('Category and amount are required');
    }

    // Check if exists
    const checkQuery = `
        SELECT id FROM budgets 
        WHERE user_id = $1 AND category_id = $2 AND period = $3
    `;
    const checkResult = await db.query(checkQuery, [userId, categoryId, period]);
    if (checkResult.rows.length > 0) {
        throw new ValidationError('Budget for this category already exists');
    }

    const insertQuery = `
        INSERT INTO budgets (user_id, category_id, amount, period)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const result = await db.query(insertQuery, [userId, categoryId, amount, period]);

    res.status(201).json(result.rows[0]);
});

// Update a budget
exports.update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = req.params.id;
    const { amount } = req.body;

    const query = `
        UPDATE budgets 
        SET amount = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *
    `;
    const result = await db.query(query, [amount, budgetId, userId]);

    if (result.rowCount === 0) {
        throw new NotFoundError('Budget not found');
    }

    res.json(result.rows[0]);
});

// Delete a budget
exports.delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const budgetId = req.params.id;

    const query = `
        DELETE FROM budgets 
        WHERE id = $1 AND user_id = $2
    `;
    const result = await db.query(query, [budgetId, userId]);

    if (result.rowCount === 0) {
        throw new NotFoundError('Budget not found');
    }

    res.json({ success: true });
});
