import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Shield, Clock, AlertTriangle } from "lucide-react";
import PersonnelList from "./hr/PersonnelList";
import LeaveFilingForm from "./hr/LeaveFilingForm";
import LeaveAdminPanel from "./hr/LeaveAdminPanel";
import DriversHelpersTimeTracking from "./hr/DriversHelpersTimeTracking";
import ReportsTab from "./hr/ReportsTab";

export function MobileHRTab() {
  return (
    <div className="space-y-4 px-2">
      <div className="text-center">
        <h2 className="text-xl font-bold">Human Resources</h2>
        <p className="text-sm text-muted-foreground">Manage personnel and leave requests</p>
      </div>

      <Tabs defaultValue="personnel" className="w-full">
        <TabsList className="grid w-full grid-cols-5 text-xs h-auto">
          <TabsTrigger value="personnel" className="flex flex-col gap-1 p-2 h-auto">
            <Users className="h-3 w-3" />
            <span className="text-[10px]">Personnel</span>
          </TabsTrigger>
          <TabsTrigger value="time-tracking" className="flex flex-col gap-1 p-2 h-auto">
            <Clock className="h-3 w-3" />
            <span className="text-[10px]">Time</span>
          </TabsTrigger>
          <TabsTrigger value="file-leave" className="flex flex-col gap-1 p-2 h-auto">
            <FileText className="h-3 w-3" />
            <span className="text-[10px]">Leave</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex flex-col gap-1 p-2 h-auto">
            <Shield className="h-3 w-3" />
            <span className="text-[10px]">Admin</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex flex-col gap-1 p-2 h-auto">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px]">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <PersonnelList />
          </div>
        </TabsContent>

        <TabsContent value="time-tracking" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <DriversHelpersTimeTracking />
          </div>
        </TabsContent>

        <TabsContent value="file-leave" className="mt-4">
          <div className="mobile-responsive">
            <LeaveFilingForm />
          </div>
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <LeaveAdminPanel />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <ReportsTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MobileHRTab;