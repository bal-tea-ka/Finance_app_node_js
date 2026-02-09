const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const transactionRoutes = require('../../routes/transactionRoutes');
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
app.use('/api/transactions', transactionRoutes);
app.use(errorHandler);

jest.mock('../../db/db', () => {
    const actual = jest.requireActual('../testDb');
    return {
        query: (...args) => actual.testPool.query(...args),
        pool: actual.testPool
    };
});

describe('Transaction API Integration Tests', () => {
    let testUser;
    let testCategory;
    let authToken;
    
    beforeAll(async () => {
        await cleanDatabase();
        testUser = await createTestUser('transaction@example.com');
        testCategory = await createTestCategory(testUser.id, 'Food', 'expense');
        
        authToken = jwt.sign(
            { id: testUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });
    
    afterAll(async () => {
        await testPool.end();
    });
    
    describe('POST /api/transactions', () => {
        it('should create a new transaction', async () => {
            const response = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: testCategory.id,
                    amount: 150.50,
                    date: '2026-02-09T12:00:00Z',
                    comment: 'Grocery shopping'
                });
            
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.transaction).toBeDefined();
            expect(parseFloat(response.body.transaction.amount)).toBe(150.50);
        });
        
        it('should return 400 for invalid amount', async () => {
            const response = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: testCategory.id,
                    amount: -50,
                    date: '2026-02-09T12:00:00Z'
                });
            
            expect(response.status).toBe(400);
        });
        
        it('should return 400 for invalid date', async () => {
            const response = await request(app)
                .post('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: testCategory.id,
                    amount: 100,
                    date: 'invalid-date'
                });
            
            expect(response.status).toBe(400);
        });
        
        it('should return 401 without auth token', async () => {
            const response = await request(app)
                .post('/api/transactions')
                .send({
                    categoryId: testCategory.id,
                    amount: 100,
                    date: '2026-02-09T12:00:00Z'
                });
            
            expect(response.status).toBe(401);
        });
    });
    
    describe('GET /api/transactions', () => {
        beforeAll(async () => {
            await testPool.query('TRUNCATE TABLE transactions CASCADE');
            
            await createTestTransaction(testUser.id, testCategory.id, 100, '2026-02-01');
            await createTestTransaction(testUser.id, testCategory.id, 200, '2026-02-05');
            await createTestTransaction(testUser.id, testCategory.id, 300, '2026-02-09');
        });
        
        it('should get all transactions for authenticated user', async () => {
            const response = await request(app)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.items).toHaveLength(3);
            expect(response.body.total).toBe(3);
        });
        
        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/transactions?page=1&limit=2')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(2);
            expect(response.body.page).toBe(1);
            expect(response.body.limit).toBe(2);
        });
        
        it('should filter by date range', async () => {
            const response = await request(app)
                .get('/api/transactions?from=2026-02-05T00:00:00Z&to=2026-02-10T00:00:00Z')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeGreaterThanOrEqual(2);
        });
        
        it('should return 401 without auth token', async () => {
            const response = await request(app)
                .get('/api/transactions');
            
            expect(response.status).toBe(401);
        });
    });
    
    describe('DELETE /api/transactions/:id', () => {
        let transactionId;
        
        beforeEach(async () => {
            const transaction = await createTestTransaction(testUser.id, testCategory.id, 100);
            transactionId = transaction.id;
        });
        
        it('should delete a transaction', async () => {
            const response = await request(app)
                .delete(`/api/transactions/${transactionId}`)
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        
        it('should return 404 for non-existent transaction', async () => {
            const response = await request(app)
                .delete('/api/transactions/99999')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(404);
        });
    });
        describe('GET /api/transactions/export', () => {
        beforeAll(async () => {
            await testPool.query('TRUNCATE TABLE transactions CASCADE');
            await createTestTransaction(testUser.id, testCategory.id, 100, '2026-02-01');
            await createTestTransaction(testUser.id, testCategory.id, 200, '2026-02-05');
        });
        
        it('should export transactions as CSV', async () => {
            const response = await request(app)
                .get('/api/transactions/export')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.text).toContain('Дата');
            expect(response.text).toContain('Категория');
        });
        
        it('should return 401 without auth token', async () => {
            const response = await request(app)
                .get('/api/transactions/export');
            
            expect(response.status).toBe(401);
        });
    });

});
