import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printerService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SchedulingParametersSettings } from "./SchedulingParametersSettings";

const SettingsTab = ({ profile }: { profile: any }) => {
  const { toast } = useToast();
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [serviceConnected, setServiceConnected] = useState(false);

  const handleConnectService = async () => {
    if (!printerService.isAvailable()) {
      toast({
        title: "Not Available",
        description: "Printer service only available on Android devices",
        variant: "destructive"
      });
      return;
    }

    try {
      await printerService.testConnection();
      setServiceConnected(true);
      toast({
        title: "Service Connected",
        description: "Printer service connection established successfully",
      });
    } catch (error: any) {
      setServiceConnected(false);
      console.error('Service connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not establish connection to printer service",
        variant: "destructive"
      });
    }
  };

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
        const versionLabel = result.serviceVersion ? ` · v${result.serviceVersion}` : '';
        toast({
          title: "Printer Connected",
          description: `${result.name || 'H10P Internal Printer'} ready${versionLabel}`,
        });
      } else {
        setPrinterStatus('error');
        toast({
          title: "Printer Not Ready",
          description: "The H10P vendor printer service is installed but not responding. Check device logs for details.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setPrinterStatus('error');
      console.error('Printer check error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Could not connect to printer service. Ensure the vendor service is running.",
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
      <SchedulingParametersSettings />
      
      <Card>
        <CardHeader>
          <CardTitle>Internal Printer</CardTitle>
          <CardDescription>
            H10P internal thermal printer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              The H10P has an internal 58mm ESC/POS thermal printer. 
              The vendor's printer service APK must be installed and running on the device.
              First click "Connect Service" to establish connection, then "Check Printer" to verify, and finally "Test Print" to test.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleConnectService}
              className="w-full"
              variant={serviceConnected ? 'default' : 'outline'}
            >
              {serviceConnected ? 'Service Connected' : 'Connect Service'}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCheckPrinter}
                className="flex-1"
                variant={printerStatus === 'connected' ? 'default' : 'outline'}
                disabled={!serviceConnected}
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
