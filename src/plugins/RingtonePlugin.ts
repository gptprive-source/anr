/**
 * Capacitor plugin interface for accessing native device ringtones
 * This requires native Android/iOS implementation
 */

import { registerPlugin } from '@capacitor/core';

export interface Ringtone {
  id: string;
  title: string;
  uri: string;
}

export interface RingtonePluginInterface {
  /**
   * Get list of available ringtones on the device
   */
  getRingtones(): Promise<{ ringtones: Ringtone[] }>;
  
  /**
   * Play a ringtone by URI
   */
  playRingtone(options: { uri: string }): Promise<void>;
  
  /**
   * Stop playing ringtone
   */
  stopRingtone(): Promise<void>;
  
  /**
   * Open native ringtone picker
   */
  pickRingtone(): Promise<{ ringtone: Ringtone | null }>;
}

// Register the plugin - will use web fallback if native not available
const RingtonePlugin = registerPlugin<RingtonePluginInterface>('RingtonePlugin', {
  web: () => import('./RingtonePluginWeb').then(m => new m.RingtonePluginWeb()),
});

export default RingtonePlugin;
