// server/controllers/transactionController.js
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { asyncHandler } = require('../middleware/errorHandler');
const { format } = require('fast-csv');
const Cursor = require('pg-cursor');
const db = require('../db/db');

// Получить транзакции (с пагинацией)
exports.getAll = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        page: req.query.page,
        limit: req.query.limit,
        from: req.query.from,
        to: req.query.to,
        categoryId: req.query.categoryId,
        type: req.query.type,
        q: req.query.q
    };

    const result = await Transaction.findAll(userId, filters);

    res.json({
        success: true,
        ...result
    });
});

// Получить одну транзакцию по ID
exports.getById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);

    const transaction = await Transaction.findById(transactionId, userId);

    res.json({
        success: true,
        data: transaction
    });
});

// Создать транзакцию
exports.create = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { categoryId, amount, date, comment } = req.body;

    const transaction = await Transaction.create(userId, {
        categoryId,
        amount,
        date,
        comment
    });

    // Автоматически проверяем бюджеты после создания транзакции
    let budgetAlerts = [];
    try {
        budgetAlerts = await Budget.checkBudgets(userId);
    } catch (error) {
        console.error('Failed to check budgets after transaction creation:', error);
        // Не прерываем выполнение, если проверка бюджетов упала
    }

    res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction,
        budgetAlerts: budgetAlerts.length > 0 ? budgetAlerts : undefined
    });
});

// Обновить транзакцию
exports.update = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    const { categoryId, amount, date, comment } = req.body;

    const transaction = await Transaction.update(transactionId, userId, {
        categoryId,
        amount,
        date,
        comment
    });

    // Проверяем бюджеты после обновления
    let budgetAlerts = [];
    try {
        budgetAlerts = await Budget.checkBudgets(userId);
    } catch (error) {
        console.error('Failed to check budgets after transaction update:', error);
    }

    res.json({
        success: true,
        message: 'Transaction updated successfully',
        data: transaction,
        budgetAlerts: budgetAlerts.length > 0 ? budgetAlerts : undefined
    });
});

// Удалить транзакцию
exports.delete = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);

    await Transaction.delete(transactionId, userId);

    res.json({
        success: true,
        message: 'Transaction deleted successfully'
    });
});

// Получить статистику по транзакциям
exports.getStatistics = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const filters = {
        from: req.query.from,
        to: req.query.to
    };

    const statistics = await Transaction.getStatistics(userId, filters);

    res.json({
        success: true,
        data: statistics
    });
});

// Экспорт в CSV
exports.exportCsv = async (req, res) => {
    const client = await db.pool.connect();

    try {
        const userId = req.user.id;
        const locale = req.query.locale || 'ru-RU';

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

        const csvStream = format({ headers: true });
        csvStream.pipe(res);

        const cursor = client.query(new Cursor(`
            SELECT t.date, c.name as category, t.amount, t.comment, c.type
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.date DESC
        `, [userId]));

        const readChunk = () => {
            cursor.read(100, (err, rows) => {
                if (err) {
                    console.error('CSV export error:', err);
                    client.release();
                    return res.status(500).end();
                }

                if (rows.length === 0) {
                    csvStream.end();
                    client.release();
                    return;
                }

                rows.forEach(row => {
                    csvStream.write({
                        Дата: new Date(row.date).toLocaleDateString(locale),
                        Категория: row.category || 'Без категории',
                        Тип: row.type === 'income' ? 'Доход' : 'Расход',
                        Сумма: row.amount,
                        Комментарий: row.comment || ''
                    });
                });

                readChunk();
            });
        };

        readChunk();

    } catch (err) {
        console.error('CSV export error:', err);
        client.release();
        res.status(500).json({
            success: false,
            message: 'Export failed'
        });
    }
};
