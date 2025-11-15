package app.lovable.d5da6030305c43408010d32b9004d074;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capawesome.capacitorjs.plugins.mlkit.barcodescanning.BarcodeScanningPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Register custom plugins
    registerPlugin(BluetoothPrinterPlugin.class);
    registerPlugin(BarcodeScanningPlugin.class);
  }
}
