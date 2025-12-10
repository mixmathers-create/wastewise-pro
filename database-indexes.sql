-- Critical indexes for performance optimization
-- Run these in your Supabase SQL editor

-- Job Orders indexes
CREATE INDEX IF NOT EXISTS idx_job_orders_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_job_orders_created_at ON job_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_orders_completed_at ON job_orders(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_orders_status_created ON job_orders(status, created_at DESC);

-- Mechanical Reports indexes
CREATE INDEX IF NOT EXISTS idx_mechanical_reports_created_at ON mechanical_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mechanical_reports_status ON mechanical_reports(status);

-- Tools indexes
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_name ON tools(name);

-- Tool Checkouts indexes
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_checked_out_at ON tool_checkouts(checked_out_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_status ON tool_checkouts(status);

-- Mechanics indexes
CREATE INDEX IF NOT EXISTS idx_mechanics_name ON mechanics(name);

-- Collection receipts indexes
CREATE INDEX IF NOT EXISTS idx_collection_receipts_created_at ON collection_receipts(created_at DESC);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Time tracking indexes (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_time_in_desc ON mechanic_time_logs(time_in DESC);
CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_time_out_not_null ON mechanic_time_logs(time_in DESC) WHERE time_out IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_time_out_null ON mechanic_time_logs(time_in DESC) WHERE time_out IS NULL;
CREATE INDEX IF NOT EXISTS idx_mechanic_time_logs_mechanic_id ON mechanic_time_logs(mechanic_id);