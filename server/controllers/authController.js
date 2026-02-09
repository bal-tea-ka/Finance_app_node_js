// server/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
require('dotenv').config();

// Регистрация
exports.register = async (req, res) => {
    const { email, password } = req.body;

    // 1. Простая валидация
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // 2. Проверяем, есть ли такой юзер
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // 3. Хешируем пароль (соль 10 раундов)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Сохраняем в БД
        const newUser = await db.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );

        // 5. Сразу выдаем токен, чтобы юзеру не пришлось логиниться после регистрации
        const token = jwt.sign(
            { id: newUser.rows[0].id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' } // Токен протухнет через 24 часа
        );

        res.json({ token, user: newUser.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Логин
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Ищем пользователя
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' }); // Не говорим "юзер не найден" для безопасности
        }

        const user = userResult.rows[0];

        // 2. Сравниваем хеши паролей
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // 3. Генерируем токен
        const token = jwt.sign(
            { id: user.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, email: user.email } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
