import { calculateDistance } from "@/lib/locationUtils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Edit2, Check, Wrench, Trash2, X, ChevronDown, ChevronUp, Download, Users, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { useNavigate } from "react-router-dom";
import { VisualScheduleChart } from "./VisualScheduleChart";
import { RouteMapView } from "./RouteMapView";
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
  latitude?: number | null;
  longitude?: number | null;
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
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  
  // Landfill location constants
  const LANDFILL_LAT = 10.41404594740414;
  const LANDFILL_LON = 123.92344575134916;
  const SERVICE_TIME_PER_MT = 40; // minutes per MT
  const AVERAGE_SPEED_KMH = 30; // average speed in traffic
  const LANDFILL_DISPOSAL_TIME = 60; // minutes for disposal at landfill
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [truckDeployment, setTruckDeployment] = useState<TruckDeployment>({});
  const [showDeploymentDialog, setShowDeploymentDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [showClientSelectionDialog, setShowClientSelectionDialog] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  
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

    if (selectedClientIds.length === 0) {
      toast({ title: "No clients selected", description: "Please select at least one client to service", variant: "destructive" });
      return;
    }

    const dates: string[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(format(currentDate, "yyyy-MM-dd"));
      currentDate = addDays(currentDate, 1);
    }

    const newSchedules: Schedule[] = [];
    const selectedClients = clients.filter(c => selectedClientIds.includes(c.id));

    for (const dateStr of dates) {
      const dayIndex = new Date(dateStr).getDay();
      const dayName = daysOfWeek[(dayIndex + 6) % 7];

      // Group selected clients by shift and day preference
      const clientsForAM = selectedClients.filter(c => 
        c.collection_days?.includes(dayName) && 
        c.collection_shift === "AM" &&
        (c.mt_requirement || 0) > 0
      );
      
      const clientsForPM = selectedClients.filter(c => 
        c.collection_days?.includes(dayName) && 
        c.collection_shift === "PM" &&
        (c.mt_requirement || 0) > 0
      );

      const usedDriversAM = new Set<string>();
      const usedHelpersAM = new Set<string>();

      for (const shift of shifts) {
        const clientsForShift = shift === "AM" ? clientsForAM : clientsForPM;
        if (clientsForShift.length === 0) continue;

        // Import location grouping utility
        const { groupClientsByProximity } = await import("@/lib/locationUtils");

        const usedDriversInPreviousShift = shift === "PM" ? usedDriversAM : new Set<string>();
        const usedHelpersInPreviousShift = shift === "PM" ? usedHelpersAM : new Set<string>();

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

        // Group clients by proximity to minimize travel distance
        const clientGroups = groupClientsByProximity(clientsForShift, availableTrucks[0]?.capacity || 3);
        const trucksNeeded = clientGroups.length;

        const helpersPerTruck = 3;
        const driversNeeded = trucksNeeded;
        const helpersNeeded = trucksNeeded * helpersPerTruck;

        if (availableDrivers.length < driversNeeded || availableHelpers.length < helpersNeeded || availableTrucks.length < trucksNeeded) {
          continue;
        }

        const usedDriversThisShift = new Set<string>();
        const usedHelpersThisShift = new Set<string>();

        for (let i = 0; i < trucksNeeded; i++) {
          const driver = availableDrivers[i];
          const truckAssignment = availableTrucks[i];
          const assignedHelpers = availableHelpers.slice(i * helpersPerTruck, (i + 1) * helpersPerTruck);
          const assignedClients = clientGroups[i];
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
      toast({ title: "No schedules generated", description: "Check client requirements, resource availability, and maintenance periods. Ensure selected clients match the date range.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("schedules").insert(
        newSchedules.map(s => ({ ...s, device_fingerprint: deviceFingerprint }))
      );
      if (error) throw error;
      toast({ title: `Generated ${newSchedules.length} draft schedules for ${selectedClientIds.length} clients` });
      setShowClientSelectionDialog(false);
      setSelectedClientIds([]);
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

  const clearAllSchedules = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("schedules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast({ title: "All schedules cleared" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportClientSchedule = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(18);
    doc.text(`Collection Schedule for ${client.name}`, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Industry: ${client.industry}`, 14, yPos);
    yPos += 5;
    doc.text(`MT Requirement per Collection: ${client.mt_requirement} MT`, 14, yPos);
    yPos += 5;
    doc.text(`Estimated Service Time: ${(client.mt_requirement * SERVICE_TIME_PER_MT).toFixed(0)} minutes`, 14, yPos);
    yPos += 10;

    // Filter schedules that include this client
    const clientSchedules = schedules.filter(s => s.client_ids?.includes(clientId));
    
    if (clientSchedules.length === 0) {
      doc.text('No scheduled collections found.', 14, yPos);
    } else {
      doc.setFontSize(14);
      doc.text('Scheduled Collections:', 14, yPos);
      yPos += 8;

      // Group by date
      const groupedByDate = clientSchedules.reduce((acc, s) => {
        if (!acc[s.date]) acc[s.date] = [];
        acc[s.date].push(s);
        return acc;
      }, {} as Record<string, Schedule[]>);

      Object.keys(groupedByDate).sort().forEach(date => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.text(format(new Date(date), 'EEEE, MMM dd, yyyy'), 14, yPos);
        yPos += 6;

        groupedByDate[date].forEach(schedule => {
          const driver = drivers.find(d => d.id === schedule.driver_id);
          const truck = trucks.find(t => t.id === schedule.truck_id);

          doc.setFontSize(10);
          doc.text(`  ${schedule.shift} Shift - Truck: ${truck?.code || 'N/A'}`, 18, yPos);
          yPos += 5;
          doc.text(`  Driver: ${driver?.name || 'N/A'}`, 18, yPos);
          yPos += 5;

          // Calculate other clients in same route
          const otherClients = clients.filter(c => 
            c.id !== clientId && schedule.client_ids?.includes(c.id)
          );
          
          if (otherClients.length > 0) {
            doc.setFontSize(9);
            doc.text(`  Other stops: ${otherClients.map(c => c.name).join(', ')}`, 18, yPos);
            yPos += 5;
          }

          yPos += 3;
        });

        yPos += 4;
      });
    }

    doc.save(`${client.name.replace(/[^a-z0-9]/gi, '_')}_schedule.pdf`);
    toast({ title: "Client schedule exported", description: `Schedule for ${client.name} has been downloaded` });
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
  
  // Filter schedules to show only current and future dates
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const minDate = format(addDays(selectedDate, -7), "yyyy-MM-dd");
  const maxDate = format(addDays(selectedDate, 7), "yyyy-MM-dd");
  const visibleDates = sortedDates.filter(d => d >= today && d >= minDate && d <= maxDate);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">Active Schedule</TabsTrigger>
          <TabsTrigger value="manage">Generate</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate("/past-schedules")}
                  >
                    View Past Schedules
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportScheduleAsPDF}>
                    <Download className="mr-1 h-3 w-3" />
                    Export PDF
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive">
                        <Trash2 className="mr-1 h-3 w-3" />
                        Clear All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Schedules?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all schedules (draft, scheduled, and approved). This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearAllSchedules} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Clear All Schedules
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
              
              <Button size="sm" disabled={!startDate || !endDate || loading} onClick={() => setShowClientSelectionDialog(true)} className="w-full">
                Select Clients to Service
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

        <TabsContent value="map">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Route Map</CardTitle>
              <CardDescription className="text-xs">
                View scheduled routes and client locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteMapView
                schedules={schedules.filter(s => s.status === 'approved')}
                clients={clients}
                trucks={trucks}
                landfillLat={LANDFILL_LAT}
                landfillLon={LANDFILL_LON}
              />
            </CardContent>
          </Card>
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
        <DialogContent className="max-w-3xl bg-background">
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
                const scheduleClients = clients.filter(c => schedule.client_ids?.includes(c.id));
                
                // Calculate service time (1MT = 40 mins)
                const totalServiceTime = scheduleClients.reduce((sum, c) => sum + (c.mt_requirement * SERVICE_TIME_PER_MT), 0);
                
                // Calculate travel time to landfill from last client
                let travelToLandfillTime = 0;
                if (scheduleClients.length > 0) {
                  const lastClient = scheduleClients[scheduleClients.length - 1];
                  if (lastClient.latitude && lastClient.longitude) {
                    const distance = calculateDistance(
                      lastClient.latitude,
                      lastClient.longitude,
                      LANDFILL_LAT,
                      LANDFILL_LON
                    );
                    // Convert distance to time in minutes
                    travelToLandfillTime = (distance / AVERAGE_SPEED_KMH) * 60;
                  }
                }
                
                const totalHours = ((totalServiceTime + travelToLandfillTime + LANDFILL_DISPOSAL_TIME) / 60).toFixed(1);
                
                return (
                  <div key={schedule.id || idx} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{truck?.code} - {truck?.type}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{truck?.capacity}MT</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSchedule(schedule)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
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
                    {scheduleClients.length > 0 && (
                      <div className="text-xs border-t pt-2 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-muted-foreground font-medium">Clients to Service:</div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs"
                            onClick={() => {
                              scheduleClients.forEach(c => exportClientSchedule(c.id));
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export All
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {scheduleClients.map(c => (
                            <div key={c.id} className="flex items-center justify-between pl-2 py-1 bg-muted/30 rounded group">
                              <div className="flex-1">
                                <span className="font-medium">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>{c.mt_requirement}MT</span>
                                <span>·</span>
                                <span>{(c.mt_requirement * SERVICE_TIME_PER_MT).toFixed(0)} mins</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => exportClientSchedule(c.id)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Total Service Time:</span>
                            <span>{(totalServiceTime / 60).toFixed(1)} hrs</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Travel to Landfill:</span>
                            <span>{(travelToLandfillTime / 60).toFixed(1)} hrs</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Landfill Disposal:</span>
                            <span>{(LANDFILL_DISPOSAL_TIME / 60).toFixed(1)} hrs</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total Shift Time:</span>
                            <span>{totalHours} hrs</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {schedule.mt_requirement && (
                      <div className="text-xs text-muted-foreground">
                        Total MT Requirement: {schedule.mt_requirement.toFixed(1)} MT
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

      {/* Client Selection Dialog */}
      <Dialog open={showClientSelectionDialog} onOpenChange={setShowClientSelectionDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Clients to Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose which clients to include in the schedule generation for {startDate && endDate && `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`}
            </p>
            <div className="flex gap-2 mb-3">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedClientIds(clients.map(c => c.id))}
              >
                Select All
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedClientIds([])}
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {clients.map(client => (
                <div key={client.id} className="flex items-start space-x-3 p-2 border rounded hover:bg-muted/50">
                  <Checkbox 
                    id={`client-${client.id}`}
                    checked={selectedClientIds.includes(client.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedClientIds([...selectedClientIds, client.id]);
                      } else {
                        setSelectedClientIds(selectedClientIds.filter(id => id !== client.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`client-${client.id}`} className="cursor-pointer font-medium">
                      {client.name}
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      {client.industry} • {client.mt_requirement || 0} MT • {client.collection_shift} • {client.collection_days?.join(', ')}
                      {client.latitude && client.longitude && ` • ${client.latitude.toFixed(4)}, ${client.longitude.toFixed(4)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-3">
              <Button 
                onClick={generateWeekSchedule} 
                disabled={loading || selectedClientIds.length === 0}
                className="flex-1"
              >
                {loading ? "Generating..." : `Generate Schedule (${selectedClientIds.length} clients)`}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowClientSelectionDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulingTab;
