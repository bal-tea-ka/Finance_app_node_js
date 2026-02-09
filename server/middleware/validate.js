const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // Форматируем ошибки в понятный вид
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg
        }));
        
        return res.status(400).json({
            error: 'Validation failed',
            details: formattedErrors
        });
    }
    
    next();
};

module.exports = validate;
