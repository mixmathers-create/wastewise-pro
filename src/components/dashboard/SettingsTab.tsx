import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printerService";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SettingsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  const handleCheckPrinter = async () => {
    if (!printerService.isAvailable()) {
      toast({
        title: "Not Available",
        description: "Printer service only available on Android devices",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await printerService.testConnection();
      if (result.success) {
        setPrinterStatus('connected');
        toast({
          title: "Printer Connected",
          description: result.name || "H10P Internal Printer ready",
        });
      } else {
        setPrinterStatus('error');
        toast({
          title: "Printer Not Ready",
          description: "The H10P vendor printer service is not installed or not running. Please install the vendor's printer service APK.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setPrinterStatus('error');
      console.error('Printer check error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "H10P vendor printer service not available. Ensure the vendor APK is installed.",
        variant: "destructive"
      });
    }
  };

  const handleTestPrint = async () => {
    if (!printerService.isAvailable()) {
      toast({
        title: "Not Available",
        description: "Printer service only available on Android devices",
        variant: "destructive"
      });
      return;
    }

    try {
      await printerService.printTest();
      toast({
        title: "Print Successful",
        description: "Test receipt printed successfully",
      });
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: "Print Failed",
        description: error.message || "Failed to print test receipt",
        variant: "destructive"
      });
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
          <Alert>
            <AlertDescription>
              The H10P has an internal 58mm ESC/POS thermal printer. 
              This requires the vendor's printer service APK to be installed on the device.
              Click "Check Printer" to verify the connection to the internal printer service,
              then use "Test Print" to print a test receipt.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button 
                onClick={handleCheckPrinter}
                className="flex-1"
                variant={printerStatus === 'connected' ? 'default' : 'outline'}
              >
                Check Printer
              </Button>
              <Button 
                onClick={handleTestPrint} 
                variant="outline"
                disabled={printerStatus !== 'connected'}
              >
                Test Print
              </Button>
            </div>

            {printerStatus === 'connected' && (
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  ✓ H10P Internal Printer Connected
                </p>
              </div>
            )}
            
            {printerStatus === 'error' && (
              <div className="p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  ✗ Printer service not available
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Please ensure the H10P vendor printer service APK is installed on this device
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
