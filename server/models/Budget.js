// server/models/Budget.js
const db = require('../db/db');
const {
    BudgetError,
    BudgetNotFoundError,
    BudgetValidationError,
    ConflictError,
    DatabaseError
} = require('../utils/errors');

class Budget {
    // Вспомогательный метод для валидации данных на уровне модели
    static validateBudgetData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.categoryId) {
            errors.push('Category ID is required');
        }

        if (data.categoryId && (!Number.isInteger(data.categoryId) || data.categoryId <= 0)) {
            errors.push('Category ID must be a positive integer');
        }

        if (!isUpdate && data.amount === undefined) {
            errors.push('Amount is required');
        }

        if (data.amount !== undefined) {
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0 || amount > 999999999.99) {
                errors.push('Amount must be a positive number up to 999999999.99');
            }
        }

        if (!isUpdate && !data.period) {
            errors.push('Period is required');
        }

        if (data.period && !['daily', 'weekly', 'monthly', 'yearly'].includes(data.period)) {
            errors.push('Period must be one of: daily, weekly, monthly, yearly');
        }

        if (!isUpdate && !data.startDate) {
            errors.push('Start date is required');
        }

        if (data.startDate && !(data.startDate instanceof Date) && isNaN(Date.parse(data.startDate))) {
            errors.push('Start date must be a valid date');
        }

        if (data.endDate) {
            if (!(data.endDate instanceof Date) && isNaN(Date.parse(data.endDate))) {
                errors.push('End date must be a valid date');
            } else {
                const startDate = new Date(data.startDate);
                const endDate = new Date(data.endDate);
                if (endDate <= startDate) {
                    errors.push('End date must be after start date');
                }
            }
        }

        if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
            errors.push('isActive must be a boolean');
        }

        if (errors.length > 0) {
            throw new BudgetValidationError('Budget validation failed', errors);
        }
    }

    // Валидация ID
    static validateId(id, fieldName = 'ID') {
        if (!id || !Number.isInteger(id) || id <= 0) {
            throw new BudgetValidationError(`Valid ${fieldName} is required`);
        }
    }

    // Получить все бюджеты пользователя
    static async findByUserId(userId, filters = {}) {
        try {
            Budget.validateId(userId, 'user ID');

            let query = `
                SELECT b.*, c.name as category_name, c.type as category_type
                FROM budgets b
                JOIN categories c ON b.category_id = c.id
                WHERE b.user_id = $1
            `;
            
            const params = [userId];
            let paramIndex = 2;
            
            if (filters.isActive !== undefined) {
                if (typeof filters.isActive !== 'boolean') {
                    throw new BudgetValidationError('isActive filter must be a boolean');
                }
                query += ` AND b.is_active = $${paramIndex}`;
                params.push(filters.isActive);
                paramIndex++;
            }
            
            if (filters.period) {
                if (!['daily', 'weekly', 'monthly', 'yearly'].includes(filters.period)) {
                    throw new BudgetValidationError('Invalid period filter value');
                }
                query += ` AND b.period = $${paramIndex}`;
                params.push(filters.period);
                paramIndex++;
            }
            
            query += ' ORDER BY b.created_at DESC';
            
            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch budgets for user ${userId}`, error);
        }
    }
    
    // Получить один бюджет по ID
    static async findById(budgetId, userId) {
        try {
            Budget.validateId(budgetId, 'budget ID');
            Budget.validateId(userId, 'user ID');

            const query = `
                SELECT b.*, c.name as category_name, c.type as category_type
                FROM budgets b
                JOIN categories c ON b.category_id = c.id
                WHERE b.id = $1 AND b.user_id = $2
            `;
            
            const result = await db.query(query, [budgetId, userId]);
            
            if (result.rows.length === 0) {
                throw new BudgetNotFoundError(budgetId);
            }
            
            return result.rows[0];
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch budget ${budgetId}`, error);
        }
    }
    
    // Создать новый бюджет
    static async create(userId, data) {
        try {
            Budget.validateId(userId, 'user ID');
            Budget.validateBudgetData(data, false);

            const { categoryId, amount, period, startDate, endDate } = data;
            
            // Проверка существования категории
            const categoryCheck = await db.query(
                'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
                [categoryId, userId]
            );

            if (categoryCheck.rows.length === 0) {
                throw new BudgetValidationError(`Category with ID ${categoryId} not found or does not belong to user`);
            }

            // Проверка на дублирование активного бюджета
            const duplicateCheck = await db.query(
                `SELECT id FROM budgets 
                 WHERE user_id = $1 AND category_id = $2 AND period = $3 AND is_active = true`,
                [userId, categoryId, period]
            );

            if (duplicateCheck.rows.length > 0) {
                throw new ConflictError(`An active ${period} budget already exists for this category`);
            }

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
        } catch (error) {
            if (error instanceof BudgetError || error instanceof ConflictError) {
                throw error;
            }
            throw new DatabaseError(`Failed to create budget for user ${userId}`, error);
        }
    }
    
    // Обновить бюджет
    static async update(budgetId, userId, data) {
        try {
            Budget.validateId(budgetId, 'budget ID');
            Budget.validateId(userId, 'user ID');

            // Проверка существования бюджета
            const existingBudget = await Budget.findById(budgetId, userId);

            // Валидация данных для обновления
            Budget.validateBudgetData(data, true);

            const { amount, period, startDate, endDate, isActive } = data;
            
            // Проверка на дублирование при изменении периода
            if (period && period !== existingBudget.period) {
                const duplicateCheck = await db.query(
                    `SELECT id FROM budgets 
                     WHERE user_id = $1 AND category_id = $2 AND period = $3 
                     AND is_active = true AND id != $4`,
                    [userId, existingBudget.category_id, period, budgetId]
                );

                if (duplicateCheck.rows.length > 0) {
                    throw new ConflictError(`An active ${period} budget already exists for this category`);
                }
            }

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
        } catch (error) {
            if (error instanceof BudgetError || error instanceof ConflictError) {
                throw error;
            }
            throw new DatabaseError(`Failed to update budget ${budgetId}`, error);
        }
    }
    
    // Удалить бюджет
    static async delete(budgetId, userId) {
        try {
            Budget.validateId(budgetId, 'budget ID');
            Budget.validateId(userId, 'user ID');

            // Проверка существования бюджета
            await Budget.findById(budgetId, userId);

            const query = 'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id';
            const result = await db.query(query, [budgetId, userId]);
            
            return result.rowCount > 0;
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to delete budget ${budgetId}`, error);
        }
    }
    
    // Получить потраченную сумму по бюджету
    static async getSpentAmount(budgetId, userId) {
        try {
            Budget.validateId(budgetId, 'budget ID');
            Budget.validateId(userId, 'user ID');

            const query = `
                SELECT 
                    b.id,
                    b.amount as budget_amount,
                    b.category_id,
                    b.start_date,
                    b.end_date,
                    COALESCE(SUM(t.amount), 0) as spent
                FROM budgets b
                LEFT JOIN transactions t ON 
                    t.user_id = b.user_id 
                    AND t.category_id = b.category_id
                    AND t.date >= b.start_date
                    AND (b.end_date IS NULL OR t.date <= b.end_date)
                WHERE b.id = $1 AND b.user_id = $2
                GROUP BY b.id, b.amount, b.category_id, b.start_date, b.end_date
            `;
            
            const result = await db.query(query, [budgetId, userId]);
            
            if (result.rows.length === 0) {
                throw new BudgetNotFoundError(budgetId);
            }
            
            return parseFloat(result.rows[0].spent);
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to get spent amount for budget ${budgetId}`, error);
        }
    }
    
    // Проверить все бюджеты пользователя и создать алерты
    static async checkBudgets(userId) {
        const client = await db.pool.connect();
        
        try {
            Budget.validateId(userId, 'user ID');

            await client.query('BEGIN');

            const budgets = await Budget.findByUserId(userId, { isActive: true });
            const alerts = [];
            
            for (const budget of budgets) {
                try {
                    const spent = await Budget.getSpentAmount(budget.id, userId);
                    const percentage = (spent / budget.amount) * 100;
                    
                    if (percentage >= 80 && percentage < 100) {
                        const existingAlert = await client.query(
                            'SELECT id FROM budget_alerts WHERE budget_id = $1 AND alert_type = $2 AND DATE(triggered_at) = CURRENT_DATE',
                            [budget.id, 'warning']
                        );
                        
                        if (existingAlert.rows.length === 0) {
                            const alert = await Budget.createAlert(
                                client,
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
                    
                    if (percentage >= 100) {
                        const existingAlert = await client.query(
                            'SELECT id FROM budget_alerts WHERE budget_id = $1 AND alert_type = $2 AND DATE(triggered_at) = CURRENT_DATE',
                            [budget.id, 'exceeded']
                        );
                        
                        if (existingAlert.rows.length === 0) {
                            const alert = await Budget.createAlert(
                                client,
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
                } catch (budgetError) {
                    console.error(`Error checking budget ${budget.id}:`, budgetError);
                }
            }
            
            await client.query('COMMIT');
            return alerts;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to check budgets for user ${userId}`, error);
        } finally {
            client.release();
        }
    }
    
    // Создать алерт
    static async createAlert(client, budgetId, userId, alertType, threshold, spent, budgetAmount) {
        try {
            Budget.validateId(budgetId, 'budget ID');
            Budget.validateId(userId, 'user ID');

            if (!['warning', 'exceeded'].includes(alertType)) {
                throw new BudgetValidationError('Alert type must be "warning" or "exceeded"');
            }

            if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
                throw new BudgetValidationError('Threshold must be a number between 0 and 100');
            }

            if (typeof spent !== 'number' || spent < 0) {
                throw new BudgetValidationError('Spent amount must be a non-negative number');
            }

            if (typeof budgetAmount !== 'number' || budgetAmount <= 0) {
                throw new BudgetValidationError('Budget amount must be a positive number');
            }

            const query = `
                INSERT INTO budget_alerts (budget_id, user_id, alert_type, threshold_percentage, current_spent, budget_amount)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const result = await client.query(query, [
                budgetId, 
                userId, 
                alertType, 
                threshold, 
                spent, 
                budgetAmount
            ]);
            
            return result.rows[0];
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to create alert for budget ${budgetId}`, error);
        }
    }
    
    // Получить непрочитанные алерты пользователя
    static async getUnreadAlerts(userId) {
        const page = Math.max(parseInt(filters.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(filters.limit) || 10, 1), 50);
        try {
            Budget.validateId(userId, 'user ID');

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
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to fetch unread alerts for user ${userId}`, error);
        }
    }
    
    // Отметить алерт как прочитанный
    static async markAlertAsRead(alertId, userId) {
        try {
            Budget.validateId(alertId, 'alert ID');
            Budget.validateId(userId, 'user ID');

            const checkQuery = 'SELECT id FROM budget_alerts WHERE id = $1 AND user_id = $2';
            const checkResult = await db.query(checkQuery, [alertId, userId]);

            if (checkResult.rows.length === 0) {
                throw new BudgetNotFoundError(alertId);
            }

            const query = `
                UPDATE budget_alerts 
                SET is_read = true 
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `;
            
            const result = await db.query(query, [alertId, userId]);
            return result.rows[0];
        } catch (error) {
            if (error instanceof BudgetError) {
                throw error;
            }
            throw new DatabaseError(`Failed to mark alert ${alertId} as read`, error);
        }
    }
}

module.exports = Budget;
