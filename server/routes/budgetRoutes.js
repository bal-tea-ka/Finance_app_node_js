const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');
const {
    createBudgetValidation,
    updateBudgetValidation,
    getBudgetsValidation,
    budgetIdValidation
} = require('../validators/budgetValidator');
const validate = require('../middleware/validate');

// Все роуты требуют аутентификации
router.use(authMiddleware);

// Получить все бюджеты
router.get('/', 
    getBudgetsValidation, 
    validate, 
    budgetController.getAll
);

// Получить статус всех бюджетов (сводка)
router.get('/status', budgetController.getStatus);

// Получить уведомления
router.get('/alerts', budgetController.getAlerts);

// Отметить уведомление как прочитанное
router.patch('/alerts/:alertId/read', budgetController.markAlertAsRead);

// Проверить бюджеты (вручную триггерить проверку)
router.post('/check', budgetController.checkBudgets);

// Получить один бюджет
router.get('/:id', 
    budgetIdValidation, 
    validate, 
    budgetController.getOne
);

// Создать бюджет
router.post('/', 
    createBudgetValidation, 
    validate, 
    budgetController.create
);

// Обновить бюджет
router.patch('/:id', 
    updateBudgetValidation, 
    validate, 
    budgetController.update
);

// Удалить бюджет
router.delete('/:id', 
    budgetIdValidation, 
    validate, 
    budgetController.delete
);

module.exports = router;
