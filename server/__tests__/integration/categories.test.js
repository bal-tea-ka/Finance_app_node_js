const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const categoryRoutes = require('../../routes/categoryRoutes');
const { testPool, createTestUser } = require('../testDb');
const { errorHandler } = require('../../middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);
app.use(errorHandler);

jest.mock('../../db/db', () => {
    const actual = jest.requireActual('../testDb');
    return {
        query: (...args) => actual.testPool.query(...args),
        pool: actual.testPool
    };
});

describe('Category API Integration Tests', () => {
    let testUser;
    let authToken;
    
    beforeAll(async () => {
        // Создаем тестового пользователя ОДИН раз для всех тестов
        testUser = await createTestUser(`cat-${Date.now()}@example.com`);
        
        authToken = jwt.sign(
            { id: testUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });
    
    afterAll(async () => {
        // Очищаем только категории этого пользователя
        await testPool.query('DELETE FROM categories WHERE user_id = $1', [testUser.id]);
        await testPool.end();
    });
    
    describe('POST /api/categories', () => {
        it('should create a new category', async () => {
            const response = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Groceries',
                    type: 'expense'
                });
            
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.category.name).toBe('Groceries');
            expect(response.body.category.type).toBe('expense');
        });
        
        it('should create an income category', async () => {
            const response = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Salary',
                    type: 'income'
                });
            
            expect(response.status).toBe(201);
            expect(response.body.category.type).toBe('income');
        });
        
        it('should return 400 for invalid type', async () => {
            const response = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Test',
                    type: 'invalid'
                });
            
            expect(response.status).toBe(400);
        });
        
        it('should return 401 without auth token', async () => {
            const response = await request(app)
                .post('/api/categories')
                .send({
                    name: 'Test',
                    type: 'expense'
                });
            
            expect(response.status).toBe(401);
        });
    });
    
    describe('GET /api/categories', () => {
        it('should get all categories for authenticated user', async () => {
            const response = await request(app)
                .get('/api/categories')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.categories)).toBe(true);
        });
    });
    
    describe('DELETE /api/categories/:id', () => {
        let categoryId;
        
        beforeEach(async () => {
            const result = await testPool.query(
                'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
                [testUser.id, 'ToDelete', 'expense']
            );
            categoryId = result.rows[0].id;
        });
        
        it('should delete a category', async () => {
            const response = await request(app)
                .delete(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        
        it('should return 404 for non-existent category', async () => {
            const response = await request(app)
                .delete('/api/categories/99999')
                .set('Authorization', `Bearer ${authToken}`);
            
            expect(response.status).toBe(404);
        });
    });
});
