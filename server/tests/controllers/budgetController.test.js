const budgetController = require('../../controllers/budgetController');
const db = require('../../db/db');
const { ValidationError, NotFoundError } = require('../../utils/errors');

// Mock dependencies
// Note: db is already mocked in setup.js if configured correctly, but we can explicit here for clarity or specific behavior
jest.mock('../../db/db');

describe('BudgetController', () => {
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
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      req.body = { categoryId: 10, amount: 500 };

      // Mock checkQuery: no existing budget
      db.query.mockResolvedValueOnce({ rows: [] });
      // Mock insertQuery: return created budget
      const createdBudget = { id: 1, user_id: 1, category_id: 10, amount: 500, period: 'month' };
      db.query.mockResolvedValueOnce({ rows: [createdBudget] });

      await budgetController.create(req, res, next);

      expect(db.query).toHaveBeenCalledTimes(2);
      // Check insert params
      expect(db.query).toHaveBeenLastCalledWith(
        expect.stringContaining('INSERT INTO budgets'),
        [1, 10, 500, 'month']
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdBudget);
    });

    it('should call next with ValidationError if category or amount missing', async () => {
      req.body = { categoryId: 10 }; // missing amount

      await budgetController.create(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should call next with ValidationError if budget already exists', async () => {
      req.body = { categoryId: 10, amount: 500 };

      // Mock checkQuery: existing budget
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await budgetController.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('getAll', () => {
    it('should return budgets with spent info', async () => {
      // Mock budgets query
      const mockBudgets = [
        { id: 1, category_id: 10, amount: 500, category_name: 'Food', category_type: 'expense' },
        { id: 2, category_id: 11, amount: 200, category_name: 'Transport', category_type: 'expense' }
      ];
      db.query.mockResolvedValueOnce({ rows: mockBudgets });

      // Mock spent query
      const mockSpent = [
        { category_id: 10, spent: 150.50 },
        // category 11 has no spent
      ];
      db.query.mockResolvedValueOnce({ rows: mockSpent });

      await budgetController.getAll(req, res, next);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalled();
      
      const result = res.json.mock.calls[0][0];
      expect(result).toHaveLength(2);
      
      // Check first budget (has spent)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 1,
        spent: 150.50,
        remaining: 349.50 // 500 - 150.5
      }));

      // Check second budget (no spent)
      expect(result[1]).toEqual(expect.objectContaining({
        id: 2,
        spent: 0,
        remaining: 200
      }));
    });
  });

  describe('update', () => {
    it('should update budget successfully', async () => {
      req.params.id = 1;
      req.body.amount = 600;

      const updatedBudget = { id: 1, amount: 600 };
      db.query.mockResolvedValueOnce({ rows: [updatedBudget], rowCount: 1 });

      await budgetController.update(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE budgets'),
        [600, 1, 1]
      );
      expect(res.json).toHaveBeenCalledWith(updatedBudget);
    });

    it('should call next with NotFoundError if budget not found', async () => {
      req.params.id = 999;
      req.body.amount = 600;

      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await budgetController.update(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('delete', () => {
    it('should delete budget successfully', async () => {
      req.params.id = 1;

      db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await budgetController.delete(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM budgets'),
        [1, 1]
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should call next with NotFoundError if budget not found', async () => {
      req.params.id = 999;

      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await budgetController.delete(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });
});
