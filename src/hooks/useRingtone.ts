import { useRef, useCallback, useEffect } from "react";

// Base64 encoded simple ring tone (short beep pattern)
// This is a fallback that works better on mobile
const RING_TONE_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleyx8telesx8telesx8teleQhTYoeupWm6dNBFOa3+1gY8BDy65+lAn8YUhvFvAcGMd58telesx8telesx8teleQhTYhOqlk26dNDBOa3+1aI8BDy65+lAoMYTivFuAcGLd58telesx8telesx8teleQhTYeOqll26dNBFOa3+1eI8BDy65+lAp8YSivFtAcGKd58telesx8telesx8teleQhTYdOqlm26dNDBOa3+1hI8BDy65+lAq8YRivFsAcGJd58telesx8telesx8teleQ==";

export const useRingtone = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const vibrationIntervalRef = useRef<number | null>(null);

  // Create audio element
  useEffect(() => {
    const audio = new Audio();
    audio.src = RING_TONE_URL;
    audio.loop = false;
    audio.volume = 1.0;
    audio.preload = "auto";
    audioRef.current = audio;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playRing = useCallback(async () => {
    if (!audioRef.current) return;
    
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      console.log("[Ringtone] Ring played");
    } catch (e) {
      console.error("[Ringtone] Play failed:", e);
      // Try Web Audio API as fallback
      tryWebAudioFallback();
    }
  }, []);

  const tryWebAudioFallback = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const currentTime = ctx.currentTime;
      
      // Simple beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, currentTime);
      gain.gain.setValueAtTime(0.5, currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(currentTime);
      osc.stop(currentTime + 0.5);
      
      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, ctx.currentTime);
        gain2.gain.setValueAtTime(0.5, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 600);
    } catch (e) {
      console.error("[Ringtone] Web Audio fallback failed:", e);
    }
  }, []);

  const startRinging = useCallback(async () => {
    if (isPlayingRef.current) {
      console.log("[Ringtone] Already ringing");
      return;
    }
    
    console.log("[Ringtone] Starting ringtone");
    isPlayingRef.current = true;
    
    // Play immediately
    await playRing();
    
    // Start vibration pattern
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
      vibrationIntervalRef.current = window.setInterval(() => {
        if (isPlayingRef.current && navigator.vibrate) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
      }, 2000);
    }
    
    // Repeat ring every 2.5 seconds
    intervalRef.current = window.setInterval(() => {
      if (isPlayingRef.current) {
        playRing();
      }
    }, 2500);
  }, [playRing]);

  const stopRinging = useCallback(() => {
    console.log("[Ringtone] Stopping ringtone");
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRinging();
    };
  }, [stopRinging]);

  return { startRinging, stopRinging };
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("[Notification] Not supported in this browser");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
};

// Show notification
export const showCallNotification = (habitationName: string, address: string): Notification | null => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.log("[Notification] Permission not granted");
    return null;
  }
  
  console.log("[Notification] Showing incoming call notification");
  const notification = new Notification("📞 Appel entrant", {
    body: `${habitationName}\n${address}`,
    icon: "/pwa-192x192.png",
    tag: "incoming-call",
    requireInteraction: true,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  return notification;
};
