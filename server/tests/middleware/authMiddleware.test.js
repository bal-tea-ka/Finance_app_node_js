const jwt = require('jsonwebtoken');
const authMiddleware = require('../../middleware/authMiddleware');

jest.mock('jsonwebtoken');

describe('AuthMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should authenticate valid JWT token', () => {
    const mockDecoded = { id: 42 };
    req.header.mockReturnValue('Bearer valid-token');

    jwt.verify.mockReturnValue(mockDecoded);

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(req.user).toEqual({ id: 42 });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if no authorization header', () => {
    req.header.mockReturnValue(undefined);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is empty after removing Bearer', () => {
    req.header.mockReturnValue('Bearer ');

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. Token is empty.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if token is invalid', () => {
    req.header.mockReturnValue('Bearer invalid-token');
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should extract user data from token payload', () => {
    req.header.mockReturnValue('Bearer token');
    jwt.verify.mockReturnValue({ id: 123, email: 'test@example.com' });

    authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: 123, email: 'test@example.com' });
  });
});
