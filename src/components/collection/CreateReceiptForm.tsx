import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Pencil, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { App } from '@capacitor/app'; 
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { MobileInput } from "@/components/mobile/MobileInput";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  offlineDb, 
  generateLocalId,
  type CachedClient,
  type CachedTruck,
  type CachedDriver,
  type CachedHelper,
  type PendingCollection,
} from "@/lib/offlineDb";
import { useReceiptSettings } from "@/hooks/useReceiptSettings";

const wasteTypes = ["Municipal Solid Waste", "Food Waste", "Construction Waste", "Special Hauling"];
const units = ["kg", "cbm", "truck load"];

interface CreateReceiptFormProps {
  profile: any;
  onSuccess: () => void;
  isOnline: boolean;
  cachedClients: CachedClient[];
  cachedTrucks: CachedTruck[];
  cachedDrivers: CachedDriver[];
  cachedHelpers: CachedHelper[];
}

const CreateReceiptForm = ({ 
  profile, 
  onSuccess, 
  isOnline, 
  cachedClients, 
  cachedTrucks, 
  cachedDrivers, 
  cachedHelpers 
}: CreateReceiptFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logoUrl: dbLogoUrl } = useReceiptSettings();
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
  const [items, setItems] = useState<{ waste_type: string; quantity: number; unit: string }[]>([]);
  const [tallyEntries, setTallyEntries] = useState<{ waste_type: string; quantity: number; unit: string }[]>([]);
  const [selectedWasteType, setSelectedWasteType] = useState<string>("");
  const [newItem, setNewItem] = useState({ quantity: 0, unit: "kg" });
  const [signedBy, setSignedBy] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ waste_type: string; quantity: number; unit: string } | null>(null);

  // Load data based on online/offline status
  useEffect(() => {
    if (isOnline) {
      // Online: fetch fresh data from Supabase
      loadClients();
    } else {
      // Offline: use cached data
      setAllClients(cachedClients);
      setTrucks(cachedTrucks);
      setDrivers(cachedDrivers);
      setHelpers(cachedHelpers);
    }
  }, [isOnline, cachedClients, cachedTrucks, cachedDrivers, cachedHelpers]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: PluginListenerHandle | null = null;

    const setupBackHandler = async () => {
      listenerHandle = await App.addListener("backButton", async (data) => {
        const isScannerActive = document.body.classList.contains("scanner-active");

        if (isScannerActive) {
          console.log("Back button pressed, cancelling scan.");
          try {
            await BarcodeScanner.stopScan();
          } catch (e) {
            console.warn("Failed to stop scanner", e);
          }

          BarcodeScanner.showBackground();
          document.body.classList.remove("scanner-active");
          setIsScanning(false); 
        } else {
          App.exitApp();
        }
      });
    };

    setupBackHandler();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      if (document.body.classList.contains("scanner-active")) {
          BarcodeScanner.showBackground();
          document.body.classList.remove("scanner-active");
          BarcodeScanner.stopScan(); 
      }
    };
  }, []);

  const handleQRDetected = async (decodedText: string) => {
    setQrInput(decodedText);
    setIsScanning(false);
    toast({ title: "QR Code Scanned", description: "Looking up client..." });
    
    if (isOnline) {
      // Online: fetch from Supabase
      await loadResources();
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("qr_code", decodedText)
        .single();
        
      if (error || !data) {
        toast({ title: "Client not found", description: "No client matches this QR code.", variant: "destructive" });
      } else {
        setClientData(data);
        toast({ title: "Client Found", description: `Loaded: ${data.name}` });
      }
    } else {
      // Offline: look up from cached data
      const client = allClients.find(c => c.qr_code === decodedText);
        
      if (!client) {
        toast({ title: "Client not found", description: "No client matches this QR code.", variant: "destructive" });
      } else {
        setClientData(client);
        toast({ title: "Client Found", description: `Loaded: ${client.name}` });
      }
    }
  };

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
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: "Camera not available",
          description: "Use the mobile app to scan QR codes",
          variant: "destructive",
        });
        return;
      }

      // Check camera permission
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (!status.granted) {
        toast({
          title: "Camera permission denied",
          description: "Please allow camera access to scan QR codes",
          variant: "destructive",
        });
        return;
      }

      // Stop any existing scan first
      try {
        await BarcodeScanner.stopScan();
      } catch (e) {
        // Ignore if no scan was running
      }

      // Start scanning
      setIsScanning(true);
      BarcodeScanner.hideBackground();
      document.body.classList.add("scanner-active");

      const result = await BarcodeScanner.startScan();

      // Clean up
      BarcodeScanner.showBackground();
      document.body.classList.remove("scanner-active");
      setIsScanning(false);

      if (result.hasContent) {
        handleQRDetected(result.content);
      }

    } catch (err: any) {
      console.error("Camera error:", err);
      BarcodeScanner.showBackground();
      document.body.classList.remove("scanner-active");
      setIsScanning(false);
      toast({
        title: "Camera error",
        description: err.message || "Failed to start camera scanner",
        variant: "destructive",
      });
    }
  };
  const stopScanning = async () => {
    try {
      await BarcodeScanner.stopScan();
    } finally {
      BarcodeScanner.showBackground();
      document.body.classList.remove("scanner-active");
      setIsScanning(false);
    }
  };


  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For now, just show a message. In the future, implement QR scanning from image
    toast({ title: "File uploaded", description: "QR code scanning from image coming soon. For now, please enter QR manually or select client." });
  };

  const handleClientSelect = async (clientId: string) => {
    if (isOnline) {
      // Online: fetch from Supabase
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
    } else {
      // Offline: find from cached data
      const client = allClients.find(c => c.id === clientId);
      if (client) {
        setClientData(client);
        setQrInput(client.qr_code);
        toast({ title: "Client Selected", description: client.name });
      }
    }
  };

  const lookupClient = async () => {
    if (!qrInput) return;
    
    if (isOnline) {
      // Online: fetch from Supabase
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
    } else {
      // Offline: find from cached data
      const client = allClients.find(c => c.qr_code === qrInput);
      if (!client) {
        toast({ title: "Not Found", description: "No client with this QR code", variant: "destructive" });
      } else {
        setClientData(client);
        toast({ title: "Client Found", description: client.name });
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedWasteType) {
      toast({ title: "No Waste Type", description: "Please select a waste type first", variant: "destructive" });
      return;
    }

    if (!newItem.quantity || newItem.quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid quantity", variant: "destructive" });
      return;
    }
    

    // Add to tally entries (individual records)
    const newTallyEntry = {
      waste_type: selectedWasteType,
      quantity: newItem.quantity,
      unit: newItem.unit,
    };
    setTallyEntries([...tallyEntries, newTallyEntry]);
    
    // Check if item with same waste_type and unit already exists for aggregated display
    const existingItemIndex = items.findIndex(
      item => item.waste_type === selectedWasteType && item.unit === newItem.unit
    );

    if (existingItemIndex !== -1) {
      // Sum the quantities
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += newItem.quantity;
      setItems(updatedItems);
    } else {
      // Add new item
      const item = {
        waste_type: selectedWasteType,
        quantity: newItem.quantity,
        unit: newItem.unit,
      };
      setItems([...items, item]);
    }

    setNewItem({ quantity: 0, unit: newItem.unit });
    toast({ title: "Item Added", description: `${newItem.quantity} ${newItem.unit} added` });
  };

  const handleEditEntry = (idx: number) => {
    setEditingIndex(idx);
    setEditingEntry({ ...tallyEntries[idx] });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingEntry) return;

    if (!editingEntry.quantity || editingEntry.quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid quantity", variant: "destructive" });
      return;
    }

    const updatedTallyEntries = [...tallyEntries];
    updatedTallyEntries[editingIndex] = editingEntry;
    setTallyEntries(updatedTallyEntries);

    // Recalculate aggregated items
    recalculateItems(updatedTallyEntries);

    setEditingIndex(null);
    setEditingEntry(null);
    toast({ title: "Entry Updated", description: "Waste entry has been updated" });
  };

  const handleDeleteEntry = (idx: number) => {
    const updatedTallyEntries = tallyEntries.filter((_, i) => i !== idx);
    setTallyEntries(updatedTallyEntries);

    // Recalculate aggregated items
    recalculateItems(updatedTallyEntries);

    toast({ title: "Entry Deleted", description: "Waste entry has been removed" });
  };

  const recalculateItems = (entries: typeof tallyEntries) => {
    const aggregated: { [key: string]: { waste_type: string; quantity: number; unit: string } } = {};

    entries.forEach(entry => {
      const key = `${entry.waste_type}-${entry.unit}`;
      if (aggregated[key]) {
        aggregated[key].quantity += entry.quantity;
      } else {
        aggregated[key] = { ...entry };
      }
    });

    setItems(Object.values(aggregated));
  };

  const handleSubmit = async () => {
    if (!clientData || !selectedTruck || !selectedDriver || selectedHelpers.length === 0 || !signedBy) {
      toast({ title: "Missing fields", description: "Please complete all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = profile.user_id;

      if (isOnline) {
        // ONLINE: Save directly to Supabase
        const receiptQR = `RECEIPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const { data: insertedReceipt, error } = await supabase
          .from("collection_receipts")
          .insert({
            client_id: clientData.id,
            truck_id: selectedTruck,
            driver_id: selectedDriver,
            helper_ids: selectedHelpers,
            items,
            tally_entries: tallyEntries,
            waste_types: items.map((i) => i.waste_type),
            qr_code: receiptQR,
            signed_by: signedBy,
            signature_data: null,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        toast({ title: "Receipt Created", description: "Collection receipt saved successfully" });
        
        if (Capacitor.isNativePlatform()) {
          navigate(`/receipt-preview?id=${insertedReceipt.id}`);
        } else {
          await generatePDF(receiptQR, clientData, null);
        }
      } else {
        // OFFLINE: Save to Dexie pending queue
        const truckData = trucks.find(t => t.id === selectedTruck);
        const driverData = drivers.find(d => d.id === selectedDriver);
        const helperData = selectedHelpers.map(hid => helpers.find(h => h.id === hid));

        const pendingCollection: PendingCollection = {
          id: generateLocalId(),
          client_id: clientData.id,
          client_name: clientData.name,
          truck_id: selectedTruck,
          truck_code: truckData?.code || selectedTruck,
          driver_id: selectedDriver,
          driver_name: driverData?.name || selectedDriver,
          helper_ids: selectedHelpers,
          helper_names: helperData.map(h => h?.name || 'Unknown'),
          items,
          tally_entries: tallyEntries,
          waste_types: items.map((i) => i.waste_type),
          signed_by: signedBy,
          created_at: new Date(),
          status: 'pending',
          user_id: userId,
        };

        await offlineDb.pendingCollections.add(pendingCollection);

        toast({ 
          title: "Saved Offline", 
          description: "Collection saved to pending. Will sync when online.",
        });
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
    const logoUrl = dbLogoUrl;
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
      doc.text(`${item.waste_type}: ${item.quantity} ${item.unit}`, 5, y, { maxWidth: 48 });
      y += 4;
    });
    y += 2;
    doc.setFontSize(baseFontSize);
    const displayUnit = items.length > 0 ? items[0].unit : "units";
    doc.text(`TOTAL: ${totalQuantity} ${displayUnit}`, 5, y);
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
    setItems([]);
    setTallyEntries([]);
    setSelectedWasteType("");
    setNewItem({ quantity: 0, unit: "kg" });
    setSignedBy("");
  };

  return (
    <>
      {isScanning && (
        <div className="scanner-overlay fixed inset-0 z-50 flex items-end justify-center pb-20">
          <button 
            onClick={stopScanning}
            className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
          >
            Cancel Scan
          </button>
        </div>
      )}

      <div className={`space-y-4 ${isScanning ? 'hidden' : ''}`}>
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
            <Label>Waste Collection</Label>
            {!selectedWasteType ? (
              <div className="mt-2 p-3 border rounded-md bg-muted">
                <Label className="mb-2 block">Select Waste Type</Label>
                <Select value={selectedWasteType} onValueChange={setSelectedWasteType}>
                  <SelectTrigger><SelectValue placeholder="Choose waste type..." /></SelectTrigger>
                  <SelectContent>{wasteTypes.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mt-2 p-3 border rounded-md bg-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Waste Type</p>
                    <p className="font-semibold">{selectedWasteType}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWasteType("");
                      setNewItem({ quantity: 0, unit: "kg" });
                    }}
                    disabled={tallyEntries.length > 0}
                  >
                    Change
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <MobileInput
                        type="number"
                        value={newItem.quantity.toString()}
                        onChange={(v) => setNewItem({ ...newItem, quantity: parseFloat(v) || 0 })}
                        placeholder="0"
                        allowDecimal={true}
                        maxLength={8}
                        onSubmit={handleAddItem}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit</Label>
                      <Select 
                        value={newItem.unit} 
                        onValueChange={(v) => setNewItem({ ...newItem, unit: v })}
                        disabled={tallyEntries.length > 0}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="default" 
                    size="sm" 
                    onClick={handleAddItem} 
                    className="w-full"
                    disabled={!newItem.quantity || newItem.quantity <= 0}
                  >
                    + Add Item
                  </Button>
                </div>
              </div>
            )}

            <div className="mb-3">
              <Label>Signed By (Name)</Label>
              <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Client representative name" />
            </div>

            {tallyEntries.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-sm font-semibold">Added Items:</p>
                {tallyEntries.map((entry, idx) => (
                  <div key={idx} className="p-2 bg-muted rounded-md">
                    {editingIndex === idx ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <MobileInput
                              type="number"
                              value={editingEntry?.quantity.toString() || "0"}
                              onChange={(v) => setEditingEntry(prev => prev ? { ...prev, quantity: parseFloat(v) || 0 } : null)}
                              placeholder="0"
                              allowDecimal={true}
                              maxLength={8}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Select 
                              value={editingEntry?.unit} 
                              onValueChange={(v) => setEditingEntry(prev => prev ? { ...prev, unit: v } : null)}
                              disabled={true}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="default" size="sm" onClick={handleSaveEdit} className="flex-1">
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => { setEditingIndex(null); setEditingEntry(null); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{entry.waste_type || "Not specified"}</p>
                          <p className="text-xs text-muted-foreground">{entry.quantity} {entry.unit}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleEditEntry(idx)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteEntry(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save & Generate Receipt"}
          </Button>
        </>
      )}
      </div>
    </>
  )
};

export default CreateReceiptForm;