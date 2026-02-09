const Budget = require('../../models/Budget');
const { 
    testPool, 
    cleanDatabase, 
    createTestUser, 
    createTestCategory,
    createTestTransaction
} = require('../testDb');

jest.mock('../../db/db', () => {
    const actual = jest.requireActual('../testDb');
    return {
        query: (...args) => actual.testPool.query(...args),
        pool: actual.testPool
    };
});

describe('Budget Model', () => {
    let testUser;
    let testCategory;
    
    beforeAll(async () => {
        await cleanDatabase();
        testUser = await createTestUser();
        testCategory = await createTestCategory(testUser.id, 'Food', 'expense');
    });
    
    afterEach(async () => {
        await testPool.query('TRUNCATE TABLE budgets CASCADE');
    });
    
    afterAll(async () => {
        await testPool.end();
    });
    
    describe('create', () => {
        it('should create a new budget', async () => {
            const budgetData = {
                categoryId: testCategory.id,
                amount: 500,
                period: 'monthly',
                startDate: '2026-02-01',
                endDate: '2026-02-28'
            };
            
            const budget = await Budget.create(testUser.id, budgetData);
            
            expect(budget).toBeDefined();
            expect(budget.user_id).toBe(testUser.id);
            expect(budget.category_id).toBe(testCategory.id);
            expect(parseFloat(budget.amount)).toBe(500);
            expect(budget.period).toBe('monthly');
        });
        
        it('should create budget without end date', async () => {
            const budgetData = {
                categoryId: testCategory.id,
                amount: 1000,
                period: 'weekly',
                startDate: '2026-02-01'
            };
            
            const budget = await Budget.create(testUser.id, budgetData);
            
            expect(budget.end_date).toBeNull();
        });
    });
    
    describe('findByUserId', () => {
        beforeEach(async () => {
            await Budget.create(testUser.id, {
                categoryId: testCategory.id,
                amount: 500,
                period: 'monthly',
                startDate: '2026-02-01'
            });
        });
        
        it('should return all budgets for a user', async () => {
            const budgets = await Budget.findByUserId(testUser.id);
            
            expect(budgets).toHaveLength(1);
            expect(budgets[0].user_id).toBe(testUser.id);
        });
        
        it('should filter by active status', async () => {
            const budgets = await Budget.findByUserId(testUser.id, { isActive: true });
            
            expect(budgets).toHaveLength(1);
            expect(budgets[0].is_active).toBe(true);
        });
        
        it('should filter by period', async () => {
            const budgets = await Budget.findByUserId(testUser.id, { period: 'monthly' });
            
            expect(budgets).toHaveLength(1);
            expect(budgets[0].period).toBe('monthly');
        });
    });
    
    describe('update', () => {
        let budget;
        
        beforeEach(async () => {
            budget = await Budget.create(testUser.id, {
                categoryId: testCategory.id,
                amount: 500,
                period: 'monthly',
                startDate: '2026-02-01'
            });
        });
        
        it('should update budget amount', async () => {
            const updated = await Budget.update(budget.id, testUser.id, { amount: 1000 });
            
            expect(parseFloat(updated.amount)).toBe(1000);
        });
        
        it('should update budget active status', async () => {
            const updated = await Budget.update(budget.id, testUser.id, { isActive: false });
            
            expect(updated.is_active).toBe(false);
        });
    });
    
    describe('delete', () => {
        it('should delete a budget', async () => {
            const budget = await Budget.create(testUser.id, {
                categoryId: testCategory.id,
                amount: 500,
                period: 'monthly',
                startDate: '2026-02-01'
            });
            
            const deleted = await Budget.delete(budget.id, testUser.id);
            
            expect(deleted).toBe(true);
            
            const budgets = await Budget.findByUserId(testUser.id);
            expect(budgets).toHaveLength(0);
        });
        
        it('should return false if budget not found', async () => {
            const deleted = await Budget.delete(9999, testUser.id);
            
            expect(deleted).toBe(false);
        });
    });
        describe('checkBudgets and alerts', () => {
        let budget;
        
        beforeEach(async () => {
            await testPool.query('TRUNCATE TABLE budgets CASCADE');
            await testPool.query('TRUNCATE TABLE transactions CASCADE');
            await testPool.query('TRUNCATE TABLE budget_alerts CASCADE');
            
            budget = await Budget.create(testUser.id, {
                categoryId: testCategory.id,
                amount: 1000,
                period: 'monthly',
                startDate: '2026-02-01',
                endDate: '2026-02-28'
            });
        });
        
        it('should create warning alert at 80%', async () => {
            // Создаем транзакции на 850 (85% бюджета)
            await createTestTransaction(testUser.id, testCategory.id, 850, '2026-02-05');
            
            const alerts = await Budget.checkBudgets(testUser.id);
            
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].alert_type).toBe('warning');
            expect(alerts[0].threshold_percentage).toBe(80);
        });
        
        it('should create exceeded alert at 100%', async () => {
            // Создаем транзакции на 1100 (110% бюджета)
            await createTestTransaction(testUser.id, testCategory.id, 1100, '2026-02-05');
            
            const alerts = await Budget.checkBudgets(testUser.id);
            
            expect(alerts.length).toBeGreaterThan(0);
            const exceededAlert = alerts.find(a => a.alert_type === 'exceeded');
            expect(exceededAlert).toBeDefined();
            expect(exceededAlert.threshold_percentage).toBe(100);
        });
        
        it('should not create duplicate alerts on same day', async () => {
            await createTestTransaction(testUser.id, testCategory.id, 850, '2026-02-05');
            
            const alerts1 = await Budget.checkBudgets(testUser.id);
            const alerts2 = await Budget.checkBudgets(testUser.id);
            
            expect(alerts1.length).toBe(1);
            expect(alerts2.length).toBe(0); // Нет новых алертов
        });
        
        it('should get unread alerts', async () => {
            await createTestTransaction(testUser.id, testCategory.id, 850, '2026-02-05');
            await Budget.checkBudgets(testUser.id);
            
            const unreadAlerts = await Budget.getUnreadAlerts(testUser.id);
            
            expect(unreadAlerts.length).toBeGreaterThan(0);
            expect(unreadAlerts[0].is_read).toBe(false);
        });
        
        it('should mark alert as read', async () => {
            await createTestTransaction(testUser.id, testCategory.id, 850, '2026-02-05');
            const alerts = await Budget.checkBudgets(testUser.id);
            const alertId = alerts[0].id;
            
            const markedAlert = await Budget.markAlertAsRead(alertId, testUser.id);
            
            expect(markedAlert.is_read).toBe(true);
        });
        
        it('should get spent amount correctly', async () => {
            await createTestTransaction(testUser.id, testCategory.id, 300, '2026-02-05');
            await createTestTransaction(testUser.id, testCategory.id, 200, '2026-02-10');
            
            const spent = await Budget.getSpentAmount(budget.id, testUser.id);
            
            expect(spent).toBe(500);
        });
    });
});



