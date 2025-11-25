import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { AlertCircle, MessageSquare, Wrench, CheckCircle, XCircle, Trash2 } from "lucide-react";

export default function MechanicalReportsNotifications() {
  const [reports, setReports] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [reportToClose, setReportToClose] = useState<any>(null);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from("mechanical_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const { data: trucksData, error: trucksError } = await supabase
        .from("trucks")
        .select("*");

      if (trucksError) throw trucksError;

      const trucksMap = (trucksData || []).reduce((acc, truck) => {
        acc[truck.id] = truck;
        return acc;
      }, {} as Record<string, any>);

      setReports(reportsData || []);
      setTrucks(trucksMap);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load mechanical reports");
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!selectedReport || !comment.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const existingComments = selectedReport.mechanic_comments || [];
      const newComment = {
        user_id: user.id,
        user_name: profile?.full_name || "Unknown",
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("mechanical_reports")
        .update({
          mechanic_comments: [...existingComments, newComment],
          status: "under_review",
        })
        .eq("id", selectedReport.id);

      if (error) throw error;

      toast.success("Comment added successfully");
      setComment("");
      fetchReports();
      setSelectedReport(null);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error(error.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const createJobOrder = async (report: any) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate job number
      const { data: existingJobs } = await supabase
        .from("job_orders")
        .select("job_number")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastNumber = existingJobs?.[0]?.job_number 
        ? parseInt(existingJobs[0].job_number.split('-')[1]) 
        : 0;
      const jobNumber = `JO-${String(lastNumber + 1).padStart(5, '0')}`;

      const { data: jobOrder, error: jobError } = await supabase
        .from("job_orders")
        .insert({
          job_number: jobNumber,
          title: `Mechanical Issue - ${trucks[report.truck_id]?.code || 'Unknown'}`,
          description: report.issue_description,
          truck_id: report.truck_id,
          priority: report.severity === "critical" || report.severity === "high" ? "high" : "medium",
          status: "pending",
          created_by: user.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const { error: updateError } = await supabase
        .from("mechanical_reports")
        .update({
          status: "job_order_created",
          job_order_id: jobOrder.id,
        })
        .eq("id", report.id);

      if (updateError) throw updateError;

      toast.success(`Job Order ${jobNumber} created successfully`);
      fetchReports();
    } catch (error: any) {
      console.error("Error creating job order:", error);
      toast.error(error.message || "Failed to create job order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeReport = async () => {
    if (!reportToClose || !closeReason.trim()) {
      toast.error("Please provide a reason for closing the report");
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
        .single();

      const existingComments = reportToClose.mechanic_comments || [];
      const closingComment = {
        user_id: user.id,
        user_name: profile?.full_name || "Unknown",
        comment: `Report closed: ${closeReason.trim()}`,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("mechanical_reports")
        .update({
          status: "resolved",
          mechanic_comments: [...existingComments, closingComment],
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportToClose.id);

      if (error) throw error;

      toast.success("Report closed successfully");
      setCloseDialogOpen(false);
      setCloseReason("");
      setReportToClose(null);
      fetchReports();
    } catch (error: any) {
      console.error("Error closing report:", error);
      toast.error(error.message || "Failed to close report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      critical: "destructive"
    };
    return <Badge variant={variants[severity] || "default"}>{severity.toUpperCase()}</Badge>;
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(reports.map(r => r.id)));
    }
  };

  const deleteSelectedReports = async () => {
    if (selectedReports.size === 0) {
      toast.error("No reports selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("mechanical_reports")
        .delete()
        .in("id", Array.from(selectedReports));

      if (error) throw error;

      toast.success(`${selectedReports.size} report(s) deleted successfully`);
      setSelectedReports(new Set());
      setDeleteDialogOpen(false);
      fetchReports();
    } catch (error: any) {
      console.error("Error deleting reports:", error);
      toast.error(error.message || "Failed to delete reports");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingReports = reports.filter(r => r.status === "submitted");

  if (loading) {
    return <div className="text-center py-8">Loading mechanical reports...</div>;
  }

  return (
    <div className="space-y-6">
      {pendingReports.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              {pendingReports.length} New Mechanical Report{pendingReports.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              Reports requiring mechanic attention
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mechanical Reports</CardTitle>
              <CardDescription>Review and take action on mechanical issues</CardDescription>
            </div>
            {selectedReports.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedReports.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No mechanical reports found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedReports.size === reports.length && reports.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Operational</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReports.has(report.id)}
                          onCheckedChange={() => toggleReportSelection(report.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {trucks[report.truck_id]?.code || "Unknown"} - {trucks[report.truck_id]?.plate_number || "N/A"}
                      </TableCell>
                      <TableCell>{report.reporter_name}</TableCell>
                      <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                      <TableCell>
                        {report.truck_operational ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="destructive">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge>{report.status.replace(/_/g, " ").toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedReport(report)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Report Details & Comments</DialogTitle>
                                <DialogDescription>
                                  {trucks[report.truck_id]?.code} - Reported by {report.reporter_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Issue Description:</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {report.issue_description}
                                  </p>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Comments:</h4>
                                  {report.mechanic_comments && report.mechanic_comments.length > 0 ? (
                                    <div className="space-y-2">
                                      {report.mechanic_comments.map((c: any, idx: number) => (
                                        <div key={idx} className="border-l-2 border-primary pl-3">
                                          <p className="text-sm font-medium">{c.user_name}</p>
                                          <p className="text-sm text-muted-foreground">{c.comment}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(c.created_at), "MMM dd, yyyy HH:mm")}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No comments yet</p>
                                  )}
                                </div>

                                {report.status !== "resolved" && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Add Comment:</h4>
                                    <Textarea
                                      value={comment}
                                      onChange={(e) => setComment(e.target.value)}
                                      placeholder="Add your assessment or comments..."
                                      className="min-h-[100px]"
                                    />
                                    <Button
                                      onClick={addComment}
                                      disabled={isSubmitting || !comment.trim()}
                                      className="mt-2"
                                    >
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Add Comment
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {report.status !== "job_order_created" && report.status !== "resolved" && (
                            <Button
                              size="sm"
                              onClick={() => createJobOrder(report)}
                              disabled={isSubmitting}
                            >
                              <Wrench className="h-4 w-4 mr-1" />
                              Create Job Order
                            </Button>
                          )}

                          {report.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setReportToClose(report);
                                setCloseDialogOpen(true);
                              }}
                              disabled={isSubmitting}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          )}

                          {report.job_order_id && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              JO Created
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Mechanical Report</DialogTitle>
            <DialogDescription>
              Provide a reason for closing this report. This action will mark the report as resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Closing *</Label>
              <Textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Explain why this report is being closed (e.g., issue resolved, false alarm, duplicate, etc.)"
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCloseDialogOpen(false);
                  setCloseReason("");
                  setReportToClose(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={closeReport}
                disabled={isSubmitting || !closeReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mechanical Reports</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedReports.size} report(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelectedReports}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Reports
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
