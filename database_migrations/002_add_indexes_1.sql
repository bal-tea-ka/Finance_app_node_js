CREATE INDEX CONCURRENTLY idx_transactions_user_category_date ON transactions(user_id, category_id, date);
CREATE INDEX CONCURRENTLY idx_budgets_user_category ON budgets(user_id, category_id);
CREATE INDEX CONCURRENTLY idx_budgets_user_active ON budgets(user_id, is_active);
CREATE INDEX CONCURRENTLY idx_categories_user ON categories(user_id);
