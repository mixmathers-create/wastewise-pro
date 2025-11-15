import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Truck } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

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
  driver_id: string;
  helper_ids: string[];
  truck_id: string;
  status: string;
}

const SchedulingTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  const dayMap: { [key: string]: string } = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };

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

  const groupedSchedules = schedules.reduce((acc, sched) => {
    const key = `${sched.date}-${sched.shift}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sched);
    return acc;
  }, {} as { [key: string]: Schedule[] });

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
          <CardTitle>Generated Schedules</CardTitle>
          <CardDescription>Upcoming week shifts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : Object.keys(groupedSchedules).length === 0 ? (
            <p className="text-muted-foreground">No schedules generated yet. Click "Generate Week Schedule" above.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSchedules)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, scheds]) => {
                  const [date, shift] = key.split("-");
                  return (
                    <div key={key} className="rounded-md border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold">
                          {format(new Date(date), "EEEE, MMM d")} - {shift} Shift
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {shift === "AM" ? "8:00 AM - 8:00 PM" : "8:00 PM - 8:00 AM"}
                        </span>
                      </div>
                      {scheds.map((sched, idx) => {
                        const driver = drivers.find((d) => d.id === sched.driver_id);
                        const truck = trucks.find((t) => t.id === sched.truck_id);
                        const assignedHelpers = sched.helper_ids
                          .map((hid) => helpers.find((h) => h.id === hid)?.name)
                          .filter(Boolean);
                        return (
                          <div key={idx} className="mt-2 rounded-sm bg-muted p-2 text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span className="font-medium">{driver?.name || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Truck className="h-4 w-4" />
                                <span>{truck?.code || "N/A"}</span>
                              </div>
                              <div className="text-muted-foreground">Helpers: {assignedHelpers.join(", ")}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
