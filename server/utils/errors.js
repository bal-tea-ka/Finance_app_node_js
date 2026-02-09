// server/utils/errors.js

/**
 * Базовый класс для всех ошибок приложения
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Ошибка валидации (400)
 */
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400);
        this.details = details;
    }
}

/**
 * Ресурс не найден (404)
 */
class NotFoundError extends AppError {
    constructor(resource, identifier) {
        super(`${resource} with identifier '${identifier}' not found`, 404);
        this.resource = resource;
        this.identifier = identifier;
    }
}

/**
 * Ошибка авторизации (401)
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}

/**
 * Ошибка доступа (403)
 */
class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}

/**
 * Конфликт данных (409)
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}

/**
 * Ошибка базы данных (500)
 */
class DatabaseError extends AppError {
    constructor(message, originalError = null) {
        super(message, 500, false);
        this.originalError = originalError;
    }
}

/**
 * Специфичные ошибки для Budget
 */
class BudgetError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, statusCode);
    }
}

class BudgetNotFoundError extends NotFoundError {
    constructor(budgetId) {
        super('Budget', budgetId);
    }
}

class BudgetValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
    }
}

/**
 * Специфичные ошибки для Transaction
 */
class TransactionError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, statusCode);
    }
}

class TransactionNotFoundError extends NotFoundError {
    constructor(transactionId) {
        super('Transaction', transactionId);
    }
}

class TransactionValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
    }
}

/**
 * Специфичные ошибки для Category
 */
class CategoryError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, statusCode);
    }
}

class CategoryNotFoundError extends NotFoundError {
    constructor(categoryId) {
        super('Category', categoryId);
    }
}

class CategoryValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
    }
}

/**
 * Специфичные ошибки для Analytics
 */
class AnalyticsError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, statusCode);
    }
}

class AnalyticsValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
    }
}

/**
 * Специфичные ошибки для Auth
 */
class AuthError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, statusCode);
    }
}

class AuthValidationError extends ValidationError {
    constructor(message, details = null) {
        super(message, details);
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    DatabaseError,
    
    // Budget errors
    BudgetError,
    BudgetNotFoundError,
    BudgetValidationError,
    
    // Transaction errors
    TransactionError,
    TransactionNotFoundError,
    TransactionValidationError,
    
    // Category errors
    CategoryError,
    CategoryNotFoundError,
    CategoryValidationError,
    
    // Analytics errors
    AnalyticsError,
    AnalyticsValidationError,
    
    // Auth errors
    AuthError,
    AuthValidationError
};
