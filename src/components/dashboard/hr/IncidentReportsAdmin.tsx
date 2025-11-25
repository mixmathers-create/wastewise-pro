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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { AlertCircle, MessageSquare, CheckCircle, XCircle } from "lucide-react";

export default function IncidentReportsAdmin() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newSeverity, setNewSeverity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load incident reports");
    } finally {
      setLoading(false);
    }
  };

  const reviewReport = async () => {
    if (!selectedReport || (!reviewNotes.trim() && !newStatus && !newSeverity)) {
      toast.error("Please provide review notes or update status/severity");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updates: any = {
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (reviewNotes.trim()) updates.review_notes = reviewNotes.trim();
      if (newStatus) updates.status = newStatus;
      if (newSeverity) updates.severity = newSeverity;

      const { error } = await supabase
        .from("incident_reports")
        .update(updates)
        .eq("id", selectedReport.id);

      if (error) throw error;

      toast.success("Report reviewed successfully");
      setReviewNotes("");
      setNewStatus("");
      setNewSeverity("");
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      console.error("Error reviewing report:", error);
      toast.error(error.message || "Failed to review report");
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      submitted: "bg-blue-500",
      under_review: "bg-yellow-500",
      resolved: "bg-green-500",
      closed: "bg-gray-500",
    };
    return <Badge className={colors[status] || ""}>{status.replace(/_/g, " ").toUpperCase()}</Badge>;
  };

  const pendingReports = reports.filter(r => r.status === "submitted");

  if (loading) {
    return <div className="text-center py-8">Loading incident reports...</div>;
  }

  return (
    <div className="space-y-6">
      {pendingReports.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              {pendingReports.length} New Incident Report{pendingReports.length !== 1 ? 's' : ''}
            </CardTitle>
            <CardDescription>
              Reports requiring HR attention
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Incident Reports</CardTitle>
          <CardDescription>Review and manage incident reports</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No incident reports found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {format(new Date(report.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{report.reporter_name}</TableCell>
                      <TableCell>{report.incident_type}</TableCell>
                      <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReport(report);
                                setNewStatus(report.status);
                                setNewSeverity(report.severity);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Incident Report</DialogTitle>
                              <DialogDescription>
                                Reported by {report.reporter_name} on {format(new Date(report.incident_date), "MMM dd, yyyy")}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Incident Type:</h4>
                                <p className="text-sm text-muted-foreground">{report.incident_type}</p>
                              </div>

                              <div>
                                <h4 className="font-semibold mb-2">Description:</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {report.description}
                                </p>
                              </div>

                              {report.location && (
                                <div>
                                  <h4 className="font-semibold mb-2">Location:</h4>
                                  <p className="text-sm text-muted-foreground">{report.location}</p>
                                </div>
                              )}

                              {report.review_notes && (
                                <div>
                                  <h4 className="font-semibold mb-2">Previous Review Notes:</h4>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {report.review_notes}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Update Severity</Label>
                                  <Select value={newSeverity} onValueChange={setNewSeverity}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">Medium</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                      <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Update Status</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="submitted">Submitted</SelectItem>
                                      <SelectItem value="under_review">Under Review</SelectItem>
                                      <SelectItem value="resolved">Resolved</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <Label>Review Notes</Label>
                                <Textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  placeholder="Add your review notes, actions taken, or recommendations..."
                                  className="min-h-[100px]"
                                />
                              </div>

                              <Button
                                onClick={reviewReport}
                                disabled={isSubmitting}
                                className="w-full"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit Review
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
