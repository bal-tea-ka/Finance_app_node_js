-- Создание таблицы бюджетов
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Один пользователь не может иметь два активных бюджета на одну категорию в один период
    UNIQUE(user_id, category_id, period, start_date)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_budgets_user_active ON budgets(user_id, is_active);
CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);
CREATE INDEX idx_budgets_category ON budgets(category_id);

-- Таблица для истории нарушений бюджета
CREATE TABLE IF NOT EXISTS budget_alerts (
    id SERIAL PRIMARY KEY,
    budget_id INT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('warning', 'exceeded')),
    threshold_percentage INT NOT NULL, -- 80 для warning, 100 для exceeded
    current_spent DECIMAL(10, 2) NOT NULL,
    budget_amount DECIMAL(10, 2) NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT false
);

CREATE INDEX idx_budget_alerts_user ON budget_alerts(user_id, is_read);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at при изменении бюджета
CREATE TRIGGER update_budgets_updated_at 
    BEFORE UPDATE ON budgets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Комментарии для документации
COMMENT ON TABLE budgets IS 'Хранит бюджеты пользователей по категориям';
COMMENT ON TABLE budget_alerts IS 'Хранит историю уведомлений о превышении бюджета';
COMMENT ON COLUMN budgets.period IS 'Период бюджета: daily, weekly, monthly, yearly';
COMMENT ON COLUMN budget_alerts.alert_type IS 'Тип уведомления: warning (80%) или exceeded (100%)';
