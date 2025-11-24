import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Leave {
  id: string;
  personnel_type: string;
  personnel_id: string;
  personnel_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  medical_certificate_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  leave_days: number;
  is_paid: boolean;
}

const LeaveAdminPanel = () => {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("leaves")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (leaveId: string, status: "approved" | "rejected") => {
    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      const leave = leaves.find(l => l.id === leaveId);

      if (!leave) {
        throw new Error("Leave not found");
      }

      // Update leave status
      const { error: leaveError } = await supabase
        .from("leaves")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", leaveId);

      if (leaveError) throw leaveError;

      // If approved and paid, deduct from personnel's available leaves
      if (status === "approved" && leave.is_paid) {
        const tableName = `${leave.personnel_type}s`;
        
        // Fetch current leaves_available
        const { data: personnelData, error: fetchError } = await supabase
          .from(tableName)
          .select("leaves_available")
          .eq("id", leave.personnel_id)
          .single();

        if (fetchError) throw fetchError;

        const currentLeaves = personnelData?.leaves_available || 0;
        const newLeaves = Math.max(0, currentLeaves - leave.leave_days);

        // Update personnel's leaves_available
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ leaves_available: newLeaves })
          .eq("id", leave.personnel_id);

        if (updateError) throw updateError;
      }

      toast({
        title: `Leave ${status}`,
        description: `The leave request has been ${status}${status === "approved" && leave.is_paid ? `. ${leave.leave_days} days deducted from available leaves.` : ""}`,
      });

      setSelectedLeave(null);
      setReviewNotes("");
      fetchLeaves();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Requests Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personnel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow key={leave.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{leave.personnel_name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{leave.personnel_type}</div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{leave.leave_type.replace("_", " ")}</TableCell>
                <TableCell className="capitalize">{leave.leave_type}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(leave.start_date), "MMM d, yyyy")} - {format(new Date(leave.end_date), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      leave.status === "approved"
                        ? "default"
                        : leave.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {leave.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLeave(leave)}
                      >
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Leave Request Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Personnel</p>
                            <p className="text-sm">{leave.personnel_name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Type</p>
                            <p className="text-sm capitalize">{leave.personnel_type}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Leave Type</p>
                            <p className="text-sm capitalize">{leave.leave_type}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <Badge variant={leave.status === "approved" ? "default" : leave.status === "rejected" ? "destructive" : "secondary"}>
                              {leave.status}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Period</p>
                          <p className="text-sm">
                            {format(new Date(leave.start_date), "MMMM d, yyyy")} - {format(new Date(leave.end_date), "MMMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {leave.leave_days} day(s) • {leave.is_paid ? "Paid" : "Unpaid"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Reason</p>
                          <p className="text-sm">{leave.reason}</p>
                        </div>

                        {leave.medical_certificate_url && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Medical Documentation</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(leave.medical_certificate_url!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Document/Photo
                            </Button>
                          </div>
                        )}

                        {leave.status === "pending" && (
                          <>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Review Notes (Optional)</p>
                              <Textarea
                                placeholder="Add notes about this decision..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReview(leave.id, "approved")}
                                disabled={processing}
                                className="flex-1"
                              >
                                {processing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleReview(leave.id, "rejected")}
                                disabled={processing}
                                variant="destructive"
                                className="flex-1"
                              >
                                {processing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        )}

                        {leave.status !== "pending" && leave.review_notes && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Review Notes</p>
                            <p className="text-sm">{leave.review_notes}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LeaveAdminPanel;