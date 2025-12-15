import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Shield, Clock, AlertTriangle } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import PersonnelList from "./hr/PersonnelList";
import LeaveFilingForm from "./hr/LeaveFilingForm";
import LeaveAdminPanel from "./hr/LeaveAdminPanel";
import DriversHelpersTimeTracking from "./hr/DriversHelpersTimeTracking";
import ReportsTab from "./hr/ReportsTab";

export const HRTab = () => {
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setProfile(data);
      }
    };
    getProfile();
  }, []);
  
  const roleAccess = useRoleAccess(profile?.user_type || 'admin');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Human Resources</h2>
        <p className="text-muted-foreground">Manage personnel and leave requests</p>
      </div>

      <Tabs defaultValue="personnel" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personnel" className="gap-2">
            <Users className="h-4 w-4" />
            Personnel
          </TabsTrigger>
          <TabsTrigger value="time-tracking" className="gap-2">
            <Clock className="h-4 w-4" />
            Time Tracking
          </TabsTrigger>
          <TabsTrigger value="file-leave" className="gap-2">
            <FileText className="h-4 w-4" />
            File Leave
          </TabsTrigger>
          {roleAccess.canAccessHRAdmin && (
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              Admin Panel
            </TabsTrigger>
          )}
          <TabsTrigger value="reports" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel">
          <PersonnelList />
        </TabsContent>

        <TabsContent value="time-tracking">
          <DriversHelpersTimeTracking />
        </TabsContent>

        <TabsContent value="file-leave">
          <LeaveFilingForm />
        </TabsContent>

        {roleAccess.canAccessHRAdmin && (
          <TabsContent value="admin">
            <LeaveAdminPanel />
          </TabsContent>
        )}

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};