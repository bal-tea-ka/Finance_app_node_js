const jwt = require('jsonwebtoken');
const authMiddleware = require('../../middleware/authMiddleware');

describe('Auth Middleware', () => {
    let req, res, next;
    
    beforeEach(() => {
        req = {
            header: jest.fn()
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        
        process.env.JWT_SECRET = 'test-secret';
    });
    
    it('should authenticate valid token with Bearer prefix', () => {
        const token = jwt.sign({ id: 123 }, process.env.JWT_SECRET);
        req.header.mockReturnValue(`Bearer ${token}`);
        
        authMiddleware(req, res, next);
        
        expect(req.user).toHaveProperty('id', 123);
        expect(req.user).toHaveProperty('iat');
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should authenticate valid token without Bearer prefix', () => {
        const token = jwt.sign({ id: 456 }, process.env.JWT_SECRET);
        req.header.mockReturnValue(token);
        
        authMiddleware(req, res, next);
        
        expect(req.user).toHaveProperty('id', 456);
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });
    
    it('should return 401 when no token provided', () => {
        req.header.mockReturnValue(null);
        
        authMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Access denied. No token provided.'
        });
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 when Authorization header is empty string', () => {
        req.header.mockReturnValue('');
        
        authMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 401 when token is only "Bearer " without actual token', () => {
        req.header.mockReturnValue('Bearer ');
        
        authMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Access denied. Token is empty.'
        });
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 when token is expired', () => {
        const expiredToken = jwt.sign(
            { id: 123 }, 
            process.env.JWT_SECRET, 
            { expiresIn: '-1h' }
        );
        req.header.mockReturnValue(`Bearer ${expiredToken}`);
        
        authMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Invalid token.'
        });
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 when token is malformed', () => {
        req.header.mockReturnValue('Bearer invalid.token.here');
        
        authMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Invalid token.'
        });
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 when token has invalid signature', () => {
        const token = jwt.sign({ id: 123 }, 'wrong-secret');
        req.header.mockReturnValue(`Bearer ${token}`);
        
        authMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Invalid token.'
        });
        expect(next).not.toHaveBeenCalled();
    });
    
    it('should decode token payload correctly', () => {
        const payload = { id: 789, email: 'test@example.com' };
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        req.header.mockReturnValue(`Bearer ${token}`);
        
        authMiddleware(req, res, next);
        
        expect(req.user).toHaveProperty('id', 789);
        expect(req.user).toHaveProperty('email', 'test@example.com');
        expect(next).toHaveBeenCalledWith();
    });
});
