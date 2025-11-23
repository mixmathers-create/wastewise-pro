import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, LogIn, Camera, Download } from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/csvUtils";
import { format } from "date-fns";

export function ToolCheckouts() {
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [selectedJobOrder, setSelectedJobOrder] = useState("");
  const [selectedJobData, setSelectedJobData] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCheckouts();
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
      .select("*, trucks(id, code)")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleJobOrderChange = (jobOrderId: string) => {
    setSelectedJobOrder(jobOrderId);
    const job = jobOrders.find(j => j.id === jobOrderId);
    setSelectedJobData(job);
  };

  const handleCheckout = async () => {
    if (!selectedTool || !selectedJobOrder || !selectedJobData) {
      toast({ title: "Error", description: "Please select tool and job order", variant: "destructive" });
      return;
    }

    if (!selectedJobData.mechanic_ids || selectedJobData.mechanic_ids.length === 0) {
      toast({ title: "Error", description: "Job order must have assigned mechanics", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Use the first mechanic from the job order
      const mechanicId = selectedJobData.mechanic_ids[0];

      const { error: checkoutError } = await supabase.from("tool_checkouts").insert({
        mechanic_id: mechanicId,
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
      setSelectedTool("");
      setSelectedJobOrder("");
      setSelectedJobData(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExportCheckouts = () => {
    const csvData = checkouts.map(checkout => ({
      Tool: checkout.tools?.code || '',
      Name: checkout.tools?.name || '',
      Mechanic: checkout.mechanics?.name || '',
      'Job Order': checkout.job_orders?.job_number || '',
      'Checked Out': format(new Date(checkout.checked_out_at), 'yyyy-MM-dd HH:mm'),
      'Checked In': checkout.checked_in_at ? format(new Date(checkout.checked_in_at), 'yyyy-MM-dd HH:mm') : '',
      Status: checkout.status
    }));
    const csv = generateCSV(csvData, ['Tool', 'Name', 'Mechanic', 'Job Order', 'Checked Out', 'Checked In', 'Status']);
    downloadCSV(csv, `tool-checkouts-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Tool checkouts exported" });
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
        <div className="flex items-center justify-between">
          <CardTitle>Tool Checkouts</CardTitle>
          <Button variant="outline" onClick={handleExportCheckouts}>
            <Download className="h-4 w-4 mr-2" /> Export Audit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Job Order</label>
            <Select value={selectedJobOrder} onValueChange={handleJobOrderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select job order" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {jobOrders.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_number} - {job.title} ({job.trucks?.code || 'No truck'})
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
