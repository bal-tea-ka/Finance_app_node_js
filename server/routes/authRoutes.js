const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerValidation, loginValidation } = require('../validators/authValidator');
const validate = require('../middleware/validate');

router.post('/register', 
    authLimiter, 
    registerValidation, 
    validate, 
    authController.register
);

router.post('/login', 
    authLimiter, 
    loginValidation, 
    validate, 
    authController.login
);

module.exports = router;
