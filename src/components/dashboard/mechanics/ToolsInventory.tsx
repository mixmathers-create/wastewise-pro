import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Plus, Edit, Trash2, QrCode, ShoppingCart, Camera } from "lucide-react";
import { generateCSV, downloadCSV, parseCSV } from "@/lib/csvUtils";
import { AddToolDialog } from "./AddToolDialog";
import { EditToolDialog } from "./EditToolDialog";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { Camera as CapacitorCamera } from "@capacitor/camera";

export function ToolsInventory() {
  const [tools, setTools] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [selectedJobOrder, setSelectedJobOrder] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkinPhoto, setCheckinPhoto] = useState<string | null>(null);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [checkinCheckoutId, setCheckinCheckoutId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTools();
    fetchCheckouts();
    fetchJobOrders();
  }, []);

  const fetchTools = async () => {
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .eq("status", "available")
      .order("name");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTools(data || []);
    }
  };

  const fetchCheckouts = async () => {
    const { data } = await supabase
      .from("tool_checkouts")
      .select(`
        *,
        tools(name, code),
        job_orders(job_number, trucks(code, plate_number))
      `)
      .order("checked_out_at", { ascending: false });
    setCheckouts(data || []);
  };

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from("job_orders")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false });
    setJobOrders(data || []);
  };

  const handleCheckout = async () => {
    if (!selectedJobOrder || !selectedTool) {
      toast({ title: "Error", description: "Please select job order and tool", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const jobOrder = jobOrders.find(jo => jo.id === selectedJobOrder);
      const mechanicId = jobOrder?.mechanic_ids?.[0] || null;

      const { error: checkoutError } = await supabase.from("tool_checkouts").insert({
        tool_id: selectedTool,
        job_order_id: selectedJobOrder,
        mechanic_id: mechanicId,
        checked_out_by_user_id: userData.user.id,
        notes: checkoutNotes || null,
        status: "checked_out"
      });

      if (checkoutError) throw checkoutError;

      const { error: updateError } = await supabase
        .from("tools")
        .update({ status: "in_use" })
        .eq("id", selectedTool);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Tool checked out successfully" });
      setShowCheckoutDialog(false);
      resetCheckoutForm();
      fetchTools();
      fetchCheckouts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetCheckoutForm = () => {
    setSelectedJobOrder("");
    setSelectedTool("");
    setCheckoutNotes("");
  };

  const capturePhoto = async () => {
    try {
      const { CameraResultType } = await import("@capacitor/camera");
      const photo = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });
      setCheckinPhoto(photo.dataUrl || null);
      setCameraActive(false);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to capture photo", variant: "destructive" });
    }
  };

  const handleCheckin = async () => {
    if (!checkinCheckoutId) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      let photoUrl = null;

      if (checkinPhoto) {
        const base64Data = checkinPhoto.split(",")[1];
        const fileName = `tool-checkin-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("personnel-photos")
          .upload(fileName, Buffer.from(base64Data, "base64"), {
            contentType: "image/jpeg"
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("personnel-photos")
          .getPublicUrl(fileName);
        
        photoUrl = urlData.publicUrl;
      }

      const checkout = checkouts.find(c => c.id === checkinCheckoutId);
      
      const { error: checkinError } = await supabase
        .from("tool_checkouts")
        .update({
          checked_in_at: new Date().toISOString(),
          checked_in_by_user_id: userData.user.id,
          checkin_photo_url: photoUrl,
          status: "checked_in"
        })
        .eq("id", checkinCheckoutId);

      if (checkinError) throw checkinError;

      const { error: updateError } = await supabase
        .from("tools")
        .update({ status: "available" })
        .eq("id", checkout?.tool_id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Tool checked in successfully" });
      setShowCheckinDialog(false);
      setCheckinCheckoutId(null);
      setCheckinPhoto(null);
      fetchTools();
      fetchCheckouts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleExportInventory = () => {
    const data = tools.map(t => ({
      name: t.name,
      code: t.code,
      category: t.category || "",
      condition: t.condition,
      status: t.status
    }));
    const csv = generateCSV(data, ["name", "code", "category", "condition", "status"]);
    downloadCSV(csv, `tools-inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Inventory exported" });
  };

  const handleExportCheckouts = () => {
    const csvData = checkouts.map(checkout => ({
      Tool: checkout.tools?.code || '',
      Name: checkout.tools?.name || '',
      'Job Order': checkout.job_orders?.job_number || '',
      Truck: checkout.job_orders?.trucks?.code || '',
      'Checked Out': format(new Date(checkout.checked_out_at), 'yyyy-MM-dd HH:mm'),
      'Checked In': checkout.checked_in_at ? format(new Date(checkout.checked_in_at), 'yyyy-MM-dd HH:mm') : 'Not returned',
      Status: checkout.status,
      Notes: checkout.notes || ''
    }));
    const csv = generateCSV(csvData, ['Tool', 'Name', 'Job Order', 'Truck', 'Checked Out', 'Checked In', 'Status', 'Notes']);
    downloadCSV(csv, `tool-checkouts-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast({ title: "Success", description: "Checkouts exported" });
  };

  const downloadTemplate = () => {
    const exampleData = [{
      name: "Power Drill",
      category: "Power Tools",
      condition: "good"
    }];
    const csv = generateCSV(exampleData, ["name", "category", "condition"]);
    downloadCSV(csv, "tools-template.csv");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    try {
      const invalidRows = rows.filter(row => !row.name);
      if (invalidRows.length > 0) {
        toast({ title: "Import Error", description: "All rows must have name", variant: "destructive" });
        return;
      }

      const toolsToInsert = rows.map(row => {
        const autoCode = `TOOL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        return {
          name: row.name,
          code: autoCode,
          category: row.category || null,
          condition: row.condition || "good",
          status: "available"
        };
      });

      const { error } = await supabase.from("tools").insert(toolsToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Imported ${toolsToInsert.length} tools` });
      fetchTools();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
    event.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    try {
      const { error } = await supabase.from("tools").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Tool deleted" });
      fetchTools();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const exportToolQRCodes = async () => {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;
    const qrSize = 50;
    const spacing = 70;

    for (const tool of tools) {
      if (y + spacing > pageHeight) {
        pdf.addPage();
        y = 20;
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(tool.code, { width: 200 });
        const x = (pageWidth - qrSize) / 2;
        
        pdf.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);
        pdf.setFontSize(10);
        pdf.text(tool.name, pageWidth / 2, y + qrSize + 5, { align: 'center' });
        pdf.text(tool.code, pageWidth / 2, y + qrSize + 10, { align: 'center' });
        
        y += spacing;
      } catch (error) {
        console.error('Error generating QR for tool:', tool.code, error);
      }
    }

    pdf.save('tool-qr-codes.pdf');
    toast({ title: "Success", description: "QR codes exported successfully" });
  };


  return (
    <Tabs defaultValue="inventory" className="w-full">
      <TabsList>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="checkouts">Checkouts</TabsTrigger>
      </TabsList>

      <TabsContent value="inventory">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tools Inventory</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" /> Template
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportInventory}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button variant="outline" size="sm" onClick={exportToolQRCodes}>
                  <QrCode className="h-4 w-4 mr-2" /> Export QR Codes
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <label>
                    <Upload className="h-4 w-4 mr-2" /> Import
                    <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                  </label>
                </Button>
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tool
                </Button>
                <Button size="sm" onClick={() => setShowCheckoutDialog(true)}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Checkout Tool
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-mono">{tool.code}</TableCell>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{tool.category || "N/A"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        tool.condition === "good" ? "bg-green-100 text-green-800" :
                        tool.condition === "fair" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {tool.condition}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        tool.status === "available" ? "bg-green-100 text-green-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {tool.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingTool(tool)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(tool.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="checkouts">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tool Checkouts</CardTitle>
              <Button variant="outline" onClick={handleExportCheckouts}>
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Job Order</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Checked Out</TableHead>
                  <TableHead>Checked In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.map((checkout) => (
                  <TableRow key={checkout.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{checkout.tools?.code}</div>
                        <div className="text-sm text-muted-foreground">{checkout.tools?.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{checkout.job_orders?.job_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{checkout.job_orders?.trucks?.code}</div>
                        <div className="text-xs text-muted-foreground">{checkout.job_orders?.trucks?.plate_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(checkout.checked_out_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      {checkout.checked_in_at 
                        ? format(new Date(checkout.checked_in_at), 'MMM dd, yyyy HH:mm')
                        : 'Not returned'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        checkout.status === "checked_in" ? "bg-green-100 text-green-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {checkout.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {checkout.status === "checked_out" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCheckinCheckoutId(checkout.id);
                            setShowCheckinDialog(true);
                          }}
                        >
                          Check In
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <AddToolDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={fetchTools} />
      
      {editingTool && (
        <EditToolDialog
          tool={editingTool}
          open={!!editingTool}
          onOpenChange={(open) => !open && setEditingTool(null)}
          onSuccess={fetchTools}
        />
      )}

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Job Order *</Label>
              <Select value={selectedJobOrder} onValueChange={setSelectedJobOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job order" />
                </SelectTrigger>
                <SelectContent>
                  {jobOrders.map((jo) => (
                    <SelectItem key={jo.id} value={jo.id}>
                      {jo.job_number} - {jo.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tool *</Label>
              <Select value={selectedTool} onValueChange={setSelectedTool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tool" />
                </SelectTrigger>
                <SelectContent>
                  {tools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.code} - {tool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckout}>Checkout</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={showCheckinDialog} onOpenChange={setShowCheckinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!checkinPhoto ? (
              <Button onClick={capturePhoto} className="w-full">
                <Camera className="h-4 w-4 mr-2" /> Capture Photo
              </Button>
            ) : (
              <div>
                <img src={checkinPhoto} alt="Check-in photo" className="w-full rounded-lg" />
                <Button variant="outline" onClick={() => setCheckinPhoto(null)} className="w-full mt-2">
                  Retake Photo
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCheckinDialog(false);
                setCheckinPhoto(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCheckin}>Confirm Check-in</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
