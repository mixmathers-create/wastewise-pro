import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useJobOrders = (currentPage: number, completedCurrentPage: number) => {
  const queryClient = useQueryClient();
  const ITEMS_PER_PAGE = 10;

  return useQuery({
    queryKey: ['job-orders', currentPage, completedCurrentPage],
    queryFn: async () => {
      // Parallel fetch with optimized queries
      const [activeResult, completedResult] = await Promise.all([
        supabase
          .from("job_orders")
          .select("id,job_number,title,status,priority,scheduled_date,created_at,started_at,total_active_minutes,last_resume_at,mechanic_ids,truck_id,trucks!inner(code)", { count: 'exact' })
          .in("status", ["pending", "in_progress", "suspended"])
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1),
        
        supabase
          .from("job_orders")
          .select("id,job_number,title,status,priority,scheduled_date,created_at,completed_at,total_active_minutes,mechanic_ids,truck_id,trucks!inner(code)", { count: 'exact' })
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .range((completedCurrentPage - 1) * ITEMS_PER_PAGE, completedCurrentPage * ITEMS_PER_PAGE - 1)
      ]);

      const { data: activeData, count: activeCount } = activeResult;
      const { data: completedData, count: completedCount } = completedResult;

      // Get mechanics data
      const allMechanicIds = [...new Set([
        ...(activeData?.flatMap(job => job.mechanic_ids || []) || []),
        ...(completedData?.flatMap(job => job.mechanic_ids || []) || [])
      ])];

      let mechanicsMap = new Map();
      if (allMechanicIds.length > 0) {
        const { data: mechanicsData } = await supabase
          .from("mechanics")
          .select("id,name")
          .in("id", allMechanicIds);
        mechanicsMap = new Map(mechanicsData?.map(m => [m.id, m]) || []);
      }

      return {
        activeJobs: (activeData || []).map(job => ({
          ...job,
          mechanics: (job.mechanic_ids || []).map(id => mechanicsMap.get(id)).filter(Boolean)
        })),
        completedJobs: (completedData || []).map(job => ({
          ...job,
          mechanics: (job.mechanic_ids || []).map(id => mechanicsMap.get(id)).filter(Boolean)
        })),
        totalActive: activeCount || 0,
        totalCompleted: completedCount || 0
      };
    },
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  });
};

export const invalidateJobOrders = (queryClient: any) => {
  queryClient.invalidateQueries({ queryKey: ['job-orders'] });
};