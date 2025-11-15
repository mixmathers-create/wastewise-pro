import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d5da6030305c43408010d32b9004d074',
  appName: 'WasteWise',
  webDir: 'dist',
  // COMMENT OUT the server block for production builds
  // server: {
  //   url: 'https://d5da6030-305c-4340-8010-d32b9004d074.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    Camera: {
      permissions: ['camera']
    }
  }
};

export default config;

