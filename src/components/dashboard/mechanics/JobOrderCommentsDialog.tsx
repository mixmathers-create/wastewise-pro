import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface JobOrderCommentsDialogProps {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function JobOrderCommentsDialog({ job, open, onOpenChange, onSuccess }: JobOrderCommentsDialogProps) {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && job) {
      setComments(job.mechanic_comments || []);
      setComment("");
    }
  }, [open, job]);

  const handleAddComment = async () => {
    if (!comment.trim()) {
      toast({ title: "Error", description: "Comment cannot be empty", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const newComment = {
        user_id: user.id,
        user_name: profile?.full_name || "Unknown",
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedComments = [...(job.mechanic_comments || []), newComment];

      const { error } = await supabase
        .from("job_orders")
        .update({ mechanic_comments: updatedComments })
        .eq("id", job.id);

      if (error) throw error;

      toast({ title: "Success", description: "Comment added successfully" });
      setComment("");
      setComments(updatedComments);
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Order Comments</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Job #: {job.job_number}</p>
            <p className="text-sm">{job.title}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Comments History</h4>
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map((c: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-primary pl-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{c.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="new-comment">Add Comment</Label>
            <Textarea
              id="new-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes, observations, or progress updates..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button 
              onClick={handleAddComment}
              disabled={isSubmitting || !comment.trim()}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
