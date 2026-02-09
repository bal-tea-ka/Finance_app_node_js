// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SQL] executed query...`);
      }

      return res;
    } catch (error) {
      console.error('[SQL Error]:', error.message);
      throw error; // Перебрасываем ошибку дальше в контроллер
    }
  },
  pool,
};
