// server/controllers/transactionController.js
const db = require('../db/db');

// Получить транзакции (с пагинацией) -> { items, total, page, limit }
exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    // filters
    const from = req.query.from || null;            // string date/iso or null
    const to = req.query.to || null;                // string date/iso or null
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const type = req.query.type || null;            // 'income' | 'expense' | null
    const qRaw = (req.query.q || '').trim();
    const q = qRaw.length ? `%${qRaw}%` : null;     // pattern for ILIKE

    // ВАЖНО: используем один и тот же WHERE для items и total
    // Паттерн "($param is null OR condition)" — типичный способ делать опциональные фильтры 
    const whereSql = `
      WHERE t.user_id = $1
        AND ($2::timestamptz IS NULL OR t.date >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR t.date <  $3::timestamptz)
        AND ($4::int IS NULL OR t.category_id = $4::int)
        AND ($5::text IS NULL OR c.type = $5::text)
        AND ($6::text IS NULL OR t.comment ILIKE $6::text)
    `;

    const paramsBase = [userId, from, to, categoryId, type, q];

    // 1) items
    const itemsQuery = `
      SELECT t.*, c.name as category_name, c.type as category_type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereSql}
      ORDER BY t.date DESC
      LIMIT $7 OFFSET $8
    `;
    const itemsParams = [...paramsBase, limit, offset];
    const itemsResult = await db.query(itemsQuery, itemsParams);

    // 2) total
    const totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereSql}
    `;
    const totalResult = await db.query(totalQuery, paramsBase);
    const total = Number(totalResult.rows[0]?.total ?? 0);

    res.json({ items: itemsResult.rows, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};



// Создать транзакцию
exports.create = async (req, res) => {
    try {
        const userId = req.user.id;
        const { categoryId, amount, date, comment } = req.body;

        if (!categoryId || !amount || !date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // ВАЖНО: Мы доверяем фронтенду, что categoryId существует.
        // Если нет - Postgres выкинет ошибку внешнего ключа (foreign key constraint),
        // которую мы поймаем в catch.
        
        const query = `
            INSERT INTO transactions (user_id, category_id, amount, date, comment)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await db.query(query, [userId, categoryId, amount, date, comment]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error (check category id)' });
    }
};

// Удалить транзакцию
exports.delete = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactionId = req.params.id;

        const query = 'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await db.query(query, [transactionId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Transaction not found or access denied' });
        }

        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// экспорт в csv
const { format } = require('fast-csv');
const Cursor = require('pg-cursor');

exports.exportCsv = async (req, res) => {
    // Нам нужен отдельный клиент из пула для работы с курсором
    const client = await db.pool.connect();
    
    try {
        const userId = req.user.id;

        // 1. Настраиваем заголовки ответа, чтобы браузер понял: "Это файл для скачивания"
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

        // 2. Создаем CSV поток. Он будет превращать объекты JS в строки CSV
        const csvStream = format({ headers: true });
        
        // Связываем поток CSV с ответом (res). 
        // Всё, что попадет в csvStream, автоматически полетит клиенту.
        csvStream.pipe(res);

        // 3. Создаем запрос с Курсором
        // Курсор позволяет читать данные порциями, а не все сразу
        const cursor = client.query(new Cursor(`
            SELECT t.date, c.name as category, t.amount, t.comment, c.type
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.date DESC
        `, [userId]));

        // 4. Читаем данные порциями по 100 штук
        // Это рекурсивная функция
        const readChunk = () => {
            cursor.read(100, (err, rows) => {
                if (err) {
                    console.error(err);
                    client.release(); // Освобождаем соединение
                    return res.status(500).end(); 
                }

                // Если строк 0 - значит, мы дочитали всё до конца
                if (rows.length === 0) {
                    csvStream.end(); // Закрываем поток (файл скачается)
                    client.release(); // Возвращаем клиента в пул
                    return;
                }

                // Пишем строки в CSV
                rows.forEach(row => {
                    csvStream.write({
                        Дата: new Date(row.date).toLocaleDateString(),
                        Категория: row.category,
                        Тип: row.type === 'income' ? 'Доход' : 'Расход',
                        Сумма: row.amount,
                        Комментарий: row.comment || ''
                    });
                });

                // Читаем следующую порцию
                readChunk();
            });
        };

        // Запускаем чтение
        readChunk();

    } catch (err) {
        console.error(err);
        client.release(); // Не забываем освободить ресурс при ошибке
        res.status(500).send('Export error');
    }
};

