# WasteWise Mobile App Setup Guide

## Overview
This guide will help you set up the WasteWise Android app for the Senraise H10 POS handheld device.

## Features
- **Collections Tab**: QR-based waste collection receipts
- **Clients Tab**: Client management and QR code viewing
- **Settings Tab**: Account information and receipt customization
- **Custom Numeric Keypad**: Touch-friendly input for number fields
- **Bluetooth Printer Integration**: Ready for lidta-capacitor-bl-printer

## Prerequisites
- Node.js and npm installed
- Android Studio installed
- Senraise H10 device or Android emulator (Android 14)
- Git access to your repository

## Setup Instructions

### 1. Export and Clone Project
1. Click "Export to Github" in Lovable
2. Clone the repository to your local machine:
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Android Platform
```bash
npx cap add android
```

### 4. Update Native Dependencies
```bash
npx cap update android
```

### 5. Build the Web Assets
```bash
npm run build
```

### 6. Sync with Native Platform
```bash
npx cap sync android
```

### 7. Open in Android Studio
```bash
npx cap open android
```

### 8. Configure for Senraise H10
In Android Studio:
1. Set minimum SDK to API 34 (Android 14)
2. Configure screen orientation in `AndroidManifest.xml` if needed
3. Add required permissions for Bluetooth printer

## Mobile-Specific Features

### Automatic Mobile Routing

**Main App File**: `src/App.tsx` (lines 14-18)
**Mobile Dashboard File**: `src/pages/MobileDashboard.tsx`
**Utils File**: `src/lib/capacitorUtils.ts`

The app automatically detects when running on a native platform and routes to the mobile dashboard (`/mobile`). The detection logic is in `src/App.tsx` at line 15:

```typescript
const DashboardComponent = isNativePlatform() ? MobileDashboard : Dashboard;
```

The mobile dashboard only shows:
- Collections Tab
- Clients Tab  
- Settings Tab

If you need to add more tabs to the mobile version, edit `src/pages/MobileDashboard.tsx` at lines 88-98 (TabsList section).

### Custom Numeric Keypad
For number inputs, a custom numeric keypad will automatically appear when running on the native Android app. This provides a better user experience than the system keyboard for POS-style input.

**Component File**: `src/components/mobile/MobileInput.tsx`
**Keypad Component**: `src/components/mobile/NumericKeypad.tsx`

To use the custom keypad in your components, import and replace standard Input components:

```typescript
// Add this import at the top of your file
import { MobileInput } from "@/components/mobile/MobileInput";

// Replace your Input component with MobileInput for number fields
<MobileInput
  type="number"
  value={value}
  onChange={setValue}
  allowDecimal={true}
  maxLength={10}
/>
```

**Example**: Replace in `src/components/collection/CreateReceiptForm.tsx` or any form with numeric inputs.

### Bluetooth Printer Service

**Service File**: `src/lib/printerService.ts`
**Utils File**: `src/lib/capacitorUtils.ts`

The printer service is set up and can be used in any component. Here's how to integrate it:

#### In Settings Tab (recommended location)

**File**: `src/components/dashboard/SettingsTab.tsx`

Add printer management section around line 70 (after the Receipt Settings card):

```typescript
// Add these imports at the top (line 7)
import { printerService } from "@/lib/printerService";
import { useState } from "react";

// Inside your component, add state for printer
const [printerConnected, setPrinterConnected] = useState(false);

// Add these handler functions
const handleConnectPrinter = async () => {
  try {
    const devices = await printerService.listDevices();
    if (devices.length > 0) {
      await printerService.connect(devices[0].address);
      setPrinterConnected(true);
      toast({ title: "Printer Connected", description: "Ready to print receipts" });
    }
  } catch (error) {
    toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
  }
};

// Add this Card component after the Receipt Settings card (around line 91)
<Card>
  <CardHeader>
    <CardTitle>Printer Settings</CardTitle>
    <CardDescription>Connect to Bluetooth printer</CardDescription>
  </CardHeader>
  <CardContent>
    <Button onClick={handleConnectPrinter}>
      {printerConnected ? "Printer Connected" : "Connect Printer"}
    </Button>
  </CardContent>
</Card>
```

#### In Collection Form (for direct printing)

**File**: `src/components/collection/CreateReceiptForm.tsx`

After receipt creation success (around line 100-120 in the form submit handler):

```typescript
// Import at the top
import { printerService } from "@/lib/printerService";

// In your onSubmit or success handler, add:
if (printerService.isConnected()) {
  await printerService.printReceipt({
    header: "WasteWise Collection Receipt",
    items: [
      { label: "Client", value: clientName },
      { label: "Date", value: new Date().toLocaleDateString() },
      { label: "QR Code", value: qrCode },
      { label: "Weight", value: `${weight} kg` }
    ],
    footer: "Thank you for using WasteWise!"
  });
}
```

**Note**: The printer service currently has placeholder implementations at lines 40-113 in `src/lib/printerService.ts`. You'll need to replace these with actual [lidta-capacitor-bl-printer](https://www.npmjs.com/package/lidta-capacitor-bl-printer) API calls.

## Display Optimization

**Mobile UI File**: `src/pages/MobileDashboard.tsx`

The mobile UI is optimized for the H10's handheld display with specific styling:

- **Compact header** (line 77): `h-14` (14px height)
- **Touch-friendly icons** (line 80): `h-8 w-8` for header icons
- **Reduced padding** (line 85): `px-3` instead of default `px-4`
- **Smaller fonts** (line 84): `text-base` for title
- **Compact buttons** (line 86): `size="sm"` and `h-8` height
- **Grid layouts** (line 88): `grid-cols-3` for tab navigation
- **Proper scrolling** (line 94): `overflow-auto` on main content container

To adjust sizes for your specific H10 device, modify these values in `src/pages/MobileDashboard.tsx`.

## Testing

### On Physical Device
1. Connect your Senraise H10 device via USB
2. Enable USB debugging on the device
3. In Android Studio, select your device
4. Click "Run"

### On Emulator
1. Create an Android 14 emulator in Android Studio
2. Set screen size to ~5.5" (similar to H10)
3. Run the app

## Hot Reload During Development
The app is configured for hot reload from the Lovable sandbox. Any changes you make in Lovable will automatically sync to the device when connected.

**Important**: After pulling changes from Git, always run:
```bash
npx cap sync android
```

## Printer Integration

The project now uses **`capacitor-thermal-printer`** which is compatible with Capacitor 7 and provides a high-performance, feature-rich printing experience.

### 1. Configure AndroidManifest.xml - Add Bluetooth permissions

**File**: `android/app/src/main/AndroidManifest.xml`

Add these permissions inside the `<manifest>` tag, before the `<application>` tag (typically around line 4-6):

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

Example placement:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Insert Bluetooth permissions here (after line 2) -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    
    <application>
        ...
    </application>
</manifest>
```

### 2. Printer Service Implementation

**File**: `src/lib/printerService.ts`

The printer service is now fully implemented using `capacitor-thermal-printer`. The API includes:

- **`connect(address: string)`** - Connect to a printer by Bluetooth address
- **`disconnect()`** - Disconnect from the current printer
- **`listDevices()`** - Get list of available Bluetooth printers
- **`printText(text: string)`** - Print plain text
- **`printReceipt(data)`** - Print formatted receipts with styling

The library uses a high-performance builder pattern for advanced formatting. See the [capacitor-thermal-printer documentation](https://github.com/malik12tree/capacitor-thermal-printer) for more features like QR codes, barcodes, and images.

### 3. Using the Printer

**Important**: With `capacitor-thermal-printer`, you must pair the Bluetooth printer in Android Settings first, then use its Bluetooth address to connect.

#### Get Printer Bluetooth Address

1. On the H10 device, go to **Settings → Bluetooth**
2. Pair with your thermal printer
3. Note the Bluetooth address (e.g., `00:11:22:33:44:55`)

#### Connect and Print

```typescript
import { printerService } from "@/lib/printerService";

// Connect using the Bluetooth address from Android settings
await printerService.connect('00:11:22:33:44:55');

// Print a receipt
await printerService.printReceipt({
  header: "WasteWise Collection Receipt",
  items: [
    { label: "Client", value: "ABC Corp" },
    { label: "Date", value: "2025-01-15" },
    { label: "Weight", value: "150 kg" }
  ],
  footer: "Thank you!",
  logo: base64Logo // Optional base64 image
});

// Disconnect when done
await printerService.disconnect();
```

#### Advanced Printing Features

The `capacitor-thermal-printer` library supports:
- **Text formatting**: Bold, underline, double-width
- **Alignment**: Left, center, right
- **Images**: Print logos from base64 strings
- **QR Codes**: Generate and print QR codes
- **Barcodes**: UPC, EAN, Code128, etc.
- **Paper control**: Cut paper automatically

Example with QR code:
```typescript
await CapacitorThermalPrinter
  .begin()
  .align('center')
  .text('Scan for more info:\n')
  .qr('https://wastewise.com/receipt/123')
  .cutPaper()
  .write();
```

## Troubleshooting

### Build Errors
- Run `npx cap sync android` after any dependency changes
- Clear build cache in Android Studio: Build > Clean Project

### App Not Loading
- Check that the server URL in `capacitor.config.ts` is correct
- Ensure device is on the same network (for hot reload)

### Printer Not Connecting
- Verify Bluetooth permissions in AndroidManifest.xml
- Check that lidta-capacitor-bl-printer is properly configured
- Test Bluetooth connection manually on the device

## Production Build

For production deployment (without hot reload):

1. Remove or comment out the `server` section in `capacitor.config.ts`:
   ```typescript
   // server: {
   //   url: 'https://...',
   //   cleartext: true
   // },
   ```

2. Build and sync:
   ```bash
   npm run build
   npx cap sync android
   ```

3. Generate signed APK in Android Studio

## Support Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Lovable Mobile Development Guide](https://docs.lovable.dev)
- [lidta-capacitor-bl-printer](https://www.npmjs.com/package/lidta-capacitor-bl-printer)
- [Senraise H10 Documentation](https://www.senraise.com/)
