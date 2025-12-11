import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle, XCircle, Trash2, CloudUpload, RefreshCw, Trash, FileText, Users, AlertTriangle, Wrench } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { offlineDb, type PendingCollection, type PendingLeaveRequest, type PendingTimeIn, type PendingTimeOut, type PendingIncidentReport, type PendingMechanicalReport } from "@/lib/offlineDb";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SyncResult {
  synced: number;
  failed: number;
}

interface PendingTabProps {
  isOnline: boolean;
  profile?: any;
  onSyncComplete?: () => void;
  refreshTrigger?: number; // Increment to trigger refresh
  lastSyncResult?: SyncResult | null; // Collection sync result
  lastHRSyncResult?: SyncResult | null; // HR sync result
}

const PendingTab = ({ isOnline, profile, onSyncComplete, refreshTrigger, lastSyncResult, lastHRSyncResult }: PendingTabProps) => {
  const { toast } = useToast();
  const [pendingCollections, setPendingCollections] = useState<PendingCollection[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<PendingLeaveRequest[]>([]);
  const [pendingTimeIns, setPendingTimeIns] = useState<PendingTimeIn[]>([]);
  const [pendingTimeOuts, setPendingTimeOuts] = useState<PendingTimeOut[]>([]);
  const [pendingIncidentReports, setPendingIncidentReports] = useState<PendingIncidentReport[]>([]);
  const [pendingMechanicalReports, setPendingMechanicalReports] = useState<PendingMechanicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("collections");

  const loadAllPendingItems = async () => {
    setLoading(true);
    try {
      const userId = profile?.user_id;
      // Include 'completed' status to show synced items (they get deleted on logout)
      const allStatuses = ['pending', 'failed', 'completed', 'syncing'];
      const filter = userId 
        ? (table: any) => table.where('user_id').equals(userId).and((item: any) => allStatuses.includes(item.status))
        : (table: any) => table.where('status').anyOf(allStatuses);

      const [collections, leaves, timeIns, timeOuts, incidents, mechanical] = await Promise.all([
        offlineDb.pendingCollections.where('status').anyOf(allStatuses).toArray(),
        filter(offlineDb.pendingLeaveRequests).toArray(),
        filter(offlineDb.pendingTimeIns).toArray(),
        filter(offlineDb.pendingTimeOuts).toArray(),
        filter(offlineDb.pendingIncidentReports).toArray(),
        filter(offlineDb.pendingMechanicalReports).toArray(),
      ]);

      // Sort all by created_at descending (newest first)
      const sortByDate = (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      
      setPendingCollections(collections.sort(sortByDate));
      setPendingLeaveRequests(leaves.sort(sortByDate));
      setPendingTimeIns(timeIns.sort(sortByDate));
      setPendingTimeOuts(timeOuts.sort(sortByDate));
      setPendingIncidentReports(incidents.sort(sortByDate));
      setPendingMechanicalReports(mechanical.sort(sortByDate));
    } catch (error) {
      console.error("Error loading pending items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPendingItems();
  }, [profile?.user_id, refreshTrigger]);

  // Auto-refresh when any sync completes (detected by lastSyncResult or lastHRSyncResult changing)
  useEffect(() => {
    if (lastSyncResult && (lastSyncResult.synced > 0 || lastSyncResult.failed > 0)) {
      loadAllPendingItems();
    }
  }, [lastSyncResult]);

  useEffect(() => {
    if (lastHRSyncResult && (lastHRSyncResult.synced > 0 || lastHRSyncResult.failed > 0)) {
      loadAllPendingItems();
    }
  }, [lastHRSyncResult]);

  const handleDelete = async (id: string, type: 'collection' | 'leave' | 'timeIn' | 'timeOut' | 'incident' | 'mechanical') => {
    try {
      switch (type) {
        case 'collection':
          await offlineDb.pendingCollections.delete(id);
          setPendingCollections(prev => prev.filter(c => c.id !== id));
          break;
        case 'leave':
          await offlineDb.pendingLeaveRequests.delete(id);
          setPendingLeaveRequests(prev => prev.filter(l => l.id !== id));
          break;
        case 'timeIn':
          await offlineDb.pendingTimeIns.delete(id);
          setPendingTimeIns(prev => prev.filter(t => t.id !== id));
          break;
        case 'timeOut':
          await offlineDb.pendingTimeOuts.delete(id);
          setPendingTimeOuts(prev => prev.filter(t => t.id !== id));
          break;
        case 'incident':
          await offlineDb.pendingIncidentReports.delete(id);
          setPendingIncidentReports(prev => prev.filter(i => i.id !== id));
          break;
        case 'mechanical':
          await offlineDb.pendingMechanicalReports.delete(id);
          setPendingMechanicalReports(prev => prev.filter(m => m.id !== id));
          break;
      }
      toast({ title: "Deleted", description: "Pending item removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleRetry = async (id: string, type: 'collection' | 'leave' | 'timeIn' | 'timeOut' | 'incident' | 'mechanical') => {
    if (!isOnline) {
      toast({ title: "Still Offline", description: "Cannot retry while offline", variant: "destructive" });
      return;
    }
    
    try {
      switch (type) {
        case 'collection':
          await offlineDb.pendingCollections.update(id, { status: 'pending', error_message: undefined });
          setPendingCollections(prev => 
            prev.map(c => c.id === id ? { ...c, status: 'pending' as const, error_message: undefined } : c)
          );
          break;
        case 'leave':
          await offlineDb.pendingLeaveRequests.update(id, { status: 'pending', error_message: undefined });
          setPendingLeaveRequests(prev => 
            prev.map(l => l.id === id ? { ...l, status: 'pending' as const, error_message: undefined } : l)
          );
          break;
        case 'timeIn':
          await offlineDb.pendingTimeIns.update(id, { status: 'pending', error_message: undefined });
          setPendingTimeIns(prev => 
            prev.map(t => t.id === id ? { ...t, status: 'pending' as const, error_message: undefined } : t)
          );
          break;
        case 'timeOut':
          await offlineDb.pendingTimeOuts.update(id, { status: 'pending', error_message: undefined });
          setPendingTimeOuts(prev => 
            prev.map(t => t.id === id ? { ...t, status: 'pending' as const, error_message: undefined } : t)
          );
          break;
        case 'incident':
          await offlineDb.pendingIncidentReports.update(id, { status: 'pending', error_message: undefined });
          setPendingIncidentReports(prev => 
            prev.map(i => i.id === id ? { ...i, status: 'pending' as const, error_message: undefined } : i)
          );
          break;
        case 'mechanical':
          await offlineDb.pendingMechanicalReports.update(id, { status: 'pending', error_message: undefined });
          setPendingMechanicalReports(prev => 
            prev.map(m => m.id === id ? { ...m, status: 'pending' as const, error_message: undefined } : m)
          );
          break;
      }
      toast({ title: "Queued for Retry", description: "Will sync shortly..." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to retry", variant: "destructive" });
    }
  };

  type PendingStatus = 'pending' | 'syncing' | 'failed' | 'completed';

  const getStatusIcon = (status: PendingStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: PendingStatus) => {
    switch (status) {
      case 'pending':
        return 'Waiting to sync';
      case 'syncing':
        return 'Syncing...';
      case 'failed':
        return 'Sync failed';
      case 'completed':
        return 'Synced';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM dd, yyyy HH:mm");
  };

  // Generic pending item renderer
  const renderPendingItem = (
    item: any,
    type: 'collection' | 'leave' | 'timeIn' | 'timeOut' | 'incident' | 'mechanical',
    title: string,
    subtitle: string
  ) => {
    return (
      <div key={item.id} className="border rounded-lg p-3 bg-card">
        <div className="flex items-start justify-between">
          <div 
            className={`flex-1 ${item.status === 'failed' ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (item.status === 'failed') {
                handleRetry(item.id, type);
              }
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(item.status)}
              <span className="font-medium text-sm">{title}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{subtitle}</p>
              <p>{formatDate(item.created_at)}</p>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                item.status === 'syncing' ? 'bg-blue-100 text-blue-700' :
                item.status === 'completed' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getStatusText(item.status)}
              </span>
              {item.status === 'failed' && (
                <span className="text-xs text-muted-foreground">(tap to retry)</span>
              )}
            </div>
            {item.error_message && (
              <p className="text-xs text-red-500 mt-1">{item.error_message}</p>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()} className="duration-0">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {item.status === 'completed' 
                    ? 'Remove from history?' 
                    : 'Delete pending item?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {item.status === 'completed' 
                    ? `This item has already been synced. Remove from local history?`
                    : `This will permanently delete this unsent item. This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="duration-0">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id, type);
                  }}
                  className={`duration-0 ${item.status === 'completed' 
                    ? '' 
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}`}
                >
                  {item.status === 'completed' ? 'Remove' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };

  const totalPending = pendingCollections.length + pendingLeaveRequests.length + 
    pendingTimeIns.length + pendingTimeOuts.length + 
    pendingIncidentReports.length + pendingMechanicalReports.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            <div className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5 shrink-0" />
              <span>Pending</span>
              {totalPending > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                  {totalPending}
                </span>
              )}
            </div>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadAllPendingItems}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 text-xs h-auto mb-4">
              <TabsTrigger value="collections" className="flex flex-col gap-1 p-2 h-auto">
                <CloudUpload className="h-3 w-3" />
                <span className="text-[10px]">Collections</span>
                {pendingCollections.length > 0 && (
                  <span className="bg-yellow-500 text-white text-[9px] px-1 rounded-full">
                    {pendingCollections.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="hr" className="flex flex-col gap-1 p-2 h-auto">
                <Users className="h-3 w-3" />
                <span className="text-[10px]">HR</span>
                {(pendingLeaveRequests.length + pendingTimeIns.length + pendingTimeOuts.length) > 0 && (
                  <span className="bg-yellow-500 text-white text-[9px] px-1 rounded-full">
                    {pendingLeaveRequests.length + pendingTimeIns.length + pendingTimeOuts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex flex-col gap-1 p-2 h-auto">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-[10px]">Reports</span>
                {(pendingIncidentReports.length + pendingMechanicalReports.length) > 0 && (
                  <span className="bg-yellow-500 text-white text-[9px] px-1 rounded-full">
                    {pendingIncidentReports.length + pendingMechanicalReports.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Collections Tab */}
            <TabsContent value="collections" className="mt-0">
              {pendingCollections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-muted-foreground text-center font-medium">All synced!</p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    No pending collections to upload
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingCollections.map((collection) =>
                    renderPendingItem(
                      collection,
                      'collection',
                      collection.client_name,
                      `Truck: ${collection.truck_code} • Driver: ${collection.driver_name} • Items: ${collection.items.length}`
                    )
                  )}
                </div>
              )}
            </TabsContent>

            {/* HR Tab with sub-tabs */}
            <TabsContent value="hr" className="mt-0">
              <Tabs defaultValue="leaves" className="w-full">
                <TabsList className="grid w-full grid-cols-3 text-xs h-auto mb-4">
                  <TabsTrigger value="leaves" className="text-[10px]">
                    Leaves {pendingLeaveRequests.length > 0 && `(${pendingLeaveRequests.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="timeIns" className="text-[10px]">
                    Time In {pendingTimeIns.length > 0 && `(${pendingTimeIns.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="timeOuts" className="text-[10px]">
                    Time Out {pendingTimeOuts.length > 0 && `(${pendingTimeOuts.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="leaves" className="mt-0">
                  {pendingLeaveRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <p className="text-xs text-muted-foreground text-center">No pending leave requests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingLeaveRequests.map((leave) =>
                        renderPendingItem(
                          leave,
                          'leave',
                          leave.personnel_name,
                          `${leave.leave_type} • ${leave.leave_days} days • ${format(new Date(leave.start_date), "MMM dd")} - ${format(new Date(leave.end_date), "MMM dd")}`
                        )
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeIns" className="mt-0">
                  {pendingTimeIns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <p className="text-xs text-muted-foreground text-center">No pending time-ins</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingTimeIns.map((timeIn) =>
                        renderPendingItem(
                          timeIn,
                          'timeIn',
                          `Truck: ${timeIn.truck_code}`,
                          `${timeIn.personnel.length} personnel • ${formatDate(timeIn.created_at)}`
                        )
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeOuts" className="mt-0">
                  {pendingTimeOuts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <p className="text-xs text-muted-foreground text-center">No pending time-outs</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingTimeOuts.map((timeOut) =>
                        renderPendingItem(
                          timeOut,
                          'timeOut',
                          timeOut.personnel_names.join(", "),
                          `${timeOut.time_log_ids.length} log(s) • ${timeOut.truck_code || 'N/A'}`
                        )
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Reports Tab with sub-tabs */}
            <TabsContent value="reports" className="mt-0">
              <Tabs defaultValue="incidents" className="w-full">
                <TabsList className="grid w-full grid-cols-2 text-xs h-auto mb-4">
                  <TabsTrigger value="incidents" className="text-[10px]">
                    Incidents {pendingIncidentReports.length > 0 && `(${pendingIncidentReports.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="mechanical" className="text-[10px]">
                    Mechanical {pendingMechanicalReports.length > 0 && `(${pendingMechanicalReports.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="incidents" className="mt-0">
                  {pendingIncidentReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <p className="text-xs text-muted-foreground text-center">No pending incident reports</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingIncidentReports.map((incident) =>
                        renderPendingItem(
                          incident,
                          'incident',
                          incident.incident_type,
                          `${incident.severity} • ${incident.reporter_name} • ${format(new Date(incident.incident_date), "MMM dd, yyyy")}`
                        )
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="mechanical" className="mt-0">
                  {pendingMechanicalReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
                      <p className="text-xs text-muted-foreground text-center">No pending mechanical reports</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingMechanicalReports.map((mechanical) =>
                        renderPendingItem(
                          mechanical,
                          'mechanical',
                          `Truck: ${mechanical.truck_code}`,
                          `${mechanical.severity} • ${mechanical.reporter_name} • ${mechanical.truck_operational ? 'Operational' : 'Not Operational'}`
                        )
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        )}
        
        {!isOnline && totalPending > 0 && (
          <p className="text-xs text-muted-foreground text-center py-2 mt-4">
            Items will sync automatically when you're back online
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingTab;

