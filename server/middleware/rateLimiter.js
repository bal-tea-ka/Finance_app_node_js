const rateLimit = require('express-rate-limit');

// Общий лимитер для всех запросов
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // Максимум 100 запросов с одного IP
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true, // Возвращает информацию в заголовках
    legacyHeaders: false,
});

// Строгий лимитер для аутентификации
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 500, // Максимум 5 попыток логина
    message: { error: 'Too many login attempts, please try again after 15 minutes.' },
    skipSuccessfulRequests: true, // Не считает успешные запросы
});

// Лимитер для создания транзакций
const transactionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 30, // Максимум 30 транзакций в минуту
    message: { error: 'Too many transactions created, slow down.' },
});

module.exports = {
    generalLimiter,
    authLimiter,
    transactionLimiter
};
