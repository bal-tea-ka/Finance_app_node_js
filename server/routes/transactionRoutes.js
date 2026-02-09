const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/export', transactionController.exportCsv);

router.get('/', transactionController.getAll);
router.post('/', transactionController.create);
router.delete('/:id', transactionController.delete);

router.delete('/:id', transactionController.delete);

module.exports = router;
