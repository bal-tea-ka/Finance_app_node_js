const { AppError } = require('../utils/errors');

// Обработчик для несуществующих роутов
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404);
    next(error);
};

// Главный обработчик ошибок
const errorHandler = (err, req, res, next) => {
    // Копируем ошибку
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
    
    // Логируем ошибку (в продакшене здесь будет winston)
    console.error('Error:', {
        message: error.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id
    });
    
    // Специальная обработка ошибок PostgreSQL
    if (err.code === '23505') {
        // Нарушение уникальности (duplicate key)
        error.message = 'This record already exists';
        error.statusCode = 409;
    }
    
    if (err.code === '23503') {
        // Нарушение внешнего ключа (foreign key)
        error.message = 'Referenced resource does not exist';
        error.statusCode = 400;
    }
    
    if (err.code === '22P02') {
        // Неверный формат данных
        error.message = 'Invalid data format';
        error.statusCode = 400;
    }
    
    // Ошибки JWT
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.statusCode = 401;
    }
    
    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        error.statusCode = 401;
    }
    
    // Отправляем ответ
    res.status(error.statusCode).json({
        success: false,
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            details: err 
        })
    });
};

// Обработчик необработанных promise rejection
const unhandledRejectionHandler = () => {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // В продакшене можно закрыть сервер gracefully
    });
};

// Обработчик необработанных исключений
const uncaughtExceptionHandler = () => {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        // Критическая ошибка - завершаем процесс
        process.exit(1);
    });
};

module.exports = {
    notFoundHandler,
    errorHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler
};
