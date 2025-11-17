package app.lovable.d5da6030305c43408010d32b9004d074;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.util.Base64;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(alias = "bluetooth", strings = {
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        })
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket bluetoothSocket;
    private OutputStream outputStream;
    private BluetoothDevice connectedDevice;
    private PluginCall scanCall;
    private List<BluetoothDevice> discoveredDevices = new ArrayList<>();
    
    // Standard UUID for SPP (Serial Port Profile)
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    
    // ESC/POS Commands
    private static final byte[] ESC_INIT = {0x1B, 0x40};
    private static final byte[] ESC_ALIGN_LEFT = {0x1B, 0x61, 0x00};
    private static final byte[] ESC_ALIGN_CENTER = {0x1B, 0x61, 0x01};
    private static final byte[] ESC_ALIGN_RIGHT = {0x1B, 0x61, 0x02};
    private static final byte[] ESC_BOLD_ON = {0x1B, 0x45, 0x01};
    private static final byte[] ESC_BOLD_OFF = {0x1B, 0x45, 0x00};
    private static final byte[] ESC_FEED_LINE = {0x0A};
    private static final byte[] ESC_CUT_PAPER = {0x1D, 0x56, 0x41, 0x00};

    private final BroadcastReceiver bluetoothReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null && !discoveredDevices.contains(device)) {
                    discoveredDevices.add(device);
                    
                    // Send discovered device to JS
                    if (scanCall != null) {
                        try {
                            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                                JSObject deviceInfo = new JSObject();
                                deviceInfo.put("name", device.getName() != null ? device.getName() : "Unknown Device");
                                deviceInfo.put("address", device.getAddress());
                                deviceInfo.put("bonded", device.getBondState() == BluetoothDevice.BOND_BONDED);
                                
                                JSObject notification = new JSObject();
                                notification.put("event", "deviceFound");
                                notification.put("device", deviceInfo);
                                scanCall.resolve(notification);
                            }
                        } catch (Exception e) {
                            // Ignore notification errors
                        }
                    }
                }
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                if (scanCall != null) {
                    JSArray devices = new JSArray();
                    try {
                        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                            for (BluetoothDevice device : discoveredDevices) {
                                JSObject deviceInfo = new JSObject();
                                deviceInfo.put("name", device.getName() != null ? device.getName() : "Unknown Device");
                                deviceInfo.put("address", device.getAddress());
                                deviceInfo.put("bonded", device.getBondState() == BluetoothDevice.BOND_BONDED);
                                devices.put(deviceInfo);
                            }
                        }
                    } catch (Exception e) {
                        // Ignore errors
                    }
                    
                    JSObject result = new JSObject();
                    result.put("event", "scanComplete");
                    result.put("devices", devices);
                    scanCall.resolve(result);
                    scanCall = null;
                }
            } else if (BluetoothDevice.ACTION_BOND_STATE_CHANGED.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                int bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.BOND_NONE);
                
                if (device != null && scanCall != null) {
                    try {
                        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                            JSObject notification = new JSObject();
                            notification.put("event", "bondStateChanged");
                            notification.put("address", device.getAddress());
                            notification.put("name", device.getName());
                            notification.put("bonded", bondState == BluetoothDevice.BOND_BONDED);
                            scanCall.resolve(notification);
                        }
                    } catch (Exception e) {
                        // Ignore errors
                    }
                }
            }
        }
    };

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        
        // Register broadcast receiver for Bluetooth events
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        filter.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
        getContext().registerReceiver(bluetoothReceiver, filter);
    }
    
    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            getContext().unregisterReceiver(bluetoothReceiver);
        } catch (Exception e) {
            // Receiver may not be registered
        }
    }
    
    private boolean isValidMacAddress(String address) {
        if (address == null || address.isEmpty()) {
            return false;
        }
        return address.matches("^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$");
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestAllPermissions(call, "permissionsCallback");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is not enabled");
            return;
        }

        try {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Bluetooth permissions not granted");
                return;
            }

            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devices = new JSArray();

            for (BluetoothDevice device : pairedDevices) {
                JSObject deviceInfo = new JSObject();
                deviceInfo.put("name", device.getName());
                deviceInfo.put("address", device.getAddress());
                deviceInfo.put("bonded", true);
                devices.put(deviceInfo);
            }

            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error listing devices: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scanForDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is not enabled");
            return;
        }

        try {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Bluetooth scan permissions not granted");
                return;
            }

            // Cancel any ongoing discovery
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }

            discoveredDevices.clear();
            scanCall = call;
            
            // Start discovery
            boolean started = bluetoothAdapter.startDiscovery();
            if (!started) {
                call.reject("Failed to start Bluetooth discovery");
                scanCall = null;
            }
        } catch (Exception e) {
            call.reject("Error scanning for devices: " + e.getMessage());
            scanCall = null;
        }
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
            try {
                if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED) {
                    bluetoothAdapter.cancelDiscovery();
                }
            } catch (Exception e) {
                // Ignore errors
            }
        }
        scanCall = null;
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void pairDevice(PluginCall call) {
        String address = call.getString("address");
        
        if (address == null || !isValidMacAddress(address)) {
            call.reject("Invalid MAC address");
            return;
        }

        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        try {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Bluetooth permissions not granted");
                return;
            }

            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            
            // Check if already bonded
            if (device.getBondState() == BluetoothDevice.BOND_BONDED) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Device already paired");
                call.resolve(result);
                return;
            }

            // Start pairing process
            boolean pairingStarted = device.createBond();
            
            if (pairingStarted) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("message", "Pairing initiated");
                call.resolve(result);
            } else {
                call.reject("Failed to start pairing");
            }
        } catch (Exception e) {
            call.reject("Pairing error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        
        if (address == null || !isValidMacAddress(address)) {
            call.reject("Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX");
            return;
        }

        // Close existing connection if any
        if (bluetoothSocket != null) {
            try {
                disconnect(null);
            } catch (Exception e) {
                // Ignore disconnect errors
            }
        }

        try {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Bluetooth permissions not granted");
                return;
            }

            connectedDevice = bluetoothAdapter.getRemoteDevice(address);
            
            // Connect in background thread
            new Thread(() -> {
                try {
                    // Create socket connection
                    bluetoothSocket = connectedDevice.createRfcommSocketToServiceRecord(SPP_UUID);
                    
                    // Cancel discovery to speed up connection
                    if (bluetoothAdapter.isDiscovering()) {
                        bluetoothAdapter.cancelDiscovery();
                    }
                    
                    // Connect to the device
                    bluetoothSocket.connect();
                    
                    // Get output stream
                    outputStream = bluetoothSocket.getOutputStream();
                    
                    // Initialize printer
                    outputStream.write(ESC_INIT);
                    outputStream.flush();
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("name", connectedDevice.getName());
                    result.put("address", connectedDevice.getAddress());
                    call.resolve(result);
                    
                } catch (IOException e) {
                    call.reject("Connection failed: " + e.getMessage());
                    cleanup();
                }
            }).start();
            
        } catch (Exception e) {
            call.reject("Connection failed: " + e.getMessage());
            cleanup();
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        cleanup();
        if (call != null) {
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        }
    }
    
    private void cleanup() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
                bluetoothSocket = null;
            }
            connectedDevice = null;
        } catch (IOException e) {
            // Ignore cleanup errors
        }
    }
    
    @PluginMethod
    public void printText(PluginCall call) {
        if (outputStream == null || bluetoothSocket == null || !bluetoothSocket.isConnected()) {
            call.reject("Printer not connected");
            return;
        }
        
        String text = call.getString("text");
        int align = call.getInt("align", 0);
        
        if (text == null) {
            call.reject("Text is required");
            return;
        }
        
        try {
            // Set alignment
            switch (align) {
                case 1:
                    outputStream.write(ESC_ALIGN_CENTER);
                    break;
                case 2:
                    outputStream.write(ESC_ALIGN_RIGHT);
                    break;
                default:
                    outputStream.write(ESC_ALIGN_LEFT);
                    break;
            }
            
            // Print text
            outputStream.write(text.getBytes(StandardCharsets.UTF_8));
            outputStream.write(ESC_FEED_LINE);
            outputStream.flush();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Print failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void printImage(PluginCall call) {
        if (outputStream == null || bluetoothSocket == null || !bluetoothSocket.isConnected()) {
            call.reject("Printer not connected");
            return;
        }
        
        String base64Image = call.getString("base64Image");
        
        if (base64Image == null) {
            call.reject("Image data is required");
            return;
        }
        
        try {
            // Decode base64 image
            byte[] imageBytes = Base64.decode(base64Image, Base64.DEFAULT);
            
            // Send image data
            outputStream.write(imageBytes);
            outputStream.flush();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Image print failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void cutPaper(PluginCall call) {
        if (outputStream == null || bluetoothSocket == null || !bluetoothSocket.isConnected()) {
            call.reject("Printer not connected");
            return;
        }
        
        try {
            outputStream.write(ESC_CUT_PAPER);
            outputStream.flush();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Cut paper failed: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void feedLine(PluginCall call) {
        if (outputStream == null || bluetoothSocket == null || !bluetoothSocket.isConnected()) {
            call.reject("Printer not connected");
            return;
        }
        
        int lines = call.getInt("lines", 1);
        
        try {
            for (int i = 0; i < lines; i++) {
                outputStream.write(ESC_FEED_LINE);
            }
            outputStream.flush();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Feed line failed: " + e.getMessage());
        }
    }
}
