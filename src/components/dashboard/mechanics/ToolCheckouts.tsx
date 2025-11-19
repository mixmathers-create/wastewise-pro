import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, LogIn, Camera } from "lucide-react";

export function ToolCheckouts() {
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [selectedJobOrder, setSelectedJobOrder] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCheckouts();
    fetchMechanics();
    fetchAvailableTools();
    fetchOpenJobOrders();
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchCheckouts = async () => {
    const { data } = await supabase
      .from("tool_checkouts")
      .select(`
        *, 
        tools(name, code), 
        mechanics(name),
        job_orders(job_number)
      `)
      .order("checked_out_at", { ascending: false });
    setCheckouts(data || []);
  };

  const fetchMechanics = async () => {
    const { data } = await supabase.from("mechanics").select("*").order("name");
    setMechanics(data || []);
  };

  const fetchAvailableTools = async () => {
    const { data } = await supabase
      .from("tools")
      .select("*")
      .eq("status", "available")
      .order("name");
    setTools(data || []);
  };

  const fetchOpenJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleCheckout = async () => {
    if (!selectedMechanic || !selectedTool || !selectedJobOrder) {
      toast({ title: "Error", description: "Please select mechanic, tool, and job order", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error: checkoutError } = await supabase.from("tool_checkouts").insert({
        mechanic_id: selectedMechanic,
        tool_id: selectedTool,
        job_order_id: selectedJobOrder,
        checked_out_by_user_id: userData.user.id,
        status: "checked_out"
      });

      if (checkoutError) throw checkoutError;

      const { error: toolError } = await supabase
        .from("tools")
        .update({ status: "checked_out" })
        .eq("id", selectedTool);

      if (toolError) throw toolError;

      toast({ title: "Success", description: "Tool checked out successfully" });
      fetchCheckouts();
      fetchAvailableTools();
      setSelectedMechanic("");
      setSelectedTool("");
      setSelectedJobOrder("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const startCamera = async (checkoutId: string) => {
    setCheckingInId(checkoutId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" },
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

  const handleCheckin = async () => {
    if (!capturedPhoto || !checkingInId) {
      toast({ title: "Error", description: "Photo is required", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const checkout = checkouts.find(c => c.id === checkingInId);

      const { error: checkoutError } = await supabase
        .from("tool_checkouts")
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by_user_id: userData.user.id,
          checkin_photo_url: capturedPhoto,
          status: "returned"
        })
        .eq("id", checkingInId);

      if (checkoutError) throw checkoutError;

      const { error: toolError } = await supabase
        .from("tools")
        .update({ status: "available" })
        .eq("id", checkout.tool_id);

      if (toolError) throw toolError;

      toast({ title: "Success", description: "Tool checked in successfully" });
      fetchCheckouts();
      fetchAvailableTools();
      setCapturedPhoto(null);
      setCheckingInId(null);
      setShowCamera(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCancel = () => {
    stopCamera();
    setCapturedPhoto(null);
    setCheckingInId(null);
    setShowCamera(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Checkouts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Mechanic</label>
            <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
              <SelectTrigger>
                <SelectValue placeholder="Select mechanic" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {mechanics.map((mechanic) => (
                  <SelectItem key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Tool</label>
            <Select value={selectedTool} onValueChange={setSelectedTool}>
              <SelectTrigger>
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {tools.map((tool) => (
                  <SelectItem key={tool.id} value={tool.id}>
                    {tool.code} - {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Job Order</label>
            <Select value={selectedJobOrder} onValueChange={setSelectedJobOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Select job order" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {jobOrders.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_number} - {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCheckout}>
            <LogOut className="h-4 w-4 mr-2" /> Check Out
          </Button>
        </div>

        <Dialog open={showCamera} onOpenChange={setShowCamera}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Capture Tool Photo</DialogTitle>
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
                  <img src={capturedPhoto} alt="Tool" className="w-full rounded-lg" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => {
                      setCapturedPhoto(null);
                      startCamera(checkingInId!);
                    }}>Retake</Button>
                    <Button onClick={handleCheckin}>Confirm Check In</Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Mechanic</TableHead>
              <TableHead>Job Order</TableHead>
              <TableHead>Checked Out</TableHead>
              <TableHead>Checked In</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkouts.map((checkout) => (
              <TableRow key={checkout.id}>
                <TableCell className="font-mono">{checkout.tools?.code} - {checkout.tools?.name}</TableCell>
                <TableCell>{checkout.mechanics?.name}</TableCell>
                <TableCell>{checkout.job_orders?.job_number || "N/A"}</TableCell>
                <TableCell>{new Date(checkout.checked_out_at).toLocaleString()}</TableCell>
                <TableCell>
                  {checkout.checked_in_at ? new Date(checkout.checked_in_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    checkout.status === "checked_out" ? "bg-orange-100 text-orange-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {checkout.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  {checkout.status === "checked_out" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startCamera(checkout.id)}
                    >
                      <LogIn className="h-4 w-4 mr-2" /> Check In
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
