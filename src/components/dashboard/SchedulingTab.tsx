import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Users, Truck, FileDown, Edit2, Check } from "lucide-react";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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

const SchedulingTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editingAvailability, setEditingAvailability] = useState<{ type: 'driver' | 'helper'; id: string; data: any } | null>(null);
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [truckDeployment, setTruckDeployment] = useState<TruckDeployment>({});
  const [showDeploymentDialog, setShowDeploymentDialog] = useState(false);

  const shifts = ["AM", "PM"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, helpersRes, trucksRes, schedulesRes] = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("helpers").select("*"),
        supabase.from("trucks").select("*"),
        supabase.from("schedules").select("*").gte("date", format(new Date(), "yyyy-MM-dd")),
      ]);

      setDrivers((driversRes.data as any[]) || []);
      setHelpers((helpersRes.data as any[]) || []);
      setTrucks(trucksRes.data || []);
      setSchedules(schedulesRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateWeekSchedule = async () => {
    setLoading(true);
    try {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const newSchedules: Schedule[] = [];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = addDays(startDate, dayOffset);
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const dayName = format(currentDate, "EEE");

        for (const shift of ["AM", "PM"]) {
          const availableDrivers = drivers.filter((d) => {
            const avail = d.availability as any;
            return avail?.shifts?.includes(shift) && avail?.days?.includes(dayName);
          });
          const availableHelpers = helpers.filter((h) => {
            const avail = h.availability as any;
            return avail?.shifts?.includes(shift) && avail?.days?.includes(dayName);
          });
          const availableTrucks = trucks.filter((t) => t.status === "available");

          if (availableDrivers.length > 0 && availableHelpers.length >= 2 && availableTrucks.length > 0) {
            const driver = availableDrivers[Math.floor(Math.random() * availableDrivers.length)];
            const selectedHelpers = availableHelpers
              .sort(() => 0.5 - Math.random())
              .slice(0, 2)
              .map((h) => h.id);
            const truck = availableTrucks[Math.floor(Math.random() * availableTrucks.length)];

            newSchedules.push({
              date: dateStr,
              shift,
              driver_id: driver.id,
              helper_ids: selectedHelpers,
              truck_id: truck.id,
              status: "scheduled",
            });
          }
        }
      }

      if (newSchedules.length > 0) {
        const { error } = await supabase.from("schedules").insert(newSchedules);
        if (error) throw error;

        toast({ title: "Success", description: `Generated ${newSchedules.length} shifts for the week` });
        loadData();
      } else {
        toast({ title: "No schedules", description: "Not enough resources to generate schedules", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const clearSchedules = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("schedules").delete().gte("date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      toast({ title: "Cleared", description: "All future schedules cleared" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async (schedule: Schedule) => {
    try {
      const { error } = await supabase.from("schedules").update({
        driver_id: schedule.driver_id,
        helper_ids: schedule.helper_ids,
        truck_id: schedule.truck_id,
      }).eq("id", schedule.id);

      if (error) throw error;
      toast({ title: "Success", description: "Schedule updated" });
      setEditingSchedule(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateAvailability = async () => {
    if (!editingAvailability) return;
    try {
      const table = editingAvailability.type === 'driver' ? 'drivers' : 'helpers';
      const { error } = await supabase.from(table).update({
        availability: editingAvailability.data.availability
      }).eq("id", editingAvailability.id);

      if (error) throw error;
      toast({ title: "Success", description: "Availability updated" });
      setEditingAvailability(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    doc.setFontSize(18);
    doc.text("Weekly Schedule", 14, 20);
    doc.setFontSize(10);
    doc.text(`Week of ${format(startDate, "MMM d, yyyy")}`, 14, 28);

    let yPos = 40;
    const lineHeight = 8;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = addDays(startDate, dayOffset);
      const dateStr = format(currentDate, "yyyy-MM-dd");

      doc.setFontSize(12);
      doc.text(format(currentDate, "EEEE, MMM d"), 14, yPos);
      yPos += lineHeight;

      for (const shift of ["AM", "PM"]) {
        const daySchedules = schedules.filter(s => s.date === dateStr && s.shift === shift);
        
        doc.setFontSize(10);
        doc.text(`  ${shift} Shift (${shift === "AM" ? "8:00 AM - 8:00 PM" : "8:00 PM - 8:00 AM"})`, 14, yPos);
        yPos += lineHeight;

        if (daySchedules.length === 0) {
          doc.setFontSize(9);
          doc.text("    No assignments", 14, yPos);
          yPos += lineHeight;
        } else {
          daySchedules.forEach(sched => {
            const driver = drivers.find(d => d.id === sched.driver_id);
            const truck = trucks.find(t => t.id === sched.truck_id);
            const assignedHelpers = sched.helper_ids
              .map(hid => helpers.find(h => h.id === hid)?.name)
              .filter(Boolean)
              .join(", ");

            doc.setFontSize(9);
            doc.text(`    Driver: ${driver?.name || "N/A"}  |  Truck: ${truck?.code || "N/A"}  |  Helpers: ${assignedHelpers}`, 14, yPos);
            yPos += lineHeight;
          });
        }

        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      }
      yPos += 4;
    }

    doc.save(`schedule-${format(startDate, "yyyy-MM-dd")}.pdf`);
    toast({ title: "Success", description: "Schedule exported to PDF" });
  };

  const getWeeklyChartData = () => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    const chartData: any[][] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = addDays(startDate, dayOffset);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const dayName = format(currentDate, "EEE");

      const amSchedules = schedules.filter(s => s.date === dateStr && s.shift === "AM");
      const pmSchedules = schedules.filter(s => s.date === dateStr && s.shift === "PM");

      chartData.push([dayName, dateStr, amSchedules, pmSchedules]);
    }

    return chartData;
  };

  const weekData = getWeeklyChartData();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule Generator
          </CardTitle>
          <CardDescription>Auto-assign drivers, helpers, and trucks based on availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generateWeekSchedule} disabled={loading}>
              Generate Week Schedule
            </Button>
            <Button variant="destructive" onClick={clearSchedules} disabled={loading}>
              Clear Schedules
            </Button>
            <Button variant="outline" onClick={exportToPDF} disabled={schedules.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Available Drivers</p>
              <p className="text-2xl font-bold">{drivers.length}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Available Helpers</p>
              <p className="text-2xl font-bold">{helpers.length}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Available Trucks</p>
              <p className="text-2xl font-bold">{trucks.filter((t) => t.status === "available").length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule Chart</CardTitle>
          <CardDescription>Current week assignments with edit capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : schedules.length === 0 ? (
            <p className="text-muted-foreground">No schedules generated yet. Click "Generate Week Schedule" above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-semibold">Day</th>
                    <th className="p-2 text-left font-semibold">AM Shift (8AM-8PM)</th>
                    <th className="p-2 text-left font-semibold">PM Shift (8PM-8AM)</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.map(([dayName, dateStr, amSchedules, pmSchedules]) => (
                    <tr key={dateStr} className="border-b hover:bg-muted/50">
                      <td className="p-2 align-top">
                        <div className="font-medium">{dayName}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(dateStr), "MMM d")}</div>
                      </td>
                      <td className="p-2 align-top">
                        {amSchedules.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No assignment</span>
                        ) : (
                          amSchedules.map((sched: Schedule, idx: number) => {
                            const driver = drivers.find(d => d.id === sched.driver_id);
                            const truck = trucks.find(t => t.id === sched.truck_id);
                            const assignedHelpers = sched.helper_ids
                              .map(hid => helpers.find(h => h.id === hid)?.name)
                              .filter(Boolean);
                            
                            return (
                              <div key={idx} className="mb-2 rounded-sm bg-muted p-2 text-sm">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3" />
                                      <span className="font-medium">{driver?.name || "N/A"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-3 w-3" />
                                      <span>{truck?.code || "N/A"}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Helpers: {assignedHelpers.join(", ")}
                                    </div>
                                  </div>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setEditingSchedule(sched)}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Schedule</DialogTitle>
                                      </DialogHeader>
                                      {editingSchedule && (
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Driver</Label>
                                            <Select 
                                              value={editingSchedule.driver_id}
                                              onValueChange={(v) => setEditingSchedule({...editingSchedule, driver_id: v})}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {drivers.map(d => (
                                                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label>Truck</Label>
                                            <Select 
                                              value={editingSchedule.truck_id}
                                              onValueChange={(v) => setEditingSchedule({...editingSchedule, truck_id: v})}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {trucks.map(t => (
                                                  <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label>Helpers</Label>
                                            <div className="space-y-2 mt-2">
                                              {helpers.map(h => (
                                                <div key={h.id} className="flex items-center gap-2">
                                                  <Checkbox 
                                                    checked={editingSchedule.helper_ids.includes(h.id)}
                                                    onCheckedChange={(checked) => {
                                                      if (checked) {
                                                        setEditingSchedule({
                                                          ...editingSchedule, 
                                                          helper_ids: [...editingSchedule.helper_ids, h.id]
                                                        });
                                                      } else {
                                                        setEditingSchedule({
                                                          ...editingSchedule, 
                                                          helper_ids: editingSchedule.helper_ids.filter(id => id !== h.id)
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  <Label>{h.name}</Label>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          <Button onClick={() => updateSchedule(editingSchedule)}>
                                            <Check className="mr-2 h-4 w-4" />
                                            Save Changes
                                          </Button>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </td>
                      <td className="p-2 align-top">
                        {pmSchedules.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No assignment</span>
                        ) : (
                          pmSchedules.map((sched: Schedule, idx: number) => {
                            const driver = drivers.find(d => d.id === sched.driver_id);
                            const truck = trucks.find(t => t.id === sched.truck_id);
                            const assignedHelpers = sched.helper_ids
                              .map(hid => helpers.find(h => h.id === hid)?.name)
                              .filter(Boolean);
                            
                            return (
                              <div key={idx} className="mb-2 rounded-sm bg-muted p-2 text-sm">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-3 w-3" />
                                      <span className="font-medium">{driver?.name || "N/A"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-3 w-3" />
                                      <span>{truck?.code || "N/A"}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Helpers: {assignedHelpers.join(", ")}
                                    </div>
                                  </div>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setEditingSchedule(sched)}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Schedule</DialogTitle>
                                      </DialogHeader>
                                      {editingSchedule && (
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Driver</Label>
                                            <Select 
                                              value={editingSchedule.driver_id}
                                              onValueChange={(v) => setEditingSchedule({...editingSchedule, driver_id: v})}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {drivers.map(d => (
                                                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label>Truck</Label>
                                            <Select 
                                              value={editingSchedule.truck_id}
                                              onValueChange={(v) => setEditingSchedule({...editingSchedule, truck_id: v})}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {trucks.map(t => (
                                                  <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label>Helpers</Label>
                                            <div className="space-y-2 mt-2">
                                              {helpers.map(h => (
                                                <div key={h.id} className="flex items-center gap-2">
                                                  <Checkbox 
                                                    checked={editingSchedule.helper_ids.includes(h.id)}
                                                    onCheckedChange={(checked) => {
                                                      if (checked) {
                                                        setEditingSchedule({
                                                          ...editingSchedule, 
                                                          helper_ids: [...editingSchedule.helper_ids, h.id]
                                                        });
                                                      } else {
                                                        setEditingSchedule({
                                                          ...editingSchedule, 
                                                          helper_ids: editingSchedule.helper_ids.filter(id => id !== h.id)
                                                        });
                                                      }
                                                    }}
                                                  />
                                                  <Label>{h.name}</Label>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          <Button onClick={() => updateSchedule(editingSchedule)}>
                                            <Check className="mr-2 h-4 w-4" />
                                            Save Changes
                                          </Button>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Availability</CardTitle>
          <CardDescription>Override driver and helper availability settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Drivers</h3>
            <div className="space-y-2">
              {drivers.map(driver => (
                <div key={driver.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Shifts: {(driver.availability as any)?.shifts?.join(", ") || "None"} | 
                      Days: {(driver.availability as any)?.days?.join(", ") || "None"}
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingAvailability({ type: 'driver', id: driver.id, data: driver })}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Driver Availability - {driver.name}</DialogTitle>
                      </DialogHeader>
                      {editingAvailability && editingAvailability.type === 'driver' && (
                        <div className="space-y-4">
                          <div>
                            <Label>Shifts</Label>
                            <div className="flex gap-4 mt-2">
                              {shifts.map(shift => (
                                <div key={shift} className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={editingAvailability.data.availability?.shifts?.includes(shift) || false}
                                    onCheckedChange={(checked) => {
                                      const currentShifts = editingAvailability.data.availability?.shifts || [];
                                      const newShifts = checked 
                                        ? [...currentShifts, shift]
                                        : currentShifts.filter((s: string) => s !== shift);
                                      setEditingAvailability({
                                        ...editingAvailability,
                                        data: {
                                          ...editingAvailability.data,
                                          availability: { ...editingAvailability.data.availability, shifts: newShifts }
                                        }
                                      });
                                    }}
                                  />
                                  <Label>{shift}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label>Days</Label>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {daysOfWeek.map(day => (
                                <div key={day} className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={editingAvailability.data.availability?.days?.includes(day) || false}
                                    onCheckedChange={(checked) => {
                                      const currentDays = editingAvailability.data.availability?.days || [];
                                      const newDays = checked 
                                        ? [...currentDays, day]
                                        : currentDays.filter((d: string) => d !== day);
                                      setEditingAvailability({
                                        ...editingAvailability,
                                        data: {
                                          ...editingAvailability.data,
                                          availability: { ...editingAvailability.data.availability, days: newDays }
                                        }
                                      });
                                    }}
                                  />
                                  <Label>{day}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button onClick={updateAvailability}>
                            <Check className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Helpers</h3>
            <div className="space-y-2">
              {helpers.map(helper => (
                <div key={helper.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{helper.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Shifts: {(helper.availability as any)?.shifts?.join(", ") || "None"} | 
                      Days: {(helper.availability as any)?.days?.join(", ") || "None"}
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingAvailability({ type: 'helper', id: helper.id, data: helper })}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Helper Availability - {helper.name}</DialogTitle>
                      </DialogHeader>
                      {editingAvailability && editingAvailability.type === 'helper' && (
                        <div className="space-y-4">
                          <div>
                            <Label>Shifts</Label>
                            <div className="flex gap-4 mt-2">
                              {shifts.map(shift => (
                                <div key={shift} className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={editingAvailability.data.availability?.shifts?.includes(shift) || false}
                                    onCheckedChange={(checked) => {
                                      const currentShifts = editingAvailability.data.availability?.shifts || [];
                                      const newShifts = checked 
                                        ? [...currentShifts, shift]
                                        : currentShifts.filter((s: string) => s !== shift);
                                      setEditingAvailability({
                                        ...editingAvailability,
                                        data: {
                                          ...editingAvailability.data,
                                          availability: { ...editingAvailability.data.availability, shifts: newShifts }
                                        }
                                      });
                                    }}
                                  />
                                  <Label>{shift}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label>Days</Label>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {daysOfWeek.map(day => (
                                <div key={day} className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={editingAvailability.data.availability?.days?.includes(day) || false}
                                    onCheckedChange={(checked) => {
                                      const currentDays = editingAvailability.data.availability?.days || [];
                                      const newDays = checked 
                                        ? [...currentDays, day]
                                        : currentDays.filter((d: string) => d !== day);
                                      setEditingAvailability({
                                        ...editingAvailability,
                                        data: {
                                          ...editingAvailability.data,
                                          availability: { ...editingAvailability.data.availability, days: newDays }
                                        }
                                      });
                                    }}
                                  />
                                  <Label>{day}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button onClick={updateAvailability}>
                            <Check className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulingTab;
