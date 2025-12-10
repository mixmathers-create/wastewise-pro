// Optimized Supabase configuration for better performance
export const supabaseConfig = {
  // Connection pooling settings
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  // Performance optimizations
  realtime: {
    params: {
      eventsPerSecond: 10 // Limit realtime events
    }
  }
};

// Query optimization helpers
export const queryOptions = {
  // Standard pagination size
  pageSize: 10,
  
  // Cache settings
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
  
  // Retry settings
  retry: 2,
  retryDelay: 1000
};

// Common select fields to reduce data transfer
export const selectFields = {
  jobOrders: 'id,job_number,title,status,priority,scheduled_date,created_at,started_at,total_active_minutes,last_resume_at,mechanic_ids,truck_id',
  mechanicalReports: 'id,created_at,truck_id,reporter_name,severity,truck_operational,status,issue_description,mechanic_comments,job_order_id',
  tools: 'id,name,code,category,condition,status',
  trucks: 'id,code,plate_number',
  mechanics: 'id,name'
};