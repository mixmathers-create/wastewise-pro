import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, FileDown, Edit2, Check, Wrench, Trash2, FileSignature, Lock } from "lucide-react";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import SignatureCanvas from "react-signature-canvas";
import { VisualScheduleChart } from "./VisualScheduleChart";
import { LiveScheduleView } from "./LiveScheduleView";

interface Driver {
  id: string;
  name: string;
  availability: { shifts: string[]; days: string[] };
}

interface Helper {
  id: string;
  name: string;
  availability: { shifts: string[]; days: string[] };
}

interface TruckType {
  id: string;
  code: string;
  status: string;
  capacity: number;
  type: string;
}

interface Schedule {
  id?: string;
  date: string;
  shift: string;
  driver_id: string | null;
  helper_ids: string[];
  truck_id: string | null;
  status: string;
  is_backup?: boolean;
  mt_requirement?: number;
  approved_by?: string;
  approved_at?: string;
  signature_data?: string;
}

interface TruckDeployment {
  [date: string]: {
    AM: { trucks: number; mt: number };
    PM: { trucks: number; mt: number };
  };
}

interface MaintenanceBlock {
  id?: string;
  truck_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

const SchedulingTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [truckDeployment, setTruckDeployment] = useState<TruckDeployment>({});
  const [showDeploymentDialog, setShowDeploymentDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  
  const [newMaintenance, setNewMaintenance] = useState<MaintenanceBlock>({
    truck_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  
  const [pendingSchedules, setPendingSchedules] = useState<Schedule[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedScheduleGroup, setSelectedScheduleGroup] = useState<Schedule[]>([]);
  const signatureRef = useRef<SignatureCanvas>(null);

  const shifts = ["AM", "PM"];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, helpersRes, trucksRes, schedulesRes, maintenanceRes, pendingRes] = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("helpers").select("*"),
        supabase.from("trucks").select("*"),
        supabase.from("schedules").select("*").in("status", ["approved", "scheduled"]),
        supabase.from("truck_maintenance_blocks").select("*"),
        supabase.from("schedules").select("*").eq("status", "draft")
      ]);

      if (driversRes.data) setDrivers(driversRes.data);
      if (helpersRes.data) setHelpers(helpersRes.data);
      if (trucksRes.data) setTrucks(trucksRes.data);
      if (schedulesRes.data) setSchedules(schedulesRes.data);
      if (maintenanceRes.data) setMaintenanceBlocks(maintenanceRes.data);
      if (pendingRes.data) setPendingSchedules(pendingRes.data);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isTruckUnderMaintenance = (truckId: string, date: string): boolean => {
    return maintenanceBlocks.some(block => {
      const checkDate = new Date(date);
      const start = new Date(block.start_date);
      const end = new Date(block.end_date);
      return block.truck_id === truckId && checkDate >= start && checkDate <= end;
    });
  };

  const updateTruckDeployment = (date: string, shift: string, field: "trucks" | "mt", value: string) => {
    setTruckDeployment(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [shift]: {
          ...prev[date]?.[shift],
          [field]: parseFloat(value) || 0
        }
      }
    }));
  };

  const generateWeekSchedule = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Missing dates", variant: "destructive" });
      return;
    }

    const dates: string[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(format(currentDate, "yyyy-MM-dd"));
      currentDate = addDays(currentDate, 1);
    }

    const newSchedules: Schedule[] = [];
    const dayIndexMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

    for (const dateStr of dates) {
      const dayIndex = new Date(dateStr).getDay();
      const dayName = daysOfWeek[(dayIndex + 6) % 7];

      const usedDriversAM = new Set<string>();
      const usedHelpersAM = new Set<string>();

      for (const shift of shifts) {
        const deployment = truckDeployment[dateStr]?.[shift];
        if (!deployment || deployment.mt === 0) continue;

        const trucksNeeded = deployment.trucks;
        const mtRequired = deployment.mt;

        const usedDriversInPreviousShift = shift === "PM" ? usedDriversAM : new Set<string>();
        const usedHelpersInPreviousShift = shift === "PM" ? usedHelpersAM : new Set<string>();

        const needsBackup = trucksNeeded > 5;
        const driversNeeded = trucksNeeded + (needsBackup ? 1 : 0);
        const helpersPerTruck = 3;
        const helpersNeeded = trucksNeeded * helpersPerTruck + (needsBackup ? 1 : 0);

        const availableDrivers = drivers.filter((d) => {
          const avail = d.availability as any;
          return avail?.shifts?.includes(shift) && 
                 avail?.days?.includes(dayName) &&
                 !usedDriversInPreviousShift.has(d.id);
        });

        const availableHelpers = helpers.filter((h) => {
          const avail = h.availability as any;
          return avail?.shifts?.includes(shift) && 
                 avail?.days?.includes(dayName) &&
                 !usedHelpersInPreviousShift.has(h.id);
        });

        let availableTrucks = trucks.filter((t) => 
          t.status === "available" && !isTruckUnderMaintenance(t.id, dateStr)
        );
        
        const avgMtPerTruck = mtRequired / trucksNeeded;
        if (avgMtPerTruck >= 3) {
          availableTrucks.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
        } else {
          availableTrucks.sort((a, b) => (a.capacity || 0) - (b.capacity || 0));
        }

        if (availableDrivers.length < driversNeeded || availableHelpers.length < helpersNeeded || availableTrucks.length < trucksNeeded) {
          continue;
        }

        const usedDriversThisShift = new Set<string>();
        const usedHelpersThisShift = new Set<string>();

        for (let i = 0; i < trucksNeeded; i++) {
          const driver = availableDrivers[i];
          const truckAssignment = availableTrucks[i];
          const assignedHelpers = availableHelpers.slice(i * helpersPerTruck, (i + 1) * helpersPerTruck);

          newSchedules.push({
            date: dateStr,
            shift,
            driver_id: driver.id,
            helper_ids: assignedHelpers.map(h => h.id),
            truck_id: truckAssignment.id,
            status: "draft",
            is_backup: false,
            mt_requirement: mtRequired
          });

          usedDriversThisShift.add(driver.id);
          assignedHelpers.forEach(h => usedHelpersThisShift.add(h.id));
        }

        if (shift === "AM") {
          usedDriversThisShift.forEach(id => usedDriversAM.add(id));
          usedHelpersThisShift.forEach(id => usedHelpersAM.add(id));
        }
      }
    }

    if (newSchedules.length === 0) {
      toast({ title: "No schedules to generate", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("schedules").insert(newSchedules);
      if (error) throw error;
      toast({ title: "Schedule generated", description: `Created ${newSchedules.length} draft assignments` });
      setShowDeploymentDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (date: string, shift: string) => {
    const schedulesToApprove = pendingSchedules.filter(
      s => s.date === date && s.shift === shift
    );
    setSelectedScheduleGroup(schedulesToApprove);
    setShowApprovalDialog(true);
  };

  const approveSchedules = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({ title: "Signature required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const signatureData = signatureRef.current.toDataURL();
      const approvedBy = profile.full_name || profile.email;

      for (const schedule of selectedScheduleGroup) {
        const { error } = await supabase
          .from("schedules")
          .update({
            status: "approved",
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            signature_data: signatureData
          })
          .eq("id", schedule.id);
        
        if (error) throw error;
      }

      toast({ title: "Success", description: `${selectedScheduleGroup.length} schedules approved` });
      setShowApprovalDialog(false);
      setSelectedScheduleGroup([]);
      signatureRef.current?.clear();
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async (schedule: Schedule) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("schedules").update({
        driver_id: schedule.driver_id,
        truck_id: schedule.truck_id,
        helper_ids: schedule.helper_ids
      }).eq("id", schedule.id!);

      if (error) throw error;
      toast({ title: "Schedule updated" });
      setEditingSchedule(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addMaintenanceBlock = async () => {
    if (!newMaintenance.truck_id || !newMaintenance.start_date || !newMaintenance.end_date) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("truck_maintenance_blocks").insert(newMaintenance);
      if (error) throw error;
      toast({ title: "Maintenance block added" });
      setNewMaintenance({ truck_id: '', start_date: '', end_date: '', reason: '' });
      setShowMaintenanceDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteMaintenanceBlock = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("truck_maintenance_blocks").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Maintenance block removed" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Live Schedule</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4 mt-4">
          <LiveScheduleView 
            schedules={schedules}
            drivers={drivers}
            helpers={helpers}
            trucks={trucks}
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4 mt-4">
          {pendingSchedules.length > 0 && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Pending Approval ({pendingSchedules.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    pendingSchedules.reduce((acc, s) => {
                      const key = `${s.date}||${s.shift}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(s);
                      return acc;
                    }, {} as Record<string, Schedule[]>)
                  ).map(([key, group]) => {
                    const [date, shift] = key.split('||');
                    return (
                      <div key={key} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{format(new Date(date), "MMM dd, yyyy")}</p>
                          <p className="text-sm text-muted-foreground">{shift} Shift • {group.length} assignments</p>
                        </div>
                        <Button size="sm" onClick={() => openApprovalDialog(date, shift)}>
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Generate Schedule</CardTitle>
              <CardDescription>Configure MT requirements - trucks auto-assigned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                </Popover>
              </div>
              
              <Dialog open={showDeploymentDialog} onOpenChange={setShowDeploymentDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!startDate || !endDate}>Configure MT Requirements</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>MT Requirements</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {startDate && endDate && (() => {
                      const dates: string[] = [];
                      let current = new Date(startDate);
                      while (current <= endDate) {
                        dates.push(format(current, "yyyy-MM-dd"));
                        current = addDays(current, 1);
                      }
                      return dates;
                    })().map(date => (
                      <Card key={date}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">{format(new Date(date), "EEE, MMM dd")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">AM Shift MT</Label>
                            <Input 
                              type="number" 
                              step="0.1"
                              value={truckDeployment[date]?.AM?.mt || 0}
                              onChange={(e) => {
                                const mt = parseFloat(e.target.value) || 0;
                                updateTruckDeployment(date, "AM", "mt", e.target.value);
                                updateTruckDeployment(date, "AM", "trucks", Math.ceil(mt / 2).toString());
                              }}
                            />
                            <p className="text-xs text-primary mt-1">→ {Math.ceil((truckDeployment[date]?.AM?.mt || 0) / 2)} trucks</p>
                          </div>
                          <div>
                            <Label className="text-xs">PM Shift MT</Label>
                            <Input 
                              type="number" 
                              step="0.1"
                              value={truckDeployment[date]?.PM?.mt || 0}
                              onChange={(e) => {
                                const mt = parseFloat(e.target.value) || 0;
                                updateTruckDeployment(date, "PM", "mt", e.target.value);
                                updateTruckDeployment(date, "PM", "trucks", Math.ceil(mt / 2).toString());
                              }}
                            />
                            <p className="text-xs text-primary mt-1">→ {Math.ceil((truckDeployment[date]?.PM?.mt || 0) / 2)} trucks</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button onClick={generateWeekSchedule} disabled={loading}>Generate</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Wrench className="mr-2 h-4 w-4" />
                    Schedule Maintenance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Truck Maintenance</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <Select value={newMaintenance.truck_id} onValueChange={(val) => setNewMaintenance({...newMaintenance, truck_id: val})}>
                      <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
                      <SelectContent>
                        {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={newMaintenance.start_date} onChange={(e) => setNewMaintenance({...newMaintenance, start_date: e.target.value})} />
                    <Input type="date" value={newMaintenance.end_date} onChange={(e) => setNewMaintenance({...newMaintenance, end_date: e.target.value})} />
                    <Textarea value={newMaintenance.reason} onChange={(e) => setNewMaintenance({...newMaintenance, reason: e.target.value})} placeholder="Reason" />
                    <Button onClick={addMaintenanceBlock}>Add</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {maintenanceBlocks.length > 0 && (
                <div className="space-y-2">
                  {maintenanceBlocks.map(block => (
                    <div key={block.id} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">{trucks.find(t => t.id === block.truck_id)?.code} • {format(new Date(block.start_date), "MMM dd")} - {format(new Date(block.end_date), "MMM dd")}</span>
                      <Button size="sm" variant="destructive" onClick={() => deleteMaintenanceBlock(block.id!)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Analytics</CardTitle></CardHeader>
            <CardContent>
              {schedules.length > 0 ? (
                <VisualScheduleChart schedules={schedules} drivers={drivers} trucks={trucks} />
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Schedules</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="border rounded p-2">
              <SignatureCanvas ref={signatureRef} canvasProps={{ className: 'w-full h-32 border rounded' }} />
            </div>
            <Button size="sm" variant="outline" onClick={() => signatureRef.current?.clear()}>Clear</Button>
            <Button onClick={approveSchedules} disabled={loading}>Approve</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulingTab;
