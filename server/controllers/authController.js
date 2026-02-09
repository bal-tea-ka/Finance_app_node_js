const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const asyncHandler = require('../utils/asyncHandler');
const { ConflictError, AuthenticationError } = require('../utils/errors');
require('dotenv').config();

// Регистрация
exports.register = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Проверяем, есть ли такой юзер
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
        throw new ConflictError('User with this email already exists');
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Сохраняем в БД
    const newUser = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, hashedPassword]
    );

    // Генерируем токен
    const token = jwt.sign(
        { id: newUser.rows[0].id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    );

    res.status(201).json({ 
        success: true,
        token, 
        user: newUser.rows[0] 
    });
});

// Логин
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Ищем пользователя
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
        throw new AuthenticationError('Invalid email or password');
    }

    const user = userResult.rows[0];

    // Сравниваем пароли
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        throw new AuthenticationError('Invalid email or password');
    }

    // Генерируем токен
    const token = jwt.sign(
        { id: user.id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
    );

    res.json({ 
        success: true,
        token, 
        user: { 
            id: user.id, 
            email: user.email,
            created_at: user.created_at
        } 
    });
});
