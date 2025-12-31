/**
 * Capacitor plugin interface for accessing native device ringtones
 * This requires native Android/iOS implementation
 */

import { registerPlugin } from '@capacitor/core';

export interface Ringtone {
  id: string;
  title: string;
  uri: string;
  category?: string;
}

export interface RingtonePluginInterface {
  /**
   * Get all available ringtones from the device
   */
  getRingtones(): Promise<{ ringtones: Ringtone[] }>;
  
  /**
   * Play a ringtone by its URI
   */
  playRingtone(options: { uri: string }): Promise<void>;
  
  /**
   * Stop currently playing ringtone
   */
  stopRingtone(): Promise<void>;
  
  /**
   * Open native ringtone picker (Android only)
   */
  pickRingtone(): Promise<{ ringtone: Ringtone | null }>;
}

const RingtonePlugin = registerPlugin<RingtonePluginInterface>('RingtonePlugin', {
  web: () => import('./RingtonePluginWeb').then((m) => new m.RingtonePluginWeb()),
});

export default RingtonePlugin;
