// db.js
const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул соединений
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Добавим обработчик ошибок (если база упадет, приложение не должно зависнуть молча)
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Экспортируем объект для выполнения запросов
// Мы оборачиваем pool.query, чтобы логировать все запросы (удобно для отладки)
module.exports = {
    query: async (text, params) => {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        // Логируем: "Запрос выполнился за 5мс, вернул 10 строк"
        console.log(`[SQL] executed query: { text: "${text}", duration: ${duration}ms, rows: ${res.rowCount} }`);
        
        return res;
    },
    // Экспортируем сам пул, если понадобится транзакция или сложный клиент
    pool,
};
