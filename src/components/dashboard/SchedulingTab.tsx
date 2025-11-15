import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Edit2, Check, Wrench, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { VisualScheduleChart } from "./VisualScheduleChart";

interface Driver {
  id: string;
  name: string;
  availability?: any;
}

interface Helper {
  id: string;
  name: string;
  availability?: any;
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
  device_fingerprint?: string;
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
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [maintenanceExpanded, setMaintenanceExpanded] = useState(false);

  const shifts = ["AM", "PM"];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    loadData();
    initFingerprint();
  }, []);

  const initFingerprint = async () => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    setDeviceFingerprint(result.visitorId);
  };

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

      if (driversRes.data) setDrivers(driversRes.data as any);
      if (helpersRes.data) setHelpers(helpersRes.data as any);
      if (trucksRes.data) setTrucks(trucksRes.data as any);
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

        const driversNeeded = trucksNeeded;
        const helpersPerTruck = 3;
        const helpersNeeded = trucksNeeded * helpersPerTruck;

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
    setLoading(true);
    try {
      const approvedBy = profile.full_name || profile.email;

      for (const schedule of selectedScheduleGroup) {
        const { error } = await supabase
          .from("schedules")
          .update({
            status: "approved",
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            device_fingerprint: deviceFingerprint
          })
          .eq("id", schedule.id);
        
        if (error) throw error;
      }

      toast({ title: "Success", description: `${selectedScheduleGroup.length} schedules approved` });
      setShowApprovalDialog(false);
      setSelectedScheduleGroup([]);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const declineDraftGroup = async (date: string, shift: string) => {
    const confirmed = window.confirm(`Decline all drafts for ${format(new Date(date), "MMM dd")} ${shift}?`);
    if (!confirmed) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("schedules")
        .update({ status: "cancelled" })
        .eq("status", "draft")
        .eq("date", date)
        .eq("shift", shift);
      if (error) throw error;
      toast({ title: "Drafts declined" });
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
      toast({ title: "Maintenance scheduled" });
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
      toast({ title: "Maintenance removed" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const groupedSchedules = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { AM: [], PM: [] };
    acc[s.date][s.shift as 'AM' | 'PM'].push(s);
    return acc;
  }, {} as Record<string, { AM: Schedule[]; PM: Schedule[] }>);

  const sortedDates = Object.keys(groupedSchedules).sort();

  return (
    <div className="space-y-4">
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Active Schedule</TabsTrigger>
          <TabsTrigger value="manage">Generate</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-3">
          {pendingSchedules.length > 0 && (
            <Card className="border-amber-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Pending Approval</span>
                  <Badge variant="secondary">{pendingSchedules.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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
                      <div key={key} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div>
                          <span className="font-medium">{format(new Date(date), "MMM dd")}</span>
                          <span className="text-muted-foreground ml-2">{shift} • {group.length} trucks</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => declineDraftGroup(date, shift)}>
                            <X className="h-3 w-3" />
                          </Button>
                          <Button size="sm" onClick={() => openApprovalDialog(date, shift)}>
                            <Check className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live Schedule</CardTitle>
              <CardDescription className="text-xs">All approved assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedDates.map(date => {
                  const dateKey = date;
                  const isExpanded = expandedGroups.has(dateKey);
                  const dayData = groupedSchedules[date];
                  const totalTrucks = dayData.AM.length + dayData.PM.length;

                  return (
                    <Collapsible key={date} open={isExpanded} onOpenChange={() => toggleGroup(dateKey)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-medium text-sm">{format(new Date(date), "EEE, MMM dd")}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{totalTrucks} trucks</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pr-2 pt-2 space-y-2">
                          {(['AM', 'PM'] as const).map(shift => {
                            const shiftSchedules = dayData[shift];
                            if (shiftSchedules.length === 0) return null;
                            return (
                              <div key={shift} className="border-l-2 border-primary/30 pl-3">
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  {shift === 'AM' ? '8AM-8PM' : '8PM-8AM'}
                                </div>
                                <div className="space-y-1">
                                  {shiftSchedules.map((s, i) => {
                                    const driver = drivers.find(d => d.id === s.driver_id);
                                    const truck = trucks.find(t => t.id === s.truck_id);
                                    return (
                                      <div key={i} className="text-xs p-1.5 bg-muted/30 rounded">
                                        <span className="font-medium">{truck?.code}</span> • {driver?.name}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generate Schedule</CardTitle>
              <CardDescription className="text-xs">Configure MT requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {startDate ? format(startDate, "MMM dd") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {endDate ? format(endDate, "MMM dd") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                </Popover>
              </div>
              
              <Dialog open={showDeploymentDialog} onOpenChange={setShowDeploymentDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!startDate || !endDate} className="w-full">Configure</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base">MT Requirements</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {startDate && endDate && (() => {
                      const dates: string[] = [];
                      let current = new Date(startDate);
                      while (current <= endDate) {
                        dates.push(format(current, "yyyy-MM-dd"));
                        current = addDays(current, 1);
                      }
                      return dates;
                    })().map(date => (
                      <div key={date} className="border rounded p-2">
                        <div className="text-xs font-medium mb-2">{format(new Date(date), "EEE, MMM dd")}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">AM MT</Label>
                            <Input 
                              type="number" 
                              step="0.1"
                              className="h-7 text-xs"
                              value={truckDeployment[date]?.AM?.mt || 0}
                              onChange={(e) => {
                                const mt = parseFloat(e.target.value) || 0;
                                updateTruckDeployment(date, "AM", "mt", e.target.value);
                                updateTruckDeployment(date, "AM", "trucks", Math.ceil(mt / 2).toString());
                              }}
                            />
                            <p className="text-xs text-primary mt-0.5">→ {Math.ceil((truckDeployment[date]?.AM?.mt || 0) / 2)} trucks</p>
                          </div>
                          <div>
                            <Label className="text-xs">PM MT</Label>
                            <Input 
                              type="number" 
                              step="0.1"
                              className="h-7 text-xs"
                              value={truckDeployment[date]?.PM?.mt || 0}
                              onChange={(e) => {
                                const mt = parseFloat(e.target.value) || 0;
                                updateTruckDeployment(date, "PM", "mt", e.target.value);
                                updateTruckDeployment(date, "PM", "trucks", Math.ceil(mt / 2).toString());
                              }}
                            />
                            <p className="text-xs text-primary mt-0.5">→ {Math.ceil((truckDeployment[date]?.PM?.mt || 0) / 2)} trucks</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button onClick={generateWeekSchedule} disabled={loading} size="sm" className="w-full">Generate</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Collapsible open={maintenanceExpanded} onOpenChange={setMaintenanceExpanded}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Truck Maintenance
                    </CardTitle>
                    {maintenanceExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full">Schedule Maintenance</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle className="text-base">Schedule Maintenance</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Select value={newMaintenance.truck_id} onValueChange={(val) => setNewMaintenance({...newMaintenance, truck_id: val})}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select truck" /></SelectTrigger>
                          <SelectContent>
                            {trucks.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.code}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="date" className="h-8 text-xs" value={newMaintenance.start_date} onChange={(e) => setNewMaintenance({...newMaintenance, start_date: e.target.value})} />
                        <Input type="date" className="h-8 text-xs" value={newMaintenance.end_date} onChange={(e) => setNewMaintenance({...newMaintenance, end_date: e.target.value})} />
                        <Textarea className="text-xs" value={newMaintenance.reason} onChange={(e) => setNewMaintenance({...newMaintenance, reason: e.target.value})} placeholder="Reason..." />
                        <Button onClick={addMaintenanceBlock} size="sm" className="w-full">Add</Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {maintenanceBlocks.map(block => (
                    <div key={block.id} className="flex items-center justify-between p-2 border rounded text-xs">
                      <div>
                        <span className="font-medium">{trucks.find(t => t.id === block.truck_id)?.code}</span>
                        <span className="text-muted-foreground ml-2">{format(new Date(block.start_date), "MMM dd")} - {format(new Date(block.end_date), "MMM dd")}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteMaintenanceBlock(block.id!)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length > 0 ? (
                <VisualScheduleChart schedules={schedules} drivers={drivers} trucks={trucks} />
              ) : (
                <p className="text-center text-muted-foreground text-xs py-4">No data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingSchedule} onOpenChange={() => setEditingSchedule(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Driver</Label>
              <Select 
                value={editingSchedule?.driver_id || undefined}
                onValueChange={(val) => setEditingSchedule({ ...editingSchedule!, driver_id: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Truck</Label>
              <Select 
                value={editingSchedule?.truck_id || undefined}
                onValueChange={(val) => setEditingSchedule({ ...editingSchedule!, truck_id: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.code} ({t.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Helpers</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                {helpers.map(h => (
                  <div key={h.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={editingSchedule?.helper_ids?.includes(h.id)}
                      onCheckedChange={(checked) => {
                        const currentHelpers = editingSchedule?.helper_ids || [];
                        const newHelpers = checked
                          ? [...currentHelpers, h.id]
                          : currentHelpers.filter(id => id !== h.id);
                        setEditingSchedule({ ...editingSchedule!, helper_ids: newHelpers });
                      }}
                    />
                    <Label className="text-xs">{h.name}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateSchedule(editingSchedule!)} disabled={loading} size="sm">Save</Button>
              <Button variant="outline" size="sm" onClick={() => setEditingSchedule(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-base">Approve Schedules</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Approve {selectedScheduleGroup.length} schedule assignments?
            </p>
            <p className="text-xs text-muted-foreground">
              Device ID: {deviceFingerprint.slice(0, 12)}...
            </p>
            <div className="flex gap-2">
              <Button onClick={approveSchedules} disabled={loading} size="sm">Approve</Button>
              <Button variant="outline" size="sm" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulingTab;
