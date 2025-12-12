import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Loader2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  status: string;
  created_at: string;
  password_hash: string;
}

export default function PendingUsersManagement() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkCurrentUser();
    fetchPendingUsers();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      console.log("Current user:", user.user?.id);
      
      if (user.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.user.id)
          .single();
        
        console.log("Current user profile:", { profile, error });
      }
    } catch (error) {
      console.error("Error checking current user:", error);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      console.log("Fetching pending users...");
      const { data, error } = await supabase
        .from("pending_users")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Query result:", { data, error, count: data?.length });
      
      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      toast.error("Failed to load pending users");
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (user: PendingUser) => {
    setProcessing(true);
    try {
      // Create auth user with signup and auto-confirm
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password_hash,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: user.full_name,
            user_type: user.user_type
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Map user_type to valid profile user_type
        const profileUserType = user.user_type === 'driver' ? 'collector' : 
                               user.user_type === 'helper' ? 'collector' :
                               user.user_type;

        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            user_id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            user_type: profileUserType,
            role: 'user'
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      // Mark as approved in pending_users
      const { error: updateError } = await supabase
        .from("pending_users")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(`User ${user.full_name} approved and account created successfully!`);
      fetchPendingUsers();
      setShowDetailsModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve user");
    } finally {
      setProcessing(false);
    }
  };

  const rejectUser = async (user: PendingUser) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("pending_users")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: rejectionReason
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`User ${user.full_name} rejected`);
      fetchPendingUsers();
      setShowDetailsModal(false);
      setRejectionReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject user");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending User Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No pending registrations found. Check console for errors.</p>
        )}
        {pendingUsers.length > 0 && (
        <>
        <div className="block md:hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "pending" ? "secondary" : user.status === "approved" ? "default" : "destructive"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDetailsModal(true);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.user_type}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "pending" ? "secondary" : user.status === "approved" ? "default" : "destructive"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(user.created_at), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    {user.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveUser(user)} disabled={processing}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          setSelectedUser(user);
                          setShowDetailsModal(true);
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
        )}

        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Registration Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.full_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <p className="text-sm text-muted-foreground capitalize">{selectedUser.user_type}</p>
                </div>
                <div>
                  <Label>Registration Date</Label>
                  <p className="text-sm text-muted-foreground">{format(new Date(selectedUser.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>

                {selectedUser.status === "pending" && (
                  <>
                    <div>
                      <Label>Rejection Reason (if rejecting)</Label>
                      <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide reason for rejection..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => approveUser(selectedUser)} disabled={processing} className="flex-1">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve
                      </Button>
                      <Button onClick={() => rejectUser(selectedUser)} disabled={processing} variant="destructive" className="flex-1">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Reject
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}