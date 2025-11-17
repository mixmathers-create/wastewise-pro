# Bluetooth Printer Setup Guide for WasteWise H10

## Quick Start

The Android app now uses a custom **`BluetoothPrinter` Capacitor plugin** that binds directly to the vendor printer service `recieptservice.com.recieptservice` (DevCheck reports version **8.3.6** on H10 firmware). No third-party printer libraries are required.

## Step 1: Update and Sync Android

## Step 1: Update and Sync Android

1. Pull the latest changes from your repository.
2. Run `npm install` to refresh web dependencies.
3. Run `npx cap sync android` to regenerate the native project without any external printer plugin modules.
4. Open Android Studio with `npx cap open android` and let Gradle finish syncing.

## Step 2: Configure Android Permissions

**File**: `android/app/src/main/AndroidManifest.xml`

Add these Bluetooth permissions inside the `<manifest>` tag (before `<application>`):

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Step 3: Pair Your Printer

### On the Senraise H10 Device:

1. Go to **Settings → Bluetooth**
2. Turn on Bluetooth if not already enabled
3. Search for your thermal printer (make sure it's powered on)
4. Pair with the printer
5. **Write down the Bluetooth address** (looks like `00:11:22:33:44:55` or similar)

### For H10 Built-in Printer:

The H10 device has an integrated thermal printer. Check the device documentation for its Bluetooth address, or look in:
- **Settings → About Device → Bluetooth Address**
- Or it may auto-pair as an internal device

## Step 4: Connect and Test Printing

### Option A: Add Printer Connection to Settings Tab

**File**: `src/components/dashboard/SettingsTab.tsx`

Add this code after the Receipt Settings card (around line 91):

```typescript
import { printerService } from "@/lib/printerService";
import { useState } from "react";
import { Input } from "@/components/ui/input";

// Inside your component, add state
const [printerAddress, setPrinterAddress] = useState("");
const [printerConnected, setPrinterConnected] = useState(false);

// Add handler
const handleConnectPrinter = async () => {
  try {
    await printerService.connect(printerAddress);
    setPrinterConnected(true);
    toast({ 
      title: "Printer Connected", 
      description: "Ready to print receipts" 
    });
  } catch (error: any) {
    toast({ 
      title: "Connection Failed", 
      description: error.message, 
      variant: "destructive" 
    });
  }
};

// Add UI card
<Card>
  <CardHeader>
    <CardTitle>Bluetooth Printer</CardTitle>
    <CardDescription>Connect to thermal printer</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <Label htmlFor="printer-address">Printer Bluetooth Address</Label>
      <Input
        id="printer-address"
        placeholder="00:11:22:33:44:55"
        value={printerAddress}
        onChange={(e) => setPrinterAddress(e.target.value)}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Pair printer in Android Settings first, then enter its address
      </p>
    </div>
    <Button 
      onClick={handleConnectPrinter}
      variant={printerConnected ? "outline" : "default"}
      disabled={!printerAddress}
    >
      {printerConnected ? "✓ Printer Connected" : "Connect Printer"}
    </Button>
    {printerConnected && (
      <Button 
        onClick={async () => {
          try {
            await printerService.printText("Test Print from WasteWise\n\n\n");
            toast({ title: "Test Print Sent" });
          } catch (error: any) {
            toast({ 
              title: "Print Failed", 
              description: error.message, 
              variant: "destructive" 
            });
          }
        }}
        variant="secondary"
      >
        Test Print
      </Button>
    )}
  </CardContent>
</Card>
```

### Option B: Test in Browser Console (for debugging)

Open Chrome DevTools on your connected device and run:

```javascript
import { printerService } from "@/lib/printerService";

// Replace with your printer's address
await printerService.connect('00:11:22:33:44:55');

// Test print
await printerService.printText("Hello from WasteWise!\n\n\n");
```

## Step 5: Add Auto-Print to Collection Receipts

**File**: `src/components/collection/CreateReceiptForm.tsx`

In your form submit/success handler, add automatic printing:

```typescript
import { printerService } from "@/lib/printerService";

// After successfully creating the receipt in the database
if (printerService.isConnected()) {
  try {
    await printerService.printReceipt({
      header: "WasteWise Collection Receipt",
      items: [
        { label: "Client", value: clientData.name },
        { label: "Date", value: new Date().toLocaleDateString() },
        { label: "QR Code", value: receiptQR },
        { label: "Driver", value: driverName },
        { label: "Truck", value: truckCode },
        { label: "Total Weight", value: `${totalWeight} kg` },
      ],
      footer: "Thank you for choosing WasteWise!",
      logo: localStorage.getItem("receipt_logo") || undefined
    });
    
    toast({ 
      title: "Receipt Printed", 
      description: "Collection receipt sent to printer" 
    });
  } catch (error) {
    console.error('Print error:', error);
    toast({ 
      title: "Print Failed", 
      description: "Receipt saved but printing failed", 
      variant: "destructive" 
    });
  }
}
```

## Advanced Printing Features

### Print with QR Code

```typescript
import { CapacitorThermalPrinter } from 'capacitor-thermal-printer';

await CapacitorThermalPrinter
  .begin()
  .align('center')
  .bold()
  .text('WasteWise Receipt\n')
  .clearFormatting()
  .text('Scan for details:\n')
  .qr('https://wastewise.com/receipt/' + receiptId)
  .text('\nThank you!\n')
  .cutPaper()
  .write();
```

### Print Logo Image

```typescript
// Logo must be base64 encoded
const logo = localStorage.getItem("receipt_logo");

await printerService.printReceipt({
  header: "Your Company Name",
  items: [
    { label: "Order ID", value: "12345" }
  ],
  logo: logo // base64 string
});
```

### Custom Formatting

```typescript
await CapacitorThermalPrinter
  .begin()
  .align('center')
  .doubleWidth()
  .text('TOTAL: $25.00\n')
  .clearFormatting()
  .align('left')
  .underline()
  .text('Payment Details:\n')
  .clearFormatting()
  .text('Cash: $30.00\n')
  .text('Change: $5.00\n')
  .cutPaper()
  .write();
```

## Troubleshooting

### "Printer not connected" error
- Verify the printer is paired in Android Settings
- Check the Bluetooth address is correct (no typos)
- Ensure printer is powered on and in range
- Try re-pairing the device

### Nothing prints
- Check printer has paper
- Verify printer is an ESC/POS compatible model
- Test with the H10's built-in printer first
- Check if printer needs to be "opened" or initialized in Android

### Permission denied errors
- Verify all Bluetooth permissions are in AndroidManifest.xml
- Grant location permissions (required for Bluetooth scanning on Android)
- Rebuild the app after adding permissions: `npx cap sync android`

### Connection works but prints garbage
- Your printer may not be ESC/POS compatible
- Try a different encoding or printer model
- Check printer documentation for supported command sets

## Printer Compatibility

The `capacitor-thermal-printer` library works with:
- ✅ ESC/POS thermal printers
- ✅ Most 58mm and 80mm receipt printers
- ✅ Bluetooth-enabled POS printers
- ✅ Senraise H10 built-in printer (ESC/POS compatible)

Not compatible with:
- ❌ Non-ESC/POS printers
- ❌ USB-only printers (without Bluetooth)
- ❌ Network/WiFi printers (different library needed)

## Resources

- [capacitor-thermal-printer GitHub](https://github.com/malik12tree/capacitor-thermal-printer)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [Senraise H10 Documentation](https://www.senraise.com/h10-point-of-sale-pos-machine-handheld-nfc-pos-senraise.html)

## Support

If you continue to have issues:
1. Check the printer works with other apps first
2. Try the test print function in Settings
3. Check Android logs: `adb logcat | grep Bluetooth`
4. Verify ESC/POS compatibility with your printer manufacturer
