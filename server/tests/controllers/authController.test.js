const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authController = require('../../controllers/authController');
const db = require('../../db/db');
const { ConflictError, AuthenticationError } = require('../../utils/errors');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        created_at: new Date()
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database responses
      db.query
        .mockResolvedValueOnce({ rows: [] }) // User check - no existing user
        .mockResolvedValueOnce({ rows: [mockUser] }); // Insert new user

      // Mock bcrypt
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');

      // Mock JWT
      jwt.sign.mockReturnValue('mock-jwt-token');

      await authController.register(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-jwt-token',
        user: mockUser
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass ConflictError to next if user already exists', async () => {
      req.body = {
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock existing user
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'existing@example.com' }]
      });

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('User with this email already exists');
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['existing@example.com']
      );
    });

    it('should hash the password before storing', async () => {
      const mockUser = { id: 1, email: 'test@example.com', created_at: new Date() };

      req.body = {
        email: 'test@example.com',
        password: 'plainPassword'
      };

      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockUser] });

      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      jwt.sign.mockReturnValue('token');

      await authController.register(req, res, next);

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 'salt');
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        ['test@example.com', 'hashedPassword']
      );
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedPassword',
        created_at: new Date()
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-jwt-token');

      await authController.login(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          email: 'test@example.com',
          created_at: mockUser.created_at
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass AuthenticationError to next if user not found', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      db.query.mockResolvedValueOnce({ rows: [] });

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid email or password');
    });

    it('should pass AuthenticationError to next if password is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashedPassword'
      };

      req.body = {
        email: 'test@example.com',
        password: 'wrongPassword'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.message).toBe('Invalid email or password');
    });

    it('should generate JWT token with correct payload', async () => {
      const mockUser = {
        id: 42,
        email: 'test@example.com',
        password_hash: 'hashedPassword',
        created_at: new Date()
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('token');

      await authController.login(req, res, next);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 42 },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    });
  });
});
