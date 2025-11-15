import { useState, useRef, useEffect } from "react";
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
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType } from "@capacitor/camera";
import { MobileInput } from "@/components/mobile/MobileInput";
import { printerService } from "@/lib/printerService";

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
  const [allClients, setAllClients] = useState<any[]>([]);
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

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setAllClients(data || []);
  };

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

  const handleCamera = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri
        });
        toast({ title: "Photo captured", description: "QR code scanning from camera coming soon. For now, please enter QR manually or select client." });
      } else {
        toast({ title: "Camera not available", description: "Camera is only available on mobile devices. Use file upload instead.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Camera Error", description: error.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For now, just show a message. In the future, implement QR scanning from image
    toast({ title: "File uploaded", description: "QR code scanning from image coming soon. For now, please enter QR manually or select client." });
  };

  const handleClientSelect = async (clientId: string) => {
    setLoading(true);
    try {
      await loadResources();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      setClientData(data);
      setQrInput(data.qr_code);
      toast({ title: "Client Selected", description: data.name });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
    if (printerService.isConnected()) {
      await printerService.printReceipt({
        header: "WasteWise Collection Receipt",
        items: [
          { label: "Client", value: clientName },
          { label: "Date", value: new Date().toLocaleDateString() },
          { label: "QR Code", value: qrCode },
          { label: "Weight", value: `${weight} kg` }
        ],
        footer: "Thank you for using WasteWise!"
      });
    }

    setLoading(true);
    try {
      const receiptQR = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const signatureData = sigCanvas.current.toDataURL();

      const { error } = await supabase.from("collection_receipts").insert({
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
    const now = new Date();
    const logoUrl = localStorage.getItem("receipt_logo");
    const companyName = localStorage.getItem("receipt_company_name") || "WASTEWISE";
    const companyAddress = localStorage.getItem("receipt_company_address") || "";
    const companyContact = localStorage.getItem("receipt_company_contact") || "";
    const headerText = localStorage.getItem("receipt_header") || "COLLECTION RECEIPT";
    const footerText = localStorage.getItem("receipt_footer") || "Thank you for your cooperation!";
    const baseFontSize = parseInt(localStorage.getItem("receipt_font_size") || "8");
    
    const truckName = trucks.find((t) => t.id === selectedTruck)?.code || selectedTruck;
    const driverName = drivers.find((d) => d.id === selectedDriver)?.name || selectedDriver;
    const helperNames = selectedHelpers.map((hid) => helpers.find((h) => h.id === hid)?.name || hid);
    
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Generate QR codes
    const clientQrUrl = await QRCode.toDataURL(client.qr_code, { width: 150 });
    const receiptQrUrl = await QRCode.toDataURL(receiptQR, { width: 150 });

    const doc = new jsPDF({ format: [58, 200], unit: "mm" });
    let y = 10;

    // Logo or company name
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, "PNG", 14, y, 30, 15);
        y += 18;
      } catch (e) {
        doc.setFontSize(baseFontSize + 4);
        doc.text(companyName, 29, y, { align: "center" });
        y += 8;
      }
    } else {
      doc.setFontSize(baseFontSize + 4);
      doc.text(companyName, 29, y, { align: "center" });
      y += 8;
    }

    // Company info
    if (companyAddress || companyContact) {
      doc.setFontSize(baseFontSize - 2);
      if (companyAddress) {
        doc.text(companyAddress, 29, y, { align: "center", maxWidth: 48 });
        y += 4;
      }
      if (companyContact) {
        doc.text(companyContact, 29, y, { align: "center" });
        y += 4;
      }
    }

    // Header
    doc.setFontSize(baseFontSize + 1);
    doc.text(headerText, 29, y, { align: "center" });
    y += 5;
    doc.setFontSize(baseFontSize - 1);
    doc.text(`Serial: ${receiptQR}`, 29, y, { align: "center" });
    y += 4;
    doc.text(`${now.toLocaleDateString()} • ${now.toLocaleTimeString()}`, 29, y, { align: "center" });
    y += 8;

    // Client Info
    doc.setFontSize(baseFontSize - 2);
    doc.text("CLIENT INFORMATION", 5, y);
    y += 4;
    doc.setFontSize(baseFontSize - 1);
    doc.text(client.name, 5, y);
    y += 3;
    doc.setFontSize(baseFontSize - 2);
    doc.text(`ID: ${client.id.slice(0, 8)}`, 5, y);
    y += 3;
    if (client.address) {
      doc.text(client.address, 5, y, { maxWidth: 48 });
      y += 3;
    }
    doc.text(`Industry: ${client.industry}`, 5, y);
    y += 3;
    if (client.contact_person) {
      doc.text(`Contact: ${client.contact_person}`, 5, y);
      y += 3;
    }
    if (client.contact_number) {
      doc.text(`Tel: ${client.contact_number}`, 5, y);
      y += 3;
    }
    
    // Client QR
    doc.addImage(clientQrUrl, "PNG", 40, y - 15, 15, 15);
    y += 5;

    // Collection Details
    doc.setFontSize(baseFontSize - 2);
    doc.text("COLLECTION DETAILS", 5, y);
    y += 4;
    doc.setFontSize(baseFontSize - 1);
    doc.text(`Truck: ${truckName}`, 5, y);
    y += 3;
    doc.text(`Driver: ${driverName}`, 5, y);
    y += 3;
    doc.text(`Helpers: ${helperNames.join(", ")}`, 5, y, { maxWidth: 48 });
    y += 6;

    // Waste Items
    doc.setFontSize(baseFontSize - 2);
    doc.text("WASTE COLLECTED", 5, y);
    y += 4;
    doc.setFontSize(baseFontSize - 1);
    items.forEach((item) => {
      doc.text(item.waste_type, 5, y);
      y += 3;
    });
    y += 2;
    doc.setFontSize(baseFontSize);
    doc.text(`TOTAL: ${totalQuantity} (mixed units)`, 5, y);
    y += 6;

    // Signature
    doc.setFontSize(6);
    doc.text("CLIENT SIGNATURE", 5, y);
    y += 4;
    if (signature) {
      doc.addImage(signature, "PNG", 5, y, 48, 12);
      y += 14;
    }
    doc.setFontSize(7);
    doc.text(`Signed by: ${signedBy}`, 5, y);
    y += 8;

    // Receipt QR
    doc.addImage(receiptQrUrl, "PNG", 19, y, 20, 20);
    y += 22;
    doc.setFontSize(baseFontSize - 2);
    doc.text("Scan to verify receipt", 29, y, { align: "center" });
    y += 5;
    doc.setFontSize(baseFontSize - 3);
    doc.text(footerText, 29, y, { align: "center", maxWidth: 50 });

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
        <Label>Select Client</Label>
        <Select onValueChange={handleClientSelect}>
          <SelectTrigger><SelectValue placeholder="Choose from database" /></SelectTrigger>
          <SelectContent>
            {allClients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name} - {c.industry}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-center text-muted-foreground text-sm">- OR -</div>

      <div>
        <Label>Scan/Enter QR Code</Label>
        <div className="flex gap-2">
          <Input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Enter or scan QR" />
          <Button type="button" variant="outline" onClick={handleCamera} title="Use Camera">
            <Camera className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" asChild title="Upload QR Image">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              📁
            </label>
          </Button>
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
                <input> placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="w-24" />
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
