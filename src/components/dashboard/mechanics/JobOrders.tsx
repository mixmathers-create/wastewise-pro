import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, PauseCircle } from "lucide-react";
import { CreateJobOrderDialog } from "./CreateJobOrderDialog";
import { CompleteJobOrderDialog } from "./CompleteJobOrderDialog";
import { SuspendJobOrderDialog } from "./SuspendJobOrderDialog";

export function JobOrders() {
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [completingJob, setCompletingJob] = useState<any>(null);
  const [suspendingJob, setSuspendingJob] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobOrders();
    checkEndOfDayJobs();
  }, []);

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*, mechanics(name), trucks(code)")
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
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
              <TableHead>Scheduled</TableHead>
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
                <TableCell>
                  {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : "N/A"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {job.status !== "completed" && job.status !== "suspended" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletingJob(job)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSuspendingJob(job)}
                        >
                          <PauseCircle className="h-4 w-4 mr-2" /> Suspend
                        </Button>
                      </>
                    )}
                    {job.status === "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompletingJob(job)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Resume & Complete
                      </Button>
                    )}
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
    </Card>
  );
}
