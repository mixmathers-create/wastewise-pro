import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printerService";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SettingsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pairing, setPairing] = useState<string | null>(null);

  const handleScanPrinter = async () => {
    if (!printerService.isAvailable()) {
      toast({
        title: "Not available",
        description: "Bluetooth printer is only available on Android app",
        variant: "destructive"
      });
      return;
    }

    setScanning(true);
    setAvailablePrinters([]);
    
    try {
      toast({
        title: "Scanning...",
        description: "Looking for nearby Bluetooth devices"
      });

      const devices = await printerService.scanForDevices((device) => {
        // Real-time device updates as they're discovered
        setAvailablePrinters(prev => {
          const exists = prev.find(d => d.address === device.address);
          if (!exists) {
            return [...prev, device];
          }
          return prev;
        });
      });

      setAvailablePrinters(devices);
      
      // Check if innerprinter is found
      const innerPrinter = devices.find(d => 
        d.name && d.name.toLowerCase().includes('innerprinter')
      );
      
      if (innerPrinter) {
        toast({
          title: "innerprinter found!",
          description: `Found ${innerPrinter.name} - ${innerPrinter.bonded ? 'Paired' : 'Not paired'}`
        });
      } else if (devices.length === 0) {
        toast({
          title: "No devices found",
          description: "Make sure Bluetooth is enabled on nearby devices",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Scan complete",
          description: `Found ${devices.length} device(s)`
        });
      }
    } catch (error: any) {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setScanning(false);
    }
  };

  const handlePairDevice = async (address: string, name: string) => {
    setPairing(address);
    try {
      const result = await printerService.pairDevice(address);
      toast({
        title: "Pairing initiated",
        description: `Pairing with ${name}. Check your device for pairing request.`
      });
      
      // Refresh device list after a short delay
      setTimeout(() => {
        handleScanPrinter();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Pairing failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPairing(null);
    }
  };

  const handleTestPrint = async () => {
    if (!printerService.isAvailable()) {
      toast({
        title: "Not available",
        description: "Bluetooth printer is only available on Android app",
        variant: "destructive"
      });
      return;
    }

    setConnecting(true);
    try {
      const printer = await printerService.findInnerPrinter();
      if (!printer) {
        toast({
          title: "innerprinter not found",
          description: "Please pair 'innerprinter' device in Bluetooth settings",
          variant: "destructive"
        });
        return;
      }

      await printerService.printReceipt({
        header: "TEST PRINT\nWasteWise Pro",
        items: [
          { label: "Date", value: new Date().toLocaleString() },
          { label: "Status", value: "Connected" }
        ],
        footer: "Test completed successfully"
      });

      toast({
        title: "Print successful",
        description: `Printed to ${printer.name}`
      });
    } catch (error: any) {
      toast({
        title: "Print failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Bluetooth Printer</CardTitle>
          <CardDescription>
            Prints to "innerprinter" device automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleScanPrinter} 
              disabled={scanning}
              variant="outline"
              className="flex-1"
            >
              {scanning ? "Scanning..." : "Scan for innerprinter"}
            </Button>
            <Button 
              onClick={handleTestPrint} 
              disabled={connecting}
              variant="default"
            >
              {connecting ? "Printing..." : "Test Print"}
            </Button>
          </div>

          {availablePrinters.length > 0 && (
            <div className="space-y-2">
              <Label>Discovered Devices ({availablePrinters.length})</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availablePrinters.map((printer) => (
                  <div 
                    key={printer.address} 
                    className={`p-3 border rounded flex items-center justify-between ${
                      printer.name && printer.name.toLowerCase().includes('innerprinter')
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{printer.name || 'Unnamed Device'}</p>
                        {printer.bonded && (
                          <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Paired
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{printer.address}</p>
                    </div>
                    {!printer.bonded && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePairDevice(printer.address, printer.name)}
                        disabled={pairing === printer.address}
                      >
                        {pairing === printer.address ? "Pairing..." : "Pair"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription>
              1. Click "Scan for innerprinter" to discover nearby Bluetooth devices<br/>
              2. If your printer isn't paired, click "Pair" next to it<br/>
              3. Once paired, the app will automatically print to "innerprinter"
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
