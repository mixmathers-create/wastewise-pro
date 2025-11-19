import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2 } from "lucide-react";
import { CreateJobOrderDialog } from "./CreateJobOrderDialog";

export function JobOrders() {
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*, mechanics(name), trucks(code)")
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Job order marked as completed" });
      fetchJobOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
                    job.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {job.status}
                  </span>
                </TableCell>
                <TableCell>
                  {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : "N/A"}
                </TableCell>
                <TableCell>
                  {job.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleComplete(job.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
                    </Button>
                  )}
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
    </Card>
  );
}
