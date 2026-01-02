/**
 * Ultra-simple vanilla JS renderer for incoming call screen
 * OPTIMISÉ: Pré-chargement Daily + Room URL pour connexion instantanée
 * Supports custom ringtones from user profile
 */

import { supabase } from "@/integrations/supabase/client";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

interface IncomingCallData {
  participantId: string;
  callId: string;
  habitationName: string;
  address: string;
}

let currentCallData: IncomingCallData | null = null;
let audioContext: AudioContext | null = null;
let audioElement: HTMLAudioElement | null = null;
let ringtoneInterval: NodeJS.Timeout | null = null;
let vibrationInterval: NodeJS.Timeout | null = null;
let prefetchedRoomUrl: string | null = null;
let preCreatedCallObject: DailyCall | null = null;
let isMuted = false;
let isAlertsStopped = false; // Flag to prevent restart after stop

// Sound definitions for preset ringtones (copied from RingtonePluginWeb)
const SOUND_DEFINITIONS: Record<string, (ctx: AudioContext, time: number) => void> = {
  'ding-dong': (ctx, time) => {
    const ding = ctx.createOscillator();
    const dong = ctx.createOscillator();
    const gainDing = ctx.createGain();
    const gainDong = ctx.createGain();
    ding.connect(gainDing).connect(ctx.destination);
    dong.connect(gainDong).connect(ctx.destination);
    ding.frequency.value = 783.99;
    dong.frequency.value = 523.25;
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
    const notes = [659.25, 523.25, 587.33, 392.00];
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
    const notes = [523.25, 659.25, 783.99];
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
    const notes = [523.25, 587.33, 659.25, 783.99, 659.25];
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
    const notes = [880, 1046.50];
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
    osc.frequency.value = 1046.50;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.setValueAtTime(0.01, time + 0.5);
    osc.start(time);
    osc.stop(time + 0.55);
  },
  'default': (ctx, time) => {
    const notes = [659.25, 783.99];
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

// Play preset ringtone with Web Audio API
const playPresetRingtone = (uri: string) => {
  if (isAlertsStopped) return;
  try {
    if (audioContext) {
      try { audioContext.close(); } catch(e) {}
    }
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const time = audioContext.currentTime;
    const playSound = SOUND_DEFINITIONS[uri] || SOUND_DEFINITIONS['default'];
    playSound(audioContext, time);
  } catch (err) {
    console.error("[Ringtone] Error playing preset:", err);
  }
};

// Play custom ringtone from URL
const playCustomRingtone = (url: string) => {
  if (isAlertsStopped) return;
  try {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    audioElement = new Audio(url);
    audioElement.loop = false;
    audioElement.volume = 1.0;
    audioElement.play().catch(err => {
      console.error("[Ringtone] Error playing custom audio:", err);
    });
  } catch (err) {
    console.error("[Ringtone] Error creating audio element:", err);
  }
};

// Force stop all alerts - exported for use in other components
export const forceStopAllAlerts = () => {
  console.log("[CALL] forceStopAllAlerts called");
  isAlertsStopped = true;
  
  // Stop interval first to prevent restart
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  
  // Stop audio
  if (audioContext) {
    try { audioContext.close(); } catch(e) {}
    audioContext = null;
  }
  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.src = '';
    } catch(e) {}
    audioElement = null;
  }
  
  // Stop vibration multiple times for reliability
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
    setTimeout(() => navigator.vibrate(0), 50);
    setTimeout(() => navigator.vibrate(0), 100);
    setTimeout(() => navigator.vibrate(0), 200);
  }
};

let cachedRingtoneUri: string | null = null;

const startRingtone = async () => {
  if (isAlertsStopped) return;
  
  try {
    // Load user's ringtone preference if not cached
    if (!cachedRingtoneUri) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("ringtone_uri")
          .eq("id", user.id)
          .single();
        
        cachedRingtoneUri = profile?.ringtone_uri || 'ding-dong';
      } else {
        cachedRingtoneUri = 'ding-dong';
      }
    }
    
    console.log("[Ringtone] Using ringtone:", cachedRingtoneUri);
    
    // Check if it's a custom URL or preset
    const isCustomUrl = cachedRingtoneUri.startsWith('http');
    
    const playRingtone = () => {
      if (isAlertsStopped) return;
      if (isCustomUrl) {
        playCustomRingtone(cachedRingtoneUri!);
      } else {
        playPresetRingtone(cachedRingtoneUri!);
      }
    };
    
    // Play immediately
    playRingtone();
    
    // Loop every 2 seconds
    ringtoneInterval = setInterval(() => {
      if (!isAlertsStopped) {
        playRingtone();
      }
    }, 2000);
    
  } catch (err) {
    console.error("[Ringtone] Error starting ringtone:", err);
    // Fallback to default
    playPresetRingtone('ding-dong');
    ringtoneInterval = setInterval(() => {
      if (!isAlertsStopped) playPresetRingtone('ding-dong');
    }, 2000);
  }
};

const stopRingtone = () => {
  console.log("[Ringtone] stopRingtone called");
  
  // Stop interval first
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  
  // Stop audio context
  if (audioContext) {
    try { audioContext.close(); } catch(e) {}
    audioContext = null;
  }
  
  // Stop audio element
  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.src = '';
    } catch(e) {}
    audioElement = null;
  }
};

const startVibration = () => {
  if (isAlertsStopped) return;
  if ("vibrate" in navigator) {
    navigator.vibrate([500, 200, 500, 200, 500]);
    vibrationInterval = setInterval(() => {
      if (!isAlertsStopped) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }, 2000);
  }
};

const stopVibration = () => {
  console.log("[Vibration] stopVibration called");
  
  // Stop interval first
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  
  // Stop vibration multiple times for reliability
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
};

// OPTIMISÉ: Nettoyage du callObject pré-créé
const cleanupPreCreatedCall = async () => {
  if (preCreatedCallObject) {
    try {
      await preCreatedCallObject.leave();
      await preCreatedCallObject.destroy();
    } catch (e) {}
    preCreatedCallObject = null;
  }
};

export const showIncomingCall = (data: IncomingCallData) => {
  console.log("[CALL] === showIncomingCall START ===");
  console.log("[CALL] callId:", data.callId);
  
  const existing = document.getElementById('vanilla-incoming-call');
  if (existing) {
    console.log("[CALL] Removing existing screen");
    existing.remove();
  }
  
  currentCallData = data;
  prefetchedRoomUrl = null;
  isAlertsStopped = false; // Reset flag for new call
  cachedRingtoneUri = null; // Reset cache to reload user preference
  
  // OPTIMISÉ: Pré-fetch room URL ET pré-création du callObject en parallèle
  const prefetchPromise = (async () => {
    try {
      console.log("[CALL] Pre-fetching room URL...");
      const startTime = Date.now();
      
      const { data: roomData, error } = await supabase.functions.invoke("daily-room", {
        body: { callId: data.callId, isResident: true }
      });
      
      if (!error && roomData?.url) {
        prefetchedRoomUrl = roomData.url;
        console.log("[CALL] Room URL pre-fetched in", Date.now() - startTime, "ms");
        
        // OPTIMISÉ: Pré-créer le callObject pour preview instantané
        preCreatedCallObject = DailyIframe.createCallObject({
          audioSource: false,
          videoSource: false,
          subscribeToTracksAutomatically: true,
          dailyConfig: { avoidEval: true },
        });
        console.log("[CALL] CallObject pre-created for instant preview");
        
        return roomData.url;
      }
    } catch (err) {
      console.error("[CALL] Pre-fetch error:", err);
    }
    return null;
  })();
  
  // Create container
  const container = document.createElement('div');
  container.id = 'vanilla-incoming-call';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background: #1e293b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    padding: 24px;
    box-sizing: border-box;
  `;

  container.innerHTML = `
    <div style="
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: #22c55e;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
    ">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </div>
    
    <h2 style="font-size: 24px; font-weight: bold; color: white; margin: 0 0 8px 0;">📞 Appel entrant</h2>
    <p style="font-size: 18px; color: white; margin: 0 0 4px 0;">${data.habitationName}</p>
    <p style="font-size: 14px; color: #94a3b8; margin: 0 0 32px 0;">${data.address}</p>

    <div id="preview-container" style="
      width: 100%;
      max-width: 400px;
      aspect-ratio: 4/3;
      background: #0f172a;
      border-radius: 12px;
      margin-bottom: 24px;
      display: none;
      overflow: hidden;
      position: relative;
    ">
      <p id="preview-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #64748b; font-size: 14px;">Connexion...</p>
    </div>

    <div style="display: flex; gap: 24px; position: relative; z-index: 10;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <div id="decline-swipe-container" style="display: flex; flex-direction: column; align-items: center; touch-action: none; user-select: none;">
          <div id="decline-arrow" style="color: #94a3b8; margin-bottom: 4px; opacity: 0.3; transition: all 0.2s;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <button type="button" id="decline-call-btn" style="
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: #ef4444;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            position: relative;
            z-index: 20;
            transition: transform 0.15s, box-shadow 0.15s;
          ">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span style="font-size: 13px; color: #94a3b8;">Refuser</span>
          <span style="font-size: 11px; color: #64748b; margin-top: 2px;">↑ Glisser</span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <button type="button" id="mute-call-btn" style="
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #6b7280;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
          position: relative;
          z-index: 20;
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <span id="mute-label" style="font-size: 13px; color: #94a3b8;">Silence</span>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <button type="button" id="preview-call-btn" style="
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #3b82f6;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
          position: relative;
          z-index: 20;
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <span style="font-size: 13px; color: #94a3b8;">Voir</span>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <div id="answer-swipe-container" style="display: flex; flex-direction: column; align-items: center; touch-action: none; user-select: none;">
          <div id="answer-arrow" style="color: #94a3b8; margin-bottom: 4px; opacity: 0.3; transition: all 0.2s;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <button type="button" id="answer-call-btn" style="
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: #22c55e;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            pointer-events: auto;
            position: relative;
            z-index: 20;
            transition: transform 0.15s, box-shadow 0.15s;
          ">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <span style="font-size: 13px; color: #94a3b8;">Répondre</span>
          <span style="font-size: 11px; color: #64748b; margin-top: 2px;">↑ Glisser</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  const check = document.getElementById('vanilla-incoming-call');
  console.log("[CALL] Element appended, exists:", !!check);
  
  startRingtone();
  startVibration();
  isMuted = false;
  
  const answerBtn = document.getElementById('answer-call-btn');
  const declineBtn = document.getElementById('decline-call-btn');
  const muteBtn = document.getElementById('mute-call-btn');
  const muteLabel = document.getElementById('mute-label');
  const previewBtn = document.getElementById('preview-call-btn');
  const previewContainer = document.getElementById('preview-container');
  
  // Mute button - silences ringtone/vibration but keeps call ringing
  if (muteBtn && muteLabel) {
    muteBtn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("[CALL] Mute clicked, current state:", isMuted);
      
      isMuted = !isMuted;
      
      if (isMuted) {
        stopRingtone();
        stopVibration();
        muteBtn.style.background = '#22c55e';
        muteLabel.textContent = 'Son activé';
      } else {
        isAlertsStopped = false; // Allow restart
        startRingtone();
        startVibration();
        muteBtn.style.background = '#6b7280';
        muteLabel.textContent = 'Silence';
      }
    };
  }
  
  // OPTIMISÉ: Preview utilisant le callObject pré-créé
  if (previewBtn && previewContainer) {
    previewBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("[CALL] Preview clicked");
      
      previewContainer.style.display = 'block';
      previewBtn.style.opacity = '0.5';
      previewBtn.style.pointerEvents = 'none';
      
      try {
        // Attendre le prefetch si pas encore terminé
        if (!prefetchedRoomUrl) {
          await prefetchPromise;
        }
        
        if (!prefetchedRoomUrl) {
          console.error("[CALL] No room URL available");
          return;
        }
        
        console.log("[CALL] Using prefetched room URL");
        
        const loadingText = document.getElementById('preview-loading');
        if (loadingText) loadingText.textContent = 'Connexion...';
        
        previewContainer.innerHTML = '';
        
        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.muted = false;
        videoEl.style.cssText = 'width:100%;height:100%;object-fit:cover;background:#000;';
        previewContainer.appendChild(videoEl);
        
        // OPTIMISÉ: Utiliser le callObject pré-créé ou en créer un nouveau
        const callObject = preCreatedCallObject || DailyIframe.createCallObject({
          audioSource: false,
          videoSource: false,
          subscribeToTracksAutomatically: true,
        });
        preCreatedCallObject = null; // Marquer comme utilisé
        
        console.log("[CALL] Preview callObject ready (pre-created:", !!preCreatedCallObject, ")");
        
        callObject.on('track-started', (event: any) => {
          if (event.participant && !event.participant.local && event.track?.kind === 'video') {
            console.log("[CALL] Preview received video track");
            const stream = new MediaStream([event.track]);
            videoEl.srcObject = stream;
            videoEl.play().catch(e => console.error("[CALL] Preview play error:", e));
          }
        });
        
        // OPTIMISÉ: Join immédiat car tout est prêt
        const startJoin = Date.now();
        await callObject.join({
          url: prefetchedRoomUrl,
          startVideoOff: true,
          startAudioOff: true,
          subscribeToTracksAutomatically: true,
        });
        
        console.log("[CALL] Preview joined in", Date.now() - startJoin, "ms");
        (window as any).__previewCallFrame = callObject;
        
      } catch (err) {
        console.error("[CALL] Preview error:", err);
      }
    };
  }
  
  // Swipe handler setup
  const SWIPE_THRESHOLD = 60;
  
  const setupSwipeHandler = (
    containerId: string,
    buttonId: string,
    arrowId: string,
    onSwipeComplete: () => void
  ) => {
    const container = document.getElementById(containerId);
    const button = document.getElementById(buttonId);
    const arrow = document.getElementById(arrowId);
    
    if (!container || !button) return;
    
    let isDragging = false;
    let startY = 0;
    let currentOffset = 0;
    
    const handleStart = (clientY: number) => {
      isDragging = true;
      startY = clientY;
    };
    
    const handleMove = (clientY: number) => {
      if (!isDragging) return;
      const diff = startY - clientY;
      currentOffset = Math.max(0, Math.min(diff, SWIPE_THRESHOLD + 20));
      
      const progress = Math.min(currentOffset / SWIPE_THRESHOLD, 1);
      button.style.transform = `translateY(${-currentOffset}px) scale(${1 + progress * 0.05})`;
      button.style.boxShadow = progress > 0 ? `0 ${4 + progress * 8}px ${8 + progress * 16}px rgba(0,0,0,0.2)` : '';
      
      if (arrow) {
        arrow.style.opacity = String(0.3 + progress * 0.7);
        arrow.style.transform = `translateY(${-progress * 10}px)`;
        arrow.style.color = progress > 0.8 ? '#ffffff' : '#94a3b8';
      }
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      if (currentOffset >= SWIPE_THRESHOLD) {
        onSwipeComplete();
      }
      
      // Reset visual
      button.style.transform = '';
      button.style.boxShadow = '';
      if (arrow) {
        arrow.style.opacity = '0.3';
        arrow.style.transform = '';
        arrow.style.color = '#94a3b8';
      }
      currentOffset = 0;
    };
    
    // Touch events
    container.addEventListener('touchstart', (e) => {
      handleStart(e.touches[0].clientY);
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
      handleMove(e.touches[0].clientY);
    }, { passive: true });
    
    container.addEventListener('touchend', handleEnd);
    
    // Mouse events for desktop testing
    container.addEventListener('mousedown', (e) => {
      handleStart(e.clientY);
    });
    
    container.addEventListener('mousemove', (e) => {
      handleMove(e.clientY);
    });
    
    container.addEventListener('mouseup', handleEnd);
    container.addEventListener('mouseleave', () => {
      if (isDragging) handleEnd();
    });
  };
  
  // Answer swipe handler
  const handleAnswer = async () => {
    console.log("[CALL] Answer swiped");
    
    // STOP alerts FIRST before any async operation
    forceStopAllAlerts();
    
    // Cleanup preview
    if ((window as any).__previewCallFrame) {
      try {
        await (window as any).__previewCallFrame.leave();
        await (window as any).__previewCallFrame.destroy();
      } catch (e) {}
      (window as any).__previewCallFrame = null;
    }
    await cleanupPreCreatedCall();
    
    // PARALLÈLE: Update des participants
    await Promise.all([
      supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", data.participantId),
      supabase
        .from("call_participants")
        .update({ status: "call_answered_by_other", left_at: new Date().toISOString() })
        .eq("call_id", data.callId)
        .eq("status", "ringing")
        .neq("id", data.participantId),
    ]);
    
    hideIncomingCall();
    window.location.href = `/call/${data.callId}?resident=true`;
  };
  
  // Decline swipe handler
  const handleDecline = async () => {
    console.log("[CALL] Decline swiped");
    
    // STOP alerts FIRST before any async operation
    forceStopAllAlerts();
    
    // Cleanup
    if ((window as any).__previewCallFrame) {
      try {
        await (window as any).__previewCallFrame.leave();
        await (window as any).__previewCallFrame.destroy();
      } catch (e) {}
      (window as any).__previewCallFrame = null;
    }
    await cleanupPreCreatedCall();
    
    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("id", data.participantId);
    
    // Check for other active residents (not the one we just declined)
    const { data: activeResidents } = await supabase
      .from("call_participants")
      .select("id, user_id, created_at")
      .eq("call_id", data.callId)
      .eq("role", "resident")
      .in("status", ["ringing", "answered", "in_group"])
      .neq("id", data.participantId);
    
    console.log("[CALL] Active residents after decline:", activeResidents?.length || 0);
    
    // Also mark as stale any ringing participants older than 60 seconds (likely not responsive)
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    if (activeResidents && activeResidents.length > 0) {
      const staleParticipants = activeResidents.filter(p => p.created_at && p.created_at < sixtySecondsAgo);
      if (staleParticipants.length > 0) {
        console.log("[CALL] Marking stale participants as timed_out:", staleParticipants.length);
        await supabase
          .from("call_participants")
          .update({ status: "timed_out", left_at: new Date().toISOString() })
          .in("id", staleParticipants.map(p => p.id));
      }
    }
    
    // Re-check after cleanup
    const { data: remainingActive } = await supabase
      .from("call_participants")
      .select("id")
      .eq("call_id", data.callId)
      .eq("role", "resident")
      .in("status", ["ringing", "answered", "in_group"]);
    
    if (!remainingActive || remainingActive.length === 0) {
      console.log("[CALL] No other residents, marking call as declined");
      await supabase
        .from("call_logs")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", data.callId);
    } else {
      console.log("[CALL] Other residents still active:", remainingActive.length);
    }
    
    hideIncomingCall();
  };
  
  // Setup swipe handlers
  setupSwipeHandler('answer-swipe-container', 'answer-call-btn', 'answer-arrow', handleAnswer);
  setupSwipeHandler('decline-swipe-container', 'decline-call-btn', 'decline-arrow', handleDecline);
  
  console.log("[CALL] === showIncomingCall END ===");
};

export const hideIncomingCall = () => {
  console.log("[CALL] hideIncomingCall called");
  
  // FORCE stop all alerts immediately
  forceStopAllAlerts();
  
  // Cleanup all call objects
  if ((window as any).__previewCallFrame) {
    try {
      (window as any).__previewCallFrame.leave();
      (window as any).__previewCallFrame.destroy();
    } catch (e) {}
    (window as any).__previewCallFrame = null;
  }
  cleanupPreCreatedCall();
  
  const existing = document.getElementById('vanilla-incoming-call');
  if (existing) {
    existing.remove();
    console.log("[CALL] Screen removed");
  }
  
  currentCallData = null;
  prefetchedRoomUrl = null;
};

export const isCallScreenVisible = () => {
  return !!document.getElementById('vanilla-incoming-call');
};

export const getCurrentCallData = () => currentCallData;
