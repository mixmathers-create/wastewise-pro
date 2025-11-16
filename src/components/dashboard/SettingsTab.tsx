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
    try {
      const devices = await printerService.listDevices();
      setAvailablePrinters(devices);
      
      // Check if innerprinter is found
      const innerPrinter = devices.find(d => 
        d.name && d.name.toLowerCase().includes('innerprinter')
      );
      
      if (innerPrinter) {
        toast({
          title: "innerprinter found!",
          description: `Ready to print to ${innerPrinter.name}`
        });
      } else if (devices.length === 0) {
        toast({
          title: "No devices found",
          description: "Make sure Bluetooth is enabled and devices are paired",
          variant: "destructive"
        });
      } else {
        toast({
          title: "innerprinter not found",
          description: `Found ${devices.length} device(s) but no 'innerprinter'`,
          variant: "destructive"
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
              <Label>Paired Devices ({availablePrinters.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {availablePrinters.map((printer) => (
                  <div 
                    key={printer.address} 
                    className={`p-3 border rounded ${
                      printer.name && printer.name.toLowerCase().includes('innerprinter')
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card'
                    }`}
                  >
                    <p className="font-medium">{printer.name || 'Unnamed Device'}</p>
                    <p className="text-sm text-muted-foreground">{printer.address}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription>
              The app will automatically find and print to "innerprinter" when you click Print on receipts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
