// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
    // 1. Достаем токен из заголовка
    // Ожидаем формат: "Bearer <token>"
    const authHeader = req.header('Authorization');
    
    // Если заголовка нет вообще
    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Отрезаем слово "Bearer " (первые 7 символов)
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. Token is empty.' });
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
        res.status(403).json({ error: 'Invalid token.' });
    }
};
