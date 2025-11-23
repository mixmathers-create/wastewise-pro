import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SuspendJobOrderDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SuspendJobOrderDialog({ job, open, onOpenChange, onSuccess }: SuspendJobOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const { toast } = useToast();

  const suspensionReasons = [
    { value: "lack_of_parts", label: "Lack of Parts/Tools to be Purchased" },
    { value: "lack_of_manpower", label: "Lack of Manpower" },
    { value: "lack_of_time", label: "Lack of Time" },
    { value: "other", label: "Other" }
  ];

  const handleSuspend = async () => {
    if (!reason) {
      toast({ title: "Error", description: "Please select a suspension reason", variant: "destructive" });
      return;
    }

    if (!remarks.trim()) {
      toast({ title: "Error", description: "Remarks are required to suspend the job order", variant: "destructive" });
      return;
    }

    try {
      // Calculate elapsed time before suspending
      let totalMinutes = job.total_active_minutes || 0;
      if (job.status === 'in_progress' && job.last_resume_at) {
        const elapsed = Math.floor((Date.now() - new Date(job.last_resume_at).getTime()) / 1000 / 60);
        totalMinutes += elapsed;
      }

      const reasonLabel = suspensionReasons.find(r => r.value === reason)?.label || reason;
      const suspensionNote = `\n\nSuspended: ${reasonLabel}\nRemarks: ${remarks}\nSuspended At: ${new Date().toLocaleString()}`;

      // Store suspension period
      const suspendedPeriods = job.suspended_periods || [];
      suspendedPeriods.push({
        suspended_at: new Date().toISOString(),
        reason: reasonLabel,
        remarks
      });

      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "suspended",
          total_active_minutes: totalMinutes,
          last_resume_at: null,
          suspended_periods: suspendedPeriods,
          description: job.description ? `${job.description}${suspensionNote}` : suspensionNote
        })
        .eq("id", job.id);

      if (error) throw error;

      toast({ title: "Success", description: "Job order suspended" });
      onSuccess();
      onOpenChange(false);
      setReason("");
      setRemarks("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Job Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Job #: {job.job_number}</p>
            <p className="text-sm">{job.title}</p>
          </div>
          <div>
            <Label htmlFor="reason">Suspension Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {suspensionReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="remarks">Additional Remarks *</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide details about the suspension..."
              rows={5}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSuspend}>Suspend Job Order</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
