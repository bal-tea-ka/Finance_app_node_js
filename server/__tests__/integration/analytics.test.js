const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const analyticsRoutes = require('../../routes/analyticsRoutes');
const { 
    cleanDatabase, 
    testPool, 
    createTestUser, 
    createTestCategory,
    createTestTransaction 
} = require('../testDb');
const { errorHandler } = require('../../middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);
app.use(errorHandler);

jest.mock('../../db/db', () => {
    const actual = jest.requireActual('../testDb');
    return {
        query: (...args) => actual.testPool.query(...args),
        pool: actual.testPool
    };
});

describe('Analytics API Integration Tests', () => {
    let testUser;
    let expenseCategory;
    let incomeCategory;
    let authToken;
    
    beforeAll(async () => {
        await cleanDatabase();
        testUser = await createTestUser('analytics@example.com');
        expenseCategory = await createTestCategory(testUser.id, 'Food', 'expense');
        incomeCategory = await createTestCategory(testUser.id, 'Salary', 'income');
        
        // Создаем тестовые транзакции
        await createTestTransaction(testUser.id, expenseCategory.id, 500, '2026-02-01');
        await createTestTransaction(testUser.id, expenseCategory.id, 300, '2026-02-05');
        await createTestTransaction(testUser.id, incomeCategory.id, 5000, '2026-02-01');
        
        authToken = jwt.sign(
            { id: testUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });
    
    afterAll(async () => {
        await testPool.end();
    });
    
    describe('GET /api/analytics/summary', () => {
        it('should get financial summary', async () => {
            const response = await request(app)
                .get('/api/analytics/summary')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.income).toBe(5000);
            expect(response.body.expense).toBe(800);
            expect(response.body.balance).toBe(4200);
        });
        
        it('should return 401 without auth token', async () => {
            const response = await request(app)
                .get('/api/analytics/summary');
            
            expect(response.status).toBe(401);
        });
    });
    
    describe('GET /api/analytics/by-category', () => {
        it('should get expenses grouped by category', async () => {
            const response = await request(app)
                .get('/api/analytics/by-category')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('total');
        });
    });
    
    describe('GET /api/analytics/daily', () => {
        it('should get daily statistics', async () => {
            const response = await request(app)
                .get('/api/analytics/daily')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('date');
            expect(response.body[0]).toHaveProperty('income');
            expect(response.body[0]).toHaveProperty('expense');
        });
    });
        describe('GET /api/analytics/summary with date range', () => {
        it('should filter summary by date range', async () => {
            const response = await request(app)
                .get('/api/analytics/summary?from=2026-02-01&to=2026-02-28')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('income');
            expect(response.body).toHaveProperty('expense');
            expect(response.body).toHaveProperty('balance');
        });
    });
    
    describe('GET /api/analytics/by-category with date range', () => {
        it('should filter by category stats by date range', async () => {
            const response = await request(app)
                .get('/api/analytics/by-category?from=2026-02-01&to=2026-02-28')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
    
    describe('GET /api/analytics/daily with date range', () => {
        it('should filter daily stats by date range', async () => {
            const response = await request(app)
                .get('/api/analytics/daily?from=2026-02-01&to=2026-02-28')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});
