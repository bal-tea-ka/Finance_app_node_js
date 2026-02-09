const { Pool } = require('pg');

// Тестовая база данных
const testPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'maxlvov13',
    database: 'finance_db_test'
});

// Очистка всех таблиц - теперь в правильном порядке (от зависимых к независимым)
const cleanDatabase = async () => {
    const client = await testPool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE budget_alerts CASCADE');
        await client.query('TRUNCATE TABLE budgets CASCADE');
        await client.query('TRUNCATE TABLE transactions CASCADE');
        await client.query('TRUNCATE TABLE categories CASCADE');
        await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Создание тестового пользователя
const createTestUser = async (email = 'test@example.com', password = 'TestPass123') => {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await testPool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hashedPassword]
    );
    
    return result.rows[0];
};

// Создание тестовой категории
const createTestCategory = async (userId, name = 'Test Category', type = 'expense') => {
    const result = await testPool.query(
        'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING *',
        [userId, name, type]
    );
    
    return result.rows[0];
};

// Создание тестовой транзакции
const createTestTransaction = async (userId, categoryId, amount = 100.00, date = new Date()) => {
    const result = await testPool.query(
        'INSERT INTO transactions (user_id, category_id, amount, date) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, categoryId, amount, date]
    );
    
    return result.rows[0];
};

module.exports = {
    testPool,
    cleanDatabase,
    createTestUser,
    createTestCategory,
    createTestTransaction
};
