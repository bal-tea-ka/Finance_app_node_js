const categoryController = require('../../controllers/categoryController');
const db = require('../../db/db');

describe('CategoryController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getAll', () => {
    it('should return all categories for the authenticated user', async () => {
      const mockCategories = [
        { id: 1, user_id: 1, name: 'Salary', type: 'income' },
        { id: 2, user_id: 1, name: 'Groceries', type: 'expense' }
      ];

      db.query.mockResolvedValueOnce({ rows: mockCategories });

      await categoryController.getAll(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM categories'),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith(mockCategories);
    });

    it('should only return categories belonging to the user', async () => {
      req.user.id = 5;
      db.query.mockResolvedValueOnce({ rows: [] });

      await categoryController.getAll(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [5]
      );
    });

    it('should return empty array if user has no categories', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await categoryController.getAll(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await categoryController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('create', () => {
    it('should create a new category successfully', async () => {
      const newCategory = {
        id: 1,
        user_id: 1,
        name: 'Entertainment',
        type: 'expense'
      };

      req.body = {
        name: 'Entertainment',
        type: 'expense'
      };

      db.query.mockResolvedValueOnce({ rows: [newCategory] });

      await categoryController.create(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        [1, 'Entertainment', 'expense']
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newCategory);
    });

    it('should return 400 if name is missing', async () => {
      req.body = {
        type: 'expense'
      };

      await categoryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Name and type are required'
      });
    });

    it('should return 400 if type is missing', async () => {
      req.body = {
        name: 'Test'
      };

      await categoryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Name and type are required'
      });
    });

    it('should return 400 if type is invalid', async () => {
      req.body = {
        name: 'Test',
        type: 'invalid'
      };

      await categoryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Type must be income or expense'
      });
    });

    it('should accept "income" as valid type', async () => {
      const newCategory = {
        id: 1,
        user_id: 1,
        name: 'Salary',
        type: 'income'
      };

      req.body = {
        name: 'Salary',
        type: 'income'
      };

      db.query.mockResolvedValueOnce({ rows: [newCategory] });

      await categoryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newCategory);
    });

    it('should handle database errors', async () => {
      req.body = {
        name: 'Test',
        type: 'expense'
      };

      db.query.mockRejectedValueOnce(new Error('Database error'));

      await categoryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('delete', () => {
    it('should delete a category successfully', async () => {
      req.params.id = '1';
      db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      await categoryController.delete(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
        ['1', 1]
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Category deleted' });
    });

    it('should return 404 if category not found', async () => {
      req.params.id = '999';
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      await categoryController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Category not found or access denied'
      });
    });

    it('should prevent deleting another user\'s category', async () => {
      req.params.id = '1';
      req.user.id = 2; // Different user
      db.query.mockResolvedValueOnce({ rowCount: 0 });

      await categoryController.delete(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['1', 2]
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors', async () => {
      req.params.id = '1';
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await categoryController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });
});
