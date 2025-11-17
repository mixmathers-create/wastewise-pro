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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import receiptservice.com.receiptservice.PrinterInterface;

@CapacitorPlugin(name = "BluetoothPrinter")
public class BluetoothPrinterPlugin extends Plugin {
    private static final String TAG = "BluetoothPrinterPlugin";
    private PrinterInterface printerInterface;
    private boolean isBound = false;
    private CountDownLatch connectionLatch;

    // Service connection for AIDL
    private ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            printerInterface = PrinterInterface.Stub.asInterface(service);
            isBound = true;
            if (connectionLatch != null) {
                connectionLatch.countDown();
            }
            Log.d(TAG, "Printer service connected");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            printerInterface = null;
            isBound = false;
            if (connectionLatch != null) {
                connectionLatch.countDown();
            }
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
            Context context = getContext();
            connectionLatch = new CountDownLatch(1);

            // Try explicit start first (may no-op if already running)
            Intent startIntent = new Intent();
            startIntent.setPackage("receiptservice.com.receiptservice");
            startIntent.setAction("receiptservice.com.receiptservice.PrinterInterface");
            try {
                context.startService(startIntent);
                Log.d(TAG, "Attempted to start printer service");
            } catch (Exception e) {
                Log.w(TAG, "Could not start service explicitly (may already be running): " + e.getMessage());
            }

            // First try implicit bind by action
            Intent bindIntent = new Intent();
            bindIntent.setPackage("receiptservice.com.receiptservice");
            bindIntent.setAction("receiptservice.com.receiptservice.PrinterInterface");

            android.content.pm.PackageManager pm = context.getPackageManager();
            java.util.List<android.content.pm.ResolveInfo> services = pm.queryIntentServices(bindIntent, 0);
            Log.d(TAG, "Available printer services found (implicit): " + services.size());
            for (android.content.pm.ResolveInfo info : services) {
                Log.d(TAG, "Service (implicit): " + info.serviceInfo.packageName + "/" + info.serviceInfo.name);
            }

            boolean bound = context.bindService(bindIntent, serviceConnection, Context.BIND_AUTO_CREATE);
            if (bound) {
                Log.d(TAG, "Successfully bound to printer service (implicit)");
                return;
            } else {
                Log.w(TAG, "bindService (implicit) returned false - trying explicit component names");
            }

            // Fallback: try common explicit service class names
            String[] candidateClasses = new String[] {
                "receiptservice.com.receiptservice.PrinterService",
                "receiptservice.com.receiptservice.InnerPrinterService",
                "receiptservice.com.receiptservice.PrintService",
                "receiptservice.com.receiptservice.ReceiptService"
            };

            for (String cls : candidateClasses) {
                try {
                    Intent explicit = new Intent();
                    explicit.setComponent(new ComponentName("receiptservice.com.receiptservice", cls));
                    boolean ok = context.bindService(explicit, serviceConnection, Context.BIND_AUTO_CREATE);
                    Log.d(TAG, "Attempted explicit bind to " + cls + " => " + ok);
                    if (ok) {
                        Log.d(TAG, "Successfully bound to printer service (explicit): " + cls);
                        return;
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "Explicit bind failed for " + cls + ": " + ex.getMessage());
                }
            }

            Log.e(TAG, "All attempts to bind to printer service failed");
            if (connectionLatch != null) {
                connectionLatch.countDown();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error binding to printer service", e);
            if (connectionLatch != null) {
                connectionLatch.countDown();
            }
        }
    }

    private boolean waitForServiceConnection(long timeoutMs) {
        try {
            if (connectionLatch != null) {
                return connectionLatch.await(timeoutMs, TimeUnit.MILLISECONDS);
            }
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            Log.e(TAG, "Interrupted while waiting for printer service", e);
            return false;
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        JSObject result = new JSObject();
        if (!isBound || printerInterface == null) {
            Log.d(TAG, "connect() called while not bound. Attempting to bind...");
            bindPrinterService();
            boolean connected = waitForServiceConnection(2000);
            if (!connected) {
                result.put("success", false);
                result.put("bound", isBound);
                result.put("interface", printerInterface != null);
                call.reject("Printer service not available. Check logcat for details.");
                return;
            }
        }
        if (isBound && printerInterface != null) {
            try {
                // Initialize printer with GB18030 charset
                String version = printerInterface.getServiceVersion();
                printerInterface.setCode("GB18030");
                Log.d(TAG, "Printer initialized with GB18030 encoding. Service version: " + version);

                result.put("success", true);
                result.put("name", "H10P Internal Printer");
                result.put("encoding", "GB18030");
                result.put("serviceVersion", version);
                call.resolve(result);
            } catch (RemoteException e) {
                Log.e(TAG, "Error initializing printer", e);
                result.put("success", false);
                result.put("error", "Failed to initialize printer: " + e.getMessage());
                call.reject("Failed to initialize printer", e);
            }
        } else {
            result.put("success", false);
            result.put("bound", isBound);
            result.put("interface", printerInterface != null);
            Log.e(TAG, "Printer not available - isBound: " + isBound + ", interface: " + (printerInterface != null));
            call.reject("Printer service not available. Check logcat for details.");
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void printText(PluginCall call) {
        if (!isBound || printerInterface == null) {
            Log.e(TAG, "printText failed - service not bound");
            call.reject("Printer service not available");
            return;
        }

        try {
            String text = call.getString("text", "");
            Integer align = call.getInt("align", 0);

            Log.d(TAG, "Printing text with alignment " + align + ": " + text);
            
            // Set alignment: 0=left, 1=center, 2=right
            printerInterface.setAlignment(align);
            
            // Print the text (already includes newline from calling code)
            printerInterface.printText(text);
            
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
            Log.e(TAG, "beginWork failed - service not bound");
            call.reject("Printer service not available");
            return;
        }

        try {
            Log.d(TAG, "Beginning print job");
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
            Log.e(TAG, "endWork failed - service not bound");
            call.reject("Printer service not available");
            return;
        }

        try {
            Log.d(TAG, "Ending print job");
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
