import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d5da6030305c43408010d32b9004d074',
  appName: 'WasteWise',
  webDir: 'dist',

  plugins: {
    Camera: {
      permissions: ['camera']
    }
  }
};

export default config;

