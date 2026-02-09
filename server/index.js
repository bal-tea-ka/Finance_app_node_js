// server/index.js
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
app.use(helmet());
app.use(express.json());
//app.use(cors({
//    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//    credentials: true
//}));
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
            success: true,
            status: 'OK',
            message: 'Database connection successful',
            time: result.rows[0].current_time
        });
    } catch (err) {
        next(err);
    }
});

// Обработка несуществующих роутов (должно быть после всех роутов)
app.use(notFoundHandler);

// Главный обработчик ошибок (должен быть последним)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Graceful shutdown
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Обработка сигналов завершения
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        db.pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        db.pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
})

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is required');
    process.exit(1);
}

module.exports = app; // Для тестирования
