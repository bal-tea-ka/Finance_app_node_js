const db = require('../db/db');

// Настройка перед всеми тестами
beforeAll(async () => {
    // Можно установить переменные окружения для тестов
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
});

// Очистка после всех тестов
afterAll(async () => {
    // Закрываем соединение с БД
    await db.pool.end();
});

// Глобальные моки если нужны
global.console = {
    ...console,
    // Отключаем console.log в тестах для чистоты вывода
    log: jest.fn(),
    error: jest.fn(),
};
