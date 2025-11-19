import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Camera, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera as CapacitorCamera, CameraResultType } from "@capacitor/camera";

export function MechanicsTimeTracking() {
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMechanics();
    fetchTimeLogs();
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

  const handleTimeIn = async () => {
    if (!selectedMechanic) {
      toast({ title: "Error", description: "Please select a mechanic", variant: "destructive" });
      return;
    }

    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });

      const location = await getCurrentLocation();

      const { error } = await supabase.from("mechanic_time_logs").insert({
        mechanic_id: selectedMechanic,
        photo_url: photo.dataUrl,
        latitude: location.latitude,
        longitude: location.longitude
      });

      if (error) throw error;

      toast({ title: "Success", description: "Time in recorded" });
      fetchTimeLogs();
      setSelectedMechanic("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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
          <Button onClick={handleTimeIn}>
            <Camera className="h-4 w-4 mr-2" /> Time In
          </Button>
        </div>

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
