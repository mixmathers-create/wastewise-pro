-- SUPABASE PRODUCTION INDEXES
-- Run these one by one in Supabase SQL Editor

-- 1. TIME TRACKING (Highest Priority - Fixes your slowest query)
CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_time_out_not_null 
ON mechanic_time_logs(time_in DESC) WHERE time_out IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_time_out_null 
ON mechanic_time_logs(time_in DESC) WHERE time_out IS NULL;

CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_mechanic_id 
ON mechanic_time_logs(mechanic_id);

-- 2. JOB ORDERS (High Priority)
CREATE INDEX IF NOT EXISTS idx_job_orders_status_created 
ON job_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_orders_completed_at 
ON job_orders(completed_at DESC) WHERE status = 'completed';

-- 3. MECHANICAL REPORTS (High Priority)
CREATE INDEX IF NOT EXISTS idx_mechanical_reports_created_at 
ON mechanical_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mechanical_reports_status 
ON mechanical_reports(status);

-- 4. TOOLS (Medium Priority)
CREATE INDEX IF NOT EXISTS idx_tools_status 
ON tools(status);

CREATE INDEX IF NOT EXISTS idx_tool_checkouts_checked_out_at 
ON tool_checkouts(checked_out_at DESC);

-- 5. GENERAL (Medium Priority)
CREATE INDEX IF NOT EXISTS idx_mechanics_name 
ON mechanics(name);

CREATE INDEX IF NOT EXISTS idx_collection_receipts_created_at 
ON collection_receipts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_name 
ON clients(name);