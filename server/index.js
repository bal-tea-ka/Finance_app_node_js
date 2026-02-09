const express = require('express');
const cors = require('cors');
const db = require('./db/db');
require('dotenv').config();

const app = express();

// Импорт роутов
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const budgetRoutes = require('./routes/budgetRoutes');

// Импорт middleware обработки ошибок
const { 
    notFoundHandler, 
    errorHandler, 
    unhandledRejectionHandler, 
    uncaughtExceptionHandler 
} = require('./middleware/errorHandler');

const { generalLimiter } = require('./middleware/rateLimiter');

// Настройка обработчиков глобальных ошибок
unhandledRejectionHandler();
uncaughtExceptionHandler();

// Middleware
app.use(express.json());
app.use(cors());
app.use(generalLimiter);

// Роуты
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budgets', budgetRoutes);

// Health check
app.get('/health', async (req, res, next) => {
    try {
        const result = await db.query('SELECT NOW() as current_time');
        res.json({
            status: 'OK',
            message: 'Database connection successful',
            time: result.rows[0].current_time
        });
    } catch (err) {
        next(err); // Передаем ошибку в обработчик
    }
});

// Обработка несуществующих роутов (должно быть после всех роутов)
app.use(notFoundHandler);

// Главный обработчик ошибок (должен быть последним)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
