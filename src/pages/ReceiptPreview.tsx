import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printerService";
import { ArrowLeft, Printer } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Label } from "@/components/ui/label";
import ReceiptTemplate, { ReceiptTemplateProps } from "@/components/collection/ReceiptTemplate";
import QRCode from "qrcode";

const QRCodeDisplay = ({ value, size }: { value: string; size: number }) => {
  const [qrUrl, setQrUrl] = useState<string>("");
  
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(setQrUrl)
      .catch(console.error);
  }, [value, size]);
  
  if (!qrUrl) return null;
  return <img src={qrUrl} alt="QR Code" style={{ width: size, height: size }} />;
};

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
  const [printing, setPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSignature, setHasSignature] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const printReceiptRef = useRef<HTMLDivElement>(null);

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
      
      // Check if signature exists
      setHasSignature(!!receiptData.signature_data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({ title: "Missing Signature", description: "Please provide a signature", variant: "destructive" });
      return;
    }

    try {
      const signatureData = signatureRef.current.toDataURL();
      
      const { error } = await supabase
        .from("collection_receipts")
        .update({ signature_data: signatureData })
        .eq("id", receiptId);

      if (error) throw error;

      setHasSignature(true);
      setReceipt({ ...receipt, signature_data: signatureData });
      toast({ title: "Success", description: "Signature saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleClearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const handlePrint = async () => {
    if (!receipt || !client) return;

    if (!hasSignature) {
      toast({ 
        title: "Missing Signature", 
        description: "Please add signature before printing", 
        variant: "destructive" 
      });
      return;
    }

    if (!printReceiptRef.current) {
      toast({ 
        title: "Print Error", 
        description: "Receipt template not ready", 
        variant: "destructive" 
      });
      return;
    }

    if (!printerService.isAvailable()) {
      toast({ 
        title: "Printer Not Available", 
        description: "Bluetooth printer is only available on Android app", 
        variant: "destructive" 
      });
      return;
    }

    try {
      setPrinting(true);
      
      await printerService.printElement(printReceiptRef.current, 1);
      toast({ title: "Print Successful", description: "Receipt printed successfully" });
    } catch (error: any) {
      toast({ title: "Print Failed", description: error.message, variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };
  
  // Prepare receipt template props
  const getReceiptProps = (): ReceiptTemplateProps | null => {
    if (!receipt || !client) return null;
    
    const logoUrl = localStorage.getItem("receipt_logo");
    const companyName = localStorage.getItem("receipt_company_name") || "WASTEWISE";
    const companyAddress = localStorage.getItem("receipt_company_address") || "";
    const companyContact = localStorage.getItem("receipt_company_contact") || "";
    const headerText = localStorage.getItem("receipt_header") || "COLLECTION RECEIPT";
    const footerText = localStorage.getItem("receipt_footer") || "Thank you for your cooperation!";
    
    return {
      logoUrl,
      companyName,
      companyAddress,
      companyContact,
      headerText,
      footerText,
      receiptQR: receipt.qr_code,
      createdAt: new Date(receipt.created_at),
      client: {
        id: client.id,
        name: client.name,
        industry: client.industry,
        address: client.address,
        contact_person: client.contact_person,
        contact_number: client.contact_number,
        qr_code: client.qr_code,
      },
      truck: {
        code: truck?.code || "N/A",
        type: truck?.type,
      },
      driver: {
        name: driver?.name || "N/A",
      },
      helpers: helpers.map((h) => ({ name: h.name })),
      items: receipt.items as Array<{ waste_type: string; quantity: number; unit: string }>,
      signedBy: receipt.signed_by,
      signatureData: receipt.signature_data,
    };
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
              <h3 className="font-bold text-lg">Waste Collected</h3>
              <div className="space-y-2">
                {(receipt.items as any[]).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>{item.waste_type}</span>
                    <span className="font-medium">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-dashed" />

            {/* QR Code */}
            {receipt?.qr_code && (
              <div className="flex flex-col items-center">
                <QRCodeDisplay value={receipt.qr_code} size={192} />
                <p className="text-xs text-gray-500 mt-2">Scan for verification</p>
              </div>
            )}

            {/* Signature Section */}
            {!hasSignature ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-lg font-bold">Client Signature</Label>
                  <div className="border-2 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: "w-full h-48 touch-none"
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearSignature}
                      className="flex-1"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveSignature}
                      className="flex-1"
                    >
                      Save Signature
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-bold text-sm">Signature</h3>
                <img src={receipt.signature_data} alt="Signature" className="border rounded h-24 w-full object-contain bg-gray-50" />
                <p className="text-sm break-words"><span className="font-medium">Signed by:</span> {receipt.signed_by}</p>
              </div>
            )}

            <div className="border-t-2 pt-4 text-center text-sm text-gray-600">
              <p>Thank you for choosing WasteWise!</p>
              <p className="text-xs mt-1">www.wastewise.com</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fixed Print Button - Only show if signature is saved */}
      {hasSignature && (
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
      )}

      {getReceiptProps() && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ReceiptTemplate ref={printReceiptRef} {...getReceiptProps()!} />
        </div>
      )}
    </div>
  );
};

export default ReceiptPreview;
