const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');
const { createTransactionValidation, getTransactionsValidation } = require('../validators/transactionValidator');
const { transactionLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

// Все роуты требуют аутентификации
router.use(authMiddleware);

router.get('/', 
    getTransactionsValidation, 
    validate, 
    transactionController.getAll
);

router.post('/', 
    transactionLimiter,
    createTransactionValidation, 
    validate, 
    transactionController.create
);

router.delete('/:id', transactionController.delete);

router.get('/export', transactionController.exportCsv);

module.exports = router;
