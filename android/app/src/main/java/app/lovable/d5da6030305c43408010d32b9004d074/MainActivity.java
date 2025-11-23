package app.lovable.d5da6030305c43408010d32b9004d074;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.camera.CameraPlugin;


public class MainActivity extends BridgeActivity {
  @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d("MainActivity", "Registering custom plugins");
        // Register custom plugins
        registerPlugin(PrinterPlugin.class);
        Log.d("MainActivity", "Registered PrinterPlugin");
        registerPlugin(CameraPlugin.class);
        Log.d("MainActivity", "Registered CameraPlugin");
        super.onCreate(savedInstanceState);
    }
}
