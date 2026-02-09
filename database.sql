-- Очистка (для перезапуска скрипта, если что-то пошло не так)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 1. Таблица Пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица Категорий
-- У каждого юзера свои категории, но type ограничен значениями 'income' или 'expense'
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- Если удалить юзера, удалятся и категории
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Таблица Транзакций
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL, -- Если категорию удалят, транзакция останется (но без категории)
    amount DECIMAL(10, 2) NOT NULL, -- DECIMAL важен для денег!
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comment TEXT
);

-- Индексы для ускорения поиска
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);

-- ТЕСТОВЫЕ ДАННЫЕ (SEEDING)
-- Пароль 'password123' (в реальности здесь должен быть хеш от bcrypt, но для теста базы пойдет текст)
INSERT INTO users (email, password_hash) VALUES 
('test@example.com', 'hashed_secret_123');

-- Добавим категории для этого юзера (id=1)
INSERT INTO categories (user_id, name, type) VALUES 
(1, 'Продукты', 'expense'),
(1, 'Зарплата', 'income'),
(1, 'Транспорт', 'expense');

-- Добавим пару транзакций
INSERT INTO transactions (user_id, category_id, amount, date, comment) VALUES
(1, 1, 1500.00, NOW(), 'Вкусвилл'),
(1, 2, 50000.00, NOW() - INTERVAL '2 days', 'Аванс');
