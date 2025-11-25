import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface ReportsListProps {
  type: "incident" | "mechanical";
}

export default function ReportsList({ type }: ReportsListProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [type]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const tableName = type === "incident" ? "incident_reports" : "mechanical_reports";
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
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
      job_order_created: "bg-purple-500"
    };
    return <Badge className={colors[status] || ""}>{status.replace(/_/g, " ").toUpperCase()}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent {type === "incident" ? "Incident" : "Mechanical"} Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No reports found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reporter</TableHead>
                  {type === "incident" ? (
                    <TableHead>Type</TableHead>
                  ) : (
                    <TableHead>Vehicle</TableHead>
                  )}
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {format(new Date(report.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{report.reporter_name}</TableCell>
                    <TableCell>
                      {type === "incident" ? report.incident_type : report.truck_id}
                    </TableCell>
                    <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {type === "incident" ? report.description : report.issue_description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
