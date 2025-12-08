import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1863c081bfa54b1f8736a4d11035460e',
  appName: 'anr',
  webDir: 'dist',
  server: {
    url: 'https://1863c081-bfa5-4b1f-8736-a4d11035460e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Recherche de modules ANR...',
        cancel: 'Annuler',
        availableDevices: 'Appareils disponibles',
        noDeviceFound: 'Aucun appareil trouvé'
      }
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  }
};

export default config;
