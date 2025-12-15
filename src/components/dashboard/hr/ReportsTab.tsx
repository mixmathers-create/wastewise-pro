import IncidentReportForm from "./IncidentReportForm";
import MechanicalReportForm from "./MechanicalReportForm";
import type { PendingIncidentReport, PendingMechanicalReport } from "@/lib/offlineDb";

interface Truck {
  id: string;
  code: string;
  plate_number?: string | null;
  type: string;
}

interface ReportsTabProps {
  isOnline?: boolean;
  profile?: any;
  cachedTrucks?: Truck[];
  createPendingIncidentReport?: (data: Omit<PendingIncidentReport, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  createPendingMechanicalReport?: (data: Omit<PendingMechanicalReport, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  onOfflineSuccess?: () => void;
}

export default function ReportsTab({
  isOnline = true,
  profile,
  cachedTrucks = [],
  createPendingIncidentReport,
  createPendingMechanicalReport,
  onOfflineSuccess,
}: ReportsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-muted-foreground">Submit incident and mechanical reports</p>
      </div>

      <IncidentReportForm 
        isOnline={isOnline}
        profile={profile}
        createPendingIncidentReport={createPendingIncidentReport}
        onOfflineSuccess={onOfflineSuccess}
      />
      <MechanicalReportForm 
        isOnline={isOnline}
        profile={profile}
        cachedTrucks={cachedTrucks}
        createPendingMechanicalReport={createPendingMechanicalReport}
        onOfflineSuccess={onOfflineSuccess}
      />
    </div>
  );
}
