-- Performance Optimization: Add Database Indexes
-- These indexes significantly improve query performance for common operations

-- Token Lending Performance Indexes
CREATE INDEX IF NOT EXISTS idx_token_lending_user_id ON token_lending(user_id);
CREATE INDEX IF NOT EXISTS idx_token_lending_lend_to_user_id ON token_lending(lend_to_user_id);
CREATE INDEX IF NOT EXISTS idx_token_lending_acceptance_status ON token_lending(acceptance_status);
CREATE INDEX IF NOT EXISTS idx_token_lending_last_lending_date ON token_lending(last_lending_date DESC);

-- Order History Performance Indexes
CREATE INDEX IF NOT EXISTS idx_order_history_user_id ON order_history(user_id);
CREATE INDEX IF NOT EXISTS idx_order_history_restaurant_id ON order_history(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_history_visit_date ON order_history(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_user_visit_date ON order_history(user_id, visit_date DESC);

-- Order History Items Performance Index
CREATE INDEX IF NOT EXISTS idx_order_history_item_order_id ON order_history_item(order_history_id);

-- Menu Items Performance Indexes
CREATE INDEX IF NOT EXISTS idx_menu_item_restaurant_id ON menu_item(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_type ON menu_item(type);

-- Favorites Performance Indexes
CREATE INDEX IF NOT EXISTS idx_favorite_user_id ON favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_restaurant_id ON favorite(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_favorite_menu_item_id ON favorite(menu_item_id);

-- Audit Log Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_correlation_id ON audit_log(correlation_id);

-- Application Log Performance Indexes
CREATE INDEX IF NOT EXISTS idx_app_log_created_at ON app_log(created_at DESC);

-- Step-Up Token Performance Indexes
CREATE INDEX IF NOT EXISTS idx_step_up_token_expires_at ON step_up_token(expires_at);

-- Account Action Performance Indexes
CREATE INDEX IF NOT EXISTS idx_account_action_user_id_action ON account_action(user_id, action);

-- User Email Index for Authentication
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
