/**
 * Ultra-simple vanilla JS renderer for incoming call screen
 */

import { supabase } from "@/integrations/supabase/client";

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

export const showIncomingCall = (data: IncomingCallData) => {
  console.log("[CALL] === showIncomingCall START ===");
  console.log("[CALL] callId:", data.callId);
  
  // Remove any existing screen first
  const existing = document.getElementById('vanilla-incoming-call');
  if (existing) {
    console.log("[CALL] Removing existing screen");
    existing.remove();
  }
  
  currentCallData = data;
  
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
      <p id="preview-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #64748b; font-size: 14px;">Chargement...</p>
    </div>

    <div style="display: flex; gap: 32px; position: relative; z-index: 10;">
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
  
  // Append to body
  document.body.appendChild(container);
  
  const check = document.getElementById('vanilla-incoming-call');
  console.log("[CALL] Element appended, exists in DOM:", !!check);
  console.log("[CALL] Element display:", check?.style.display);
  console.log("[CALL] Body children count:", document.body.children.length);
  
  // Start alerts
  startRingtone();
  startVibration();
  
  // Attach handlers
  const answerBtn = document.getElementById('answer-call-btn');
  const declineBtn = document.getElementById('decline-call-btn');
  const previewBtn = document.getElementById('preview-call-btn');
  const previewContainer = document.getElementById('preview-container');
  
  console.log("[CALL] Answer btn found:", !!answerBtn);
  console.log("[CALL] Decline btn found:", !!declineBtn);
  console.log("[CALL] Preview btn found:", !!previewBtn);
  
  // Preview functionality - fetch Daily room URL and show video
  if (previewBtn && previewContainer) {
    previewBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("[CALL] Preview clicked");
      
      // Show preview container
      previewContainer.style.display = 'block';
      previewBtn.style.opacity = '0.5';
      previewBtn.style.pointerEvents = 'none';
      
      try {
        // Fetch Daily room token
        const { data: roomData, error } = await supabase.functions.invoke("daily-room", {
          body: { callId: data.callId, isResident: true }
        });
        
        if (error) {
          console.error("[CALL] Preview room error:", error);
          return;
        }
        
        if (roomData?.url) {
          // Hide loading text
          const loadingText = document.getElementById('preview-loading');
          if (loadingText) loadingText.style.display = 'none';
          
          // Import Daily dynamically
          const Daily = (await import("@daily-co/daily-js")).default;
          const callFrame = Daily.createFrame(previewContainer, {
            iframeStyle: {
              width: "100%",
              height: "100%",
              border: "none",
              position: "absolute",
              top: "0",
              left: "0",
            },
            showLeaveButton: false,
            showFullscreenButton: false,
          });
          
          await callFrame.join({
            url: roomData.url,
            token: roomData.token,
            startVideoOff: true,
            startAudioOff: true,
          });
          
          // Store callFrame for cleanup
          (window as any).__previewCallFrame = callFrame;
          console.log("[CALL] Preview joined successfully");
        }
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
      
      // Cleanup preview if active
      if ((window as any).__previewCallFrame) {
        try {
          await (window as any).__previewCallFrame.leave();
          await (window as any).__previewCallFrame.destroy();
        } catch (e) {}
        (window as any).__previewCallFrame = null;
      }
      
      await supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", data.participantId);
      
      hideIncomingCall();
      window.location.href = `/call/${data.callId}?resident=true`;
    };
  }
  
  if (declineBtn) {
    declineBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("[CALL] Decline clicked");
      
      // Cleanup preview if active
      if ((window as any).__previewCallFrame) {
        try {
          await (window as any).__previewCallFrame.leave();
          await (window as any).__previewCallFrame.destroy();
        } catch (e) {}
        (window as any).__previewCallFrame = null;
      }
      
      // Update participant status
      await supabase
        .from("call_participants")
        .update({ status: "declined", left_at: new Date().toISOString() })
        .eq("id", data.participantId);
      
      // Update call_logs to "ended" so visitor hangs up
      await supabase
        .from("call_logs")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", data.callId);
      
      hideIncomingCall();
    };
  }
  
  console.log("[CALL] === showIncomingCall END ===");
};

export const hideIncomingCall = () => {
  console.log("[CALL] hideIncomingCall called");
  stopRingtone();
  stopVibration();
  
  // Cleanup preview if active
  if ((window as any).__previewCallFrame) {
    try {
      (window as any).__previewCallFrame.leave();
      (window as any).__previewCallFrame.destroy();
    } catch (e) {}
    (window as any).__previewCallFrame = null;
  }
  
  const existing = document.getElementById('vanilla-incoming-call');
  if (existing) {
    existing.remove();
    console.log("[CALL] Screen removed from DOM");
  }
  
  currentCallData = null;
};

export const isCallScreenVisible = () => {
  const visible = !!document.getElementById('vanilla-incoming-call');
  return visible;
};

export const getCurrentCallData = () => currentCallData;
