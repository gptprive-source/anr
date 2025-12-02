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
let callSubscription: any = null;
let previewPeerConnection: RTCPeerConnection | null = null;
let previewVideoElement: HTMLVideoElement | null = null;

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

const stopPreview = () => {
  if (previewPeerConnection) {
    previewPeerConnection.close();
    previewPeerConnection = null;
  }
  if (previewVideoElement) {
    previewVideoElement.srcObject = null;
    previewVideoElement = null;
  }
  const previewContainer = document.getElementById('preview-container');
  if (previewContainer) {
    previewContainer.style.display = 'none';
  }
};

// Subscribe to call status changes to detect when visitor hangs up
const subscribeToCallStatus = (callId: string) => {
  console.log("[IncomingCallRenderer] 📡 Subscribing to call status:", callId);
  
  callSubscription = supabase
    .channel(`incoming-call-${callId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "call_logs",
        filter: `id=eq.${callId}`,
      },
      (payload) => {
        const callLog = payload.new as any;
        console.log("[IncomingCallRenderer] 📡 Call status changed:", callLog.status);
        if (callLog.status === "ended" || callLog.status === "answered") {
          console.log("[IncomingCallRenderer] 🛑 Call ended/answered by other party, hiding screen");
          hideIncomingCall();
        }
      }
    )
    .subscribe();
};

const unsubscribeFromCallStatus = () => {
  if (callSubscription) {
    console.log("[IncomingCallRenderer] 📡 Unsubscribing from call status");
    supabase.removeChannel(callSubscription);
    callSubscription = null;
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
    <!-- Preview video container (hidden by default) -->
    <div id="preview-container" style="
      display: none;
      position: absolute;
      top: 60px;
      left: 20px;
      right: 20px;
      height: 280px;
      background: #0f172a;
      border-radius: 16px;
      overflow: hidden;
      border: 2px solid #334155;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    ">
      <video id="preview-video" autoplay playsinline muted style="
        width: 100%;
        height: 100%;
        object-fit: cover;
      "></video>
      <div id="preview-loading" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #94a3b8;
        font-size: 14px;
      ">Chargement vidéo...</div>
      <button id="close-preview-btn" style="
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background: rgba(0,0,0,0.5);
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>
    </div>

    <div style="
      width: 100px;
      height: 100px;
      border-radius: 50px;
      background-color: #22c55e;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
      animation: pulse-call 2s infinite;
    ">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    </div>
    
    <h2 style="
      font-size: 24px;
      font-weight: bold;
      color: white;
      margin: 0 0 8px 0;
      text-align: center;
    ">📞 Appel entrant</h2>
    
    <p style="
      font-size: 18px;
      color: white;
      margin: 0 0 4px 0;
      text-align: center;
    ">${data.habitationName}</p>
    
    <p style="
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 32px 0;
      text-align: center;
    ">${data.address}</p>

    <!-- Preview button (eye/peephole) -->
    <button id="preview-call-btn" style="
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background-color: #3b82f6;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-bottom: 24px;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    ">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
    <span style="font-size: 12px; color: #64748b; margin-bottom: 24px;">Voir le visiteur</span>

    <div style="display: flex; gap: 48px;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <button id="decline-call-btn" style="
          width: 72px;
          height: 72px;
          border-radius: 36px;
          background-color: #ef4444;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
            <line x1="23" y1="1" x2="1" y2="23"/>
          </svg>
        </button>
        <span style="font-size: 13px; color: #94a3b8;">Refuser</span>
      </div>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <button id="answer-call-btn" style="
          width: 72px;
          height: 72px;
          border-radius: 36px;
          background-color: #22c55e;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
        <span style="font-size: 13px; color: #94a3b8;">Répondre</span>
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

const startPreview = async (callId: string) => {
  console.log("[IncomingCallRenderer] 👁️ Starting video preview");
  
  const previewContainer = document.getElementById('preview-container');
  const previewVideo = document.getElementById('preview-video') as HTMLVideoElement;
  const previewLoading = document.getElementById('preview-loading');
  
  if (!previewContainer || !previewVideo) return;
  
  previewContainer.style.display = 'block';
  previewVideoElement = previewVideo;
  
  try {
    // Get Daily room URL
    const { data, error } = await supabase.functions.invoke("daily-room", {
      body: { callId },
    });
    
    if (error || !data?.url) {
      console.error("[IncomingCallRenderer] ❌ Failed to get room URL");
      if (previewLoading) previewLoading.textContent = "Erreur de connexion";
      return;
    }
    
    // Import Daily.js dynamically for preview
    const DailyIframe = (await import("@daily-co/daily-js")).default;
    
    // Create preview call with NO media sources - receive only
    const previewCall = DailyIframe.createCallObject({
      audioSource: false,
      videoSource: false,
      subscribeToTracksAutomatically: true,
    });
    
    const updatePreviewVideo = () => {
      const participants = previewCall.participants();
      const remote = Object.values(participants).find(p => !p.local);
      if (remote?.tracks?.video?.persistentTrack) {
        const stream = new MediaStream([remote.tracks.video.persistentTrack]);
        previewVideo.srcObject = stream;
        if (previewLoading) previewLoading.style.display = 'none';
        console.log("[IncomingCallRenderer] 👁️ Preview video connected");
      }
    };
    
    previewCall.on("participant-joined", updatePreviewVideo);
    previewCall.on("participant-updated", updatePreviewVideo);
    previewCall.on("track-started", updatePreviewVideo);
    
    // Store reference for cleanup
    (window as any).__previewCall = previewCall;
    
    await previewCall.join({
      url: data.url,
      startVideoOff: true,
      startAudioOff: true,
      userName: "preview-observer",
    });
    
    console.log("[IncomingCallRenderer] 👁️ Preview joined room");
    
    // Check if there's already a participant
    setTimeout(updatePreviewVideo, 500);
    
  } catch (err) {
    console.error("[IncomingCallRenderer] ❌ Preview error:", err);
    if (previewLoading) previewLoading.textContent = "Erreur vidéo";
  }
};

const cleanupPreview = async (): Promise<void> => {
  console.log("[IncomingCallRenderer] 🧹 Cleaning up preview...");
  const previewCall = (window as any).__previewCall;
  if (previewCall) {
    try {
      // First stop all tracks
      const participants = previewCall.participants();
      if (participants.local) {
        previewCall.setLocalAudio(false);
        previewCall.setLocalVideo(false);
      }
      
      // Leave and destroy
      await previewCall.leave();
      await previewCall.destroy();
      console.log("[IncomingCallRenderer] 🧹 Preview call destroyed");
    } catch (err) {
      console.error("[IncomingCallRenderer] Error cleaning preview:", err);
    }
    (window as any).__previewCall = null;
  }
  stopPreview();
  
  // Small delay to ensure Daily.co fully releases the connection
  await new Promise(resolve => setTimeout(resolve, 300));
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
  
  // Subscribe to call status changes (to detect when visitor hangs up)
  subscribeToCallStatus(data.callId);
  
  // Attach event handlers
  const answerBtn = document.getElementById('answer-call-btn');
  const declineBtn = document.getElementById('decline-call-btn');
  const previewBtn = document.getElementById('preview-call-btn');
  const closePreviewBtn = document.getElementById('close-preview-btn');
  
  if (previewBtn) {
    previewBtn.onclick = () => {
      console.log("[IncomingCallRenderer] 👁️ Preview clicked");
      startPreview(data.callId);
    };
  }
  
  if (closePreviewBtn) {
    closePreviewBtn.onclick = () => {
      console.log("[IncomingCallRenderer] 👁️ Close preview clicked");
      cleanupPreview();
    };
  }
  
  if (answerBtn) {
    answerBtn.onclick = async () => {
      console.log("[IncomingCallRenderer] ✅ Answer clicked");
      answerBtn.style.opacity = '0.5';
      declineBtn!.style.opacity = '0.5';
      answerBtn.style.pointerEvents = 'none';
      declineBtn!.style.pointerEvents = 'none';
      
      try {
        // IMPORTANT: Cleanup preview FIRST and wait for it to complete
        console.log("[IncomingCallRenderer] 🧹 Cleaning up preview before answering...");
        await cleanupPreview();
        console.log("[IncomingCallRenderer] 🧹 Preview cleanup complete");
        
        // Update participant status
        await supabase
          .from("call_participants")
          .update({ status: "answered", joined_at: new Date().toISOString() })
          .eq("id", data.participantId);
        
        // Hide incoming call screen
        stopRingtone();
        stopVibration();
        unsubscribeFromCallStatus();
        
        const existing = document.getElementById('vanilla-incoming-call');
        if (existing) {
          existing.remove();
        }
        currentCallData = null;
        
        // Navigate to call page
        console.log("[IncomingCallRenderer] 📞 Navigating to call...");
        window.location.href = `/call/${data.callId}?resident=true`;
      } catch (err) {
        console.error("[IncomingCallRenderer] ❌ Answer error:", err);
        answerBtn.style.opacity = '1';
        answerBtn.style.pointerEvents = 'auto';
        declineBtn!.style.opacity = '1';
        declineBtn!.style.pointerEvents = 'auto';
      }
    };
  }
  
  if (declineBtn) {
    declineBtn.onclick = async () => {
      console.log("[IncomingCallRenderer] ❌ Decline clicked");
      answerBtn!.style.opacity = '0.5';
      declineBtn.style.opacity = '0.5';
      
      try {
        // Cleanup preview if open
        await cleanupPreview();
        
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

export const hideIncomingCall = async () => {
  stopRingtone();
  stopVibration();
  unsubscribeFromCallStatus();
  await cleanupPreview();
  
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
