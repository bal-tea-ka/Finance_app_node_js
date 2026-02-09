const asyncHandler = require('../../utils/asyncHandler');

describe('asyncHandler', () => {
    it('should call next with error if promise rejects', async () => {
        const error = new Error('Test error');
        const fn = jest.fn().mockRejectedValue(error);
        const req = {};
        const res = {};
        const next = jest.fn();
        
        const handler = asyncHandler(fn);
        await handler(req, res, next);
        
        expect(next).toHaveBeenCalledWith(error);
    });
    
    it('should not call next if promise resolves', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const req = {};
        const res = { json: jest.fn() };
        const next = jest.fn();
        
        const handler = asyncHandler(fn);
        await handler(req, res, next);
        
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should pass req, res, next to the wrapped function', async () => {
        const fn = jest.fn().mockResolvedValue('success');
        const req = { user: { id: 1 } };
        const res = { json: jest.fn() };
        const next = jest.fn();
        
        const handler = asyncHandler(fn);
        await handler(req, res, next);
        
        expect(fn).toHaveBeenCalledWith(req, res, next);
    });
});
