/**
 * Web fallback for RingtonePlugin
 * Provides preset ringtones with realistic doorbell sounds for web/PWA usage
 */

import { WebPlugin } from '@capacitor/core';
import type { RingtonePluginInterface, Ringtone } from './RingtonePlugin';

// Extended Ringtone type with category
interface RingtoneWithCategory extends Ringtone {
  category?: string;
}

// Preset ringtones with realistic doorbell/chime sounds
const PRESET_RINGTONES: RingtoneWithCategory[] = [
  // Carillons
  { id: 'ding-dong', title: 'Ding-Dong', uri: 'ding-dong', category: 'Carillon' },
  { id: 'westminster', title: 'Westminster', uri: 'westminster', category: 'Carillon' },
  { id: 'chime-3', title: 'Carillon 3 notes', uri: 'chime-3', category: 'Carillon' },
  { id: 'chime-melody', title: 'Carillon mélodique', uri: 'chime-melody', category: 'Carillon' },
  
  // Sonneries maison
  { id: 'doorbell-classic', title: 'Sonnette classique', uri: 'doorbell-classic', category: 'Maison' },
  { id: 'doorbell-modern', title: 'Sonnette moderne', uri: 'doorbell-modern', category: 'Maison' },
  { id: 'doorbell-retro', title: 'Sonnette rétro', uri: 'doorbell-retro', category: 'Maison' },
  { id: 'door-knock', title: 'Toc-toc', uri: 'door-knock', category: 'Maison' },
  
  // Tons simples
  { id: 'bell-simple', title: 'Cloche simple', uri: 'bell-simple', category: 'Simple' },
  { id: 'tone-gentle', title: 'Ton doux', uri: 'tone-gentle', category: 'Simple' },
  { id: 'tone-bright', title: 'Ton clair', uri: 'tone-bright', category: 'Simple' },
  { id: 'default', title: 'Par défaut', uri: 'default', category: 'Simple' },
];

// Sound definitions using Web Audio API
const SOUND_DEFINITIONS: Record<string, (ctx: AudioContext, time: number) => void> = {
  'ding-dong': (ctx, time) => {
    // Classic ding-dong doorbell
    const ding = ctx.createOscillator();
    const dong = ctx.createOscillator();
    const gainDing = ctx.createGain();
    const gainDong = ctx.createGain();
    
    ding.connect(gainDing).connect(ctx.destination);
    dong.connect(gainDong).connect(ctx.destination);
    
    ding.frequency.value = 783.99; // G5
    dong.frequency.value = 523.25; // C5
    ding.type = 'sine';
    dong.type = 'sine';
    
    gainDing.gain.setValueAtTime(0.4, time);
    gainDing.gain.exponentialRampToValueAtTime(0.01, time + 0.8);
    
    gainDong.gain.setValueAtTime(0.001, time);
    gainDong.gain.setValueAtTime(0.4, time + 0.4);
    gainDong.gain.exponentialRampToValueAtTime(0.01, time + 1.2);
    
    ding.start(time);
    dong.start(time + 0.4);
    ding.stop(time + 0.8);
    dong.stop(time + 1.2);
  },
  
  'westminster': (ctx, time) => {
    // Westminster chime (Big Ben style)
    const notes = [659.25, 523.25, 587.33, 392.00]; // E5, C5, D5, G4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time + i * 0.5);
      gain.gain.setValueAtTime(0.01, time + i * 0.5 + 0.45);
      osc.start(time + i * 0.5);
      osc.stop(time + i * 0.5 + 0.5);
    });
  },
  
  'chime-3': (ctx, time) => {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.35, time + i * 0.25);
      gain.gain.setValueAtTime(0.01, time + i * 0.25 + 0.4);
      osc.start(time + i * 0.25);
      osc.stop(time + i * 0.25 + 0.45);
    });
  },
  
  'chime-melody': (ctx, time) => {
    const notes = [523.25, 587.33, 659.25, 783.99, 659.25]; // C5, D5, E5, G5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time + i * 0.2);
      gain.gain.setValueAtTime(0.01, time + i * 0.2 + 0.3);
      osc.start(time + i * 0.2);
      osc.stop(time + i * 0.2 + 0.35);
    });
  },
  
  'doorbell-classic': (ctx, time) => {
    // Electric buzzer style
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.setValueAtTime(0.15, time + 0.3);
    gain.gain.setValueAtTime(0, time + 0.35);
    gain.gain.setValueAtTime(0.15, time + 0.5);
    gain.gain.setValueAtTime(0.01, time + 0.8);
    osc.start(time);
    osc.stop(time + 0.85);
  },
  
  'doorbell-modern': (ctx, time) => {
    // Modern electronic doorbell
    const notes = [880, 1046.50]; // A5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, time + i * 0.15);
      gain.gain.setValueAtTime(0.01, time + i * 0.15 + 0.3);
      osc.start(time + i * 0.15);
      osc.stop(time + i * 0.15 + 0.35);
    });
  },
  
  'doorbell-retro': (ctx, time) => {
    // Old mechanical bell ring
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 2000;
    osc.type = 'triangle';
    
    for (let i = 0; i < 6; i++) {
      gain.gain.setValueAtTime(0.2, time + i * 0.1);
      gain.gain.setValueAtTime(0.05, time + i * 0.1 + 0.05);
    }
    gain.gain.setValueAtTime(0.01, time + 0.6);
    osc.start(time);
    osc.stop(time + 0.65);
  },
  
  'door-knock': (ctx, time) => {
    // Knock knock knock
    for (let i = 0; i < 3; i++) {
      const noise = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.frequency.value = 150 + Math.random() * 50;
      noise.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      gain.gain.setValueAtTime(0.4, time + i * 0.2);
      gain.gain.setValueAtTime(0.01, time + i * 0.2 + 0.08);
      noise.start(time + i * 0.2);
      noise.stop(time + i * 0.2 + 0.1);
    }
  },
  
  'bell-simple': (ctx, time) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.setValueAtTime(0.01, time + 0.8);
    osc.start(time);
    osc.stop(time + 0.85);
  },
  
  'tone-gentle': (ctx, time) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.setValueAtTime(0.25, time + 0.3);
    gain.gain.setValueAtTime(0.01, time + 1);
    osc.start(time);
    osc.stop(time + 1.05);
  },
  
  'tone-bright': (ctx, time) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 1046.50; // C6
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.setValueAtTime(0.01, time + 0.5);
    osc.start(time);
    osc.stop(time + 0.55);
  },
  
  'default': (ctx, time) => {
    const notes = [659.25, 783.99]; // E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, time + i * 0.3);
      gain.gain.setValueAtTime(0.01, time + i * 0.3 + 0.4);
      osc.start(time + i * 0.3);
      osc.stop(time + i * 0.3 + 0.45);
    });
  },
};

export class RingtonePluginWeb extends WebPlugin implements RingtonePluginInterface {
  private audioContext: AudioContext | null = null;

  async getRingtones(): Promise<{ ringtones: Ringtone[] }> {
    console.log('[RingtonePlugin Web] Returning preset ringtones');
    return { ringtones: PRESET_RINGTONES };
  }

  async playRingtone(options: { uri: string }): Promise<void> {
    console.log('[RingtonePlugin Web] Playing ringtone:', options.uri);
    await this.stopRingtone();
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const time = this.audioContext.currentTime;
      
      const playSound = SOUND_DEFINITIONS[options.uri] || SOUND_DEFINITIONS['default'];
      playSound(this.audioContext, time);
      
    } catch (err) {
      console.error('[RingtonePlugin Web] Error playing ringtone:', err);
    }
  }

  async stopRingtone(): Promise<void> {
    console.log('[RingtonePlugin Web] Stopping ringtone');
    if (this.audioContext) {
      try { 
        await this.audioContext.close(); 
      } catch(e) {}
      this.audioContext = null;
    }
  }

  async pickRingtone(): Promise<{ ringtone: Ringtone | null }> {
    console.log('[RingtonePlugin Web] pickRingtone not available on web');
    return { ringtone: null };
  }
}
