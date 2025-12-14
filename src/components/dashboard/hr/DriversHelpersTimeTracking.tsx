import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Camera, Clock, Download, Loader2, WifiOff, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import type { PendingTimeIn, PendingTimeOut, TimeInPersonnel, CachedTimeLog } from "@/lib/offline/hrTypes";
import type { CachedTruck } from "@/lib/offline/commonTypes";

const ITEMS_PER_PAGE = 5;
const MAX_ITEMS = 100;

interface Personnel {
  id: string;
  name: string;
  type: 'driver' | 'helper' | 'recycler';
}

interface CachedPersonnel {
  id: string;
  name: string;
  id_number?: string | null;
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
  isPending?: boolean;  // Flag for pending offline items
}

interface DriversHelpersTimeTrackingProps {
  isOnline?: boolean;
  cachedTrucks?: CachedTruck[];
  cachedDrivers?: CachedPersonnel[];
  cachedHelpers?: CachedPersonnel[];
  cachedRecyclers?: CachedPersonnel[];
  cachedTimeLogs?: CachedTimeLog[];
  pendingTimeIns?: PendingTimeIn[];
  createPendingTimeIn?: (data: Omit<PendingTimeIn, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  createPendingTimeOut?: (data: Omit<PendingTimeOut, 'id' | 'created_at' | 'status' | 'user_id'>) => Promise<string>;
  onOfflineSuccess?: () => void;
}

export default function DriversHelpersTimeTracking({
  isOnline = true,
  cachedTrucks = [],
  cachedDrivers = [],
  cachedHelpers = [],
  cachedRecyclers = [],
  cachedTimeLogs = [],
  pendingTimeIns = [],
  createPendingTimeIn,
  createPendingTimeOut,
  onOfflineSuccess,
}: DriversHelpersTimeTrackingProps) {
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
  const [showGroupTimeOutCamera, setShowGroupTimeOutCamera] = useState(false);
  const [groupTimeOutPhoto, setGroupTimeOutPhoto] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'getting-location' | 'saving'>('idle');
  // Individual time out dialog state
  const [showIndividualTimeOutDialog, setShowIndividualTimeOutDialog] = useState(false);
  const [selectedLogForTimeOut, setSelectedLogForTimeOut] = useState<TimeLog | null>(null);
  const [individualIdInput, setIndividualIdInput] = useState("");
  const [individualTimeOutLoading, setIndividualTimeOutLoading] = useState(false);
  // Group time out ID verification
  const [groupIdInputs, setGroupIdInputs] = useState<Record<string, string>>({});
  const [groupTimeOutLoading, setGroupTimeOutLoading] = useState(false);
  // Personnel ID lookup cache
  const [personnelIdNumbers, setPersonnelIdNumbers] = useState<Record<string, string>>({});
  // Mobile modal states
  const [selectedActiveLog, setSelectedActiveLog] = useState<TimeLog | null>(null);
  const [selectedTimedOutLog, setSelectedTimedOutLog] = useState<TimeLog | null>(null);
  const [showActiveDetailsModal, setShowActiveDetailsModal] = useState(false);
  const [showTimedOutDetailsModal, setShowTimedOutDetailsModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupVideoRef = useRef<HTMLVideoElement>(null);
  const groupCanvasRef = useRef<HTMLCanvasElement>(null);


// Fetch data based on online status
useEffect(() => {
  if (isOnline) {
    fetchPersonnel();
    fetchTrucks();
    fetchTimeLogs();
  } else {
    loadCachedData();
  }
}, [isOnline]);

  // Load cached data when offline
  const loadCachedData = () => {
    // Load personnel from cache
    const idMap: Record<string, string> = {};
    
    setDrivers(cachedDrivers.map(d => ({ id: d.id, name: d.name, type: 'driver' as const })));
    cachedDrivers.forEach(d => { if (d.id_number) idMap[d.id] = d.id_number; });
    
    setHelpers(cachedHelpers.map(h => ({ id: h.id, name: h.name, type: 'helper' as const })));
    cachedHelpers.forEach(h => { if (h.id_number) idMap[h.id] = h.id_number; });
    
    setRecyclers(cachedRecyclers.map(r => ({ id: r.id, name: r.name, type: 'recycler' as const })));
    cachedRecyclers.forEach(r => { if (r.id_number) idMap[r.id] = r.id_number; });
    
    setPersonnelIdNumbers(idMap);
    
    // Load trucks from cache
    setTrucks(cachedTrucks.map(t => ({ 
      id: t.id, 
      code: t.code, 
      plate_number: t.plate_number || null, 
      type: t.type || 'truck' 
    })));
    
    // Load time logs from cache (pending time-ins are shown in Pending tab, not here)
    const cachedLogs: TimeLog[] = cachedTimeLogs.map(log => ({
      ...log,
      trucks: log.truck_code ? { code: log.truck_code, plate_number: null } : null,
    }));
    
    setTimeLogs(cachedLogs);
    setLoading(false);
  };

  const fetchPersonnel = async () => {
    try {
      const [driversData, helpersData, recyclersData] = await Promise.all([
        supabase.from("drivers").select("id,name,id_number").eq("status", "available").limit(MAX_ITEMS),
        supabase.from("helpers").select("id,name,id_number").eq("status", "available").limit(MAX_ITEMS),
        supabase.from("recyclers").select("id,name,id_number").eq("status", "available").limit(MAX_ITEMS)
      ]);

      // Build ID number lookup map
      const idMap: Record<string, string> = {};
      
      if (driversData.data) {
        setDrivers(driversData.data.map(d => ({ ...d, type: 'driver' as const })));
        driversData.data.forEach(d => { if (d.id_number) idMap[d.id] = d.id_number; });
      }
      if (helpersData.data) {
        setHelpers(helpersData.data.map(h => ({ ...h, type: 'helper' as const })));
        helpersData.data.forEach(h => { if (h.id_number) idMap[h.id] = h.id_number; });
      }
      if (recyclersData.data) {
        setRecyclers(recyclersData.data.map(r => ({ ...r, type: 'recycler' as const })));
        recyclersData.data.forEach(r => { if (r.id_number) idMap[r.id] = r.id_number; });
      }
      
      setPersonnelIdNumbers(idMap);
    } catch (error) {
      console.error("Error fetching personnel:", error);
      toast.error("Failed to load personnel");
    }
  };

  const fetchTrucks = async () => {
    try {
      console.log("Fetching trucks...");
      const { data, error } = await supabase
        .from("trucks")
        .select("id,code,plate_number,type")
        .eq("status", "available")
        .limit(MAX_ITEMS);

      console.log("Trucks query result:", { data, error });
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

  // Get cached location from localStorage
  const getCachedLocation = (): { latitude: number; longitude: number } | null => {
    try {
      const cached = localStorage.getItem('cachedGPSLocation');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          return { latitude: parsed.latitude, longitude: parsed.longitude };
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  };

  // Save location to cache
  const saveCachedLocation = (latitude: number, longitude: number) => {
    try {
      localStorage.setItem('cachedGPSLocation', JSON.stringify({
        latitude,
        longitude,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Get location: try fresh GPS first, then cached, then fallback to 0,0
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; success: boolean }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const cached = getCachedLocation();
        if (cached) {
          resolve({ ...cached, success: true });
        } else {
          resolve({ latitude: 0, longitude: 0, success: false });
        }
        return;
      }

      let resolved = false;
      
      // Timeout: if GPS doesn't respond in 3 seconds, try cached
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          const cached = getCachedLocation();
          if (cached) {
            resolve({ ...cached, success: true });
          } else {
            resolve({ latitude: 0, longitude: 0, success: false });
          }
        }
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            // Cache successful location
            saveCachedLocation(lat, lng);
            resolve({
              latitude: lat,
              longitude: lng,
              success: true,
            });
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            // Try cached location on failure
            const cached = getCachedLocation();
            if (cached) {
              resolve({ ...cached, success: true });
            } else {
              resolve({ latitude: 0, longitude: 0, success: false });
            }
          }
        },
        { enableHighAccuracy: false, maximumAge: 60000 }
      );
    });
  };

const startCamera = async () => {
  try {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: 1280, height: 720 }
    }).catch(() => 
      navigator.mediaDevices.getUserMedia({ video: true })
    );

    setCameraStream(stream);
    setShowCamera(true);
    
    // Wait for Dialog to mount, then assign stream to video
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }, 200);
    
  } catch (error: any) {
    console.error("❌ Camera error:", error);
    toast.error(error.name === "NotAllowedError" 
      ? "Camera permission denied" 
      : "Failed to access camera");
  }
};


  const capturePhoto = () => {
  if (!videoRef.current || !canvasRef.current) {
    console.error("❌ Video or canvas ref is null");
    return;
  }

  const canvas = canvasRef.current;
  const video = videoRef.current;
  
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    toast.error("Camera not ready. Please wait a moment.");
    return;
  }
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0);
    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    
    if (photoData === 'data:,' || photoData.length < 100) {
      toast.error("Failed to capture photo. Please try again.");
      return;
    }
    
    setCapturedPhoto(photoData);
    setShowCamera(false);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }
};

  const handleTimeIn = async () => {
    if (submitStatus !== 'idle') return; // Prevent double-tap
    
    if (!selectedTruck) {
      toast.error("Please select a vehicle");
      return;
    }

    if (selectedDrivers.size === 0 && selectedHelpers.size === 0 && selectedRecyclers.size === 0) {
      toast.error("Please select at least one driver, helper, or recycler");
      return;
    }

    try {
      // Step 1: Get location
      setSubmitStatus('getting-location');
      const location = await getCurrentLocation();
      const groupSessionId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Build personnel list
      const personnelList: TimeInPersonnel[] = [];
      
      for (const driverId of selectedDrivers) {
        const driver = drivers.find(d => d.id === driverId);
        if (driver) {
          personnelList.push({ id: driverId, name: driver.name, type: 'driver' });
        }
      }
      for (const helperId of selectedHelpers) {
        const helper = helpers.find(h => h.id === helperId);
        if (helper) {
          personnelList.push({ id: helperId, name: helper.name, type: 'helper' });
        }
      }
      for (const recyclerId of selectedRecyclers) {
        const recycler = recyclers.find(r => r.id === recyclerId);
        if (recycler) {
          personnelList.push({ id: recyclerId, name: recycler.name, type: 'recycler' });
        }
      }

      const selectedTruckObj = trucks.find(t => t.id === selectedTruck);
      const truckCode = selectedTruckObj?.code || selectedTruck;

      // Handle offline mode
      if (!isOnline) {
        if (!createPendingTimeIn) {
          toast.error("Offline mode not available");
          return;
        }

        setSubmitStatus('saving');
        
        await createPendingTimeIn({
          truck_id: selectedTruck,
          truck_code: truckCode,
          personnel: personnelList,
          photo_base64: capturedPhoto,
          latitude: location.latitude,
          longitude: location.longitude,
          group_session_id: groupSessionId,
        });

        const locationMsg = location.success ? "" : " (Location not recorded)";
        toast.success(`Time in saved offline for ${personnelList.length} personnel${locationMsg}. Will sync when online.`);
        
        // Reset form
        setSelectedTruck("");
        setSelectedDrivers(new Set());
        setSelectedHelpers(new Set());
        setSelectedRecyclers(new Set());
        setCapturedPhoto(null);
        
        if (onOfflineSuccess) onOfflineSuccess();
        loadCachedData(); // Refresh to show pending items
        
        setSubmitStatus('idle');
        return;
      }

      // Online mode - save to database
      setSubmitStatus('saving');
      
      // Get user's team_id for RLS policy
      const { data: { user } } = await supabase.auth.getUser();
      let teamId: string | null = null;
      if (user) {
        const { data: tid } = await supabase.rpc('get_user_team_id', { _user_id: user.id });
        teamId = tid;
      }

      let publicUrl: string | null = null;

      if (capturedPhoto) {
        const photoBlob = await fetch(capturedPhoto).then(r => r.blob());
        const photoFileName = `time-logs/${groupSessionId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("time-logs")
          .upload(photoFileName, photoBlob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("time-logs")
          .getPublicUrl(photoFileName);
        publicUrl = data.publicUrl;
      }

      // Create time logs for all selected personnel
      const logs = personnelList.map(p => ({
        personnel_id: p.id,
        personnel_type: p.type,
        personnel_name: p.name,
        time_in: timestamp,
        photo_url: publicUrl,
        latitude: location.latitude,
        longitude: location.longitude,
        group_session_id: groupSessionId,
        truck_id: selectedTruck,
        team_id: teamId
      }));

      const { error } = await supabase
        .from("personnel_time_logs")
        .insert(logs);

      if (error) {
        console.error("❌ Insert error:", error);
        throw error;
      }

      const locationMsg = location.success ? "" : " (Location not recorded)";
      toast.success(`Time in recorded for ${logs.length} personnel${locationMsg}`);
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
    } catch (error: any) {
      console.error("Error recording time in:", error);
      toast.error(error?.message || "Failed to record time in");
    } finally {
      setSubmitStatus('idle');
    }
  };

  // Open individual time out dialog
  const handleTimeOutClick = (log: TimeLog) => {
    setSelectedLogForTimeOut(log);
    setIndividualIdInput("");
    setShowIndividualTimeOutDialog(true);
  };

  // Verify ID and perform individual time out
  const handleIndividualTimeOut = async () => {
    if (!selectedLogForTimeOut) return;
    
    const expectedId = personnelIdNumbers[selectedLogForTimeOut.personnel_id];
    if (!expectedId) {
      toast.error("Could not verify ID - personnel record not found");
      return;
    }
    
    if (individualIdInput.trim() !== expectedId) {
      toast.error("ID number does not match. Please enter the correct ID.");
      return;
    }
    
    // Check if this is a pending (offline) time-in - can't time out pending items
    if (selectedLogForTimeOut.isPending || selectedLogForTimeOut.id.startsWith('pending-')) {
      toast.error("Cannot time out a pending time-in. Please wait for it to sync first.");
      return;
    }
    
    setIndividualTimeOutLoading(true);
    try {
      // Handle offline mode
      if (!isOnline) {
        if (!createPendingTimeOut) {
          toast.error("Offline mode not available");
          return;
        }
        
        await createPendingTimeOut({
          time_log_ids: [selectedLogForTimeOut.id],
          personnel_names: [selectedLogForTimeOut.personnel_name],
          truck_code: selectedLogForTimeOut.trucks?.code || null,
          time_out: new Date(),
        });
        
        toast.success("Time out saved offline. Will sync when online.");
        setShowIndividualTimeOutDialog(false);
        setSelectedLogForTimeOut(null);
        setIndividualIdInput("");
        if (onOfflineSuccess) onOfflineSuccess();
        loadCachedData();
        return;
      }
      
      // Online mode
      const { error } = await supabase
        .from("personnel_time_logs")
        .update({ time_out: new Date().toISOString() })
        .eq("id", selectedLogForTimeOut.id);

      if (error) throw error;
      toast.success("Time out recorded");
      setShowIndividualTimeOutDialog(false);
      setSelectedLogForTimeOut(null);
      setIndividualIdInput("");
      fetchTimeLogs();
    } catch (error) {
      console.error("Error recording time out:", error);
      toast.error("Failed to record time out");
    } finally {
      setIndividualTimeOutLoading(false);
    }
  };

  const handleGroupTimeOutClick = (truckId: string) => {
    const groupMembers = activeLogs.filter(log => log.truck_id === truckId);
    setSelectedGroupTruck(truckId);
    setGroupMembersToTimeOut(new Set(groupMembers.map(log => log.id)));
    // Initialize empty ID inputs
    const initialInputs: Record<string, string> = {};
    groupMembers.forEach(log => { initialInputs[log.id] = ""; });
    setGroupIdInputs(initialInputs);
    setShowGroupTimeOutDialog(true);
  };

  const startGroupTimeOutCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "user", width: 1280, height: 720 }
    });
    
    setShowGroupTimeOutCamera(true);
    
    setTimeout(() => {
      if (groupVideoRef.current) {
        groupVideoRef.current.srcObject = stream;
        groupVideoRef.current.play().catch(() => {});
      }
    }, 200);
    
  } catch (error: any) {
    console.error("❌ Group camera error:", error);
    toast.error(error.name === "NotAllowedError"
      ? "Camera permission denied"
      : "Failed to access camera");
  }
};

  const captureGroupTimeOutPhoto = () => {
  if (!groupVideoRef.current || !groupCanvasRef.current) {
    console.error("❌ Group video or canvas ref is null");
    return;
  }

  const canvas = groupCanvasRef.current;
  const video = groupVideoRef.current;
  
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    toast.error("Camera not ready. Please wait a moment.");
    return;
  }
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0);
    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    
    if (photoData === 'data:,' || photoData.length < 100) {
      toast.error("Failed to capture photo. Please try again.");
      return;
    }
    
    setGroupTimeOutPhoto(photoData);
    setShowGroupTimeOutCamera(false);
    
    // Stop camera stream
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
};

  const handleGroupTimeOut = async () => {
    if (groupMembersToTimeOut.size === 0) {
      toast.error("Please select at least one person to time out");
      return;
    }

    // Photo only required for group (2+ people)
    if (groupMembersToTimeOut.size > 1 && !groupTimeOutPhoto) {
      toast.error("Please capture a group photo for time out");
      return;
    }

    // Verify all IDs
    const membersToTimeOut = activeLogs.filter(log => groupMembersToTimeOut.has(log.id));
    
    // Check if any are pending (offline) time-ins
    const hasPendingItems = membersToTimeOut.some(m => m.isPending || m.id.startsWith('pending-'));
    if (hasPendingItems) {
      toast.error("Cannot time out pending time-ins. Please wait for them to sync first.");
      return;
    }
    
    for (const member of membersToTimeOut) {
      const expectedId = personnelIdNumbers[member.personnel_id];
      const enteredId = groupIdInputs[member.id]?.trim() || "";
      
      if (!expectedId) {
        toast.error(`Could not verify ID for ${member.personnel_name}`);
        return;
      }
      
      if (enteredId !== expectedId) {
        toast.error(`ID does not match for ${member.personnel_name}`);
        return;
      }
    }

    setGroupTimeOutLoading(true);
    try {
      // Handle offline mode
      if (!isOnline) {
        if (!createPendingTimeOut) {
          toast.error("Offline mode not available");
          return;
        }
        
        const truckCode = membersToTimeOut[0]?.trucks?.code || null;
        const personnelNames = membersToTimeOut.map(m => m.personnel_name);
        
        await createPendingTimeOut({
          time_log_ids: Array.from(groupMembersToTimeOut),
          personnel_names: personnelNames,
          truck_code: truckCode,
          time_out: new Date(),
        });
        
        toast.success(`Time out saved offline for ${membersToTimeOut.length} personnel. Will sync when online.`);
        setShowGroupTimeOutDialog(false);
        setSelectedGroupTruck(null);
        setGroupMembersToTimeOut(new Set());
        setGroupTimeOutPhoto(null);
        setGroupIdInputs({});
        if (onOfflineSuccess) onOfflineSuccess();
        loadCachedData();
        return;
      }
      
      // Online mode
      const timestamp = new Date().toISOString();

      // Upload photo to storage only if captured
      if (groupTimeOutPhoto) {
        const groupSessionId = crypto.randomUUID();
        const photoBlob = await fetch(groupTimeOutPhoto).then(r => r.blob());
        const photoFileName = `time-logs/timeout-${groupSessionId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("time-logs")
          .upload(photoFileName, photoBlob);

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase
        .from("personnel_time_logs")
        .update({ time_out: timestamp })
        .in("id", Array.from(groupMembersToTimeOut));

      if (error) throw error;
      
      toast.success(`Time out recorded for ${groupMembersToTimeOut.size} personnel`);
      setShowGroupTimeOutDialog(false);
      setSelectedGroupTruck(null);
      setGroupMembersToTimeOut(new Set());
      setGroupTimeOutPhoto(null);
      setGroupIdInputs({});
      fetchTimeLogs();
    } catch (error: any) {
      console.error("Error recording group time out:", error);
      toast.error(error?.message || "Failed to record time out");
    } finally {
      setGroupTimeOutLoading(false);
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
  
  // Get set of truck IDs that are currently in use (from active logs)
  const activeTruckIds = new Set(
    activeLogs
      .filter(log => log.truck_id !== null)
      .map(log => log.truck_id)
  );
  
  // Also include trucks from pending time-ins (in case timeLogs hasn't refreshed yet)
  pendingTimeIns.forEach(pending => {
    if (pending.truck_id) {
      activeTruckIds.add(pending.truck_id);
    }
  });
  
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

          <div className="flex gap-2 items-center">
            <Button onClick={startCamera} variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              {(selectedDrivers.size + selectedHelpers.size + selectedRecyclers.size) === 1 ? "Photo (Optional)" : "Capture Group Photo"}
            </Button>
            <Button 
              onClick={handleTimeIn} 
              disabled={
                !selectedTruck || 
                (selectedDrivers.size === 0 && selectedHelpers.size === 0 && selectedRecyclers.size === 0) || 
                submitStatus !== 'idle' ||
                ((selectedDrivers.size + selectedHelpers.size + selectedRecyclers.size) > 1 && !capturedPhoto)
              }
            >
              {submitStatus === 'getting-location' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : submitStatus === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Time In ({selectedDrivers.size + selectedHelpers.size + selectedRecyclers.size} selected)
                </>
              )}
            </Button>
          </div>
          {(selectedDrivers.size + selectedHelpers.size + selectedRecyclers.size) > 1 && !capturedPhoto && (
            <p className="text-xs text-amber-600">
              Group photo required for 2+ personnel
            </p>
          )}

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
                        <div className="block md:hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {logs.map((log) => (
                                <TableRow key={log.id} className={log.isPending ? "bg-yellow-50" : ""}>
                                  <TableCell>
                                    {log.personnel_name}
                                    {log.isPending && (
                                      <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-600 text-[10px]">
                                        Pending
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="capitalize">{log.personnel_type}</TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedActiveLog(log);
                                        setShowActiveDetailsModal(true);
                                      }}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="hidden md:block">
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
                                <TableRow key={log.id} className={log.isPending ? "bg-yellow-50" : ""}>
                                  <TableCell>
                                    {log.personnel_name}
                                    {log.isPending && (
                                      <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-600 text-[10px]">
                                        Pending Sync
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="capitalize">{log.personnel_type}</TableCell>
                                  <TableCell>{format(new Date(log.time_in), "MMM dd, yyyy HH:mm")}</TableCell>
                                  <TableCell>{calculateTotalTime(log.time_in, log.time_out)}</TableCell>
                                  <TableCell>
                                    {log.isPending ? (
                                      <span className="text-xs text-muted-foreground">Sync first</span>
                                    ) : (
                                      <Button onClick={() => handleTimeOutClick(log)} size="sm" variant="outline">
                                        Individual Time Out
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
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
              <div className="block md:hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTimedOutLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.personnel_name}</TableCell>
                        <TableCell className="capitalize">{log.personnel_type}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedTimedOutLog(log);
                              setShowTimedOutDetailsModal(true);
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="hidden md:block">
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
              </div>
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

        <Dialog open={showCamera} onOpenChange={(open) => {
  if (!open && cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  }
  setShowCamera(open);
}}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Capture Group Photo</DialogTitle>
      <DialogDescription>
        Position everyone in frame and capture a group photo for time-in
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div className="relative bg-black rounded overflow-hidden" style={{ minHeight: '400px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-2">
        <Button onClick={capturePhoto} disabled={!cameraStream}>
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
          <DialogContent className="w-[95vw] max-w-lg mx-auto">
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
                Each person must enter their ID number to verify identity before timing out.
              </p>
              <div className="border rounded p-3 space-y-3 max-h-72 overflow-y-auto">
                {selectedGroupTruck && getGroupMembersForTruck(selectedGroupTruck).map((log) => (
                  <div key={log.id} className="p-2 bg-muted/50 rounded space-y-2">
                    <div className="flex items-center space-x-2">
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
                      <label className="text-sm flex-1 font-medium">
                        {log.personnel_name} ({log.personnel_type})
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {calculateTotalTime(log.time_in, null)}
                      </span>
                    </div>
                    {groupMembersToTimeOut.has(log.id) && (
                      <input
                        type="text"
                        placeholder="Enter ID number"
                        value={groupIdInputs[log.id] || ""}
                        onChange={(e) => setGroupIdInputs(prev => ({ ...prev, [log.id]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    )}
                  </div>
                ))}
              </div>
              {groupTimeOutPhoto && (
                <div className="border rounded p-2">
                  <img src={groupTimeOutPhoto} alt="Group timeout photo" className="max-h-32 mx-auto" />
                </div>
              )}
              {groupMembersToTimeOut.size > 1 && !groupTimeOutPhoto && (
                <p className="text-xs text-amber-600 text-center">
                  Group photo required for 2+ personnel
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setShowGroupTimeOutDialog(false);
                    setSelectedGroupTruck(null);
                    setGroupMembersToTimeOut(new Set());
                    setGroupTimeOutPhoto(null);
                    setGroupIdInputs({});
                  }}
                >
                  Cancel
                </Button>
                {!groupTimeOutPhoto && (
                  <Button onClick={startGroupTimeOutCamera} variant="outline" className="w-full sm:w-auto">
                    <Camera className="h-4 w-4 mr-2" />
                    {groupMembersToTimeOut.size === 1 ? "Photo (Optional)" : "Capture Photo"}
                  </Button>
                )}
                <Button 
                  className="w-full sm:w-auto"
                  onClick={handleGroupTimeOut}
                  disabled={
                    groupMembersToTimeOut.size === 0 || 
                    groupTimeOutLoading ||
                    (groupMembersToTimeOut.size > 1 && !groupTimeOutPhoto)
                  }
                >
                  {groupTimeOutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    `Time Out (${groupMembersToTimeOut.size})`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showGroupTimeOutCamera} onOpenChange={(open) => {
  if (!open && groupVideoRef.current?.srcObject) {
    const stream = groupVideoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
  }
  setShowGroupTimeOutCamera(open);
}}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Capture Group Time Out Photo</DialogTitle>
      <DialogDescription>
        Take a group photo to record the time-out
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div className="relative bg-black rounded overflow-hidden" style={{ minHeight: '400px' }}>
        <video 
          ref={groupVideoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
      <canvas ref={groupCanvasRef} className="hidden" />
      <div className="flex gap-2">
        <Button onClick={captureGroupTimeOutPhoto}>
          <Camera className="h-4 w-4 mr-2" />
          Capture Photo
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const video = groupVideoRef.current;
            if (video?.srcObject) {
              const stream = video.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
            }
            setShowGroupTimeOutCamera(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

        {/* Individual Time Out Dialog */}
        <Dialog open={showIndividualTimeOutDialog} onOpenChange={(open) => {
          if (!open) {
            setShowIndividualTimeOutDialog(false);
            setSelectedLogForTimeOut(null);
            setIndividualIdInput("");
          }
        }}>
          <DialogContent className="w-[95vw] max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle>Time Out Verification</DialogTitle>
              <DialogDescription>
                Enter your ID number to confirm time out
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedLogForTimeOut && (
                <div className="bg-muted p-3 rounded">
                  <div className="text-sm font-medium">{selectedLogForTimeOut.personnel_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{selectedLogForTimeOut.personnel_type}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Time in: {format(new Date(selectedLogForTimeOut.time_in), "MMM dd, yyyy HH:mm")}
                  </div>
                  <div className="text-xs font-medium mt-1">
                    Duration: {calculateTotalTime(selectedLogForTimeOut.time_in, null)}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">ID Number</label>
                <input
                  type="text"
                  placeholder="Enter your ID number"
                  value={individualIdInput}
                  onChange={(e) => setIndividualIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleIndividualTimeOut();
                  }}
                  className="w-full px-3 py-3 text-base border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:flex-1"
                  onClick={() => {
                    setShowIndividualTimeOutDialog(false);
                    setSelectedLogForTimeOut(null);
                    setIndividualIdInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="w-full sm:flex-1"
                  onClick={handleIndividualTimeOut}
                  disabled={!individualIdInput.trim() || individualTimeOutLoading}
                >
                  {individualTimeOutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Confirm Time Out"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Active Log Details Modal */}
        <Dialog open={showActiveDetailsModal} onOpenChange={setShowActiveDetailsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Active Log Details</DialogTitle>
            </DialogHeader>
            {selectedActiveLog && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{selectedActiveLog.personnel_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground capitalize">{selectedActiveLog.personnel_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Time In</label>
                  <p className="text-sm text-muted-foreground">{format(new Date(selectedActiveLog.time_in), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <p className="text-sm text-muted-foreground">{calculateTotalTime(selectedActiveLog.time_in, selectedActiveLog.time_out)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Vehicle</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedActiveLog.trucks ? `${selectedActiveLog.trucks.code} ${selectedActiveLog.trucks.plate_number || ''}` : 'N/A'}
                  </p>
                </div>
                {!selectedActiveLog.isPending && (
                  <Button 
                    onClick={() => {
                      handleTimeOutClick(selectedActiveLog);
                      setShowActiveDetailsModal(false);
                    }} 
                    className="w-full"
                  >
                    Individual Time Out
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Timed Out Log Details Modal */}
        <Dialog open={showTimedOutDetailsModal} onOpenChange={setShowTimedOutDetailsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Time Log Details</DialogTitle>
            </DialogHeader>
            {selectedTimedOutLog && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{selectedTimedOutLog.personnel_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground capitalize">{selectedTimedOutLog.personnel_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Vehicle</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTimedOutLog.trucks ? (
                      `${selectedTimedOutLog.trucks.code} ${selectedTimedOutLog.trucks.plate_number || ''}`
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Time In</label>
                  <p className="text-sm text-muted-foreground">{format(new Date(selectedTimedOutLog.time_in), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Time Out</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTimedOutLog.time_out ? format(new Date(selectedTimedOutLog.time_out), "MMM dd, yyyy HH:mm") : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Time</label>
                  <p className="text-sm text-muted-foreground">{calculateTotalTime(selectedTimedOutLog.time_in, selectedTimedOutLog.time_out)}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const newSet = new Set(selectedTimedOutLogs);
                      if (selectedTimedOutLogs.has(selectedTimedOutLog.id)) {
                        newSet.delete(selectedTimedOutLog.id);
                      } else {
                        newSet.add(selectedTimedOutLog.id);
                      }
                      setSelectedTimedOutLogs(newSet);
                    }}
                    className="flex-1"
                  >
                    {selectedTimedOutLogs.has(selectedTimedOutLog.id) ? 'Unselect' : 'Select for Delete'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
