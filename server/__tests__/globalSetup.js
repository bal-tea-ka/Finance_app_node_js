const { Pool } = require('pg');

module.exports = async () => {
    const testPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'maxlvov13',
        database: 'finance_db_test'
    });

    // Очистка БД перед всеми тестами
    const client = await testPool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE budget_alerts CASCADE');
        await client.query('TRUNCATE TABLE budgets CASCADE');
        await client.query('TRUNCATE TABLE transactions CASCADE');
        await client.query('TRUNCATE TABLE categories CASCADE');
        await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
        await client.query('COMMIT');
        console.log('✅ Test database cleaned');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to clean database:', error);
    } finally {
        client.release();
        await testPool.end();
    }
};
