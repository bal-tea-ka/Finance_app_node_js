// Обертка для async функций, чтобы автоматически ловить ошибки
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
