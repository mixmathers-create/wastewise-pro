import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Printer } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { printerService } from "@/lib/printerService";
import { SchedulingParametersSettings } from "./SchedulingParametersSettings";

const EnhancedSettingsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState("");
  const [companyName, setCompanyName] = useState("WasteWise");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyContact, setCompanyContact] = useState("");
  const [receiptHeader, setReceiptHeader] = useState("COLLECTION RECEIPT");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your cooperation!");
  const [fontSize, setFontSize] = useState("8");
  const [printerConnected, setPrinterConnected] = useState(false);

  useEffect(() => {
    const savedLogo = localStorage.getItem("receipt_logo");
    const savedCompanyName = localStorage.getItem("receipt_company_name");
    const savedCompanyAddress = localStorage.getItem("receipt_company_address");
    const savedCompanyContact = localStorage.getItem("receipt_company_contact");
    const savedHeader = localStorage.getItem("receipt_header");
    const savedFooter = localStorage.getItem("receipt_footer");
    const savedFontSize = localStorage.getItem("receipt_font_size");

    if (savedLogo) setLogoUrl(savedLogo);
    if (savedCompanyName) setCompanyName(savedCompanyName);
    if (savedCompanyAddress) setCompanyAddress(savedCompanyAddress);
    if (savedCompanyContact) setCompanyContact(savedCompanyContact);
    if (savedHeader) setReceiptHeader(savedHeader);
    if (savedFooter) setReceiptFooter(savedFooter);
    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoUrl(result);
        localStorage.setItem("receipt_logo", result);
        toast({ title: "Logo Updated", description: "Receipt logo saved successfully" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    localStorage.removeItem("receipt_logo");
    toast({ title: "Logo Removed", description: "Receipt logo has been removed" });
  };

  const saveSettings = () => {
    localStorage.setItem("receipt_company_name", companyName);
    localStorage.setItem("receipt_company_address", companyAddress);
    localStorage.setItem("receipt_company_contact", companyContact);
    localStorage.setItem("receipt_header", receiptHeader);
    localStorage.setItem("receipt_footer", receiptFooter);
    localStorage.setItem("receipt_font_size", fontSize);
    toast({ title: "Settings Saved", description: "Receipt settings have been updated" });
  };

  const connectPrinter = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({ 
        title: "Not Available", 
        description: "Internal printer is only available on mobile devices",
        variant: "destructive" 
      });
      return;
    }

    try {
      const result = await printerService.testConnection();
      setPrinterConnected(result.success);

      toast({
        title: result.success ? "Printer Connected" : "Printer Not Available",
        description: result.success
          ? `Service version ${result.serviceVersion || "unknown"} ready`
          : "Could not reach the H10 printer service"
      });
    } catch (error: any) {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <SchedulingParametersSettings />
      
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>User details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Full name</p>
              <p className="text-lg font-semibold">{profile?.full_name}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">{profile?.email}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Your role</p>
              <p className="text-lg font-semibold capitalize">{profile?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Internal Printer Settings
          </CardTitle>
          <CardDescription>Connect to the H10P internal thermal printer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Printer Status</p>
              <p className="text-sm text-muted-foreground">
                {printerConnected ? "Connected" : "Not connected"}
              </p>
            </div>
            <Button onClick={connectPrinter} disabled={!Capacitor.isNativePlatform()}>
              <Printer className="mr-2 h-4 w-4" />
              {printerConnected ? "Reconnect" : "Connect Printer"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Bluetooth printing uses the built-in H10 service (`recieptservice.com.recieptservice`). Ensure the vendor app is
            installed and running on the device.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Customization</CardTitle>
          <CardDescription>Customize the appearance and content of printed receipts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Receipt Logo</Label>
            <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} />
            {logoUrl && (
              <div className="mt-2">
                <img src={logoUrl} alt="Receipt Logo" className="h-20 w-auto border rounded-md" />
                <Button variant="destructive" size="sm" onClick={handleRemoveLogo} className="mt-2">
                  Remove Logo
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company Address</Label>
            <Textarea
              id="companyAddress"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="123 Main St, City, Country"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyContact">Contact Information</Label>
            <Input
              id="companyContact"
              value={companyContact}
              onChange={(e) => setCompanyContact(e.target.value)}
              placeholder="Tel: +123456789 | Email: info@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptHeader">Receipt Header Text</Label>
            <Input
              id="receiptHeader"
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder="COLLECTION RECEIPT"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Receipt Footer Text</Label>
            <Textarea
              id="receiptFooter"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Thank you for your cooperation!"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontSize">Font Size (pt)</Label>
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger id="fontSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6pt (Very Small)</SelectItem>
                <SelectItem value="7">7pt (Small)</SelectItem>
                <SelectItem value="8">8pt (Default)</SelectItem>
                <SelectItem value="9">9pt (Medium)</SelectItem>
                <SelectItem value="10">10pt (Large)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={saveSettings} className="w-full">
            Save Receipt Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedSettingsTab;
