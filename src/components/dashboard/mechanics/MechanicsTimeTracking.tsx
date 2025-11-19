import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Camera, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MechanicsTimeTracking() {
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMechanics();
    fetchTimeLogs();
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*").order("name");
    setMechanics(data || []);
  };

  const fetchTimeLogs = async () => {
    const { data } = await supabase
      .from("mechanic_time_logs")
      .select("*, mechanics(name)")
      .order("time_in", { ascending: false })
      .limit(50);
    setTimeLogs(data || []);
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }),
          (error) => reject(error)
        );
      } else {
        reject(new Error("Geolocation not supported"));
      }
    });
  };

  const startCamera = async () => {
    if (!selectedMechanic) {
      toast({ title: "Error", description: "Please select a mechanic", variant: "destructive" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error: any) {
      toast({ title: "Camera Error", description: error.message, variant: "destructive" });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(photoData);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleTimeIn = async () => {
    if (!capturedPhoto) {
      toast({ title: "Error", description: "Please capture a photo", variant: "destructive" });
      return;
    }

    try {
      const location = await getCurrentLocation();

      const { error } = await supabase.from("mechanic_time_logs").insert({
        mechanic_id: selectedMechanic,
        photo_url: capturedPhoto,
        latitude: location.latitude,
        longitude: location.longitude
      });

      if (error) throw error;

      toast({ title: "Success", description: "Time in recorded" });
      fetchTimeLogs();
      setSelectedMechanic("");
      setCapturedPhoto(null);
      setShowCamera(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCancel = () => {
    stopCamera();
    setCapturedPhoto(null);
    setShowCamera(false);
  };

  const handleTimeOut = async (logId: string) => {
    try {
      const { error } = await supabase
        .from("mechanic_time_logs")
        .update({ time_out: new Date().toISOString() })
        .eq("id", logId);

      if (error) throw error;

      toast({ title: "Success", description: "Time out recorded" });
      fetchTimeLogs();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Mechanic</label>
            <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a mechanic" />
              </SelectTrigger>
              <SelectContent>
                {mechanics.map((mechanic) => (
                  <SelectItem key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startCamera}>
            <Camera className="h-4 w-4 mr-2" /> Time In
          </Button>
        </div>

        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Capture Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!capturedPhoto ? (
                <>
                  <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                    <Button onClick={capturePhoto}>
                      <Camera className="h-4 w-4 mr-2" /> Capture
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <img src={capturedPhoto} alt="Captured" className="w-full rounded-lg" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => {
                      setCapturedPhoto(null);
                      startCamera();
                    }}>Retake</Button>
                    <Button onClick={handleTimeIn}>Confirm Time In</Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mechanic</TableHead>
              <TableHead>Time In</TableHead>
              <TableHead>Time Out</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.mechanics?.name}</TableCell>
                <TableCell>{new Date(log.time_in).toLocaleString()}</TableCell>
                <TableCell>
                  {log.time_out ? new Date(log.time_out).toLocaleString() : "—"}
                </TableCell>
                <TableCell>
                  {log.latitude && log.longitude ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}` : "N/A"}
                </TableCell>
                <TableCell>
                  {!log.time_out && (
                    <Button size="sm" variant="outline" onClick={() => handleTimeOut(log.id)}>
                      <Clock className="h-4 w-4 mr-2" /> Time Out
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
