const analyticsController = require('../../controllers/analyticsController');
const db = require('../../db/db');

describe('AnalyticsController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getSummary', () => {
    it('should return income, expense, and balance', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ total_income: '5000.00', total_expense: '3200.50' }]
      });

      await analyticsController.getSummary(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SUM(CASE WHEN c.type'),
        [1]
      );
      expect(res.json).toHaveBeenCalledWith({
        income: 5000,
        expense: 3200.50,
        balance: 1799.50
      });
    });

    it('should handle zero transactions', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ total_income: null, total_expense: null }]
      });

      await analyticsController.getSummary(req, res);

      expect(res.json).toHaveBeenCalledWith({
        income: 0,
        expense: 0,
        balance: 0
      });
    });

    it('should calculate negative balance correctly', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ total_income: '1000', total_expense: '2000' }]
      });

      await analyticsController.getSummary(req, res);

      expect(res.json).toHaveBeenCalledWith({
        income: 1000,
        expense: 2000,
        balance: -1000
      });
    });

    it('should query only user\'s transactions', async () => {
      req.user.id = 42;
      db.query.mockResolvedValueOnce({
        rows: [{ total_income: '0', total_expense: '0' }]
      });

      await analyticsController.getSummary(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE t.user_id = $1'),
        [42]
      );
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await analyticsController.getSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('getCategoryStats', () => {
    it('should return expense breakdown by category', async () => {
      const mockStats = [
        { name: 'Groceries', total: '1200.50' },
        { name: 'Transport', total: '450.25' },
        { name: 'Entertainment', total: '300.00' }
      ];

      db.query.mockResolvedValueOnce({ rows: mockStats });

      await analyticsController.getCategoryStats(req, res);

      expect(res.json).toHaveBeenCalledWith([
        { name: 'Groceries', total: 1200.50 },
        { name: 'Transport', total: 450.25 },
        { name: 'Entertainment', total: 300.00 }
      ]);
    });

    it('should only include expenses', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getCategoryStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("c.type = 'expense'"),
        [1]
      );
    });

    it('should group by category name', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getCategoryStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY c.name'),
        [1]
      );
    });

    it('should order by total descending', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getCategoryStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY total DESC'),
        [1]
      );
    });

    it('should return empty array if no expenses', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getCategoryStats(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await analyticsController.getCategoryStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });

  describe('getDailyStats', () => {
    it('should return daily income and expense', async () => {
      const mockDaily = [
        { day: '2026-02-01', income: '500.00', expense: '120.50' },
        { day: '2026-02-02', income: '0.00', expense: '85.00' },
        { day: '2026-02-03', income: '1000.00', expense: '200.00' }
      ];

      db.query.mockResolvedValueOnce({ rows: mockDaily });

      await analyticsController.getDailyStats(req, res);

      expect(res.json).toHaveBeenCalledWith([
        { date: '2026-02-01', income: 500, expense: 120.50 },
        { date: '2026-02-02', income: 0, expense: 85 },
        { date: '2026-02-03', income: 1000, expense: 200 }
      ]);
    });

    it('should group by day', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getDailyStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY day'),
        [1]
      );
    });

    it('should order by day ascending', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getDailyStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY day ASC'),
        [1]
      );
    });

    it('should limit to 30 days', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getDailyStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 30'),
        [1]
      );
    });

    it('should format dates as YYYY-MM-DD', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getDailyStats(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("TO_CHAR(date, 'YYYY-MM-DD')"),
        [1]
      );
    });

    it('should return empty array if no transactions', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await analyticsController.getDailyStats(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await analyticsController.getDailyStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Server error' });
    });
  });
});
