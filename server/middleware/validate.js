// server/middleware/validate.js
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Middleware для проверки результатов валидации express-validator
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.param,
            message: err.msg,
            value: err.value
        }));
        
        throw new ValidationError('Request validation failed', errorMessages);
    }
    
    next();
};

module.exports = validateRequest;
