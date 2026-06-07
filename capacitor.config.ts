import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fpvacademy.app',
  appName: 'FPV Academy',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;
