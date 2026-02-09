// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

module.exports = function (req, res, next) {
    // 1. Достаем токен из заголовка
    // Ожидаем формат: "Bearer <token>"
    const authHeader = req.header('Authorization');
    
    // Если заголовка нет вообще
    if (!authHeader) {
        throw new UnauthorizedError('Access denied. No token provided.');
    }

    // Отрезаем слово "Bearer " (более безопасно через substring)
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!token) {
        throw new UnauthorizedError('Access denied. Token is empty.');
    }

    try {
        // 2. Проверяем токен (валидна ли подпись?)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Если всё ок, кладем расшифрованные данные (userId) прямо в запрос
        // Теперь в любом следующем контроллере мы сможем сделать req.user.id
        req.user = decoded;
        
        // Пропускаем запрос дальше
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            throw new UnauthorizedError('Invalid token.');
        } else if (err.name === 'TokenExpiredError') {
            throw new UnauthorizedError('Token expired.');
        } else {
            throw new UnauthorizedError('Authentication failed.');
        }
    }
};
