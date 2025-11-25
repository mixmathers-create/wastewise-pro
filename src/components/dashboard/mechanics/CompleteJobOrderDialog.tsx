import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ServicesList } from "./ServicesList";

interface CompleteJobOrderDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CompleteJobOrderDialog({ job, open, onOpenChange, onSuccess }: CompleteJobOrderDialogProps) {
  const [remarks, setRemarks] = useState("");
  const [unpaidServices, setUnpaidServices] = useState(0);
  const [servicesChecked, setServicesChecked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && job) {
      checkUnpaidServices();
    }
  }, [open, job]);

  const checkUnpaidServices = async () => {
    const { data } = await supabase
      .from("job_order_services")
      .select("id,service_type,cost")
      .eq("job_order_id", job.id)
      .or("cost.is.null,cost.eq.0");
    
    setUnpaidServices(data?.length || 0);
    setServicesChecked(true);
  };

  const handleComplete = async () => {
    if (!remarks.trim()) {
      toast({ title: "Error", description: "Remarks are required to complete the job order", variant: "destructive" });
      return;
    }

    if (unpaidServices > 0) {
      toast({ 
        title: "Cannot Complete", 
        description: `${unpaidServices} third-party service(s) need cost added before completing this job order`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      // Calculate final active time
      let totalMinutes = job.total_active_minutes || 0;
      if (job.status === 'in_progress' && job.last_resume_at) {
        const elapsed = Math.floor((Date.now() - new Date(job.last_resume_at).getTime()) / 1000 / 60);
        totalMinutes += elapsed;
      }

      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_active_minutes: totalMinutes,
          last_resume_at: null,
          description: job.description ? `${job.description}\n\nCompletion Remarks: ${remarks}` : `Completion Remarks: ${remarks}`
        })
        .eq("id", job.id);

      if (error) throw error;

      // Check for related mechanical reports and close them
      const { data: relatedReports } = await supabase
        .from("mechanical_reports")
        .select("*")
        .eq("job_order_id", job.id)
        .neq("status", "resolved");

      if (relatedReports && relatedReports.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user?.id || "")
          .single();

        // Update each related report
        for (const report of relatedReports) {
          const existingComments = report.mechanic_comments || [];
          const completionComment = {
            user_id: user?.id || "system",
            user_name: profile?.full_name || "System",
            comment: `Report automatically closed: Related job order ${job.job_number} completed. ${remarks}`,
            created_at: new Date().toISOString(),
          };

          await supabase
            .from("mechanical_reports")
            .update({
              status: "resolved",
              mechanic_comments: [...existingComments, completionComment],
              reviewed_by: user?.id,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", report.id);
        }
      }

      toast({ title: "Success", description: "Job order completed successfully" });
      onSuccess();
      onOpenChange(false);
      setRemarks("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Complete Job Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Job #: {job.job_number}</p>
            <p className="text-sm">{job.title}</p>
          </div>

          <ServicesList jobOrderId={job.id} onServicesUpdate={checkUnpaidServices} />

          {unpaidServices > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm font-semibold text-destructive">
                ⚠️ {unpaidServices} service(s) require cost to be added before completing
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please add costs to all third-party services above before completing this job order.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="remarks">Completion Remarks *</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter details about the completed work..."
              rows={5}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              onClick={handleComplete}
              disabled={unpaidServices > 0}
            >
              Complete Job Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
