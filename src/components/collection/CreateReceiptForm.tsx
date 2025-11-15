import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { Capacitor } from "@capacitor/core";

const wasteTypes = ["Municipal Solid Waste", "Food Waste", "Construction Waste", "Special Hauling"];
const units = ["kg", "cbm", "truck load"];

interface CreateReceiptFormProps {
  profile: any;
  onSuccess: () => void;
}

const CreateReceiptForm = ({ profile, onSuccess }: CreateReceiptFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [clientData, setClientData] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [selectedTruck, setSelectedTruck] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedHelpers, setSelectedHelpers] = useState<string[]>([]);
  const [items, setItems] = useState<{ waste_type: string; quantity: number; unit: string }[]>([
    { waste_type: "", quantity: 0, unit: "kg" }
  ]);
  const [signedBy, setSignedBy] = useState("");
  const sigCanvas = useRef<SignatureCanvas>(null);

  const loadResources = async () => {
    const [t, d, h] = await Promise.all([
      supabase.from("trucks").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("helpers").select("*"),
    ]);
    setTrucks(t.data || []);
    setDrivers(d.data || []);
    setHelpers(h.data || []);
  };

  const lookupClient = async () => {
    if (!qrInput) return;
    setLoading(true);
    try {
      await loadResources();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("qr_code", qrInput)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({ title: "Not Found", description: "No client with this QR code", variant: "destructive" });
      } else {
        setClientData(data);
        toast({ title: "Client Found", description: data.name });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { waste_type: "", quantity: 0, unit: "kg" }]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!clientData || !selectedTruck || !selectedDriver || selectedHelpers.length === 0 || !signedBy) {
      toast({ title: "Missing fields", description: "Please complete all fields", variant: "destructive" });
      return;
    }
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast({ title: "Signature required", description: "Please sign the receipt", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const receiptQR = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const signatureData = sigCanvas.current.toDataURL();

      const { error } = await supabase.from("collection_receipts").insert({
        team_id: profile?.team_id || null,
        client_id: clientData.id,
        truck_id: selectedTruck,
        driver_id: selectedDriver,
        helper_ids: selectedHelpers,
        items,
        waste_types: items.map((i) => i.waste_type),
        qr_code: receiptQR,
        signed_by: signedBy,
        signature_data: signatureData,
        created_by: profile?.user_id || "",
      });

      if (error) throw error;

      toast({ title: "Receipt Created", description: "Collection receipt saved successfully" });
      
      if (Capacitor.isNativePlatform()) {
        toast({ title: "Print", description: "Printer integration will be available soon" });
      } else {
        await generatePDF(receiptQR, clientData, signatureData);
      }

      resetForm();
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (receiptQR: string, client: any, signature: string) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("WasteWise Collection Receipt", 10, 10);
    doc.setFontSize(12);
    doc.text(`Receipt QR: ${receiptQR}`, 10, 20);
    doc.text(`Client: ${client.name}`, 10, 30);
    doc.text(`Industry: ${client.industry}`, 10, 40);
    doc.text(`Address: ${client.address}`, 10, 50);
    doc.text(`Truck: ${selectedTruck}`, 10, 60);
    doc.text(`Driver: ${selectedDriver}`, 10, 70);
    doc.text(`Helpers: ${selectedHelpers.join(", ")}`, 10, 80);
    doc.text(`Signed by: ${signedBy}`, 10, 90);
    let y = 100;
    items.forEach((item, idx) => {
      doc.text(`Item ${idx + 1}: ${item.waste_type} - ${item.quantity} ${item.unit}`, 10, y);
      y += 10;
    });
    doc.save(`receipt-${receiptQR}.pdf`);
    toast({ title: "PDF Generated", description: "Receipt downloaded" });
  };

  const resetForm = () => {
    setQrInput("");
    setClientData(null);
    setSelectedTruck("");
    setSelectedDriver("");
    setSelectedHelpers([]);
    setItems([{ waste_type: "", quantity: 0, unit: "kg" }]);
    setSignedBy("");
    sigCanvas.current?.clear();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Client QR Code</Label>
        <div className="flex gap-2">
          <Input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Enter or scan QR" />
          <Button type="button" variant="outline"><Camera className="h-4 w-4" /></Button>
          <Button type="button" onClick={lookupClient} disabled={loading}>Lookup</Button>
        </div>
      </div>

      {clientData && (
        <>
          <div className="rounded-md border p-4 bg-muted">
            <p className="text-sm font-semibold">{clientData.name}</p>
            <p className="text-xs text-muted-foreground">{clientData.industry} • {clientData.address}</p>
          </div>

          <div>
            <Label>Truck</Label>
            <Select value={selectedTruck} onValueChange={setSelectedTruck}>
              <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
              <SelectContent>
                {trucks.map((t) => <SelectItem key={t.id} value={t.id}>{t.code} - {t.type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Driver</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Helpers</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {helpers.map((h) => (
                <label key={h.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedHelpers.includes(h.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedHelpers([...selectedHelpers, h.id]);
                      else setSelectedHelpers(selectedHelpers.filter((id) => id !== h.id));
                    }}
                  />
                  {h.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Items</Label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mt-2">
                <Select value={item.waste_type} onValueChange={(v) => updateItem(idx, "waste_type", v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Waste type" /></SelectTrigger>
                  <SelectContent>{wasteTypes.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="w-24" />
                <Select value={item.unit} onValueChange={(v) => updateItem(idx, "unit", v)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">Add Item</Button>
          </div>

          <div>
            <Label>Client Signature</Label>
            <div className="border rounded-md">
              <SignatureCanvas ref={sigCanvas} canvasProps={{ className: "w-full h-32" }} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()} className="mt-1">Clear</Button>
          </div>

          <div>
            <Label>Signed By (Name)</Label>
            <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Client representative name" />
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save & Generate Receipt"}
          </Button>
        </>
      )}
    </div>
  );
};

export default CreateReceiptForm;
