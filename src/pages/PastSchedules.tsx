import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, ArrowLeft, ChevronDown, ChevronUp, Download } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";

interface Driver {
  id: string;
  name: string;
}

interface Helper {
  id: string;
  name: string;
}

interface Recycler {
  id: string;
  name: string;
}

interface TruckType {
  id: string;
  code: string;
  capacity: number;
  type: string;
}

interface Schedule {
  id?: string;
  date: string;
  shift: string;
  driver_id: string | null;
  helper_ids: string[];
  recycler_ids?: string[];
  truck_id: string | null;
  status: string;
  mt_requirement?: number;
  client_ids?: string[];
}

interface Client {
  id: string;
  name: string;
  industry: string;
  mt_requirement: number;
}

const PastSchedules = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 7));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, helpersRes, recyclersRes, trucksRes, schedulesRes, clientsRes] = await Promise.all([
        supabase.from("drivers").select("*"),
        supabase.from("helpers").select("*"),
        supabase.from("recyclers").select("*"),
        supabase.from("trucks").select("*"),
        supabase.from("schedules").select("*").eq("status", "approved"),
        supabase.from("clients").select("*"),
      ]);

      if (driversRes.error) throw driversRes.error;
      if (helpersRes.error) throw helpersRes.error;
      if (recyclersRes.error) throw recyclersRes.error;
      if (trucksRes.error) throw trucksRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setDrivers(driversRes.data || []);
      setHelpers(helpersRes.data || []);
      setRecyclers(recyclersRes.data || []);
      setTrucks(trucksRes.data || []);
      setSchedules(schedulesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
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
    doc.text('Past Collection Schedules', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy hh:mm a')}`, 14, yPos);
    yPos += 10;

    const sortedDates = Object.keys(groupedSchedules).sort();
    
    sortedDates.forEach(date => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(format(new Date(date), 'EEEE, MMMM dd, yyyy'), 14, yPos);
      yPos += 8;
      
      ['AM', 'PM'].forEach(shift => {
        const scheduleList = groupedSchedules[date][shift as 'AM' | 'PM'];
        if (scheduleList.length > 0) {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }
          
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
    
    doc.save(`past-schedules-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const groupedSchedules = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { AM: [], PM: [] };
    acc[s.date][s.shift as 'AM' | 'PM'].push(s);
    return acc;
  }, {} as Record<string, { AM: Schedule[]; PM: Schedule[] }>);

  const sortedDates = Object.keys(groupedSchedules).sort((a, b) => b.localeCompare(a));
  
  // Filter to show only past schedules
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const minDate = format(addDays(selectedDate, -30), "yyyy-MM-dd");
  const maxDate = format(addDays(selectedDate, 30), "yyyy-MM-dd");
  const visibleDates = sortedDates.filter(d => d < today && d >= minDate && d <= maxDate);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Past Schedules</h1>
              <p className="text-sm text-muted-foreground">View historical collection schedules</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Historical Schedules</CardTitle>
                <CardDescription className="text-xs">All past approved assignments</CardDescription>
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
                    <Calendar 
                      mode="single" 
                      selected={selectedDate} 
                      onSelect={(date) => date && setSelectedDate(date)}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <p className="text-center text-muted-foreground text-xs py-4">Loading...</p>
              ) : visibleDates.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-4">No past schedules for this date range</p>
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
                          <Badge variant="secondary" className="text-xs">{totalTrucks} trucks</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pr-2 pt-2 space-y-2">
                          {['AM', 'PM'].map(shift => {
                            const shiftSchedules = dayData[shift as 'AM' | 'PM'];
                            if (shiftSchedules.length === 0) return null;

                            return (
                              <div key={shift} className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">{shift} Shift</div>
                                {shiftSchedules.map(schedule => {
                                  const driver = drivers.find(d => d.id === schedule.driver_id);
                                  const truck = trucks.find(t => t.id === schedule.truck_id);
                                  const scheduleHelpers = helpers.filter(h => schedule.helper_ids.includes(h.id));
                                  const scheduleRecyclers = recyclers.filter(r => schedule.recycler_ids?.includes(r.id));
                                  const scheduleClients = clients.filter(c => schedule.client_ids?.includes(c.id));

                                  return (
                                    <div key={schedule.id} className="p-2 border rounded bg-card text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{truck?.code || 'No Truck'}</span>
                                        <Badge variant="outline" className="text-[10px]">{schedule.mt_requirement || 0} MT</Badge>
                                      </div>
                                      <div className="text-muted-foreground">
                                        <div>Driver: {driver?.name || 'Not assigned'}</div>
                                        {scheduleHelpers.length > 0 && (
                                          <div>Helpers: {scheduleHelpers.map(h => h.name).join(', ')}</div>
                                        )}
                                        {scheduleRecyclers.length > 0 && (
                                          <div>Recyclers: {scheduleRecyclers.map(r => r.name).join(', ')}</div>
                                        )}
                                        {scheduleClients.length > 0 && (
                                          <div className="mt-1">
                                            <div className="font-medium text-foreground">Clients ({scheduleClients.length}):</div>
                                            <div>{scheduleClients.map(c => c.name).join(', ')}</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
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
      </div>
    </div>
  );
};

export default PastSchedules;
