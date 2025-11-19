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
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSArray;

import org.json.JSONException;

import recieptservice.com.recieptservice.PrinterInterface;

@CapacitorPlugin(name = "BluetoothPrinter")
public class BluetoothPrinterPlugin extends Plugin {
    private static final String TAG = "BluetoothPrinterPlugin";
    private static final long CONNECTION_TIMEOUT_MS = 8000;
    private static final String[][] SERVICE_CANDIDATES = new String[][] {
        {"recieptservice.com.recieptservice", "recieptservice.com.recieptservice.service.PrinterService"}
    };
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
            bindPrinterService();
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
            isBound = false;
            printerInterface = null;

            for (String[] candidate : SERVICE_CANDIDATES) {
                String pkg = candidate[0];
                String cls = candidate[1];

                // First attempt: explicit component only (matches supplier instructions)
                try {
                    Intent explicitComponent = new Intent();
                    explicitComponent.setClassName(pkg, cls);
                    boolean ok = context.bindService(explicitComponent, serviceConnection, Context.BIND_AUTO_CREATE);
                    Log.d(TAG, "Attempted bind to " + pkg + "/" + cls + " (component only) => " + ok);
                    if (ok) {
                        Log.d(TAG, "Successfully bound to printer service: " + pkg + "/" + cls);
                        return;
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "Component bind failed for " + pkg + "/" + cls + ": " + ex.getMessage());
                }

                // Fallback: include the AIDL action string for older firmware
                try {
                    Intent withAction = new Intent(pkg + ".PrinterInterface");
                    withAction.setClassName(pkg, cls);
                    boolean ok = context.bindService(withAction, serviceConnection, Context.BIND_AUTO_CREATE);
                    Log.d(TAG, "Attempted bind to " + pkg + "/" + cls + " (with action) => " + ok);
                    if (ok) {
                        Log.d(TAG, "Successfully bound to printer service: " + pkg + "/" + cls);
                        return;
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "Action bind failed for " + pkg + "/" + cls + ": " + ex.getMessage());
                }
            }
            Log.e(TAG, "Failed to bind to any printer service candidate");
        } catch (Exception e) {
            Log.e(TAG, "Error binding printer service: " + e.getMessage());
        }
    }

    private boolean waitForServiceConnection() {
        try {
            if (connectionLatch != null) {
                boolean connected = connectionLatch.await(CONNECTION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
                if (!connected) {
                    Log.e(TAG, "Service connection timeout after " + CONNECTION_TIMEOUT_MS + "ms");
                }
                return connected && isBound;
            }
            return isBound;
        } catch (InterruptedException e) {
            Log.e(TAG, "Interrupted while waiting for service connection", e);
            return false;
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!waitForServiceConnection()) {
            call.reject("Failed to connect to printer service");
            return;
        }

        try {
            // Initialize printer with GB18030 encoding
            byte[] initCommand = new byte[]{0x1B, 0x40, 0x1C, 0x26, 0x1C, 0x43, 0x00};
            printerInterface.printEpson(initCommand);

            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("service", "PrinterService");
            try {
                ret.put("version", printerInterface.getServiceVersion());
            } catch (RemoteException e) {
                ret.put("version", "unknown");
            }
            call.resolve(ret);
        } catch (RemoteException e) {
            call.reject("Failed to initialize printer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("disconnected", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text");
        Integer alignment = call.getInt("alignment", 0);

        if (text == null) {
            call.reject("Text is required");
            return;
        }

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.setAlignment(alignment);
            printerInterface.printText(text);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to print text: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printImage(PluginCall call) {
        String base64Image = call.getString("base64Image");
        Integer alignment = call.getInt("alignment", 0);

        if (base64Image == null) {
            call.reject("base64Image is required");
            return;
        }

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            if (bitmap == null) {
                call.reject("Failed to decode image");
                return;
            }

            printerInterface.setAlignment(alignment);
            printerInterface.printBitmap(bitmap);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to print image: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printBarcode(PluginCall call) {
        String data = call.getString("data");
        Integer symbology = call.getInt("symbology", 73);
        Integer height = call.getInt("height", 162);
        Integer width = call.getInt("width", 2);
        Integer alignment = call.getInt("alignment", 1);

        if (data == null) {
            call.reject("Barcode data is required");
            return;
        }

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.setAlignment(alignment);
            printerInterface.printBarCode(data, symbology, height, width);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to print barcode: " + e.getMessage());
        }
    }

    @PluginMethod
    public void feedLine(PluginCall call) {
        Integer lines = call.getInt("lines", 1);

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.nextLine(lines);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to feed line: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cutPaper(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.nextLine(5);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to cut paper: " + e.getMessage());
        }
    }

    @PluginMethod
    public void beginWork(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.beginWork();
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to begin work: " + e.getMessage());
        }
    }

    @PluginMethod
    public void endWork(PluginCall call) {
        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.endWork();
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to end work: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setTextBold(PluginCall call) {
        Boolean bold = call.getBoolean("bold", false);

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.setTextBold(bold);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to set text bold: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setTextSize(PluginCall call) {
        Float size = call.getFloat("size", 1.0f);

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.setTextSize(size);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to set text size: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printQRCode(PluginCall call) {
        String data = call.getString("data");
        Integer moduleSize = call.getInt("moduleSize", 8);
        Integer errorLevel = call.getInt("errorLevel", 3);
        Integer alignment = call.getInt("alignment", 1);

        if (data == null) {
            call.reject("QR code data is required");
            return;
        }

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            printerInterface.setAlignment(alignment);
            printerInterface.printQRCode(data, moduleSize, errorLevel);
            call.resolve();
        } catch (RemoteException e) {
            call.reject("Failed to print QR code: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printTableText(PluginCall call) {
        try {
            JSArray textArray = call.getArray("text");
            JSArray weightArray = call.getArray("weight");
            JSArray alignmentArray = call.getArray("alignment");

            if (textArray == null || weightArray == null || alignmentArray == null) {
                call.reject("text, weight, and alignment arrays are required");
                return;
            }

            String[] text = new String[textArray.length()];
            int[] weight = new int[weightArray.length()];
            int[] alignment = new int[alignmentArray.length()];

            for (int i = 0; i < textArray.length(); i++) {
                text[i] = textArray.getString(i);
            }
            for (int i = 0; i < weightArray.length(); i++) {
                weight[i] = weightArray.getInt(i);
            }
            for (int i = 0; i < alignmentArray.length(); i++) {
                alignment[i] = alignmentArray.getInt(i);
            }

            if (!isBound || printerInterface == null) {
                call.reject("Printer not connected");
                return;
            }

            printerInterface.printTableText(text, weight, alignment);
            call.resolve();
        } catch (JSONException | RemoteException e) {
            call.reject("Failed to print table text: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printEpson(PluginCall call) {
        String base64Data = call.getString("data");

        if (base64Data == null) {
            call.reject("data is required");
            return;
        }

        if (!isBound || printerInterface == null) {
            call.reject("Printer not connected");
            return;
        }

        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            printerInterface.printEpson(data);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to print Epson data: " + e.getMessage());
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
