import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CompleteJobOrderDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CompleteJobOrderDialog({ job, open, onOpenChange, onSuccess }: CompleteJobOrderDialogProps) {
  const [remarks, setRemarks] = useState("");
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!remarks.trim()) {
      toast({ title: "Error", description: "Remarks are required to complete the job order", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("job_orders")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          description: job.description ? `${job.description}\n\nCompletion Remarks: ${remarks}` : `Completion Remarks: ${remarks}`
        })
        .eq("id", job.id);

      if (error) throw error;

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Job Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Job #: {job.job_number}</p>
            <p className="text-sm">{job.title}</p>
          </div>
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
            <Button onClick={handleComplete}>Complete Job Order</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
