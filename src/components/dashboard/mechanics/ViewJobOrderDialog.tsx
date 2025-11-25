import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ServicesList } from "./ServicesList";
import { MessageSquare } from "lucide-react";

interface ViewJobOrderDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewJobOrderDialog({ job, open, onOpenChange }: ViewJobOrderDialogProps) {
  const [mechanics, setMechanics] = useState<any[]>([]);

  useEffect(() => {
    if (open && job?.mechanic_ids?.length > 0) {
      fetchMechanics();
    }
  }, [open, job]);

  const fetchMechanics = async () => {
    const { data } = await supabase
      .from("mechanics")
      .select("id,name")
      .in("id", job.mechanic_ids || []);
    
    setMechanics(data || []);
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive"
    };
    return <Badge variant={variants[priority] || "default"}>{priority.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      suspended: "bg-orange-500",
      completed: "bg-green-500"
    };
    return <Badge className={colors[status] || ""}>{status.replace(/_/g, " ").toUpperCase()}</Badge>;
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Order Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Job Number</Label>
              <p className="font-semibold">{job.job_number}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(job.status)}</div>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Title</Label>
            <p className="font-semibold">{job.title}</p>
          </div>

          {job.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="whitespace-pre-wrap text-sm">{job.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <div className="mt-1">{getPriorityBadge(job.priority)}</div>
            </div>
            {job.scheduled_date && (
              <div>
                <Label className="text-muted-foreground">Scheduled Date</Label>
                <p className="font-semibold">{format(new Date(job.scheduled_date), "MMM dd, yyyy")}</p>
              </div>
            )}
          </div>

          {job.trucks && (
            <div>
              <Label className="text-muted-foreground">Vehicle</Label>
              <p className="font-semibold">{job.trucks.code}</p>
            </div>
          )}

          {mechanics.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Assigned Mechanics</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {mechanics.map(mechanic => (
                  <Badge key={mechanic.id} variant="secondary">{mechanic.name}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground mb-2 block">Services</Label>
            <ServicesList jobOrderId={job.id} onServicesUpdate={() => {}} />
          </div>

          {job.mechanic_comments && job.mechanic_comments.length > 0 && (
            <div>
              <Label className="text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments History
              </Label>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {job.mechanic_comments.map((comment: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-primary pl-3 py-2 bg-muted/30 rounded-r">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{comment.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
