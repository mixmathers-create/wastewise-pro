import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Edit2, Check, Wrench, Trash2, X, ChevronDown, ChevronUp, Download, Users } from "lucide-react";
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
import jsPDF from "jspdf";

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
  client_ids?: string[];
}

interface Client {
  id: string;
  name: string;
  industry: string;
  mt_requirement: number;
  collection_days: string[];
  collection_shift: string;
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
  const [clients, setClients] = useState<Client[]>([]);
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
  
  const [showPeekDialog, setShowPeekDialog] = useState(false);
  const [peekSchedules, setPeekSchedules] = useState<Schedule[]>([]);
  const [peekTitle, setPeekTitle] = useState<string>("");
  
  const [showDraftsDialog, setShowDraftsDialog] = useState(false);
  const [draftsInDialog, setDraftsInDialog] = useState<Schedule[]>([]);
  const [draftsDialogTitle, setDraftsDialogTitle] = useState<string>("");
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
      const [driversRes, helpersRes, trucksRes, clientsRes, schedulesRes, maintenanceRes, pendingRes] = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("helpers").select("*"),
        supabase.from("trucks").select("*"),
        supabase.from("clients").select("*"),
        supabase.from("schedules").select("*").in("status", ["approved", "scheduled"]),
        supabase.from("truck_maintenance_blocks").select("*"),
        supabase.from("schedules").select("*").eq("status", "draft")
      ]);

      if (driversRes.data) setDrivers(driversRes.data as any);
      if (helpersRes.data) setHelpers(helpersRes.data as any);
      if (trucksRes.data) setTrucks(trucksRes.data as any);
      if (clientsRes.data) setClients(clientsRes.data as any);
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

      // Group clients by shift and day preference
      const clientsForAM = clients.filter(c => 
        c.collection_days?.includes(dayName) && 
        c.collection_shift === "AM" &&
        (c.mt_requirement || 0) > 0
      );
      
      const clientsForPM = clients.filter(c => 
        c.collection_days?.includes(dayName) && 
        c.collection_shift === "PM" &&
        (c.mt_requirement || 0) > 0
      );

      const usedDriversAM = new Set<string>();
      const usedHelpersAM = new Set<string>();

      for (const shift of shifts) {
        const clientsForShift = shift === "AM" ? clientsForAM : clientsForPM;
        if (clientsForShift.length === 0) continue;

        // Calculate total MT requirement for this shift
        const totalMt = clientsForShift.reduce((sum, c) => sum + (c.mt_requirement || 0), 0);
        const trucksNeeded = Math.ceil(totalMt / 3); // Assuming 3 MT average per truck

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
        
        availableTrucks.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));

        if (availableDrivers.length < driversNeeded || availableHelpers.length < helpersNeeded || availableTrucks.length < trucksNeeded) {
          continue;
        }

        const usedDriversThisShift = new Set<string>();
        const usedHelpersThisShift = new Set<string>();

        // Distribute clients among trucks
        const clientsPerTruck: Client[][] = Array(trucksNeeded).fill(null).map(() => []);
        clientsForShift.forEach((client, idx) => {
          clientsPerTruck[idx % trucksNeeded].push(client);
        });

        for (let i = 0; i < trucksNeeded; i++) {
          const driver = availableDrivers[i];
          const truckAssignment = availableTrucks[i];
          const assignedHelpers = availableHelpers.slice(i * helpersPerTruck, (i + 1) * helpersPerTruck);
          const assignedClients = clientsPerTruck[i];
          const truckMt = assignedClients.reduce((sum, c) => sum + (c.mt_requirement || 0), 0);

          newSchedules.push({
            date: dateStr,
            shift,
            driver_id: driver.id,
            helper_ids: assignedHelpers.map(h => h.id),
            truck_id: truckAssignment.id,
            status: "draft",
            is_backup: false,
            mt_requirement: truckMt,
            client_ids: assignedClients.map(c => c.id)
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
      toast({ title: "No schedules generated", description: "Check client requirements, resource availability, and maintenance periods", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("schedules").insert(
        newSchedules.map(s => ({ ...s, device_fingerprint: deviceFingerprint }))
      );
      if (error) throw error;
      toast({ title: `Generated ${newSchedules.length} draft schedules based on client requirements` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error creating schedules", description: error.message, variant: "destructive" });
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

  const openPeekDialog = (date: string, shift: string) => {
    const shiftSchedules = schedules.filter(s => s.date === date && s.shift === shift);
    setPeekSchedules(shiftSchedules);
    setPeekTitle(`${format(new Date(date), "EEE, MMM dd, yyyy")} • ${shift === 'AM' ? '8AM-8PM' : '8PM-8AM'}`);
    setShowPeekDialog(true);
  };

  const openDraftsDialog = (date: string, shift: string) => {
    const groupDrafts = pendingSchedules.filter(s => s.date === date && s.shift === shift);
    setDraftsInDialog(groupDrafts);
    setDraftsDialogTitle(`${format(new Date(date), "EEE, MMM dd, yyyy")} • ${shift} Shift`);
    setShowDraftsDialog(true);
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

  const exportScheduleAsPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(18);
    doc.text('Live Schedule', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, yPos);
    yPos += 10;

    visibleDates.forEach(date => {
      const dateSchedules = groupedSchedules[date];
      
      // Add page break if needed
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(format(new Date(date), 'EEEE, MMM dd, yyyy'), 14, yPos);
      yPos += 8;
      
      ['AM', 'PM'].forEach(shift => {
        const scheduleList = dateSchedules[shift as 'AM' | 'PM'];
        if (scheduleList.length > 0) {
          doc.setFontSize(12);
          doc.text(`${shift} Shift (${scheduleList.length} trucks)`, 14, yPos);
          yPos += 6;
          
          scheduleList.forEach((s, idx) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            
            const driver = drivers.find(d => d.id === s.driver_id);
            const truck = trucks.find(t => t.id === s.truck_id);
            const scheduleHelpers = helpers.filter(h => s.helper_ids.includes(h.id));
            const scheduleClients = clients.filter(c => s.client_ids?.includes(c.id));
            
            doc.setFontSize(10);
            doc.text(`${idx + 1}. ${truck?.code || 'N/A'} | ${driver?.name || 'N/A'}`, 18, yPos);
            yPos += 5;
            
            if (scheduleHelpers.length > 0) {
              doc.setFontSize(9);
              doc.text(`   Helpers: ${scheduleHelpers.map(h => h.name).join(', ')}`, 18, yPos);
              yPos += 4;
            }
            
            if (scheduleClients.length > 0) {
              doc.text(`   Clients (${s.mt_requirement || 0} MT): ${scheduleClients.map(c => c.name).join(', ')}`, 18, yPos);
              yPos += 4;
            }
            
            yPos += 2;
          });
          
          yPos += 4;
        }
      });
      
      yPos += 6;
    });
    
    doc.save(`schedule-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const groupedSchedules = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { AM: [], PM: [] };
    acc[s.date][s.shift as 'AM' | 'PM'].push(s);
    return acc;
  }, {} as Record<string, { AM: Schedule[]; PM: Schedule[] }>);

  const sortedDates = Object.keys(groupedSchedules).sort();
  
  // Filter schedules by selected date (show ±7 days)
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const minDate = format(addDays(selectedDate, -7), "yyyy-MM-dd");
  const maxDate = format(addDays(selectedDate, 7), "yyyy-MM-dd");
  const visibleDates = sortedDates.filter(d => d >= minDate && d <= maxDate);

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
                          <Button variant="outline" size="sm" onClick={() => openDraftsDialog(date, shift)}>
                            <Edit2 className="h-3 w-3 mr-1" /> Review
                          </Button>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Live Schedule</CardTitle>
                  <CardDescription className="text-xs">All approved assignments</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportScheduleAsPDF}>
                    <Download className="mr-1 h-3 w-3" />
                    Export PDF
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(selectedDate, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {visibleDates.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-4">No schedules for this date range</p>
                ) : (
                  visibleDates.map(date => {
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
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    {shift === 'AM' ? '8AM-8PM' : '8PM-8AM'}
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 px-2 text-xs"
                                    onClick={() => openPeekDialog(date, shift)}
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" /> Peek
                                  </Button>
                                </div>
                                <div className="space-y-1">
                                  {shiftSchedules.map((s, i) => {
                                    const driver = drivers.find(d => d.id === s.driver_id);
                                    const truck = trucks.find(t => t.id === s.truck_id);
                                    const scheduleClients = clients.filter(c => s.client_ids?.includes(c.id));
                                    return (
                                      <div key={i} className="text-xs p-1.5 bg-muted/30 rounded space-y-0.5">
                                        <div>
                                          <span className="font-medium">{truck?.code}</span> • {driver?.name}
                                        </div>
                                        {scheduleClients.length > 0 && (
                                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {scheduleClients.map(c => c.name).join(', ')} ({s.mt_requirement || 0} MT)
                                          </div>
                                        )}
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
                })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generate Schedule</CardTitle>
              <CardDescription className="text-xs">Auto-generate based on client requirements and collection schedules</CardDescription>
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
              
              <Button size="sm" disabled={!startDate || !endDate || loading} onClick={generateWeekSchedule} className="w-full">
                {loading ? "Generating..." : "Generate from Client Requirements"}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Schedules will be auto-generated based on client MT requirements, collection days, and preferred shifts.
              </p>
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

      {/* Peek Dialog */}
      <Dialog open={showPeekDialog} onOpenChange={setShowPeekDialog}>
        <DialogContent className="max-w-2xl bg-background">
          <DialogHeader>
            <DialogTitle className="text-base">Schedule Details</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">{peekTitle}</div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {peekSchedules.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">No schedules</p>
            ) : (
              peekSchedules.map((schedule, idx) => {
                const driver = drivers.find(d => d.id === schedule.driver_id);
                const truck = trucks.find(t => t.id === schedule.truck_id);
                const scheduleHelpers = helpers.filter(h => schedule.helper_ids.includes(h.id));
                return (
                  <div key={schedule.id || idx} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{truck?.code} - {truck?.type}</div>
                      <Badge variant="outline" className="text-xs">{truck?.capacity}MT</Badge>
                    </div>
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Driver:</span>
                        <span className="font-medium">{driver?.name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-1">Helpers:</div>
                      <div className="flex flex-wrap gap-1">
                        {scheduleHelpers.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          scheduleHelpers.map(h => (
                            <Badge key={h.id} variant="secondary" className="text-xs">{h.name}</Badge>
                          ))
                        )}
                      </div>
                    </div>
                    {schedule.mt_requirement && (
                      <div className="text-xs text-muted-foreground">
                        MT Requirement: {schedule.mt_requirement.toFixed(1)} MT
                      </div>
                    )}
                    {schedule.approved_by && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Approved by {schedule.approved_by} on {schedule.approved_at && format(new Date(schedule.approved_at), "MMM dd, yyyy 'at' h:mm a")}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowPeekDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drafts Review Dialog */}
      <Dialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
        <DialogContent className="max-w-3xl bg-background">
          <DialogHeader>
            <DialogTitle className="text-base">Review & Edit Drafts</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">{draftsDialogTitle}</div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {draftsInDialog.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">No drafts</p>
            ) : (
              draftsInDialog.map((schedule, idx) => {
                const driver = drivers.find(d => d.id === schedule.driver_id);
                const truck = trucks.find(t => t.id === schedule.truck_id);
                const scheduleHelpers = helpers.filter(h => schedule.helper_ids.includes(h.id));
                return (
                  <div key={schedule.id || idx} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm">
                        <span className="font-medium">{truck?.code}</span> • {driver?.name}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEditingSchedule(schedule)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Helpers: {scheduleHelpers.map(h => h.name).join(', ') || 'None'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowDraftsDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
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
