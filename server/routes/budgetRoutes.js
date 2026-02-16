// server/routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', budgetController.getAll);
router.post('/', budgetController.create);
router.put('/:id', budgetController.update);
router.delete('/:id', budgetController.delete);

module.exports = router;
