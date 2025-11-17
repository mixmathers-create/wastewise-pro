package app.lovable.d5da6030305c43408010d32b9004d074;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import recieptservice.com.recieptservice.PrinterInterface;

@CapacitorPlugin(name = "BluetoothPrinter")
public class BluetoothPrinterPlugin extends Plugin {
    private static final String TAG = "BluetoothPrinterPlugin";
    private PrinterInterface printerInterface;
    private boolean isBound = false;

    // Service connection for AIDL
    private ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            printerInterface = PrinterInterface.Stub.asInterface(service);
            isBound = true;
            Log.d(TAG, "Printer service connected");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            printerInterface = null;
            isBound = false;
            Log.d(TAG, "Printer service disconnected");
        }
    };

    @Override
    public void load() {
        super.load();
        bindPrinterService();
    }

    private void bindPrinterService() {
        try {
            Intent intent = new Intent();
            intent.setPackage("recieptservice.com.recieptservice");
            intent.setAction("recieptservice.com.recieptservice.PrinterInterface");
            
            Context context = getContext();
            
            // Log available services for debugging
            android.content.pm.PackageManager pm = context.getPackageManager();
            java.util.List<android.content.pm.ResolveInfo> services = pm.queryIntentServices(intent, 0);
            Log.d(TAG, "Available printer services: " + services.size());
            
            boolean bound = context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
            
            if (bound) {
                Log.d(TAG, "Binding to printer service...");
            } else {
                Log.e(TAG, "Failed to bind to printer service - service may not be installed");
                Log.e(TAG, "Make sure the H10P vendor printer service APK is installed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error binding to printer service", e);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        JSObject result = new JSObject();
        if (isBound && printerInterface != null) {
            result.put("success", true);
            result.put("name", "H10P Internal Printer");
            call.resolve(result);
        } else {
            result.put("success", false);
            result.put("error", "Printer service not connected");
            call.reject("Printer service not available");
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void printText(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            String text = call.getString("text", "");
            Integer align = call.getInt("align", 0);

            // Set alignment: 0=left, 1=center, 2=right
            printerInterface.setAlignment(align);
            
            // Print the text
            printerInterface.printText(text + "\n");
            
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error printing text", e);
            call.reject("Failed to print text: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printImage(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            String base64Image = call.getString("base64Image", "");
            Integer align = call.getInt("align", 1);

            // Decode base64 to bitmap
            byte[] decodedBytes = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);

            if (bitmap == null) {
                call.reject("Failed to decode image");
                return;
            }

            // Set alignment
            printerInterface.setAlignment(align);
            
            // Print bitmap
            printerInterface.printBitmap(bitmap);
            
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error printing image", e);
            call.reject("Failed to print image: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Error decoding image", e);
            call.reject("Failed to decode image: " + e.getMessage());
        }
    }

    @PluginMethod
    public void feedLine(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            Integer lines = call.getInt("lines", 1);
            printerInterface.nextLine(lines);
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error feeding line", e);
            call.reject("Failed to feed line: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cutPaper(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            // Feed extra lines before cut (simulating paper cut)
            printerInterface.nextLine(5);
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error cutting paper", e);
            call.reject("Failed to cut paper: " + e.getMessage());
        }
    }

    @PluginMethod
    public void beginWork(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            printerInterface.beginWork();
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error beginning work", e);
            call.reject("Failed to begin work: " + e.getMessage());
        }
    }

    @PluginMethod
    public void endWork(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            printerInterface.endWork();
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error ending work", e);
            call.reject("Failed to end work: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setTextBold(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            Boolean bold = call.getBoolean("bold", false);
            printerInterface.setTextBold(bold);
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error setting text bold", e);
            call.reject("Failed to set text bold: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setTextSize(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            Float size = call.getFloat("size", 24.0f);
            printerInterface.setTextSize(size);
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error setting text size", e);
            call.reject("Failed to set text size: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printQRCode(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer service not available");
            return;
        }

        try {
            String data = call.getString("data", "");
            Integer moduleSize = call.getInt("moduleSize", 8);
            Integer errorLevel = call.getInt("errorLevel", 3);
            Integer align = call.getInt("align", 1);

            printerInterface.setAlignment(align);
            printerInterface.printQRCode(data, moduleSize, errorLevel);
            
            call.resolve();
        } catch (RemoteException e) {
            Log.e(TAG, "Error printing QR code", e);
            call.reject("Failed to print QR code: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (isBound) {
            try {
                getContext().unbindService(serviceConnection);
                isBound = false;
            } catch (Exception e) {
                Log.e(TAG, "Error unbinding service", e);
            }
        }
    }
}
