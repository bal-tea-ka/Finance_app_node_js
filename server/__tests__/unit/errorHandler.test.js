const { 
    errorHandler, 
    notFoundHandler 
} = require('../../middleware/errorHandler');
const { 
    ValidationError, 
    NotFoundError, 
    ConflictError 
} = require('../../utils/errors');

describe('Error Handler Middleware', () => {
    let req, res, next;
    
    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        
        // Мокаем console.error чтобы не засорять вывод
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        console.error.mockRestore();
    });
    
    describe('errorHandler', () => {
        it('should handle ValidationError', () => {
            const error = new ValidationError('Invalid input');
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid input'
            });
        });
        
        it('should handle NotFoundError', () => {
            const error = new NotFoundError('Resource not found');
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Resource not found'
            });
        });
        
        it('should handle ConflictError', () => {
            const error = new ConflictError('Duplicate entry');
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Duplicate entry'
            });
        });
        
        it('should handle database unique constraint violations', () => {
            const error = new Error('duplicate key value violates unique constraint');
            error.code = '23505';
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'This record already exists'
            });
        });
        
        it('should handle database foreign key violations', () => {
            const error = new Error('violates foreign key constraint');
            error.code = '23503';
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Referenced resource does not exist'
            });
        });
        
        it('should handle generic errors with 500 status', () => {
            const error = new Error('Something went wrong');
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Something went wrong'
            });
        });
        
        it('should log error details', () => {
            const error = new Error('Test error');
            error.stack = 'Error stack trace';
            
            errorHandler(error, req, res, next);
            
            expect(console.error).toHaveBeenCalled();
        });
    });
    
    describe('notFoundHandler', () => {
        it('should call next with NotFoundError', () => {
            req.method = 'GET';
            req.originalUrl = '/api/unknown';
            
            notFoundHandler(req, res, next);
            
            expect(next).toHaveBeenCalled();
            const error = next.mock.calls[0][0];
            expect(error).toBeDefined();
            expect(error.statusCode).toBe(404);
        });
    });
});
