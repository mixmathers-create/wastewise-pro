import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Camera, Clock, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 5;
const MAX_ITEMS = 100;

interface Personnel {
  id: string;
  name: string;
  type: 'driver' | 'helper' | 'recycler';
}

interface Truck {
  id: string;
  code: string;
  plate_number: string | null;
  type: string;
}

interface TimeLog {
  id: string;
  personnel_id: string;
  personnel_name: string;
  personnel_type: string;
  time_in: string;
  time_out: string | null;
  photo_url: string | null;
  group_session_id: string | null;
  truck_id: string | null;
  latitude: number | null;
  longitude: number | null;
  trucks?: {
    code: string;
    plate_number: string | null;
  } | null;
}

export default function DriversHelpersTimeTracking() {
  const [drivers, setDrivers] = useState<Personnel[]>([]);
  const [helpers, setHelpers] = useState<Personnel[]>([]);
  const [recyclers, setRecyclers] = useState<Personnel[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [selectedHelpers, setSelectedHelpers] = useState<Set<string>>(new Set());
  const [selectedRecyclers, setSelectedRecyclers] = useState<Set<string>>(new Set());
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [timedOutPage, setTimedOutPage] = useState(1);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [showGroupTimeOutDialog, setShowGroupTimeOutDialog] = useState(false);
  const [selectedGroupTruck, setSelectedGroupTruck] = useState<string | null>(null);
  const [groupMembersToTimeOut, setGroupMembersToTimeOut] = useState<Set<string>>(new Set());
  const [selectedTimedOutLogs, setSelectedTimedOutLogs] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchPersonnel();
    fetchTrucks();
    fetchTimeLogs();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchPersonnel = async () => {
    try {
      const [driversData, helpersData, recyclersData] = await Promise.all([
        supabase.from("drivers").select("id,name").eq("status", "available").limit(MAX_ITEMS),
        supabase.from("helpers").select("id,name").eq("status", "available").limit(MAX_ITEMS),
        supabase.from("recyclers").select("id,name").eq("status", "available").limit(MAX_ITEMS)
      ]);

      if (driversData.data) {
        setDrivers(driversData.data.map(d => ({ ...d, type: 'driver' as const })));
      }
      if (helpersData.data) {
        setHelpers(helpersData.data.map(h => ({ ...h, type: 'helper' as const })));
      }
      if (recyclersData.data) {
        setRecyclers(recyclersData.data.map(r => ({ ...r, type: 'recycler' as const })));
      }
    } catch (error) {
      console.error("Error fetching personnel:", error);
      toast.error("Failed to load personnel");
    }
  };

  const fetchTrucks = async () => {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("id,code,plate_number,type")
        .eq("status", "available")
        .limit(MAX_ITEMS);

      if (error) throw error;
      setTrucks(data || []);
    } catch (error) {
      console.error("Error fetching trucks:", error);
      toast.error("Failed to load trucks");
    }
  };

  const fetchTimeLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("personnel_time_logs")
        .select(`
          id,
          personnel_id,
          personnel_name,
          personnel_type,
          time_in,
          time_out,
          photo_url,
          group_session_id,
          truck_id,
          latitude,
          longitude,
          trucks:truck_id(code,plate_number)
        `)
        .in("personnel_type", ["driver", "helper", "recycler"])
        .order("time_in", { ascending: false })
        .limit(MAX_ITEMS);

      if (error) throw error;
      
      // Transform the data to handle trucks as single object instead of array
      const transformedData = (data || []).map(log => ({
        ...log,
        trucks: Array.isArray(log.trucks) ? log.trucks[0] : log.trucks
      })) as TimeLog[];
      
      setTimeLogs(transformedData);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      toast.error("Failed to load time logs");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          resolve({ latitude: 0, longitude: 0 });
        }
      );
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL("image/jpeg");
      setCapturedPhoto(photoData);
    }
  };

  const handleTimeIn = async () => {
    if (!selectedTruck) {
      toast.error("Please select a vehicle");
      return;
    }

    if (selectedDrivers.size === 0 && selectedHelpers.size === 0 && selectedRecyclers.size === 0) {
      toast.error("Please select at least one driver, helper, or recycler");
      return;
    }

    if (!capturedPhoto) {
      toast.error("Please capture a group photo");
      return;
    }

    try {
      const location = await getCurrentLocation();
      const groupSessionId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Upload photo to storage
      const photoBlob = await fetch(capturedPhoto).then(r => r.blob());
      const photoFileName = `time-logs/${groupSessionId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("time-logs")
        .upload(photoFileName, photoBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("time-logs")
        .getPublicUrl(photoFileName);

      // Create time logs for all selected personnel
      const logs = [];
      
      for (const driverId of selectedDrivers) {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
          logs.push({
            personnel_id: driverId,
            personnel_type: 'driver',
            personnel_name: driver.name,
            time_in: timestamp,
            photo_url: publicUrl,
            latitude: location.latitude,
            longitude: location.longitude,
            group_session_id: groupSessionId,
            truck_id: selectedTruck
          });
        }
      }

      for (const helperId of selectedHelpers) {
        const helper = helpers.find(h => h.id === helperId);
        if (helper) {
          logs.push({
            personnel_id: helperId,
            personnel_type: 'helper',
            personnel_name: helper.name,
            time_in: timestamp,
            photo_url: publicUrl,
            latitude: location.latitude,
            longitude: location.longitude,
            group_session_id: groupSessionId,
            truck_id: selectedTruck
          });
        }
      }

      for (const recyclerId of selectedRecyclers) {
        const recycler = recyclers.find(r => r.id === recyclerId);
        if (recycler) {
          logs.push({
            personnel_id: recyclerId,
            personnel_type: 'recycler',
            personnel_name: recycler.name,
            time_in: timestamp,
            photo_url: publicUrl,
            latitude: location.latitude,
            longitude: location.longitude,
            group_session_id: groupSessionId,
            truck_id: selectedTruck
          });
        }
      }

      const { error } = await supabase
        .from("personnel_time_logs")
        .insert(logs);

      if (error) throw error;

      toast.success(`Time in recorded for ${logs.length} personnel`);
      setSelectedTruck("");
      setSelectedDrivers(new Set());
      setSelectedHelpers(new Set());
      setSelectedRecyclers(new Set());
      setCapturedPhoto(null);
      setShowCamera(false);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      fetchTimeLogs();
    } catch (error) {
      console.error("Error recording time in:", error);
      toast.error("Failed to record time in");
    }
  };

  const handleTimeOut = async (logId: string) => {
    try {
      const { error } = await supabase
        .from("personnel_time_logs")
        .update({ time_out: new Date().toISOString() })
        .eq("id", logId);

      if (error) throw error;
      toast.success("Time out recorded");
      fetchTimeLogs();
    } catch (error) {
      console.error("Error recording time out:", error);
      toast.error("Failed to record time out");
    }
  };

  const handleGroupTimeOutClick = (truckId: string) => {
    const groupMembers = activeLogs.filter(log => log.truck_id === truckId);
    setSelectedGroupTruck(truckId);
    setGroupMembersToTimeOut(new Set(groupMembers.map(log => log.id)));
    setShowGroupTimeOutDialog(true);
  };

  const handleGroupTimeOut = async () => {
    if (groupMembersToTimeOut.size === 0) {
      toast.error("Please select at least one person to time out");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from("personnel_time_logs")
        .update({ time_out: timestamp })
        .in("id", Array.from(groupMembersToTimeOut));

      if (error) throw error;
      
      toast.success(`Time out recorded for ${groupMembersToTimeOut.size} personnel`);
      setShowGroupTimeOutDialog(false);
      setSelectedGroupTruck(null);
      setGroupMembersToTimeOut(new Set());
      fetchTimeLogs();
    } catch (error) {
      console.error("Error recording group time out:", error);
      toast.error("Failed to record time out");
    }
  };

  const handleMassDelete = async () => {
    if (selectedTimedOutLogs.size === 0) {
      toast.error("Please select at least one log to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedTimedOutLogs.size} time log(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("personnel_time_logs")
        .delete()
        .in("id", Array.from(selectedTimedOutLogs));

      if (error) throw error;
      
      toast.success(`Deleted ${selectedTimedOutLogs.size} time log(s)`);
      setSelectedTimedOutLogs(new Set());
      fetchTimeLogs();
    } catch (error) {
      console.error("Error deleting time logs:", error);
      toast.error("Failed to delete time logs");
    }
  };

  const calculateTotalTime = (timeIn: string, timeOut: string | null) => {
    if (!timeOut) return "Active";
    const start = new Date(timeIn);
    const end = new Date(timeOut);
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((end.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleExport = async () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error("Please select start and end dates");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("personnel_time_logs")
        .select(`
          *,
          trucks:truck_id(code,plate_number)
        `)
        .in("personnel_type", ["driver", "helper", "recycler"])
        .gte("time_in", exportStartDate)
        .lte("time_in", exportEndDate)
        .order("time_in", { ascending: false });

      if (error) throw error;

      // Calculate total hours and minutes per person
      interface PersonnelTotal {
        name: string;
        type: string;
        totalMinutes: number;
        logs: any[];
      }
      
      const personnelTotals: Record<string, PersonnelTotal> = (data || []).reduce((acc, log) => {
        if (!log.time_out) return acc; // Skip active logs
        
        const start = new Date(log.time_in);
        const end = new Date(log.time_out);
        const totalMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
        
        const key = `${log.personnel_id}-${log.personnel_name}`;
        if (!acc[key]) {
          acc[key] = {
            name: log.personnel_name,
            type: log.personnel_type,
            totalMinutes: 0,
            logs: []
          };
        }
        acc[key].totalMinutes += totalMinutes;
        acc[key].logs.push(log);
        
        return acc;
      }, {} as Record<string, PersonnelTotal>);

      // Create detailed CSV with individual logs
      const detailedCsv = [
        ["Personnel Name", "Time In", "Time Out", "Duration"].join(","),
        ...(data || []).map(log => {
          return [
            log.personnel_name,
            format(new Date(log.time_in), "yyyy-MM-dd HH:mm:ss"),
            log.time_out ? format(new Date(log.time_out), "yyyy-MM-dd HH:mm:ss") : "Active",
            calculateTotalTime(log.time_in, log.time_out)
          ].join(",");
        })
      ].join("\n");

      // Sort personnel by total minutes worked (descending)
      const sortedPersonnel = Object.values(personnelTotals).sort((a, b) => b.totalMinutes - a.totalMinutes);

      // Create summary CSV with totals per person
      const summaryCsv = [
        ["Personnel Name", "Total Hours", "Total Minutes"].join(","),
        ...sortedPersonnel.map((person) => {
          const hours = Math.floor(person.totalMinutes / 60);
          const minutes = person.totalMinutes % 60;
          return [
            person.name,
            hours.toString(),
            minutes.toString()
          ].join(",");
        })
      ].join("\n");

      // Export detailed logs
      const detailedBlob = new Blob([detailedCsv], { type: "text/csv" });
      const detailedUrl = window.URL.createObjectURL(detailedBlob);
      const detailedLink = document.createElement("a");
      detailedLink.href = detailedUrl;
      detailedLink.download = `personnel-time-logs-detailed-${exportStartDate}-to-${exportEndDate}.csv`;
      detailedLink.click();

      // Export summary
      setTimeout(() => {
        const summaryBlob = new Blob([summaryCsv], { type: "text/csv" });
        const summaryUrl = window.URL.createObjectURL(summaryBlob);
        const summaryLink = document.createElement("a");
        summaryLink.href = summaryUrl;
        summaryLink.download = `personnel-time-logs-summary-${exportStartDate}-to-${exportEndDate}.csv`;
        summaryLink.click();
      }, 500);

      toast.success("Time logs exported (detailed + summary)");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export time logs");
    }
  };

  const activeLogs = timeLogs.filter(log => !log.time_out);
  const timedOutLogs = timeLogs.filter(log => log.time_out);
  
  // Get set of truck IDs that are currently in use
  const activeTruckIds = new Set(
    activeLogs
      .filter(log => log.truck_id !== null)
      .map(log => log.truck_id)
  );
  
  // Filter available trucks to exclude those currently in use
  const availableTrucks = trucks.filter(truck => !activeTruckIds.has(truck.id));
  
  // Group active logs by truck_id
  const groupedActiveLogs = activeLogs.reduce((acc, log) => {
    const key = log.truck_id || `individual-${log.id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(log);
    return acc;
  }, {} as Record<string, TimeLog[]>);

  const paginatedTimedOutLogs = timedOutLogs.slice((timedOutPage - 1) * ITEMS_PER_PAGE, timedOutPage * ITEMS_PER_PAGE);

  const getGroupMembersForTruck = (truckId: string) => {
    return activeLogs.filter(log => log.truck_id === truckId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Personnel Time Tracking</CardTitle>
          <div className="flex gap-2">
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="px-3 py-2 border rounded"
            />
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="px-3 py-2 border rounded"
            />
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Select Vehicle</h3>
            <select
              value={selectedTruck}
              onChange={(e) => setSelectedTruck(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">-- Select a vehicle --</option>
              {availableTrucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.code} {truck.plate_number ? `- ${truck.plate_number}` : ''} ({truck.type})
                </option>
              ))}
            </select>
            {activeTruckIds.size > 0 && availableTrucks.length < trucks.length && (
              <p className="text-xs text-muted-foreground">
                {trucks.length - availableTrucks.length} vehicle(s) currently in use and unavailable
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Select Drivers</h3>
              <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedDrivers.has(driver.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedDrivers);
                        if (checked) {
                          newSet.add(driver.id);
                        } else {
                          newSet.delete(driver.id);
                        }
                        setSelectedDrivers(newSet);
                      }}
                    />
                    <label className="text-sm">{driver.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Select Helpers</h3>
              <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                {helpers.map((helper) => (
                  <div key={helper.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedHelpers.has(helper.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedHelpers);
                        if (checked) {
                          newSet.add(helper.id);
                        } else {
                          newSet.delete(helper.id);
                        }
                        setSelectedHelpers(newSet);
                      }}
                    />
                    <label className="text-sm">{helper.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Select Recyclers</h3>
              <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                {recyclers.map((recycler) => (
                  <div key={recycler.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedRecyclers.has(recycler.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedRecyclers);
                        if (checked) {
                          newSet.add(recycler.id);
                        } else {
                          newSet.delete(recycler.id);
                        }
                        setSelectedRecyclers(newSet);
                      }}
                    />
                    <label className="text-sm">{recycler.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={startCamera} variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              Capture Group Photo
            </Button>
            {capturedPhoto && (
              <Button 
                onClick={handleTimeIn} 
                disabled={!selectedTruck || (selectedDrivers.size === 0 && selectedHelpers.size === 0 && selectedRecyclers.size === 0)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Time In ({selectedDrivers.size + selectedHelpers.size + selectedRecyclers.size} selected)
              </Button>
            )}
          </div>

          {capturedPhoto && (
            <div className="border rounded p-2">
              <img src={capturedPhoto} alt="Group photo" className="max-h-48 mx-auto" />
            </div>
          )}
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({activeLogs.length})</TabsTrigger>
            <TabsTrigger value="timed-out">Timed Out ({timedOutLogs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedActiveLogs).map(([key, logs]) => {
                  const isTeam = !key.startsWith('individual-');
                  const truckInfo = logs[0]?.trucks;
                  
                  return (
                    <Card key={key} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            {isTeam && truckInfo ? (
                              <div>
                                <CardTitle className="text-lg">Team: {truckInfo.code}</CardTitle>
                                {truckInfo.plate_number && (
                                  <p className="text-sm text-muted-foreground">{truckInfo.plate_number}</p>
                                )}
                              </div>
                            ) : (
                              <CardTitle className="text-lg">Individual</CardTitle>
                            )}
                          </div>
                          {isTeam && (
                            <Button 
                              onClick={() => handleGroupTimeOutClick(logs[0].truck_id!)} 
                              size="sm"
                            >
                              Group Time Out ({logs.length})
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Time In</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {logs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell>{log.personnel_name}</TableCell>
                                <TableCell className="capitalize">{log.personnel_type}</TableCell>
                                <TableCell>{format(new Date(log.time_in), "MMM dd, yyyy HH:mm")}</TableCell>
                                <TableCell>{calculateTotalTime(log.time_in, log.time_out)}</TableCell>
                                <TableCell>
                                  <Button onClick={() => handleTimeOut(log.id)} size="sm" variant="outline">
                                    Individual Time Out
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
                {Object.keys(groupedActiveLogs).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active time logs
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timed-out">
            <div className="space-y-4">
              {selectedTimedOutLogs.size > 0 && (
                <div className="flex items-center justify-between bg-muted p-3 rounded">
                  <span className="text-sm font-medium">
                    {selectedTimedOutLogs.size} log(s) selected
                  </span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleMassDelete}
                  >
                    Delete Selected
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTimedOutLogs.size === paginatedTimedOutLogs.length && paginatedTimedOutLogs.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTimedOutLogs(new Set(paginatedTimedOutLogs.map(log => log.id)));
                          } else {
                            setSelectedTimedOutLogs(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTimedOutLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTimedOutLogs.has(log.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedTimedOutLogs);
                            if (checked) {
                              newSet.add(log.id);
                            } else {
                              newSet.delete(log.id);
                            }
                            setSelectedTimedOutLogs(newSet);
                          }}
                        />
                      </TableCell>
                      <TableCell>{log.personnel_name}</TableCell>
                      <TableCell className="capitalize">{log.personnel_type}</TableCell>
                      <TableCell>
                        {log.trucks ? (
                          <div className="text-sm">
                            <div className="font-medium">{log.trucks.code}</div>
                            {log.trucks.plate_number && (
                              <div className="text-xs text-muted-foreground">{log.trucks.plate_number}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(log.time_in), "MMM dd, yyyy HH:mm")}</TableCell>
                      <TableCell>
                        {log.time_out ? format(new Date(log.time_out), "MMM dd, yyyy HH:mm") : "N/A"}
                      </TableCell>
                      <TableCell>{calculateTotalTime(log.time_in, log.time_out)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {timedOutLogs.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimedOutPage(p => Math.max(1, p - 1))}
                    disabled={timedOutPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {timedOutPage} of {Math.ceil(timedOutLogs.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimedOutPage(p => Math.min(Math.ceil(timedOutLogs.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={timedOutPage >= Math.ceil(timedOutLogs.length / ITEMS_PER_PAGE)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Capture Group Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <Button onClick={capturePhoto}>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (cameraStream) {
                      cameraStream.getTracks().forEach(track => track.stop());
                      setCameraStream(null);
                    }
                    setShowCamera(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showGroupTimeOutDialog} onOpenChange={setShowGroupTimeOutDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Group Time Out</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedGroupTruck && (
                <div className="bg-muted p-3 rounded">
                  <div className="text-sm font-medium">
                    Vehicle: {getGroupMembersForTruck(selectedGroupTruck)[0]?.trucks?.code}
                  </div>
                  {getGroupMembersForTruck(selectedGroupTruck)[0]?.trucks?.plate_number && (
                    <div className="text-xs text-muted-foreground">
                      {getGroupMembersForTruck(selectedGroupTruck)[0]?.trucks?.plate_number}
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Select which personnel to time out. You can deselect individuals if they need to continue working.
              </p>
              <div className="border rounded p-3 space-y-2 max-h-64 overflow-y-auto">
                {selectedGroupTruck && getGroupMembersForTruck(selectedGroupTruck).map((log) => (
                  <div key={log.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={groupMembersToTimeOut.has(log.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(groupMembersToTimeOut);
                        if (checked) {
                          newSet.add(log.id);
                        } else {
                          newSet.delete(log.id);
                        }
                        setGroupMembersToTimeOut(newSet);
                      }}
                    />
                    <label className="text-sm flex-1">
                      {log.personnel_name} ({log.personnel_type})
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {calculateTotalTime(log.time_in, null)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowGroupTimeOutDialog(false);
                    setSelectedGroupTruck(null);
                    setGroupMembersToTimeOut(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGroupTimeOut}
                  disabled={groupMembersToTimeOut.size === 0}
                >
                  Time Out ({groupMembersToTimeOut.size} selected)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
