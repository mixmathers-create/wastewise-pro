package app.lovable.d5da6030305c43408010d32b9004d074;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.camera.CameraPlugin;
import com.capacitor.mlkit.barcode.scanning.BarcodeScannerPlugin;

public class MainActivity extends BridgeActivity {
  @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("MainActivity", "Registering custom plugins");
        // Register custom plugins
        registerPlugin(BluetoothPrinterPlugin.class);
        Log.d("MainActivity", "Registered BluetoothPrinterPlugin");
        registerPlugin(CameraPlugin.class);
        Log.d("MainActivity", "Registered CameraPlugin");
    }
}
