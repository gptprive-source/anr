/**
 * Ultra-simple vanilla JS renderer for incoming call screen
 * OPTIMISÉ: Pré-chargement Daily + Room URL pour connexion instantanée
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
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let ringtoneInterval: NodeJS.Timeout | null = null;
let vibrationInterval: NodeJS.Timeout | null = null;
let prefetchedRoomUrl: string | null = null;
let preCreatedCallObject: DailyCall | null = null;
let isMuted = false;

// Force stop all alerts - exported for use in other components
export const forceStopAllAlerts = () => {
  console.log("[CALL] forceStopAllAlerts called");
  stopRingtone();
  stopVibration();
  // Double security - stop vibration again
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
};

const startRingtone = () => {
  try {
    if (audioContext) return;
    
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.value = 0;
    
    oscillator.start();
    
    let isOn = true;
    const toggleRing = () => {
      if (gainNode) {
        gainNode.gain.setValueAtTime(isOn ? 0.3 : 0, audioContext!.currentTime);
      }
      isOn = !isOn;
    };
    
    toggleRing();
    ringtoneInterval = setInterval(toggleRing, isOn ? 1000 : 2000);
  } catch (err) {
    console.error("[Ringtone] Error:", err);
  }
};

const stopRingtone = () => {
  if (ringtoneInterval) clearInterval(ringtoneInterval);
  ringtoneInterval = null;
  if (oscillator) {
    try { oscillator.stop(); } catch(e) {}
  }
  oscillator = null;
  gainNode = null;
  if (audioContext) {
    try { audioContext.close(); } catch(e) {}
  }
  audioContext = null;
};

const startVibration = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([500, 200, 500, 200, 500]);
    vibrationInterval = setInterval(() => {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }, 2000);
  }
};

const stopVibration = () => {
  if (vibrationInterval) clearInterval(vibrationInterval);
  vibrationInterval = null;
  if ("vibrate" in navigator) navigator.vibrate(0);
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
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <span style="font-size: 13px; color: #94a3b8;">Refuser</span>
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
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
        <span style="font-size: 13px; color: #94a3b8;">Répondre</span>
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
  
  if (answerBtn) {
    answerBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("[CALL] Answer clicked");
      
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
  }
  
  if (declineBtn) {
    declineBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("[CALL] Decline clicked");
      
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
  }
  
  console.log("[CALL] === showIncomingCall END ===");
};

export const hideIncomingCall = () => {
  console.log("[CALL] hideIncomingCall called");
  
  // FORCE stop all alerts immediately
  stopRingtone();
  stopVibration();
  if ("vibrate" in navigator) navigator.vibrate(0);
  
  // Double security after 100ms
  setTimeout(() => {
    stopRingtone();
    stopVibration();
    if ("vibrate" in navigator) navigator.vibrate(0);
  }, 100);
  
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
