import { useRef, useCallback, useEffect } from "react";

export const useRingtone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const createRingtone = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playRing = useCallback(() => {
    const ctx = createRingtone();
    
    // Create oscillator for ring tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Classic phone ring frequencies
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.type = "sine";
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    
    // Second tone
    setTimeout(() => {
      if (!isPlayingRef.current) return;
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.frequency.setValueAtTime(480, ctx.currentTime);
      osc2.type = "sine";
      
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.4);
    }, 100);
  }, [createRingtone]);

  const startRinging = useCallback(() => {
    if (isPlayingRef.current) return;
    
    isPlayingRef.current = true;
    
    // Play immediately
    playRing();
    
    // Then repeat every 2 seconds
    intervalRef.current = window.setInterval(() => {
      if (isPlayingRef.current) {
        playRing();
      }
    }, 2000);
  }, [playRing]);

  const stopRinging = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      oscillatorRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRinging();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopRinging]);

  return { startRinging, stopRinging };
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
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
    return null;
  }
  
  const notification = new Notification("Appel entrant", {
    body: `${habitationName}\n${address}`,
    icon: "/favicon.ico",
    tag: "incoming-call",
    requireInteraction: true,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  return notification;
};
