// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware'); // <--- Импорт

// ВАЖНО: Вешаем middleware на все роуты в этом файле
// Теперь без токена сюда никто не пройдет
router.use(authMiddleware);

router.get('/', categoryController.getAll);
router.post('/', categoryController.create);
router.delete('/:id', categoryController.delete);

module.exports = router;
