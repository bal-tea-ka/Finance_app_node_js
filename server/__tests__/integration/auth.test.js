const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/authRoutes');
const { cleanDatabase, testPool } = require('../testDb');
const { errorHandler } = require('../../middleware/errorHandler');

// Создаем тестовое приложение
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

// Правильный способ мокирования
jest.mock('../../db/db', () => {
    const actual = jest.requireActual('../testDb');
    return {
        query: (...args) => actual.testPool.query(...args),
        pool: actual.testPool
    };
});

describe('Auth API Integration Tests', () => {
    beforeAll(async () => {
        await cleanDatabase();
    });
    
    afterAll(async () => {
        await testPool.end();
    });
    
    describe('POST /api/auth/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'newuser@example.com',
                    password: 'SecurePass123'
                });
            
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.email).toBe('newuser@example.com');
        });
        
        it('should return 400 for invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'SecurePass123'
                });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
        });
        
        it('should return 400 for short password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'short'
                });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Validation failed');
        });
        
        it('should return 409 for duplicate email', async () => {
            // Создаем пользователя
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'SecurePass123'
                });
            
            // Пытаемся создать еще раз
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'SecurePass123'
                });
            
            expect(response.status).toBe(409);
        });
    });
    
    describe('POST /api/auth/login', () => {
        beforeAll(async () => {
            // Создаем пользователя для тестов логина
            await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'logintest@example.com',
                    password: 'SecurePass123'
                });
        });
        
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'logintest@example.com',
                    password: 'SecurePass123'
                });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
        });
        
        it('should return 401 for invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'logintest@example.com',
                    password: 'WrongPassword123'
                });
            
            expect(response.status).toBe(401);
        });
        
        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'SecurePass123'
                });
            
            expect(response.status).toBe(401);
        });
    });
});
