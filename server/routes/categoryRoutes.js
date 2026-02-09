const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');
const { createCategoryValidation } = require('../validators/categoryValidator');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.get('/', categoryController.getAll);

router.post('/', 
    createCategoryValidation, 
    validate, 
    categoryController.create
);

router.delete('/:id', categoryController.delete);

module.exports = router;
