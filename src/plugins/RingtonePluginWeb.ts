/**
 * Web fallback for RingtonePlugin
 * Provides preset ringtones for web/PWA usage
 */

import { WebPlugin } from '@capacitor/core';
import type { RingtonePluginInterface, Ringtone } from './RingtonePlugin';

// Preset ringtones for web fallback
const PRESET_RINGTONES: Ringtone[] = [
  { id: 'default', title: 'Sonnerie par défaut', uri: 'default' },
  { id: 'classic', title: 'Classique', uri: 'classic' },
  { id: 'digital', title: 'Digital', uri: 'digital' },
  { id: 'gentle', title: 'Douce', uri: 'gentle' },
  { id: 'urgent', title: 'Urgente', uri: 'urgent' },
];

export class RingtonePluginWeb extends WebPlugin implements RingtonePluginInterface {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  async getRingtones(): Promise<{ ringtones: Ringtone[] }> {
    console.log('[RingtonePlugin Web] Returning preset ringtones');
    return { ringtones: PRESET_RINGTONES };
  }

  async playRingtone(options: { uri: string }): Promise<void> {
    console.log('[RingtonePlugin Web] Playing ringtone:', options.uri);
    await this.stopRingtone();
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();
      
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      // Different frequencies for different ringtones
      const frequencies: Record<string, number> = {
        default: 440,
        classic: 523,
        digital: 880,
        gentle: 330,
        urgent: 660,
      };
      
      this.oscillator.frequency.value = frequencies[options.uri] || 440;
      this.oscillator.type = 'sine';
      this.gainNode.gain.value = 0.3;
      
      this.oscillator.start();
      
      // Auto-stop after 3 seconds for preview
      setTimeout(() => this.stopRingtone(), 3000);
    } catch (err) {
      console.error('[RingtonePlugin Web] Error playing ringtone:', err);
    }
  }

  async stopRingtone(): Promise<void> {
    console.log('[RingtonePlugin Web] Stopping ringtone');
    if (this.oscillator) {
      try { this.oscillator.stop(); } catch(e) {}
      this.oscillator = null;
    }
    this.gainNode = null;
    if (this.audioContext) {
      try { this.audioContext.close(); } catch(e) {}
      this.audioContext = null;
    }
  }

  async pickRingtone(): Promise<{ ringtone: Ringtone | null }> {
    console.log('[RingtonePlugin Web] pickRingtone not available on web');
    // On web, return null - UI should show preset list instead
    return { ringtone: null };
  }
}
