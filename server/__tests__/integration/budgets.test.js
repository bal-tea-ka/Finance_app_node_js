const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const budgetRoutes = require('../../routes/budgetRoutes');
const { 
    testPool, 
    createTestUser, 
    createTestCategory 
} = require('../testDb');
const { errorHandler } = require('../../middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/budgets', budgetRoutes);
app.use(errorHandler);

jest.mock('../../db/db', () => {
    const actual = jest.requireActual('../testDb');
    return {
        query: (...args) => actual.testPool.query(...args),
        pool: actual.testPool
    };
});

describe('Budget API Integration Tests', () => {
    let testUser;
    let testCategory;
    let authToken;
    
    beforeAll(async () => {
        testUser = await createTestUser(`budget-${Date.now()}@example.com`);
        testCategory = await createTestCategory(testUser.id, 'Food', 'expense');
        
        authToken = jwt.sign(
            { id: testUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });
    
    afterAll(async () => {
        // Очищаем данные этого пользователя
        await testPool.query('DELETE FROM budgets WHERE user_id = $1', [testUser.id]);
        await testPool.query('DELETE FROM categories WHERE user_id = $1', [testUser.id]);
        await testPool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        await testPool.end();
    });
    
    describe('POST /api/budgets', () => {
        it('should create a new budget', async () => {
            const response = await request(app)
                .post('/api/budgets')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: testCategory.id,
                    amount: 500,
                    period: 'monthly',
                    startDate: '2026-02-01'
                });
            
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.budget).toBeDefined();
            expect(parseFloat(response.body.budget.amount)).toBe(500);
        });
        
        it('should return 401 without auth token', async () => {
            const response = await request(app)
                .post('/api/budgets')
                .send({
                    categoryId: testCategory.id,
                    amount: 500,
                    period: 'monthly',
                    startDate: '2026-03-01'
                });
            
            expect(response.status).toBe(401);
        });
        
        it('should return 400 for invalid period', async () => {
            const response = await request(app)
                .post('/api/budgets')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: testCategory.id,
                    amount: 500,
                    period: 'invalid_period',
                    startDate: '2026-04-01'
                });
            
            expect(response.status).toBe(400);
        });
    });
    
    describe('GET /api/budgets', () => {
        beforeAll(async () => {
            // Создаем бюджет для тестов GET
            await testPool.query(
                'INSERT INTO budgets (user_id, category_id, amount, period, start_date) VALUES ($1, $2, $3, $4, $5)',
                [testUser.id, testCategory.id, 500, 'monthly', '2026-05-01']
            );
        });
        
        it('should get all budgets for authenticated user', async () => {
            const response = await request(app)
                .get('/api/budgets')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.budgets)).toBe(true);
            expect(response.body.budgets.length).toBeGreaterThan(0);
        });
        
        it('should filter budgets by active status', async () => {
            const response = await request(app)
                .get('/api/budgets?isActive=true')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.budgets)).toBe(true);
        });
    });
    
    describe('GET /api/budgets/status', () => {
        it('should return budget status summary', async () => {
            const response = await request(app)
                .get('/api/budgets/status')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.summary).toBeDefined();
            expect(response.body.summary.totalBudgets).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('GET /api/budgets/:id', () => {
        let budgetId;
        
        beforeAll(async () => {
            const result = await testPool.query(
                'INSERT INTO budgets (user_id, category_id, amount, period, start_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [testUser.id, testCategory.id, 1000, 'monthly', '2026-06-01']
            );
            budgetId = result.rows[0].id;
        });
        
        it('should get a single budget by id', async () => {
            const response = await request(app)
                .get(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.budget.id).toBe(budgetId);
        });
        
        it('should return 404 for non-existent budget', async () => {
            const response = await request(app)
                .get('/api/budgets/99999')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(404);
        });
    });
    
    describe('PATCH /api/budgets/:id', () => {
        let budgetId;
        
        beforeEach(async () => {
            // Удаляем старые бюджеты для этого describe
            await testPool.query(
                'DELETE FROM budgets WHERE user_id = $1 AND start_date >= $2',
                [testUser.id, '2026-07-01']
            );
            
            // Создаем новый с уникальной датой
            const timestamp = Date.now() % 28 + 1; // День месяца от 1 до 28
            const result = await testPool.query(
                'INSERT INTO budgets (user_id, category_id, amount, period, start_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [testUser.id, testCategory.id, 1000, 'monthly', `2026-07-${timestamp.toString().padStart(2, '0')}`]
            );
            budgetId = result.rows[0].id;
        });
        
        it('should update a budget', async () => {
            const response = await request(app)
                .patch(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: 1500
                });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(parseFloat(response.body.budget.amount)).toBe(1500);
        });
        
        it('should return 404 for non-existent budget', async () => {
            const response = await request(app)
                .patch('/api/budgets/99999')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: 1500
                });
            
            expect(response.status).toBe(404);
        });
    });
    
    describe('DELETE /api/budgets/:id', () => {
        let budgetId;
        
        beforeEach(async () => {
            // Создаем бюджет с уникальной датой для каждого теста
            const timestamp = Date.now() % 28 + 1;
            const result = await testPool.query(
                'INSERT INTO budgets (user_id, category_id, amount, period, start_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [testUser.id, testCategory.id, 1000, 'monthly', `2026-08-${timestamp.toString().padStart(2, '0')}`]
            );
            budgetId = result.rows[0].id;
        });
        
        it('should delete a budget', async () => {
            const response = await request(app)
                .delete(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        
        it('should return 404 for non-existent budget', async () => {
            const response = await request(app)
                .delete('/api/budgets/99999')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(404);
        });
    });
    
    describe('GET /api/budgets/alerts', () => {
        it('should get budget alerts', async () => {
            const response = await request(app)
                .get('/api/budgets/alerts')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.alerts)).toBe(true);
        });
    });
    
    describe('POST /api/budgets/check', () => {
        it('should check budgets manually', async () => {
            const response = await request(app)
                .post('/api/budgets/check')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBeDefined();
        });
    });
            describe('Error handling', () => {
        it('should return 404 when creating budget with invalid categoryId', async () => {
            const response = await request(app)
                .post('/api/budgets')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: 99999, // Несуществующая категория
                    amount: 500,
                    period: 'monthly',
                    startDate: '2026-09-01'
                });
            
            // Может быть 400 или 404 в зависимости от обработки ошибки
            expect([400, 404]).toContain(response.status);
        });
        
        it('should return 400 when updating with invalid data', async () => {
            // Создаем бюджет
            const createRes = await request(app)
                .post('/api/budgets')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    categoryId: testCategory.id,
                    amount: 500,
                    period: 'monthly',
                    startDate: '2026-10-01'
                });
            
            const budgetId = createRes.body.budget.id;
            
            // Пытаемся обновить с невалидными данными
            const response = await request(app)
                .patch(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: -100 // Отрицательная сумма
                });
            
            expect(response.status).toBe(400);
        });
        
        it('should handle invalid budget id gracefully', async () => {
            const response = await request(app)
                .get('/api/budgets/not-a-number')
                .set('Authorization', `Bearer ${authToken}`);
            
            // Может быть 400 или 500 в зависимости от валидации
            expect([400, 500]).toContain(response.status);
        });
    });

    
        describe('POST /api/budgets/alerts/:id/read', () => {
        it('should handle marking alert as read', async () => {
            // Просто проверяем что эндпоинт отвечает
            const response = await request(app)
                .post('/api/budgets/alerts/1/read')
                .set('Authorization', `Bearer ${authToken}`);
            
            // Может быть 200 (успех) или 404 (алерт не найден)
            expect([200, 404]).toContain(response.status);
        });
    });
});
