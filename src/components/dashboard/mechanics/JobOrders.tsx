import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, PauseCircle, Trash2, Play, Download } from "lucide-react";
import { CreateJobOrderDialog } from "./CreateJobOrderDialog";
import { CompleteJobOrderDialog } from "./CompleteJobOrderDialog";
import { SuspendJobOrderDialog } from "./SuspendJobOrderDialog";
import { ExportJobOrderDialog } from "./ExportJobOrderDialog";

export function JobOrders() {
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [completingJob, setCompletingJob] = useState<any>(null);
  const [suspendingJob, setSuspendingJob] = useState<any>(null);
  const [exportingJob, setExportingJob] = useState<any>(null);
  const [activeTimers, setActiveTimers] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchJobOrders();
    checkEndOfDayJobs();
    
    // Update timers every second for in-progress jobs
    const interval = setInterval(() => {
      updateActiveTimers();
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const updateActiveTimers = () => {
    const newTimers: {[key: string]: number} = {};
    jobOrders.forEach(job => {
      if (job.status === 'in_progress' && job.last_resume_at) {
        const elapsed = Math.floor((Date.now() - new Date(job.last_resume_at).getTime()) / 1000);
        const totalMinutes = job.total_active_minutes || 0;
        newTimers[job.id] = totalMinutes * 60 + elapsed;
      }
    });
    setActiveTimers(newTimers);
  };

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*, mechanics(name), trucks(code)")
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleStart = async (job: any) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "in_progress",
          started_at: job.started_at || now,
          last_resume_at: now,
          updated_at: now
        })
        .eq("id", job.id);

      if (error) throw error;
      toast({ title: "Success", description: "Job order started" });
      fetchJobOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job order?")) return;

    try {
      const { error } = await supabase.from("job_orders").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Job order deleted" });
      fetchJobOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const checkEndOfDayJobs = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 18) {
      const today = now.toISOString().split('T')[0];
      
      const { data: openJobs } = await supabase
        .from("job_orders")
        .select("*")
        .eq("status", "in_progress")
        .lte("scheduled_date", today);

      if (openJobs && openJobs.length > 0) {
        toast({
          title: "Pending Job Orders",
          description: `${openJobs.length} job order(s) are still open. Please add remarks or complete them.`,
          variant: "destructive"
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Job Orders</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Job Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Truck</TableHead>
              <TableHead>Mechanic</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time Elapsed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobOrders.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-mono">{job.job_number}</TableCell>
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell>{job.trucks?.code || "N/A"}</TableCell>
                <TableCell>{job.mechanics?.name || "Unassigned"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    job.priority === "high" ? "bg-red-100 text-red-800" :
                    job.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {job.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    job.status === "completed" ? "bg-green-100 text-green-800" :
                    job.status === "suspended" ? "bg-orange-100 text-orange-800" :
                    job.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="font-mono">
                  {job.status === 'in_progress' && activeTimers[job.id] 
                    ? formatTime(activeTimers[job.id])
                    : job.total_active_minutes 
                    ? formatTime(job.total_active_minutes * 60)
                    : '00:00:00'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {job.status === "pending" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStart(job)}
                      >
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                    )}
                    {job.status === "in_progress" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletingJob(job)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSuspendingJob(job)}
                        >
                          <PauseCircle className="h-4 w-4 mr-1" /> Suspend
                        </Button>
                      </>
                    )}
                    {job.status === "suspended" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStart(job)}
                        >
                          <Play className="h-4 w-4 mr-1" /> Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletingJob(job)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                        </Button>
                      </>
                    )}
                    {job.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExportingJob(job)}
                      >
                        <Download className="h-4 w-4 mr-1" /> Export
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <CreateJobOrderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchJobOrders}
      />

      {completingJob && (
        <CompleteJobOrderDialog
          job={completingJob}
          open={!!completingJob}
          onOpenChange={(open) => !open && setCompletingJob(null)}
          onSuccess={fetchJobOrders}
        />
      )}

      {suspendingJob && (
        <SuspendJobOrderDialog
          job={suspendingJob}
          open={!!suspendingJob}
          onOpenChange={(open) => !open && setSuspendingJob(null)}
          onSuccess={fetchJobOrders}
        />
      )}

      {exportingJob && (
        <ExportJobOrderDialog
          job={exportingJob}
          open={!!exportingJob}
          onOpenChange={(open) => !open && setExportingJob(null)}
        />
      )}
    </Card>
  );
}