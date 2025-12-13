import { useCallback, useRef, useEffect } from "react";

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isUnlockedRef = useRef(false);

  // Unlock audio context on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlockedRef.current) return;
      
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().then(() => {
            console.log("[Audio] Context unlocked");
            isUnlockedRef.current = true;
          });
        } else {
          isUnlockedRef.current = true;
        }
      } catch (e) {
        console.error("[Audio] Failed to unlock:", e);
      }
    };

    // Listen for any user interaction to unlock audio
    document.addEventListener("click", unlockAudio, { once: false });
    document.addEventListener("touchstart", unlockAudio, { once: false });

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume context if suspended (needed for mobile)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Create a pleasant notification sound (two-tone chime)
      const frequencies = [880, 1100]; // A5 and C#6 - pleasant notification sound
      
      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now);

        // Quick fade in and out for smooth sound
        gainNode.gain.setValueAtTime(0, now + (index * 0.1));
        gainNode.gain.linearRampToValueAtTime(0.3, now + (index * 0.1) + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + (index * 0.1) + 0.3);

        oscillator.start(now + (index * 0.1));
        oscillator.stop(now + (index * 0.1) + 0.35);
      });
      
      console.log("[Audio] Notification sound played");
    } catch (err) {
      console.error("Error playing notification sound:", err);
    }
  }, []);

  const vibrate = useCallback((pattern: number[] = [200, 100, 200]) => {
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (err) {
      console.error("Error vibrating:", err);
    }
  }, []);

  const stopVibrate = useCallback(() => {
    try {
      if ("vibrate" in navigator) {
        navigator.vibrate(0);
      }
    } catch (err) {
      console.error("Error stopping vibration:", err);
    }
  }, []);

  return {
    playNotificationSound,
    vibrate,
    stopVibrate,
  };
}
