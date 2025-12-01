import { useEffect, useRef } from "react";

/**
 * Hook to unlock audio playback on mobile devices.
 * Mobile browsers require user interaction before audio can play.
 * This hook creates a silent audio context on first touch/click.
 */
export const useAudioUnlock = () => {
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlockAudio = async () => {
      if (unlockedRef.current) return;
      
      try {
        // Create and play a silent audio
        const audio = new Audio();
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAB/f39/";
        audio.volume = 0.01;
        await audio.play();
        audio.pause();
        
        // Also unlock AudioContext
        const ctx = new AudioContext();
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        
        unlockedRef.current = true;
        console.log("[AudioUnlock] Audio unlocked successfully");
        
        // Remove listeners after successful unlock
        document.removeEventListener("touchstart", unlockAudio);
        document.removeEventListener("click", unlockAudio);
      } catch (e) {
        console.log("[AudioUnlock] Unlock attempt:", e);
      }
    };

    // Add listeners for first user interaction
    document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    document.addEventListener("click", unlockAudio, { once: true });

    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);
};
