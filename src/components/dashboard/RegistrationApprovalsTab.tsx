import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PendingRegistration {
  id: string;
  email: string;
  full_name: string;
  requested_role: string;
  status: string;
  created_at: string;
}

const RegistrationApprovalsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading registrations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (registrationId: string, assignedRole: string) => {
    setProcessingId(registrationId);
    try {
      const { data, error } = await supabase.rpc("approve_registration", {
        registration_id: registrationId,
        assigned_user_type: assignedRole,
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Registration approved",
          description: "User has been successfully created and can now log in.",
        });
        fetchRegistrations();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejection = async (registrationId: string) => {
    setProcessingId(registrationId);
    try {
      const { error } = await supabase
        .from("pending_registrations")
        .update({ 
          status: "rejected", 
          approved_by: profile.user_id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", registrationId);

      if (error) throw error;

      toast({
        title: "Registration rejected",
        description: "Registration request has been rejected.",
      });
      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800";
      case "mechanic": return "bg-blue-100 text-blue-800";
      case "collector": return "bg-green-100 text-green-800";
      case "hr": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration Approvals</CardTitle>
          <CardDescription>Review and approve pending user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Registration Approvals
        </CardTitle>
        <CardDescription>Review and approve pending user registrations</CardDescription>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No pending registrations</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell className="font-medium">{registration.full_name}</TableCell>
                  <TableCell>{registration.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(registration.requested_role)}>
                      {registration.requested_role}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(registration.status)}</TableCell>
                  <TableCell>{new Date(registration.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {registration.status === "pending" && (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(role) => handleApproval(registration.id, role)}
                          disabled={processingId === registration.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Approve as..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="mechanic">Mechanic</SelectItem>
                            <SelectItem value="collector">Collector</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejection(registration.id)}
                          disabled={processingId === registration.id}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RegistrationApprovalsTab;