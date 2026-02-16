// server/scripts/migrate_budgets.js
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path to .env if needed

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const createBudgetsTable = async () => {
    const client = await pool.connect();
    try {
        console.log('Creating budgets table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
                period VARCHAR(20) DEFAULT 'month',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, category_id, period)
            );
        `);
        console.log('Budgets table created successfully!');
    } catch (err) {
        console.error('Error creating budgets table:', err);
    } finally {
        client.release();
        await pool.end();
    }
};

createBudgetsTable();
