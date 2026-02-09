const db = require('../db/db');

class Budget {
    // Получить все бюджеты пользователя
    static async findByUserId(userId, filters = {}) {
        let query = `
            SELECT b.*, c.name as category_name, c.type as category_type
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = $1
        `;
        
        const params = [userId];
        let paramIndex = 2;
        
        if (filters.isActive !== undefined) {
            query += ` AND b.is_active = $${paramIndex}`;
            params.push(filters.isActive);
            paramIndex++;
        }
        
        if (filters.period) {
            query += ` AND b.period = $${paramIndex}`;
            params.push(filters.period);
            paramIndex++;
        }
        
        query += ' ORDER BY b.created_at DESC';
        
        const result = await db.query(query, params);
        return result.rows;
    }
    
    // Получить один бюджет по ID
    static async findById(budgetId, userId) {
        const query = `
            SELECT b.*, c.name as category_name, c.type as category_type
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            WHERE b.id = $1 AND b.user_id = $2
        `;
        
        const result = await db.query(query, [budgetId, userId]);
        return result.rows[0];
    }
    
    // Создать новый бюджет
    static async create(userId, data) {
        const { categoryId, amount, period, startDate, endDate } = data;
        
        const query = `
            INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            userId, 
            categoryId, 
            amount, 
            period, 
            startDate, 
            endDate || null
        ]);
        
        return result.rows[0];
    }
    
    // Обновить бюджет
    static async update(budgetId, userId, data) {
        const { amount, period, startDate, endDate, isActive } = data;
        
        const query = `
            UPDATE budgets 
            SET amount = COALESCE($1, amount),
                period = COALESCE($2, period),
                start_date = COALESCE($3, start_date),
                end_date = COALESCE($4, end_date),
                is_active = COALESCE($5, is_active)
            WHERE id = $6 AND user_id = $7
            RETURNING *
        `;
        
        const result = await db.query(query, [
            amount, 
            period, 
            startDate, 
            endDate, 
            isActive, 
            budgetId, 
            userId
        ]);
        
        return result.rows[0];
    }
    
    // Удалить бюджет
    static async delete(budgetId, userId) {
        const query = 'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await db.query(query, [budgetId, userId]);
        return result.rowCount > 0;
    }
    
    // Получить потраченную сумму по бюджету
    static async getSpentAmount(budgetId, userId) {
        const budget = await Budget.findById(budgetId, userId);
        if (!budget) return null;
        
        const query = `
            SELECT COALESCE(SUM(t.amount), 0) as spent
            FROM transactions t
            WHERE t.user_id = $1 
                AND t.category_id = $2
                AND t.date >= $3
                AND ($4::date IS NULL OR t.date <= $4::date)
        `;
        
        const result = await db.query(query, [
            userId,
            budget.category_id,
            budget.start_date,
            budget.end_date
        ]);
        
        return parseFloat(result.rows[0].spent);
    }
    
    // Проверить все бюджеты пользователя и создать алерты
    static async checkBudgets(userId) {
        const budgets = await Budget.findByUserId(userId, { isActive: true });
        const alerts = [];
        
        for (const budget of budgets) {
            const spent = await Budget.getSpentAmount(budget.id, userId);
            const percentage = (spent / budget.amount) * 100;
            
            // Проверка на 80% (предупреждение)
            if (percentage >= 80 && percentage < 100) {
                const existingAlert = await db.query(
                    'SELECT id FROM budget_alerts WHERE budget_id = $1 AND alert_type = $2 AND DATE(triggered_at) = CURRENT_DATE',
                    [budget.id, 'warning']
                );
                
                if (existingAlert.rows.length === 0) {
                    const alert = await Budget.createAlert(
                        budget.id, 
                        userId, 
                        'warning', 
                        80, 
                        spent, 
                        budget.amount
                    );
                    alerts.push(alert);
                }
            }
            
            // Проверка на 100% (превышение)
            if (percentage >= 100) {
                const existingAlert = await db.query(
                    'SELECT id FROM budget_alerts WHERE budget_id = $1 AND alert_type = $2 AND DATE(triggered_at) = CURRENT_DATE',
                    [budget.id, 'exceeded']
                );
                
                if (existingAlert.rows.length === 0) {
                    const alert = await Budget.createAlert(
                        budget.id, 
                        userId, 
                        'exceeded', 
                        100, 
                        spent, 
                        budget.amount
                    );
                    alerts.push(alert);
                }
            }
        }
        
        return alerts;
    }
    
    // Создать алерт
    static async createAlert(budgetId, userId, alertType, threshold, spent, budgetAmount) {
        const query = `
            INSERT INTO budget_alerts (budget_id, user_id, alert_type, threshold_percentage, current_spent, budget_amount)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            budgetId, 
            userId, 
            alertType, 
            threshold, 
            spent, 
            budgetAmount
        ]);
        
        return result.rows[0];
    }
    
    // Получить непрочитанные алерты пользователя
    static async getUnreadAlerts(userId) {
        const query = `
            SELECT ba.*, b.amount as budget_amount, b.period, c.name as category_name
            FROM budget_alerts ba
            JOIN budgets b ON ba.budget_id = b.id
            JOIN categories c ON b.category_id = c.id
            WHERE ba.user_id = $1 AND ba.is_read = false
            ORDER BY ba.triggered_at DESC
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows;
    }
    
    // Отметить алерт как прочитанный
    static async markAlertAsRead(alertId, userId) {
        const query = `
            UPDATE budget_alerts 
            SET is_read = true 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        
        const result = await db.query(query, [alertId, userId]);
        return result.rows[0];
    }
}

module.exports = Budget;
