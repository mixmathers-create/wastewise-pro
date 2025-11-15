import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, FileDown, Edit2, Check, Wrench, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

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
}

interface TruckDeployment {
  [date: string]: {
    AM: number;
    PM: number;
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
  const [editingAvailability, setEditingAvailability] = useState<{ type: 'driver' | 'helper'; id: string; data: any } | null>(null);
  
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

  const shifts = ["AM", "PM"];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, helpersRes, trucksRes, schedulesRes, maintenanceRes] = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("helpers").select("*"),
        supabase.from("trucks").select("*"),
        supabase.from("schedules").select("*").gte("date", format(new Date(), "yyyy-MM-dd")),
        supabase.from("truck_maintenance_blocks").select("*").gte("end_date", format(new Date(), "yyyy-MM-dd")),
      ]);

      setDrivers((driversRes.data as any[]) || []);
      setHelpers((helpersRes.data as any[]) || []);
      setTrucks(trucksRes.data || []);
      setSchedules(schedulesRes.data || []);
      setMaintenanceBlocks(maintenanceRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isTruckUnderMaintenance = (truckId: string, date: string): boolean => {
    return maintenanceBlocks.some(block => 
      block.truck_id === truckId && 
      date >= block.start_date && 
      date <= block.end_date
    );
  };

  const validateDateRange = () => {
    if (!startDate || !endDate) {
      toast({ title: "Select dates", description: "Please select both start and end dates", variant: "destructive" });
      return false;
    }
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 6) {
      toast({ title: "Invalid range", description: "Date range must be within 7 days", variant: "destructive" });
      return false;
    }
    return true;
  };

  const openDeploymentDialog = () => {
    if (!validateDateRange()) return;
    
    const deployment: TruckDeployment = {};
    let currentDate = new Date(startDate!);
    while (currentDate <= endDate!) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      deployment[dateStr] = { AM: 1, PM: 1 };
      currentDate = addDays(currentDate, 1);
    }
    setTruckDeployment(deployment);
    setShowDeploymentDialog(true);
  };

  const updateTruckDeployment = (date: string, shift: "AM" | "PM", value: string) => {
    const numValue = parseInt(value) || 0;
    setTruckDeployment(prev => ({
      ...prev,
      [date]: { ...prev[date], [shift]: Math.max(0, Math.min(numValue, trucks.length)) }
    }));
  };

  const generateWeekSchedule = async () => {
    if (!validateDateRange()) return;
    
    setLoading(true);
    try {
      const newSchedules: Schedule[] = [];
      const usedDriversInPreviousShift = new Set<string>();
      const usedHelpersInPreviousShift = new Set<string>();

      let currentDate = new Date(startDate!);
      while (currentDate <= endDate!) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const dayName = format(currentDate, "EEE");

        for (const shift of ["AM", "PM"]) {
          const trucksNeeded = truckDeployment[dateStr]?.[shift] || 0;
          if (trucksNeeded === 0) continue;

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

          const availableTrucks = trucks.filter((t) => 
            t.status === "available" && !isTruckUnderMaintenance(t.id, dateStr)
          );

          if (availableDrivers.length < driversNeeded) {
            toast({ 
              title: "Insufficient drivers", 
              description: `Need ${driversNeeded} drivers for ${dateStr} ${shift}, only ${availableDrivers.length} available`,
              variant: "destructive" 
            });
            continue;
          }

          if (availableHelpers.length < helpersNeeded) {
            toast({ 
              title: "Insufficient helpers", 
              description: `Need ${helpersNeeded} helpers for ${dateStr} ${shift}, only ${availableHelpers.length} available`,
              variant: "destructive" 
            });
            continue;
          }

          if (availableTrucks.length < trucksNeeded) {
            toast({ 
              title: "Insufficient trucks", 
              description: `Need ${trucksNeeded} trucks for ${dateStr} ${shift}, only ${availableTrucks.length} available`,
              variant: "destructive" 
            });
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
              status: "scheduled",
              is_backup: false
            });

            usedDriversThisShift.add(driver.id);
            assignedHelpers.forEach(h => usedHelpersThisShift.add(h.id));
          }

          if (needsBackup) {
            const backupDriver = availableDrivers[trucksNeeded];
            const backupHelper = availableHelpers[trucksNeeded * helpersPerTruck];
            
            if (backupDriver && backupHelper) {
              newSchedules.push({
                date: dateStr,
                shift,
                driver_id: backupDriver.id,
                helper_ids: [backupHelper.id],
                truck_id: null,
                status: "scheduled",
                is_backup: true
              });
              usedDriversThisShift.add(backupDriver.id);
              usedHelpersThisShift.add(backupHelper.id);
            }
          }

          usedDriversInPreviousShift.clear();
          usedHelpersInPreviousShift.clear();
          usedDriversThisShift.forEach(id => usedDriversInPreviousShift.add(id));
          usedHelpersThisShift.forEach(id => usedHelpersInPreviousShift.add(id));
        }

        currentDate = addDays(currentDate, 1);
      }

      if (newSchedules.length === 0) {
        toast({ title: "No schedules created", description: "Check availability and deployment settings", variant: "destructive" });
        return;
      }

      await supabase.from("schedules").delete().gte("date", format(startDate!, "yyyy-MM-dd")).lte("date", format(endDate!, "yyyy-MM-dd"));
      const { error } = await supabase.from("schedules").insert(newSchedules);
      if (error) throw error;

      toast({ title: "Success", description: `Generated ${newSchedules.length} schedules!` });
      setShowDeploymentDialog(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clearSchedules = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Select dates", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await supabase.from("schedules").delete().gte("date", format(startDate, "yyyy-MM-dd")).lte("date", format(endDate, "yyyy-MM-dd"));
      toast({ title: "Schedules cleared" });
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

  const updateAvailability = async (type: 'driver' | 'helper', id: string, availability: any) => {
    setLoading(true);
    try {
      const table = type === 'driver' ? 'drivers' : 'helpers';
      const { error } = await supabase.from(table).update({ availability }).eq("id", id);
      if (error) throw error;
      toast({ title: "Availability updated" });
      setEditingAvailability(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addMaintenanceBlock = async () => {
    if (!newMaintenance.truck_id || !newMaintenance.start_date || !newMaintenance.end_date) {
      toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const startDate = new Date(newMaintenance.start_date);
    const endDate = new Date(newMaintenance.end_date);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      toast({ title: "Invalid range", description: "Maintenance period cannot exceed 30 days", variant: "destructive" });
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

  const exportToPDF = () => {
    if (!schedules.length || !startDate || !endDate) {
      toast({ title: "No schedule", variant: "destructive" });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Weekly Schedule", 14, 15);
    doc.setFontSize(10);
    doc.text(`${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`, 14, 22);

    const dates: string[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(format(currentDate, "yyyy-MM-dd"));
      currentDate = addDays(currentDate, 1);
    }

    let yPos = 35;
    doc.setFontSize(12);
    doc.text("Date", 14, yPos);
    doc.text("Shift", 50, yPos);
    doc.text("Driver", 80, yPos);
    doc.text("Truck", 130, yPos);
    doc.text("Helpers", 170, yPos);
    doc.line(14, yPos + 2, 280, yPos + 2);
    yPos += 8;

    dates.forEach(date => {
      shifts.forEach(shift => {
        const shiftSchedules = schedules.filter(s => s.date === date && s.shift === shift);
        
        if (shiftSchedules.length > 0) {
          doc.setFontSize(10);
          
          shiftSchedules.forEach((schedule, idx) => {
            const driver = drivers.find(d => d.id === schedule.driver_id);
            const truck = trucks.find(t => t.id === schedule.truck_id);
            const scheduleHelpers = helpers.filter(h => schedule.helper_ids.includes(h.id));
            
            if (yPos > 180) {
              doc.addPage();
              yPos = 20;
            }
            
            if (idx === 0) {
              doc.text(format(new Date(date), "MMM dd"), 14, yPos);
              doc.text(shift === "AM" ? "8AM-8PM" : "8PM-8AM", 50, yPos);
            }
            
            const backupLabel = schedule.is_backup ? " [BACKUP]" : "";
            doc.text(`${driver?.name || 'N/A'}${backupLabel}`, 80, yPos);
            doc.text(truck?.code || 'N/A', 130, yPos);
            doc.text(`${scheduleHelpers.length} helpers`, 170, yPos);
            
            yPos += 6;
          });
          
          yPos += 3;
        }
      });
    });

    doc.save(`schedule-${format(startDate, "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF exported" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Scheduling Management
          </CardTitle>
          <CardDescription>
            Select a 7-day window and specify truck deployment to generate schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background">
                  <Calendar 
                    mode="single" 
                    selected={startDate} 
                    onSelect={setStartDate} 
                    initialFocus 
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background">
                  <Calendar 
                    mode="single" 
                    selected={endDate} 
                    onSelect={setEndDate} 
                    initialFocus 
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={openDeploymentDialog} disabled={loading || !startDate || !endDate}>
              Configure & Generate
            </Button>
            <Button onClick={clearSchedules} variant="outline" disabled={loading}>
              Clear
            </Button>
            <Button onClick={exportToPDF} variant="outline" disabled={!schedules.length}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* Weekly Schedule Chart */}
          {schedules.length > 0 && startDate && endDate && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Weekly Schedule Chart</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left">Date</th>
                      <th className="border border-border p-2 text-left">Shift</th>
                      <th className="border border-border p-2 text-left">Trucks</th>
                      <th className="border border-border p-2 text-left">Assignments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const dates: string[] = [];
                      let currentDate = new Date(startDate);
                      while (currentDate <= endDate) {
                        dates.push(format(currentDate, "yyyy-MM-dd"));
                        currentDate = addDays(currentDate, 1);
                      }
                      
                      return dates.flatMap(date => 
                        shifts.map(shift => {
                          const shiftSchedules = schedules.filter(s => s.date === date && s.shift === shift);
                          return (
                            <tr key={`${date}-${shift}`} className="hover:bg-muted/50">
                              <td className="border border-border p-2">{format(new Date(date), "EEE, MMM dd")}</td>
                              <td className="border border-border p-2">
                                {shift === "AM" ? "8AM-8PM" : "8PM-8AM"}
                              </td>
                              <td className="border border-border p-2 font-semibold">{shiftSchedules.length}</td>
                              <td className="border border-border p-2">
                                {shiftSchedules.length === 0 ? (
                                  <span className="text-muted-foreground">No assignments</span>
                                ) : (
                                  <div className="space-y-2">
                                    {shiftSchedules.map((schedule, idx) => {
                                      const driver = drivers.find(d => d.id === schedule.driver_id);
                                      const truck = trucks.find(t => t.id === schedule.truck_id);
                                      const scheduleHelpers = helpers.filter(h => schedule.helper_ids.includes(h.id));
                                      
                                      return (
                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={() => setEditingSchedule(schedule)}
                                              >
                                                <Edit2 className="h-3 w-3" />
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-background">
                                              <DialogHeader>
                                                <DialogTitle>Edit Schedule Assignment</DialogTitle>
                                              </DialogHeader>
                                              <div className="space-y-4">
                                                <div>
                                                  <Label>Driver</Label>
                                                  <Select 
                                                    value={editingSchedule?.driver_id || undefined} 
                                                    onValueChange={(value) => setEditingSchedule(prev => prev ? {...prev, driver_id: value} : null)}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-background">
                                                      {drivers.map(d => (
                                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                      ))}
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                {!schedule.is_backup && (
                                                  <div>
                                                    <Label>Truck</Label>
                                                    <Select 
                                                      value={editingSchedule?.truck_id || undefined} 
                                                      onValueChange={(value) => setEditingSchedule(prev => prev ? {...prev, truck_id: value} : null)}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent className="bg-background">
                                                        {trucks.map(t => (
                                                          <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                )}
                                                <div>
                                                  <Label>Helpers ({schedule.is_backup ? "Backup" : "2-4 per truck"})</Label>
                                                  <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                                                    {helpers.map(h => (
                                                      <div key={h.id} className="flex items-center space-x-2">
                                                        <Checkbox 
                                                          checked={editingSchedule?.helper_ids.includes(h.id)}
                                                          onCheckedChange={(checked) => {
                                                            setEditingSchedule(prev => {
                                                              if (!prev) return null;
                                                              const newHelperIds = checked 
                                                                ? [...prev.helper_ids, h.id]
                                                                : prev.helper_ids.filter(id => id !== h.id);
                                                              return {...prev, helper_ids: newHelperIds};
                                                            });
                                                          }}
                                                        />
                                                        <Label>{h.name}</Label>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                                <Button onClick={() => updateSchedule(editingSchedule!)}>
                                                  <Check className="h-4 w-4 mr-2" />
                                                  Save Changes
                                                </Button>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                          <div className="flex-1">
                                            {schedule.is_backup && <span className="font-semibold text-orange-500">[BACKUP] </span>}
                                            <span className="font-medium">{driver?.name}</span>
                                            {!schedule.is_backup && <span> • {truck?.code}</span>}
                                            <div className="text-xs text-muted-foreground mt-1">
                                              Helpers: {scheduleHelpers.map(h => h.name).join(', ') || 'None'}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Truck Deployment Dialog */}
      <Dialog open={showDeploymentDialog} onOpenChange={setShowDeploymentDialog}>
        <DialogContent className="max-w-4xl bg-background max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Truck Deployment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Specify how many trucks to deploy for each shift. If more than 5 trucks are deployed, backup driver and helper will be added automatically.
            </p>
            <div className="space-y-3">
              {Object.keys(truckDeployment).sort().map(date => (
                <Card key={date}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{format(new Date(date), "EEEE, MMMM dd, yyyy")}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Morning Shift (8AM-8PM)</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max={trucks.length}
                          value={truckDeployment[date]?.AM || 0}
                          onChange={(e) => updateTruckDeployment(date, "AM", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {truckDeployment[date]?.AM > 5 && "⚠️ Backup personnel will be assigned"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Night Shift (8PM-8AM)</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max={trucks.length}
                          value={truckDeployment[date]?.PM || 0}
                          onChange={(e) => updateTruckDeployment(date, "PM", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {truckDeployment[date]?.PM > 5 && "⚠️ Backup personnel will be assigned"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={generateWeekSchedule} disabled={loading}>
                Generate Schedule
              </Button>
              <Button variant="outline" onClick={() => setShowDeploymentDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Availability Management */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Availability</CardTitle>
          <CardDescription>Update driver and helper availability for scheduling</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Drivers ({drivers.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {drivers.map(driver => {
                  const avail = driver.availability as any;
                  return (
                    <div key={driver.id} className="flex items-center justify-between p-2 border border-border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {avail?.shifts?.join(", ")} • {avail?.days?.join(", ")}
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingAvailability({ type: 'driver', id: driver.id, data: driver.availability })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background">
                          <DialogHeader>
                            <DialogTitle>Edit Driver Availability - {driver.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Available Shifts</Label>
                              <div className="space-y-2 mt-2">
                                {shifts.map(shift => (
                                  <div key={shift} className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={editingAvailability?.data?.shifts?.includes(shift)}
                                      onCheckedChange={(checked) => {
                                        setEditingAvailability(prev => {
                                          if (!prev) return null;
                                          const newShifts = checked 
                                            ? [...(prev.data?.shifts || []), shift]
                                            : (prev.data?.shifts || []).filter((s: string) => s !== shift);
                                          return {...prev, data: {...prev.data, shifts: newShifts}};
                                        });
                                      }}
                                    />
                                    <Label>{shift} ({shift === "AM" ? "8AM-8PM" : "8PM-8AM"})</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Available Days</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {daysOfWeek.map(day => (
                                  <div key={day} className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={editingAvailability?.data?.days?.includes(day)}
                                      onCheckedChange={(checked) => {
                                        setEditingAvailability(prev => {
                                          if (!prev) return null;
                                          const newDays = checked 
                                            ? [...(prev.data?.days || []), day]
                                            : (prev.data?.days || []).filter((d: string) => d !== day);
                                          return {...prev, data: {...prev.data, days: newDays}};
                                        });
                                      }}
                                    />
                                    <Label>{day}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button onClick={() => updateAvailability('driver', driver.id, editingAvailability!.data)}>
                              <Check className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Helpers ({helpers.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {helpers.map(helper => {
                  const avail = helper.availability as any;
                  return (
                    <div key={helper.id} className="flex items-center justify-between p-2 border border-border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{helper.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {avail?.shifts?.join(", ")} • {avail?.days?.join(", ")}
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingAvailability({ type: 'helper', id: helper.id, data: helper.availability })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-background">
                          <DialogHeader>
                            <DialogTitle>Edit Helper Availability - {helper.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Available Shifts</Label>
                              <div className="space-y-2 mt-2">
                                {shifts.map(shift => (
                                  <div key={shift} className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={editingAvailability?.data?.shifts?.includes(shift)}
                                      onCheckedChange={(checked) => {
                                        setEditingAvailability(prev => {
                                          if (!prev) return null;
                                          const newShifts = checked 
                                            ? [...(prev.data?.shifts || []), shift]
                                            : (prev.data?.shifts || []).filter((s: string) => s !== shift);
                                          return {...prev, data: {...prev.data, shifts: newShifts}};
                                        });
                                      }}
                                    />
                                    <Label>{shift} ({shift === "AM" ? "8AM-8PM" : "8PM-8AM"})</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Available Days</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {daysOfWeek.map(day => (
                                  <div key={day} className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={editingAvailability?.data?.days?.includes(day)}
                                      onCheckedChange={(checked) => {
                                        setEditingAvailability(prev => {
                                          if (!prev) return null;
                                          const newDays = checked 
                                            ? [...(prev.data?.days || []), day]
                                            : (prev.data?.days || []).filter((d: string) => d !== day);
                                          return {...prev, data: {...prev.data, days: newDays}};
                                        });
                                      }}
                                    />
                                    <Label>{day}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button onClick={() => updateAvailability('helper', helper.id, editingAvailability!.data)}>
                              <Check className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Truck Maintenance Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Truck Maintenance Schedule
              </CardTitle>
              <CardDescription>Block trucks for maintenance (max 30 days per block)</CardDescription>
            </div>
            <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Wrench className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background">
                <DialogHeader>
                  <DialogTitle>Schedule Truck Maintenance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Truck</Label>
                    <Select value={newMaintenance.truck_id} onValueChange={(value) => setNewMaintenance(prev => ({ ...prev, truck_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select truck" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {trucks.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input 
                      type="date" 
                      value={newMaintenance.start_date}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input 
                      type="date" 
                      value={newMaintenance.end_date}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Maximum 30 days from start date</p>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea 
                      value={newMaintenance.reason}
                      onChange={(e) => setNewMaintenance(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="e.g., Regular maintenance, repairs, inspection"
                    />
                  </div>
                  <Button onClick={addMaintenanceBlock} disabled={loading} className="w-full">
                    Add Maintenance Block
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {maintenanceBlocks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No maintenance scheduled</p>
          ) : (
            <div className="space-y-3">
              {maintenanceBlocks.map(block => {
                const truck = trucks.find(t => t.id === block.truck_id);
                return (
                  <Card key={block.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{truck?.code}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(block.start_date), "MMM dd, yyyy")} - {format(new Date(block.end_date), "MMM dd, yyyy")}
                          </div>
                          {block.reason && (
                            <div className="text-sm mt-1">{block.reason}</div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => block.id && deleteMaintenanceBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulingTab;
