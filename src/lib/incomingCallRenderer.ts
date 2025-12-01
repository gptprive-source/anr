/**
 * Vanilla JS renderer for incoming call screen
 * Completely bypasses React to ensure the screen persists on Android
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
    
    // French ring pattern: 1s on, 2s off
    let isOn = true;
    const toggleRing = () => {
      if (gainNode) {
        gainNode.gain.setValueAtTime(isOn ? 0.3 : 0, audioContext!.currentTime);
      }
      isOn = !isOn;
    };
    
    toggleRing();
    ringtoneInterval = setInterval(toggleRing, isOn ? 1000 : 2000);
    
    console.log("[IncomingCallRenderer] 🔔 Ringtone started");
  } catch (err) {
    console.error("[IncomingCallRenderer] ❌ Ringtone error:", err);
  }
};

const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
  if (gainNode) {
    gainNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  console.log("[IncomingCallRenderer] 🔕 Ringtone stopped");
};

const startVibration = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([500, 200, 500, 200, 500]);
    vibrationInterval = setInterval(() => {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }, 2000);
    console.log("[IncomingCallRenderer] 📳 Vibration started");
  }
};

const stopVibration = () => {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
};

const createCallScreen = (data: IncomingCallData): HTMLDivElement => {
  const container = document.createElement('div');
  container.id = 'vanilla-incoming-call';
  container.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    background-color: #1e293b !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 2147483647 !important;
    padding: 24px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    isolation: isolate !important;
    -webkit-transform: translate3d(0,0,0) !important;
    transform: translate3d(0,0,0) !important;
  `;

  container.innerHTML = `
    <div style="
      width: 120px;
      height: 120px;
      border-radius: 60px;
      background-color: #22c55e;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
      animation: pulse-call 2s infinite;
    ">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </div>
    
    <h2 style="
      font-size: 28px;
      font-weight: bold;
      color: white;
      margin: 0 0 8px 0;
      text-align: center;
    ">📞 Appel entrant</h2>
    
    <p style="
      font-size: 20px;
      color: white;
      margin: 0 0 4px 0;
      text-align: center;
    ">${data.habitationName}</p>
    
    <p style="
      font-size: 16px;
      color: #94a3b8;
      margin: 0 0 48px 0;
      text-align: center;
    ">${data.address}</p>

    <div style="display: flex; gap: 64px;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <button id="decline-call-btn" style="
          width: 80px;
          height: 80px;
          border-radius: 40px;
          background-color: #ef4444;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4);
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
            <line x1="23" y1="1" x2="1" y2="23"/>
          </svg>
        </button>
        <span style="font-size: 14px; color: #94a3b8;">Refuser</span>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
        <button id="answer-call-btn" style="
          width: 80px;
          height: 80px;
          border-radius: 40px;
          background-color: #22c55e;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
        <span style="font-size: 14px; color: #94a3b8;">Répondre</span>
      </div>
    </div>
    
    <style>
      @keyframes pulse-call {
        0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(34, 197, 94, 0.5); }
        50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(34, 197, 94, 0.7); }
      }
    </style>
  `;

  return container;
};

export const showIncomingCall = (data: IncomingCallData) => {
  console.log("[IncomingCallRenderer] 📞 Showing call screen:", data.callId);
  
  // Remove any existing call screen
  hideIncomingCall();
  
  currentCallData = data;
  
  // Create and append the screen
  const screen = createCallScreen(data);
  document.body.appendChild(screen);
  
  // Start alerts
  startRingtone();
  startVibration();
  
  // Attach event handlers
  const answerBtn = document.getElementById('answer-call-btn');
  const declineBtn = document.getElementById('decline-call-btn');
  
  if (answerBtn) {
    answerBtn.onclick = async () => {
      console.log("[IncomingCallRenderer] ✅ Answer clicked");
      answerBtn.style.opacity = '0.5';
      declineBtn!.style.opacity = '0.5';
      
      try {
        await supabase
          .from("call_participants")
          .update({ status: "answered", joined_at: new Date().toISOString() })
          .eq("id", data.participantId);
        
        hideIncomingCall();
        window.location.href = `/call/${data.callId}?resident=true`;
      } catch (err) {
        console.error("[IncomingCallRenderer] ❌ Answer error:", err);
        answerBtn.style.opacity = '1';
        declineBtn!.style.opacity = '1';
      }
    };
  }
  
  if (declineBtn) {
    declineBtn.onclick = async () => {
      console.log("[IncomingCallRenderer] ❌ Decline clicked");
      answerBtn!.style.opacity = '0.5';
      declineBtn.style.opacity = '0.5';
      
      try {
        await supabase
          .from("call_participants")
          .update({ status: "declined", left_at: new Date().toISOString() })
          .eq("id", data.participantId);
        
        hideIncomingCall();
      } catch (err) {
        console.error("[IncomingCallRenderer] ❌ Decline error:", err);
        answerBtn!.style.opacity = '1';
        declineBtn.style.opacity = '1';
      }
    };
  }
  
  console.log("[IncomingCallRenderer] ✅ Call screen displayed");
};

export const hideIncomingCall = () => {
  stopRingtone();
  stopVibration();
  
  const existing = document.getElementById('vanilla-incoming-call');
  if (existing) {
    existing.remove();
    console.log("[IncomingCallRenderer] 🛑 Call screen removed");
  }
  
  currentCallData = null;
};

export const isCallScreenVisible = () => {
  return !!document.getElementById('vanilla-incoming-call');
};

export const getCurrentCallData = () => currentCallData;
