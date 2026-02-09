// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
    createTransactionValidation,
    updateTransactionValidation,
    transactionIdValidation,
    getTransactionsValidation
} = require('../validators/transactionValidator');
const { param } = require('express-validator');

// Все роуты требуют аутентификации
router.use(authMiddleware);

// GET /api/transactions - получить все транзакции с фильтрами
router.get('/', transactionController.getAll);

// GET /api/transactions/statistics - получить статистику
router.get('/statistics', transactionController.getStatistics);

// GET /api/transactions/export/csv - экспорт в CSV
router.get('/export/csv', 
    query('limit').optional().isInt({max: 10000}),
    validateRequest,
    transactionController.exportCsv
);


// GET /api/transactions/:id - получить одну транзакцию
router.get(
    '/:id',
    [param('id').isInt({ min: 1 }).withMessage('Valid transaction ID is required')],
    validateRequest,
    transactionController.getById
);

// POST /api/transactions - создать новую транзакцию
router.post(
    '/',
    createTransactionValidation,
    validateRequest,
    transactionController.create
);

// PUT /api/transactions/:id - обновить транзакцию
router.put(
    '/:id',
    updateTransactionValidation,
    validateRequest,
    transactionController.update
);

// DELETE /api/transactions/:id - удалить транзакцию
router.delete(
    '/:id',
    [param('id').isInt({ min: 1 }).withMessage('Valid transaction ID is required')],
    validateRequest,
    transactionController.delete
);

module.exports = router;
