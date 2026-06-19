import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'edu.buksu.motorpool',
  appName: 'BukSU Motorpool',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Matches the app's maroon brand color so there's no white flash
      // between the OS launcher and the app's own UI loading.
      backgroundColor: '#7B1C1C',
      launchAutoHide: true,
      launchShowDuration: 1000,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#7B1C1C',
    },
  },
};

export default config;