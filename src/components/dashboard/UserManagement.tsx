import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X, UserCheck } from "lucide-react";
import PendingUsersManagement from "./PendingUsersManagement";

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingUserType, setEditingUserType] = useState<string>("");

  const userTypes = [
    { value: "admin", label: "Admin" },
    { value: "mechanic", label: "Mechanic" },
    { value: "collector", label: "Collector" },
    { value: "hr", label: "HR" }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: any) => {
    setEditingUser(user.id);
    setEditingUserType(user.user_type || "admin");
  };

  const handleSaveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ user_type: editingUserType })
        .eq("id", userId);

      if (error) throw error;

      toast({ title: "Success", description: "User type updated successfully" });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditingUserType("");
  };

  return (
    <Tabs defaultValue="existing" className="space-y-4">
      <TabsList>
        <TabsTrigger value="existing">Existing Users</TabsTrigger>
        <TabsTrigger value="pending">
          <UserCheck className="h-4 w-4 mr-2" />
          Pending Approvals
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="existing">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user roles and access levels</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading users...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {editingUser === user.id ? (
                          <Select value={editingUserType} onValueChange={setEditingUserType}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {userTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize">{user.user_type || "admin"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser === user.id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveUser(user.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="pending">
        <PendingUsersManagement />
      </TabsContent>
    </Tabs>
  );
};

export default UserManagement;