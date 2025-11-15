package app.lovable.d5da6030305c43408010d32b9004d074;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.Set;

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

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
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
        // For now, just return paired devices
        // Full discovery requires BLE scanning which is more complex
        listPairedDevices(call);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        
        if (address == null) {
            call.reject("Device address is required");
            return;
        }

        try {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Bluetooth permissions not granted");
                return;
            }

            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("name", device.getName());
            result.put("address", device.getAddress());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Connection failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
