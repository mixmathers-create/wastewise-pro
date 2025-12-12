import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileText, Shield, Clock, AlertTriangle } from "lucide-react";
import PersonnelList from "./hr/PersonnelList";
import LeaveFilingForm from "./hr/LeaveFilingForm";
import LeaveAdminPanel from "./hr/LeaveAdminPanel";
import DriversHelpersTimeTracking from "./hr/DriversHelpersTimeTracking";
import ReportsTab from "./hr/ReportsTab";
import type { UseHROfflineSyncReturn } from "@/hooks/useHROfflineSync";

interface MobileHRTabProps {
  profile?: any;
  isOnline?: boolean;
  hrSync?: UseHROfflineSyncReturn;
  onPendingItemAdded?: () => void; // Callback to refresh PendingTab when item added
}

export function MobileHRTab({ profile, isOnline = true, hrSync, onPendingItemAdded }: MobileHRTabProps) {
  // Use hrSync data passed from parent (synced at app level in MobileDashboard)
  const trucks = hrSync?.trucks || [];
  const drivers = hrSync?.drivers || [];
  const helpers = hrSync?.helpers || [];
  const mechanics = hrSync?.mechanics || [];
  const recyclers = hrSync?.recyclers || [];
  const management = hrSync?.management || [];
  const cachedTimeLogs = hrSync?.cachedTimeLogs || [];
  const pendingTimeIns = hrSync?.pendingTimeIns || [];
  const createPendingLeaveRequest = hrSync?.createPendingLeaveRequest;
  const createPendingIncidentReport = hrSync?.createPendingIncidentReport;
  const createPendingMechanicalReport = hrSync?.createPendingMechanicalReport;
  const createPendingTimeIn = hrSync?.createPendingTimeIn;
  const createPendingTimeOut = hrSync?.createPendingTimeOut;
  const refreshPendingItems = hrSync?.refreshPendingItems;
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
            <PersonnelList 
              isOnline={isOnline}
              cachedDrivers={drivers}
              cachedHelpers={helpers}
              cachedMechanics={mechanics}
              cachedRecyclers={recyclers}
              cachedManagement={management}
            />
          </div>
        </TabsContent>

        <TabsContent value="time-tracking" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <DriversHelpersTimeTracking 
              isOnline={isOnline}
              cachedTrucks={trucks}
              cachedDrivers={drivers}
              cachedHelpers={helpers}
              cachedRecyclers={recyclers}
              cachedTimeLogs={cachedTimeLogs}
              pendingTimeIns={pendingTimeIns}
              createPendingTimeIn={profile ? createPendingTimeIn : undefined}
              createPendingTimeOut={profile ? createPendingTimeOut : undefined}
              onOfflineSuccess={onPendingItemAdded}
            />
          </div>
        </TabsContent>

        <TabsContent value="file-leave" className="mt-4">
          <div className="mobile-responsive">
            <LeaveFilingForm 
              profile={profile} 
              isOnline={isOnline}
              cachedDrivers={drivers}
              cachedHelpers={helpers}
              cachedMechanics={mechanics}
              cachedRecyclers={recyclers}
              cachedManagement={management}
              createPendingLeaveRequest={profile ? createPendingLeaveRequest : undefined}
              refreshPendingItems={refreshPendingItems}
              onOfflineSuccess={onPendingItemAdded}
            />
          </div>
        </TabsContent>

        <TabsContent value="admin" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <LeaveAdminPanel />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="mobile-responsive overflow-x-auto">
            <ReportsTab 
              isOnline={isOnline}
              profile={profile}
              cachedTrucks={trucks}
              createPendingIncidentReport={profile ? createPendingIncidentReport : undefined}
              createPendingMechanicalReport={profile ? createPendingMechanicalReport : undefined}
              onOfflineSuccess={onPendingItemAdded}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MobileHRTab;