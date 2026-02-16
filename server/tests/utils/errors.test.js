const {
  ConflictError,
  AuthenticationError,
  NotFoundError,
  ValidationError
} = require('../../utils/errors');

describe('Custom Errors', () => {
  describe('ConflictError', () => {
    it('should create error with correct status code', () => {
      const error = new ConflictError('Resource already exists');

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
      expect(error.isOperational).toBe(true);
    });

    it('should be instance of Error', () => {
      const error = new ConflictError('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('AuthenticationError', () => {
    it('should create error with correct status code', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid credentials');
      expect(error.isOperational).toBe(true);
    });

    it('should be instance of Error', () => {
      const error = new AuthenticationError('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('NotFoundError', () => {
    it('should create error with correct status code', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.isOperational).toBe(true);
    });

    it('should be instance of Error', () => {
      const error = new NotFoundError('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('should create error with correct status code', () => {
      const error = new ValidationError('Validation failed');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.isOperational).toBe(true);
    });

    it('should be instance of Error', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain stack trace', () => {
      const error = new ConflictError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test');
    });

    it('should be catchable as Error', () => {
      try {
        throw new AuthenticationError('Test');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('Test');
      }
    });
  });
});
