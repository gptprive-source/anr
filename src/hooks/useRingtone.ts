import { useRef, useCallback, useEffect } from "react";

export const useRingtone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const createRingtone = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play a realistic phone ring tone
  const playRing = useCallback(() => {
    const ctx = createRingtone();
    const currentTime = ctx.currentTime;

    // Create master gain for overall volume
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0.5, currentTime);

    // Classic dual-tone ring (similar to phone)
    // First ring burst
    const playBurst = (startTime: number) => {
      // Tone 1: 440 Hz (A4)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, startTime);
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain1.gain.setValueAtTime(0.3, startTime + 0.4);
      gain1.gain.linearRampToValueAtTime(0, startTime + 0.42);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(startTime);
      osc1.stop(startTime + 0.45);

      // Tone 2: 480 Hz (B4) - creates the classic ring modulation
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, startTime);
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain2.gain.setValueAtTime(0.3, startTime + 0.4);
      gain2.gain.linearRampToValueAtTime(0, startTime + 0.42);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(startTime + 0.45);
    };

    // Play two short bursts with a small gap (classic ring pattern)
    playBurst(currentTime);
    playBurst(currentTime + 0.5);
  }, [createRingtone]);

  const startRinging = useCallback(() => {
    if (isPlayingRef.current) return;
    
    console.log("[Ringtone] Starting ringtone");
    isPlayingRef.current = true;
    
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    
    // Play immediately
    playRing();
    
    // Start vibration pattern (1s vibrate, 1.5s pause)
    const vibrateLoop = () => {
      if (isPlayingRef.current && navigator.vibrate) {
        navigator.vibrate([1000, 1500]);
        setTimeout(vibrateLoop, 2500);
      }
    };
    vibrateLoop();
    
    // Then repeat every 2.5 seconds (ring pattern)
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
    
    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRinging();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
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
