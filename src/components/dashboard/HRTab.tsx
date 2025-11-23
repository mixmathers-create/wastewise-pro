import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Shield } from "lucide-react";
import PersonnelList from "./hr/PersonnelList";
import LeaveFilingForm from "./hr/LeaveFilingForm";
import LeaveAdminPanel from "./hr/LeaveAdminPanel";

export const HRTab = () => {
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
          <TabsTrigger value="file-leave" className="gap-2">
            <FileText className="h-4 w-4" />
            File Leave
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-2">
            <Shield className="h-4 w-4" />
            Admin Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel">
          <PersonnelList />
        </TabsContent>

        <TabsContent value="file-leave">
          <LeaveFilingForm />
        </TabsContent>

        <TabsContent value="admin">
          <LeaveAdminPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};