const transactionController = require('../../controllers/transactionController');
const db = require('../../db/db');
const { NotFoundError } = require('../../utils/errors');

describe('TransactionController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      end: jest.fn()
    };
    next = jest.fn();
  });

  describe('getAll', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [
        { id: 1, user_id: 1, amount: 100, category_name: 'Food', category_type: 'expense' },
        { id: 2, user_id: 1, amount: 200, category_name: 'Salary', category_type: 'income' }
      ];

      db.query
        .mockResolvedValueOnce({ rows: mockTransactions }) // Items query
        .mockResolvedValueOnce({ rows: [{ total: 2 }] }); // Count query

      await transactionController.getAll(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        items: mockTransactions,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should apply pagination parameters', async () => {
      req.query = { page: '2', limit: '20' };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $7 OFFSET $8'),
        expect.arrayContaining([20, 20]) // limit and offset
      );
    });

    it('should filter by date range', async () => {
      req.query = {
        from: '2026-01-01T00:00:00Z',
        to: '2026-01-31T23:59:59Z'
      };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.date >='),
        expect.arrayContaining(['2026-01-01T00:00:00Z', '2026-01-31T23:59:59Z'])
      );
    });

    it('should filter by categoryId', async () => {
      req.query = { categoryId: '5' };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.category_id = $4'),
        expect.arrayContaining([5])
      );
    });

    it('should filter by type', async () => {
      req.query = { type: 'expense' };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.type = $5'),
        expect.arrayContaining(['expense'])
      );
    });

    it('should filter by search query', async () => {
      req.query = { q: 'coffee' };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('t.comment ILIKE'),
        expect.arrayContaining(['%coffee%'])
      );
    });

    it('should enforce maximum limit of 100', async () => {
      req.query = { limit: '500' };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100]) // Capped at 100
      );
    });

    it('should enforce minimum page of 1', async () => {
      req.query = { page: '-5' };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await transactionController.getAll(req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.page).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a transaction successfully', async () => {
      const newTransaction = {
        id: 1,
        user_id: 1,
        category_id: 5,
        amount: 150.50,
        date: '2026-02-16T10:00:00Z',
        comment: 'Test transaction'
      };

      req.body = {
        categoryId: 5,
        amount: 150.50,
        date: '2026-02-16T10:00:00Z',
        comment: 'Test transaction'
      };

      db.query.mockResolvedValueOnce({ rows: [newTransaction] });

      await transactionController.create(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [1, 5, 150.50, '2026-02-16T10:00:00Z', 'Test transaction']
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        transaction: newTransaction
      });
    });

    it('should use user ID from authenticated request', async () => {
      req.user.id = 42;
      req.body = {
        categoryId: 1,
        amount: 100,
        date: '2026-02-16T10:00:00Z',
        comment: 'Test'
      };

      db.query.mockResolvedValueOnce({ rows: [{}] });

      await transactionController.create(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [42, 1, 100, '2026-02-16T10:00:00Z', 'Test']
      );
    });
  });

  describe('delete', () => {
    it('should delete a transaction successfully', async () => {
      req.params.id = '1';
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      await transactionController.delete(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
        ['1', 1]
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Transaction deleted successfully'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if transaction not found', async () => {
      req.params.id = '999';
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      await transactionController.delete(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Transaction not found or you do not have permission to delete it');
    });

    it('should call next with NotFoundError when deleting another user\'s transaction', async () => {
      req.params.id = '1';
      req.user.id = 2;
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      await transactionController.delete(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('exportCsv', () => {
    it('should be defined', () => {
      expect(transactionController.exportCsv).toBeDefined();
      expect(typeof transactionController.exportCsv).toBe('function');
    });
  });
});
