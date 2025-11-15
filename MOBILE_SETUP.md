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
The app automatically detects when running on a native platform and routes to the mobile dashboard (`/mobile`). The mobile dashboard only shows:
- Collections Tab
- Clients Tab  
- Settings Tab

### Custom Numeric Keypad
For number inputs, a custom numeric keypad will automatically appear when running on the native Android app. This provides a better user experience than the system keyboard for POS-style input.

To use the custom keypad in your components:
```typescript
import { MobileInput } from "@/components/mobile/MobileInput";

<MobileInput
  type="number"
  value={value}
  onChange={setValue}
  allowDecimal={true}
  maxLength={10}
/>
```

### Bluetooth Printer Service
The printer service is set up at `src/lib/printerService.ts`. To use it:

```typescript
import { printerService } from "@/lib/printerService";

// List available devices
const devices = await printerService.listDevices();

// Connect to a printer
await printerService.connect(deviceAddress);

// Print a receipt
await printerService.printReceipt({
  header: "WasteWise Collection Receipt",
  items: [
    { label: "Client", value: "ABC Corp" },
    { label: "Date", value: "2025-01-15" },
    { label: "Weight", value: "150 kg" }
  ],
  footer: "Thank you!"
});

// Disconnect
await printerService.disconnect();
```

**Note**: The printer service currently has placeholder implementations. You'll need to configure it according to the [lidta-capacitor-bl-printer documentation](https://www.npmjs.com/package/lidta-capacitor-bl-printer).

## Display Optimization

The mobile UI is optimized for the H10's handheld display:
- Compact header (14px height)
- Touch-friendly button sizes
- Reduced padding and margins
- Responsive grid layouts
- Full-screen tabs with proper scrolling

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

## Printer Integration TODO
The Bluetooth printer integration needs the following configurations:

1. **Configure AndroidManifest.xml** - Add Bluetooth permissions:
   ```xml
   <uses-permission android:name="android.permission.BLUETOOTH" />
   <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
   <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
   ```

2. **Update printerService.ts** - Implement actual lidta-capacitor-bl-printer API calls based on the package documentation

3. **Test with H10 built-in printer** - The Senraise H10 has a built-in thermal printer that should work with the lidta library

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
