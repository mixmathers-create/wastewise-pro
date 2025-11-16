import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printerService";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SettingsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const teamName = profile?.teams?.name || profile?.team_id || "";
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const savedLogo = localStorage.getItem("receipt_logo");
    if (savedLogo) setLogoUrl(savedLogo);
    
    // Check if printer is already connected
    if (printerService.isConnected()) {
      setPrinterConnected(true);
    }
  }, []);

  const handleConnectPrinter = async () => {
    try {
      if (!printerService.isAvailable()) {
        toast({ 
          title: "Bluetooth Not Available", 
          description: "Bluetooth printer is only available on the Android app.",
          variant: "destructive" 
        });
        return;
      }

      setScanning(true);
      
      // List paired devices
      const pairedDevices = await printerService.listDevices();
      setDevices(pairedDevices);
      setShowDeviceDialog(true);
      setScanning(false);

      if (pairedDevices.length === 0) {
        toast({ 
          title: "No Paired Devices", 
          description: "Please pair your Bluetooth printer in Android Settings first." 
        });
      }
    } catch (error: any) {
      setScanning(false);
      toast({ title: "Bluetooth Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeviceSelect = async (device: any) => {
    try {
      const connected = await printerService.connect(device.address);
      if (connected) {
        setPrinterConnected(true);
        setShowDeviceDialog(false);
        toast({ title: "Printer Connected", description: `Connected to ${device.name}` });
      } else {
        toast({ title: "Connection Failed", description: "Could not connect to printer", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Connection Error", description: error.message, variant: "destructive" });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
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
    setLogoFile(null);
    localStorage.removeItem("receipt_logo");
    toast({ title: "Logo Removed", description: "Receipt logo has been removed" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Team and user details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Team</p>
              <p className="text-lg font-semibold">{teamName}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Your role</p>
              <p className="text-lg font-semibold capitalize">{profile?.role}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Full name</p>
              <p className="text-lg font-semibold">{profile?.full_name}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">{profile?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
          <CardDescription>Customize collection receipt appearance</CardDescription>
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
            <p className="text-xs text-muted-foreground">Upload a logo to appear on printed receipts</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Printer Settings</CardTitle>
          <CardDescription>Connect to Bluetooth printer</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnectPrinter} disabled={scanning}>
            {scanning ? "Scanning..." : printerConnected ? "Printer Connected ✓" : "Scan for Printer"}
          </Button>
          {printerConnected && (
            <p className="text-sm text-muted-foreground mt-2">
              Connected to: {printerService.getConnectedPrinter()?.name}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Bluetooth Printer</DialogTitle>
            <DialogDescription>Choose a paired device to connect</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paired devices found. Please pair your printer in Android Settings.</p>
            ) : (
              devices.map((device) => (
                <Button
                  key={device.address}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDeviceSelect(device)}
                >
                  <div className="text-left">
                    <p className="font-medium">{device.name || "Unknown Device"}</p>
                    <p className="text-xs text-muted-foreground">{device.address}</p>
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsTab;
