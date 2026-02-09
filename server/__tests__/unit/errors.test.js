const {
    AppError,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    ConflictError
} = require('../../utils/errors');

describe('Custom Error Classes', () => {
    describe('AppError', () => {
        it('should create an error with message and status code', () => {
            const error = new AppError('Test error', 400);
            
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
        });
        
        it('should be an instance of Error', () => {
            const error = new AppError('Test error', 500);
            
            expect(error).toBeInstanceOf(Error);
        });
    });
    
    describe('ValidationError', () => {
        it('should create a validation error with 400 status', () => {
            const error = new ValidationError('Invalid input');
            
            expect(error.message).toBe('Invalid input');
            expect(error.statusCode).toBe(400);
        });
        
        it('should use default message if none provided', () => {
            const error = new ValidationError();
            
            expect(error.message).toBe('Validation failed');
        });
    });
    
    describe('AuthenticationError', () => {
        it('should create an authentication error with 401 status', () => {
            const error = new AuthenticationError('Invalid credentials');
            
            expect(error.message).toBe('Invalid credentials');
            expect(error.statusCode).toBe(401);
        });
    });
    
    describe('NotFoundError', () => {
        it('should create a not found error with 404 status', () => {
            const error = new NotFoundError('User not found');
            
            expect(error.message).toBe('User not found');
            expect(error.statusCode).toBe(404);
        });
    });
    
    describe('ConflictError', () => {
        it('should create a conflict error with 409 status', () => {
            const error = new ConflictError('Email already exists');
            
            expect(error.message).toBe('Email already exists');
            expect(error.statusCode).toBe(409);
        });
    });
});
