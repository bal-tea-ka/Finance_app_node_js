// server/middleware/errorHandler.js
const {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    DatabaseError
} = require('../utils/errors');

/**
 * Обработчик ошибок валидации express-validator
 */
const handleValidationErrors = (errors) => {
    const messages = errors.map(err => `${err.param}: ${err.msg}`);
    return {
        statusCode: 400,
        message: 'Validation failed',
        errors: messages
    };
};

/**
 * Обработчик ошибок PostgreSQL
 */
const handleDatabaseError = (error) => {
    // Уникальное нарушение ограничения
    if (error.code === '23505') {
        return {
            statusCode: 409,
            message: 'Resource already exists',
            detail: error.detail
        };
    }
    
    // Нарушение внешнего ключа
    if (error.code === '23503') {
        return {
            statusCode: 400,
            message: 'Referenced resource does not exist',
            detail: error.detail
        };
    }
    
    // Нарушение NOT NULL
    if (error.code === '23502') {
        return {
            statusCode: 400,
            message: 'Required field is missing',
            detail: error.detail
        };
    }

    // Общая ошибка БД
    return {
        statusCode: 500,
        message: 'Database error occurred',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
};

/**
 * Главный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = null;
    let detail = null;

    // Логирование ошибки
    if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', {
            name: err.name,
            message: err.message,
            statusCode,
            stack: err.stack,
            isOperational: err.isOperational
        });
    } else {
        // В production логируем только операционные ошибки
        if (err.isOperational) {
            console.error('Operational error:', {
                name: err.name,
                message: err.message,
                statusCode
            });
        } else {
            console.error('Programming or unknown error:', err);
        }
    }

    // Обработка известных типов ошибок
    if (err instanceof ValidationError) {
        statusCode = 400;
        message = err.message;
        errors = err.details;
    } else if (err instanceof NotFoundError) {
        statusCode = 404;
        message = err.message;
    } else if (err instanceof UnauthorizedError) {
        statusCode = 401;
        message = err.message;
    } else if (err instanceof ForbiddenError) {
        statusCode = 403;
        message = err.message;
    } else if (err instanceof ConflictError) {
        statusCode = 409;
        message = err.message;
    } else if (err instanceof DatabaseError) {
        const dbError = handleDatabaseError(err.originalError || err);
        statusCode = dbError.statusCode;
        message = dbError.message;
        detail = dbError.detail;
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (err.code && err.code.startsWith('23')) {
        // Ошибки PostgreSQL
        const dbError = handleDatabaseError(err);
        statusCode = dbError.statusCode;
        message = dbError.message;
        detail = dbError.detail;
    } else if (!err.isOperational) {
        // Неизвестная ошибка - не раскрываем детали в production
        statusCode = 500;
        message = 'Something went wrong';
    }

    // Формируем ответ
    const response = {
        success: false,
        message,
        ...(errors && { errors }),
        ...(detail && { detail }),
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            original: err.originalError?.message
        })
    };

    res.status(statusCode).json(response);
};

/**
 * Обработчик несуществующих роутов
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError('Route', req.originalUrl);
    next(error);
};

/**
 * Обработчик необработанных Promise rejection
 */
const unhandledRejectionHandler = () => {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // В production можно добавить отправку в систему мониторинга
        // Не завершаем процесс, чтобы дать возможность обработать текущие запросы
    });
};

/**
 * Обработчик необработанных исключений
 */
const uncaughtExceptionHandler = () => {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        // В production отправляем в систему мониторинга
        // Завершаем процесс, так как приложение в неопределенном состоянии
        process.exit(1);
    });
};

/**
 * Обертка для async функций в роутах
 * Автоматически перехватывает ошибки и передает в errorHandler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorHandler,
    notFoundHandler,
    unhandledRejectionHandler,
    uncaughtExceptionHandler,
    asyncHandler,
    handleValidationErrors
};
