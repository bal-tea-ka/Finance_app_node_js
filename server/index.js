// index.js
const express = require('express');
const cors = require('cors');
const db = require('./db/db');
require('dotenv').config();

const app = express();

const authRoutes = require('./routes/authRoutes'); // <--- Импортируем роуты
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Middleware
app.use(express.json()); // Чтобы парсить JSON в body запроса
app.use(cors());         // Чтобы фронтенд мог делать запросы

app.use('/api/auth', authRoutes); // <--- Все запросы на /api/auth/* пойдут в этот файл
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);


// Тестовый роут: Проверка здоровья
app.get('/health', async (req, res) => {
    try {
        // Простой SQL запрос "SELECT NOW()" просто чтобы проверить связь
        const result = await db.query('SELECT NOW() as current_time');
        
        res.json({
            status: 'OK',
            message: 'Database connection successful',
            time: result.rows[0].current_time
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Тестовый роут: Получить всех пользователей (проверка таблицы)
app.get('/test-users', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});