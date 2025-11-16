import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printerService";
import { ArrowLeft, Printer } from "lucide-react";
import QRCode from "qrcode";

const ReceiptPreview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const receiptId = searchParams.get("id");
  
  const [receipt, setReceipt] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [truck, setTruck] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [helpers, setHelpers] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (receiptId) {
      loadReceipt();
    }
  }, [receiptId]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      
      // Load receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from("collection_receipts")
        .select("*")
        .eq("id", receiptId)
        .single();

      if (receiptError) throw receiptError;
      setReceipt(receiptData);

      // Load related data
      const [clientRes, truckRes, driverRes, helpersRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", receiptData.client_id).single(),
        supabase.from("trucks").select("*").eq("id", receiptData.truck_id).single(),
        supabase.from("drivers").select("*").eq("id", receiptData.driver_id).single(),
        supabase.from("helpers").select("*").in("id", receiptData.helper_ids)
      ]);

      setClient(clientRes.data);
      setTruck(truckRes.data);
      setDriver(driverRes.data);
      setHelpers(helpersRes.data || []);

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(receiptData.qr_code, { width: 300 });
      setQrCodeUrl(qrUrl);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!receipt || !client) return;

    if (!printerService.isAvailable()) {
      toast({ 
        title: "Printer Not Available", 
        description: "Bluetooth printer is only available on Android app", 
        variant: "destructive" 
      });
      return;
    }

    if (!printerService.isConnected()) {
      toast({ 
        title: "Printer Not Connected", 
        description: "Please connect to a printer in Settings first", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setPrinting(true);
      
      const totalQuantity = (receipt.items as any[]).reduce((sum, item) => sum + item.quantity, 0);
      const totalWeight = (receipt.items as any[]).filter(i => i.unit === 'kg').reduce((sum, item) => sum + item.quantity, 0);
      
      await printerService.printReceipt({
        header: "WASTEWISE COLLECTION RECEIPT",
        items: [
          { label: "Receipt ID", value: receipt.qr_code },
          { label: "Date", value: new Date(receipt.created_at).toLocaleDateString() },
          { label: "Time", value: new Date(receipt.created_at).toLocaleTimeString() },
          { label: "", value: "---" },
          { label: "Client", value: client.name },
          { label: "Industry", value: client.industry },
          { label: "Address", value: client.address || "N/A" },
          { label: "", value: "---" },
          { label: "Truck", value: truck?.code || "N/A" },
          { label: "Driver", value: driver?.name || "N/A" },
          { label: "Helpers", value: helpers.map(h => h.name).join(", ") },
          { label: "", value: "---" },
          { label: "Total Items", value: `${totalQuantity}` },
          { label: "Total Weight", value: `${totalWeight} kg` },
          { label: "", value: "---" },
          { label: "Signed By", value: receipt.signed_by }
        ],
        qrCode: qrCodeUrl.split(',')[1], // Remove data:image/png;base64, prefix
        footer: "Thank you for choosing WasteWise!\nwww.wastewise.com"
      });

      toast({ title: "Print Successful", description: "Receipt printed successfully" });
    } catch (error: any) {
      toast({ title: "Print Failed", description: error.message, variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading receipt...</p>
      </div>
    );
  }

  if (!receipt || !client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Receipt not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Receipt Preview</h1>
      </div>

      {/* Receipt Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4 pb-24">
        <Card className="max-w-2xl mx-auto bg-white text-black">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center border-b-2 pb-4">
              <h2 className="text-2xl font-bold mb-2">WASTEWISE</h2>
              <p className="text-lg font-semibold">COLLECTION RECEIPT</p>
            </div>

            {/* Receipt ID & Date */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Receipt ID:</span>
                <span className="font-mono">{receipt.qr_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{new Date(receipt.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span>{new Date(receipt.created_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="border-t-2 border-dashed" />

            {/* Client Info */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Client Information</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Name:</span> {client.name}</div>
                <div><span className="font-medium">Industry:</span> {client.industry}</div>
                {client.address && <div><span className="font-medium">Address:</span> {client.address}</div>}
                {client.contact_person && <div><span className="font-medium">Contact:</span> {client.contact_person}</div>}
              </div>
            </div>

            <div className="border-t-2 border-dashed" />

            {/* Collection Details */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Collection Details</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Truck:</span> {truck?.code} - {truck?.type}</div>
                <div><span className="font-medium">Driver:</span> {driver?.name}</div>
                <div><span className="font-medium">Helpers:</span> {helpers.map(h => h.name).join(", ")}</div>
              </div>
            </div>

            <div className="border-t-2 border-dashed" />

            {/* Items */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Waste Items</h3>
              <div className="space-y-2">
                {(receipt.items as any[]).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{item.waste_type}</span>
                    <span className="font-medium">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total Weight:</span>
                <span>{(receipt.items as any[]).filter(i => i.unit === 'kg').reduce((sum, item) => sum + item.quantity, 0)} kg</span>
              </div>
            </div>

            <div className="border-t-2 border-dashed" />

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex flex-col items-center">
                <img src={qrCodeUrl} alt="Receipt QR Code" className="w-48 h-48" />
                <p className="text-xs text-gray-500 mt-2">Scan for verification</p>
              </div>
            )}

            {/* Signature */}
            {receipt.signature_data && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm">Signature</h3>
                <img src={receipt.signature_data} alt="Signature" className="border rounded h-24 w-full object-contain bg-gray-50" />
                <p className="text-sm"><span className="font-medium">Signed by:</span> {receipt.signed_by}</p>
              </div>
            )}

            <div className="border-t-2 pt-4 text-center text-sm text-gray-600">
              <p>Thank you for choosing WasteWise!</p>
              <p className="text-xs mt-1">www.wastewise.com</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fixed Print Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
        <Button 
          onClick={handlePrint} 
          disabled={printing}
          className="w-full h-14 text-lg"
        >
          <Printer className="h-5 w-5 mr-2" />
          {printing ? "Printing..." : "Print Receipt"}
        </Button>
      </div>
    </div>
  );
};

export default ReceiptPreview;
